import { db, SyncQueueItem } from './db';
import { supabase } from './supabase';
import { sbInsert, sbUpdate, sbDelete, sbGetAll } from './supabase-operations';

export class SyncEngine {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(status: 'online' | 'offline' | 'syncing' | 'error') => void> = new Set();
  private status: 'online' | 'offline' | 'syncing' | 'error' = 'offline';

  constructor() {
    // Monitorar conectividade
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Status inicial
    this.updateStatus(navigator.onLine ? 'online' : 'offline');

    // Automação de sync a cada 30 segundos se online
    this.startAutoSync();
  }

  private updateStatus(newStatus: 'online' | 'offline' | 'syncing' | 'error') {
    // Não sobrepor erro permanente a menos que estejamos tentando reconectar
    if (this.status === 'error' && newStatus === 'offline') return;
    
    this.status = newStatus;
    this.listeners.forEach(listener => listener(this.status));
  }

  public subscribe(listener: (status: 'online' | 'offline' | 'syncing' | 'error') => void) {
    this.listeners.add(listener);
    listener(this.status); // Envia status atual imediatamente
    return () => this.listeners.delete(listener);
  }

  private handleOnline() {
    this.updateStatus('online');
    this.flush(); // Tenta sincronizar assim que volta online
  }

  private handleOffline() {
    this.updateStatus('offline');
  }

