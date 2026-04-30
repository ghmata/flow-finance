import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncEngine } from '../lib/sync-engine';
import { db } from '../lib/db';

// Mock do Supabase para evitar chamadas reais
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user' } } }, error: null })),
    }
  }
}));

// Mock das operações do Supabase
vi.mock('../lib/supabase-operations', () => ({
  sbInsert: vi.fn(() => Promise.resolve({ success: true })),
  sbUpdate: vi.fn(() => Promise.resolve({ success: true })),
  sbDelete: vi.fn(() => Promise.resolve({ success: true })),
  sbGetAll: vi.fn(() => Promise.resolve([])),
}));

describe('SyncEngine Online/Offline Logic', () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
    vi.clearAllMocks();
    
    // Resetar o estado do navigator.onLine (jsdom)
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('deve enfileirar itens quando estiver offline', async () => {
    // Simular Offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    await syncEngine.enqueue('INSERT', 'clientes', '123', { nome: 'Teste Offline' });
    
    const pending = await db.syncQueue.where('status').equals('pending').toArray();
    expect(pending.length).toBe(1);
    expect(pending[0].recordId).toBe('123');
  });

  it('deve disparar o flush automaticamente ao voltar a ficar online', async () => {
    // 1. Começa offline e adiciona item
    Object.defineProperty(navigator, 'onLine', { value: false });
    await syncEngine.enqueue('INSERT', 'clientes', '456', { nome: 'Teste Sync' });
    
    // 2. Mock do flush para verificar se foi chamado
    const flushSpy = vi.spyOn(syncEngine, 'flush');
    
    // 3. Simular evento de "online" no navegador
    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));
    
    // O SyncEngine escuta o evento 'online' e chama flush()
    expect(flushSpy).toHaveBeenCalled();
  });

  it('não deve remover itens da fila se a sincronização falhar (status error)', async () => {
    // Forçar erro no Supabase
    const { sbInsert } = await import('../lib/supabase-operations');
    (sbInsert as any).mockRejectedValueOnce(new Error('Falha na Rede'));

    await syncEngine.enqueue('INSERT', 'produtos', 'prod-1', { nome: 'Erro' });
    await syncEngine.flush();

    const items = await db.syncQueue.toArray();
    expect(items[0].status).toBe('error');
    expect(items[0].error).toBe('Falha na Rede');
  });
});
