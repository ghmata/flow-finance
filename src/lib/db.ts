import Dexie, { type EntityTable } from 'dexie';
import { Cliente, Produto, PedidoPreVenda, RegistroPosVenda, Pagamento, Despesa, Receita, ScheduledOrder, AuditLog, NotificationLog } from '@/types';

// ⭐ NOVA INTERFACE
export interface Configuracao {
  id: string;
  chave: string;
  valor: string;
  created_at: string;
}

class FlowFinanceDB extends Dexie {
  clientes!: EntityTable<Cliente, 'id'>;
  produtos!: EntityTable<Produto, 'id'>;
  pedidosPreVenda!: EntityTable<PedidoPreVenda, 'id'>;
  registrosPosVenda!: EntityTable<RegistroPosVenda, 'id'>;
  pagamentos!: EntityTable<Pagamento, 'id'>;
  despesas!: EntityTable<Despesa, 'id'>;
  receitas!: EntityTable<Receita, 'id'>;
  
  // ⭐ NOVA TABELA
  configuracoes!: EntityTable<Configuracao, 'id'>;
  
  // ⭐ NOVAS TABELAS (Task Schema Update)
  scheduledOrders!: EntityTable<ScheduledOrder, 'orderId'>;
  auditLogs!: EntityTable<AuditLog, 'id'>;
  notificationLogs!: EntityTable<NotificationLog, 'id'>;

  constructor() {
    super('FlowFinanceDB');
    this.version(1).stores({
      clientes: '&id, nome, telefone, created_at',
      produtos: '&id, nome_sabor, ativo, created_at',
      pedidosPreVenda: '&id, cliente_id, produto_id, status, data_pedido, [cliente_id+status]',
      registrosPosVenda: '&id, cliente_id, status, data_registro, [cliente_id+status]',
      pagamentos: '&id, tipo, referencia_id, cliente_id, data_pagamento, [referencia_id+tipo]',
      despesas: '&id, categoria, data_despesa, status, [categoria+data_despesa]',
      receitas: '&id, categoria, data_receita, origem, [categoria+data_receita]',
      configuracoes: '&id, chave'
    });

    this.version(2).stores({
      pedidosPreVenda: '&id, cliente_id, status, data_pedido, [cliente_id+status]', // Remove produto_id from index
      registrosPosVenda: '&id, cliente_id, status, data_registro, [cliente_id+status]',
    }).upgrade(async (trans) => {
      console.log('[Migration v2] Iniciando migração para múltiplos itens...');
      
      // Migrate PedidosPreVenda
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await trans.table('pedidosPreVenda').toCollection().modify((pedido: any) => {
        if (!pedido.itens) {
          pedido.itens = [{
            id: `mig-${pedido.id}`,
            produto_id: pedido.produto_id || 'unknown',
            produto_nome: 'Produto (Migrado)', // We might not have access to products table here easily in modify, or it's costly. 
                                               // ideally we'd join, but for now simple migration. 
                                               // The UI should handle "unknown" names or we fetch them at runtime if needed.
                                               // Actually, let's try to be safe.
            quantidade: pedido.quantidade || 1,
            preco_unitario: pedido.valor_unitario || 0,
            subtotal: pedido.valor_total || 0,
          }];
          // Keep legacy fields or delete them? Dexie modify allows deletion if we use `delete pedido.produto_id`.
          // For safety, let's keep them for a bit or just ignore them in new UI.
        }
      });

      // Migrate RegistrosPosVenda
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await trans.table('registrosPosVenda').toCollection().modify((registro: any) => {
        if (!registro.itens) {
           registro.itens = [{
            id: `mig-${registro.id}`,
             produto_id: 'pos-venda-item',
             produto_nome: registro.descricao || 'Venda Avulsa',
             quantidade: registro.quantidade || 1,
             preco_unitario: registro.valor_total || 0, // Approx
             subtotal: registro.valor_total || 0,
           }];
        }
      });
      
      console.log('[Migration v2] Migração concluída.');
    });

    this.version(3).upgrade(async (trans) => {
      console.log('[Migration v3] Backfilling granular status...');
      
      // Update PedidosPreVenda items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await trans.table('pedidosPreVenda').toCollection().modify((pedido: any) => {
        if (pedido.itens && Array.isArray(pedido.itens)) {
           const finalItens = pedido.itens.map((item: any) => ({
             ...item,
             // Inherit from parent if not present
             paidAt: item.paidAt || (pedido.status === 'pago' ? (pedido.data_pagamento || new Date().toISOString().slice(0, 10)) : null),
             deliveredAt: item.deliveredAt || (pedido.status === 'entregue' || (pedido.status === 'pago' && pedido.data_entrega) ? (pedido.data_entrega || new Date().toISOString().slice(0, 10)) : null)
           }));
           pedido.itens = finalItens;
        }
      });
      
      // Update RegistrosPosVenda items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await trans.table('registrosPosVenda').toCollection().modify((registro: any) => {
        if (registro.itens && Array.isArray(registro.itens)) {
           const finalItens = registro.itens.map((item: any) => ({
             ...item,
             paidAt: item.paidAt || (registro.status === 'pago' ? (registro.data_pagamento || registro.data_registro) : null),
             // PosVenda is usually delivered immediately, but let's assume deliveredAt = data_registro if bought
             deliveredAt: item.deliveredAt || registro.data_registro
           }));
           registro.itens = finalItens;
        }
      });
      console.log('[Migration v3] Migração granular concluída.');
    });
    
    // NEW VERSION 4 FOR SCHEDULING
    this.version(4).stores({
      scheduledOrders: '&orderId, scheduledDate, status, [scheduledDate+status]',
      auditLogs: '++id, orderId, action, timestamp',
      notificationLogs: '++id, orderId, type, status, sentAt'
    });
  }
}

export const db = new FlowFinanceDB();