  private startAutoSync() {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.flush();
      }
    }, 30000); // 30 segundos
  }

  public stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Adiciona uma operação à fila de sincronização (chamado localmente)
   */
  public async enqueue(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    table: string,
    recordId: string | number,
    data?: any
  ) {
    const item: SyncQueueItem = {
      operation,
      table,
      recordId: String(recordId),
      data,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    await db.syncQueue.add(item);
    
    // Tenta sincronizar imediatamente se estiver online
    if (navigator.onLine && !this.isSyncing) {
      this.flush();
    }
  }

  /**
   * Processa a fila de sincronização (Local -> Nuvem)
   */
  public async flush() {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;
    this.updateStatus('syncing');

    const MAX_RETRIES = 5;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        this.isSyncing = false;
        this.updateStatus('online'); // Online, mas sem sessão
        return;
      }

      const pendingItems = await db.syncQueue
        .where('status')
        .equals('pending')
        .sortBy('createdAt');

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        this.updateStatus('online');
        return;
      }

      for (const item of pendingItems) {
        try {
          // Processar operação
          // 'INSERT' é o padrão do tipo SyncQueueItem; 'CREATE' é mantido por compatibilidade com itens legados na fila
          if (item.operation === 'INSERT' || (item.operation as string) === 'CREATE') {
            await sbInsert(item.table, item.data);
          } else if (item.operation === 'UPDATE') {
            await sbUpdate(item.table, item.recordId, item.data);
          } else if (item.operation === 'DELETE') {
            await sbDelete(item.table, item.recordId);
          }

          // Marcar como completado
          await db.syncQueue.update(item.id, { status: 'completed' });
        } catch (error: any) {
          const statusCode = error?.code || error?.status || error?.statusCode;
          const retryCount = (item.retryCount || 0) + 1;

          // Erros 403 são irrecuperáveis (dados pertencem a outro usuário)
          if (statusCode === '42501' || statusCode === 403 || String(error?.message).includes('403')) {
            console.warn(`[SyncEngine] Item ${item.id} marcado como dead (permissão negada):`, error?.message);
            await db.syncQueue.update(item.id, {
              status: 'dead',
              error: `Permissão negada (403). Registro pode pertencer a outro usuário.`,
              retryCount
            });
            continue;
          }

          // Se excedeu limite de retries, marcar como dead
          if (retryCount >= MAX_RETRIES) {
            console.warn(`[SyncEngine] Item ${item.id} atingiu ${MAX_RETRIES} tentativas. Descartando.`);
            await db.syncQueue.update(item.id, {
              status: 'dead',
              error: `Falhou após ${MAX_RETRIES} tentativas: ${error instanceof Error ? error.message : String(error)}`,
              retryCount
            });
            continue;
          }

          // Erro recuperável: incrementar retry e manter como pending
          console.error(`[SyncEngine] Erro ao sincronizar item ${item.id} (tentativa ${retryCount}/${MAX_RETRIES}):`, error);
          await db.syncQueue.update(item.id, {
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            retryCount
          });
        }
      }

      // Reprocessar itens com erro que ainda podem ser retentados
      const errorItems = await db.syncQueue
        .where('status')
        .equals('error')
        .filter(i => (i.retryCount || 0) < MAX_RETRIES)
        .toArray();

      if (errorItems.length > 0) {
        // Re-enfileirar para a próxima tentativa
        for (const item of errorItems) {
          await db.syncQueue.update(item.id, { status: 'pending' });
        }
      }

      // Limpar itens completados/mortos com mais de 24h
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oldItems = await db.syncQueue
        .where('status')
        .anyOf(['completed', 'dead'])
        .filter(i => i.createdAt < cutoffDate)
        .toArray();
      
      for (const old of oldItems) {
        await db.syncQueue.delete(old.id);
      }

      this.updateStatus('online');
    } catch (error) {
      console.error('Erro no processo de flush da sincronização:', error);
      this.updateStatus('error');
    } finally {
      this.isSyncing = false;
      // Retornar para online após um pequeno delay para a UI
      if (this.status === 'syncing') {
        setTimeout(() => {
          if (navigator.onLine) this.updateStatus('online');
        }, 1000);
      }
    }
  }

  /**
   * Puxa todos os dados do Supabase para o Dexie (Nuvem -> Local)
   * Usado principalmente no login / inicialização.
   */
  public async pullFromCloud() {
    if (!navigator.onLine) return false;
    
    this.isSyncing = true;
    this.updateStatus('syncing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // Otimização: Paralelizar as requisições principais
      const tables = [
        'clientes', 
        'produtos', 
        'pedidosPreVenda', 
        'registrosPosVenda',
        'pagamentos',
        'despesas',
        'receitas',
        'scheduledOrders',
        'auditLogs',
        'notificationLogs',
        'configuracoes'
      ];

      for (const table of tables) {
        try {
          const cloudData = await sbGetAll(table);
          
          if (cloudData && cloudData.length > 0) {
            // Limpa dados locais antigos
            // Atenção: Esta é uma abordagem agressiva que confia totalmente na nuvem.
            // Para produção, uma estratégia de 'last_modified' (delta sync) é melhor.
            await (db as any)[table].clear();
            await (db as any)[table].bulkAdd(cloudData);
          }
        } catch (e) {
          console.warn(`Falha ao puxar dados da tabela ${table}:`, e);
          // Continua para a próxima tabela mesmo se uma falhar
        }
      }

      this.updateStatus('online');
      return true;
    } catch (error) {
      console.error('Erro ao puxar dados da nuvem:', error);
      this.updateStatus('error');
      return false;
    } finally {
      this.isSyncing = false;
      setTimeout(() => {
        if (navigator.onLine && this.status !== 'error') this.updateStatus('online');
      }, 1000);
    }
  }

  /**
   * Reconcilia os dados legados do Dexie com a nuvem após o primeiro login.
   * Procura dados não sincronizados e os joga na syncQueue.
   */
  public async reconcileLocalData() {
    try {
      const configuracoes = await db.configuracoes.where('chave').equals('migration_v4_completed').first();
      if (configuracoes?.valor === 'true') {
        return; // Já foi migrado
      }

      // Vamos percorrer as tabelas principais e enfileirar criações
      const tables = [
        'clientes', 
        'produtos', 
        'pedidosPreVenda', 
        'registrosPosVenda',
        'pagamentos',
        'despesas',
        'receitas',
        'scheduledOrders',
        'auditLogs',
        'notificationLogs'
      ];

      for (const table of tables) {
        const records = await (db as any)[table].toArray();
        if (records.length === 0) continue;

        const syncItems: SyncQueueItem[] = records.map(record => ({
          operation: 'INSERT',
          table,
          recordId: String(record.id || record.orderId),
          data: record,
          createdAt: new Date().toISOString(),
          status: 'pending'
        }));

        await db.syncQueue.bulkAdd(syncItems);
      }

      // Tenta sincronizar tudo o que foi enfileirado
      if (navigator.onLine) {
        this.flush();
      }

      // Marcar como concluído
      await db.configuracoes.put({
        id: crypto.randomUUID(),
        chave: 'migration_v4_completed',
        valor: 'true',
        created_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao reconciliar dados legados:', error);
    }
  }
}

// Exportar uma instância singleton
export const syncEngine = new SyncEngine();
