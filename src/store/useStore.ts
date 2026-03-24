import { create } from 'zustand';
import type {
  Cliente, Produto, PedidoPreVenda, RegistroPosVenda,
  Pagamento, Despesa, Receita, DevedorAgrupado, PedidoItem,
} from '@/types';
import { dbAdd, dbUpdate, dbDelete, dbGetAll } from '@/lib/db-operations';
import { migrateFromLocalStorage } from '@/lib/db-migration';
import { isInCurrentMonth } from '@/lib/date-utils';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

interface AppState {
  clientes: Cliente[];
  produtos: Produto[];
  pedidosPreVenda: PedidoPreVenda[];
  registrosPosVenda: RegistroPosVenda[];
  pagamentos: Pagamento[];
  despesas: Despesa[];
  receitas: Receita[];

  isLoading: boolean;
  error: string | null;

  // Initialization
  init: () => Promise<void>;

  // Clientes
  addCliente: (nome: string, telefone?: string, observacoes?: string) => Promise<boolean>;
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<boolean>;
  deleteCliente: (id: string) => Promise<boolean>;

  // Produtos
  addProduto: (nome_sabor: string, preco_unitario: number) => Promise<boolean>;
  updateProduto: (id: string, data: Partial<Produto>) => Promise<boolean>;
  deleteProduto: (id: string) => Promise<boolean>;

  // Pré-venda
  addPreVenda: (cliente_id: string, itens: PedidoItem[], scheduledDate?: string) => Promise<boolean>;
  updatePreVenda: (id: string, data: Partial<PedidoPreVenda>) => Promise<boolean>;
  entregarPreVenda: (id: string) => Promise<boolean>;
  entregarItem: (pedido_id: string, item_id: string) => Promise<boolean>; // Granular delivery
  deletePreVenda: (id: string) => Promise<boolean>;

  // Pós-venda
  addPosVenda: (cliente_id: string, descricao: string, quantidade: number, valor_total: number, itens?: PedidoItem[]) => Promise<boolean>;
  deletePosVenda: (id: string) => Promise<boolean>;

  // Pagamento
  // Pagamento Granular
  registrarPagamentoReserva: (tipo: 'prevenda' | 'posvenda', referencia_id: string, item_id: string, forma_pagamento: string) => Promise<void>;
  registrarPagamentoEmLote: (tipo: 'prevenda' | 'posvenda', referencia_id: string, itens_ids: string[], forma_pagamento: string, valor_pago_custom?: number) => Promise<void>;
  // Legacy support or full order payment
  registrarPagamento: (tipo: 'prevenda' | 'posvenda', referencia_id: string, forma_pagamento: string) => Promise<void>;

  // Despesas
  addDespesa: (data: Omit<Despesa, 'id'>) => Promise<void>;
  updateDespesa: (id: string, data: Partial<Despesa>) => Promise<void>;
  deleteDespesa: (id: string) => Promise<void>;

  // Receitas
  addReceitaManual: (data: Omit<Receita, 'id' | 'origem'>) => Promise<void>;

  // Computed
  getDevedores: () => DevedorAgrupado[];
  getClienteNome: (id: string) => string;
  getProdutoNome: (id: string) => string;
  getTop3Compradores: () => { nome: string; total: number; qtd: number }[];
  getTop3ProdutosMaisVendidos: () => { nome: string; quantidade: number }[];
}

export const useStore = create<AppState>((set, get) => ({
  clientes: [],
  produtos: [],
  pedidosPreVenda: [],
  registrosPosVenda: [],
  pagamentos: [],
  despesas: [],
  receitas: [],
  isLoading: true,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Run migration if needed
      await migrateFromLocalStorage();

      // 2. Fetch all data
      const [
        clientes,
        produtos,
        pedidosPreVenda,
        registrosPosVenda,
        pagamentos,
        despesas,
        receitas
      ] = await Promise.all([
        dbGetAll<Cliente>('clientes'),
        dbGetAll<Produto>('produtos'),
        dbGetAll<PedidoPreVenda>('pedidosPreVenda'),
        dbGetAll<RegistroPosVenda>('registrosPosVenda'),
        dbGetAll<Pagamento>('pagamentos'),
        dbGetAll<Despesa>('despesas'),
        dbGetAll<Receita>('receitas')
      ]);

      set({
        clientes,
        produtos,
        pedidosPreVenda,
        registrosPosVenda,
        pagamentos,
        despesas,
        receitas,
        isLoading: false
      });
    } catch (err: unknown) {
      console.error('Failed to initialize store:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao carregar dados do banco de dados.';
      set({ error: msg, isLoading: false });
    }
  },

  addCliente: async (nome, telefone, observacoes) => {
    console.log('[addCliente] Iniciando...', { nome });
    try {
      const id = uid();
      const newCliente: Cliente = { id, nome, telefone, observacoes, created_at: today() };
      const res = await dbAdd('clientes', newCliente);
      if (res.success) {
        console.log('[addCliente] Sucesso. ID:', id);
        set((s) => ({ clientes: [...s.clientes, newCliente] }));
        return true;
      } else {
        console.error('[addCliente] Falha no dbAdd:', res.error);
        set({ error: 'Erro ao adicionar cliente.' });
        return false;
      }
    } catch (e) {
      console.error('[addCliente] Exceção:', e);
      return false;
    }
  },

  updateCliente: async (id, data) => {
    console.log('[updateCliente] Iniciando...', { id, data });
    try {
      const res = await dbUpdate('clientes', id, data);
      if (res.success) {
        set((s) => ({
          clientes: s.clientes.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
        return true;
      } else {
        console.error('[updateCliente] Falha:', res.error);
        set({ error: 'Erro ao atualizar cliente.' });
        return false;
      }
    } catch (e) {
       console.error('[updateCliente] Exceção:', e);
       return false;
    }
  },

  deleteCliente: async (id) => {
    console.log('[deleteCliente] Iniciando...', { id });
    try {
      const res = await dbDelete('clientes', id);
      if (res.success) {
        set((s) => ({ clientes: s.clientes.filter((c) => c.id !== id) }));
        return true;
      } else {
        console.error('[deleteCliente] Falha:', res.error);
        set({ error: 'Erro ao excluir cliente.' });
        return false;
      }
    } catch (e) {
      console.error('[deleteCliente] Exceção:', e);
      return false;
    }
  },

  addProduto: async (nome_sabor, preco_unitario) => {
    console.log('[addProduto] Iniciando...', { nome_sabor });
    try {
      const id = uid();
      const newProduto: Produto = { id, nome_sabor, preco_unitario, ativo: true, created_at: today() };
      const res = await dbAdd('produtos', newProduto);
      if (res.success) {
        console.log('[addProduto] Sucesso. ID:', id);
        set((s) => ({ produtos: [...s.produtos, newProduto] }));
        return true;
      } else {
        console.error('[addProduto] Falha:', res.error);
        set({ error: 'Erro ao adicionar produto.' });
        return false;
      }
    } catch (e) {
      console.error('[addProduto] Exceção:', e);
      return false;
    }
  },

  updateProduto: async (id, data) => {
    console.log('[updateProduto] Iniciando...', { id, data });
    try {
      const res = await dbUpdate('produtos', id, data);
      if (res.success) {
        set((s) => ({
          produtos: s.produtos.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
        return true;
      } else {
        console.error('[updateProduto] Falha:', res.error);
        set({ error: 'Erro ao atualizar produto.' });
        return false;
      }
    } catch (e) {
      console.error('[updateProduto] Exceção:', e);
      return false;
    }
  },

  deleteProduto: async (id) => {
    console.log('[deleteProduto] Iniciando...', { id });
    try {
      const res = await dbDelete('produtos', id);
      if (res.success) {
        set((s) => ({ produtos: s.produtos.filter((p) => p.id !== id) }));
        return true;
      } else {
        console.error('[deleteProduto] Falha:', res.error);
        set({ error: 'Erro ao excluir produto.' });
        return false;
      }
    } catch (e) {
      console.error('[deleteProduto] Exceção:', e);
      return false;
    }
  },

  addPreVenda: async (cliente_id, itens, scheduledDate) => {
    console.log('[addPreVenda] Iniciando...', { cliente_id, itensCount: itens.length, scheduledDate });
    try {
      const id = uid();
      const valor_total = itens.reduce((acc, item) => acc + item.subtotal, 0);

      // Assign IDs to items if they don't have them (though UI should provide them)
      const finalItens = itens.map(item => ({
        ...item,
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));

      const newPedido: PedidoPreVenda = {
        id, 
        cliente_id, 
        itens: finalItens,
        valor_total, 
        status: scheduledDate ? 'agendado' : 'pendente',
        data_pedido: today(),
        scheduledDate: scheduledDate, // Use correct field
        // data_entrega: undefined, // Keep undefined until delivered
      };

      const res = await dbAdd('pedidosPreVenda', newPedido);
      if (res.success) {
        console.log('[addPreVenda] Sucesso. ID:', id);
        set((s) => ({ pedidosPreVenda: [...s.pedidosPreVenda, newPedido] }));
        return true;
      } else {
        console.error('[addPreVenda] Falha:', res.error);
        set({ error: 'Erro ao criar pedido.' });
        return false;
      }
    } catch (e) {
      console.error('[addPreVenda] Exceção:', e);
      return false;
    }
  },

  updatePreVenda: async (id, data) => {
    console.log('[updatePreVenda] Iniciando...', { id, data });
    try {
      // Calculate new total if items are updated
      const updateData = { ...data };
      if (data.itens) {
          const valor_total = data.itens.reduce((acc, item) => acc + item.subtotal, 0);
          updateData.valor_total = valor_total;
      }

      const res = await dbUpdate('pedidosPreVenda', id, updateData);
      if (res.success) {
        set((s) => ({
          pedidosPreVenda: s.pedidosPreVenda.map((p) =>
            p.id === id ? { ...p, ...updateData } : p
          ),
        }));
        return true;
      } else {
        console.error('[updatePreVenda] Falha:', res.error);
        set({ error: 'Erro ao atualizar pedido.' });
        return false;
      }
    } catch (e) {
      console.error('[updatePreVenda] Exceção:', e);
      return false;
    }
  },

  deletePreVenda: async (id) => {
    console.log('[deletePreVenda] Iniciando...', { id });
    try {
      const res = await dbDelete('pedidosPreVenda', id);
      if (res.success) {
        set((s) => ({ pedidosPreVenda: s.pedidosPreVenda.filter((p) => p.id !== id) }));
        return true;
      } else {
        console.error('[deletePreVenda] Falha:', res.error);
        set({ error: 'Erro ao excluir pedido.' });
        return false;
      }
    } catch (e) {
      console.error('[deletePreVenda] Exceção:', e);
      return false;
    }
  },

  deletePosVenda: async (id) => {
    console.log('[deletePosVenda] Iniciando...', { id });
    try {
      const res = await dbDelete('registrosPosVenda', id);
      if (res.success) {
        set((s) => ({ registrosPosVenda: s.registrosPosVenda.filter((r) => r.id !== id) }));
        return true;
      } else {
        console.error('[deletePosVenda] Falha:', res.error);
        set({ error: 'Erro ao excluir registro.' });
        return false;
      }
    } catch (e) {
      console.error('[deletePosVenda] Exceção:', e);
      return false;
    }
  },

  entregarPreVenda: async (id) => {
    // Legacy: marks whole order as delivered
    // Also update all items deliveredAt
    console.log('[entregarPreVenda] Iniciando...', { id });
    try {
      const pedido = get().pedidosPreVenda.find((p) => p.id === id);
      if (!pedido) return false;

      const data_entrega = today();
      const novoStatus: PedidoPreVenda['status'] = pedido.status === 'pago' ? 'pago' : 'entregue';
      
      const newItens = pedido.itens.map(i => ({...i, deliveredAt: i.deliveredAt || data_entrega}));

      const updateData = { status: novoStatus, data_entrega, itens: newItens };

      const res = await dbUpdate('pedidosPreVenda', id, updateData);
      if (res.success) {
        set((s) => ({
          pedidosPreVenda: s.pedidosPreVenda.map((p) =>
            p.id === id ? { ...p, ...updateData } : p
          ),
        }));
        return true;
      } else {
        console.error('[entregarPreVenda] Falha:', res.error);
        set({ error: 'Erro ao atualizar status de entrega.' });
        return false;
      }
    } catch (e) {
      console.error('[entregarPreVenda] Exceção:', e);
      return false;
    }
  },

  entregarItem: async (pedido_id, item_id) => {
      console.log('[entregarItem] Iniciando...', { pedido_id, item_id });
      try {
        const pedido = get().pedidosPreVenda.find((p) => p.id === pedido_id);
        if (!pedido) return false;

        const data_entrega = today();
        
        const newItens = pedido.itens.map(i => i.id === item_id ? ({...i, deliveredAt: data_entrega}) : i);
        
        // Check if all items are delivered to update parent status
        const allDelivered = newItens.every(i => !!i.deliveredAt);
        const allPaid = newItens.every(i => !!i.paidAt);
        
        let novoStatus: PedidoPreVenda['status'] = pedido.status;
        if (allPaid && allDelivered) novoStatus = 'pago'; // Or 'concluido' if generic
        else if (allDelivered) novoStatus = 'entregue';
        
        const updateData = { itens: newItens, status: novoStatus, ...(allDelivered ? {data_entrega} : {}) };

        const res = await dbUpdate('pedidosPreVenda', pedido_id, updateData);
         if (res.success) {
            set((s) => ({
              pedidosPreVenda: s.pedidosPreVenda.map((p) =>
                p.id === pedido_id ? { ...p, ...updateData } : p
              ),
            }));
            return true;
          }
          return false;
      } catch (e) {
        console.error('[entregarItem] Exceção:', e);
        return false;
      }
  },

  addPosVenda: async (cliente_id, descricao, quantidade, valor_total, itens = []) => {
    console.log('[addPosVenda] Iniciando...', { cliente_id, descricao });
    try {
      const id = uid();
      
      // If no items provided (legacy call or manual entry), create one from params
      let finalItens = itens;
      if (finalItens.length === 0) {
          finalItens = [{
              id: `item-${Date.now()}-1`,
              produto_id: 'pos-venda-manual',
              produto_nome: descricao,
              quantidade: quantidade,
              preco_unitario: valor_total / (quantidade || 1),
              subtotal: valor_total
          }];
      }

      const newRegistro: RegistroPosVenda = {
        id, cliente_id, descricao, quantidade, valor_total, status: 'aberto', data_registro: today(),
        itens: finalItens
      };
      
      const res = await dbAdd('registrosPosVenda', newRegistro);
      if (res.success) {
        console.log('[addPosVenda] Sucesso. ID:', id);
        set((s) => ({ registrosPosVenda: [...s.registrosPosVenda, newRegistro] }));
        return true;
      } else {
        console.error('[addPosVenda] Falha:', res.error);
        set({ error: 'Erro ao criar registro pós-venda.' });
        return false;
      }
    } catch (e) {
      console.error('[addPosVenda] Exceção:', e);
      return false;
    }
  },

  registrarPagamento: async (tipo, referencia_id, forma_pagamento) => {
    // Legacy: Pay ALL items
    // Use the granular function for all items logic
    const state = get();
    if (tipo === 'prevenda') {
        const pedido = state.pedidosPreVenda.find((p) => p.id === referencia_id);
        if (pedido) {
            const itemIds = pedido.itens.map(i => i.id);
            await get().registrarPagamentoEmLote(tipo, referencia_id, itemIds, forma_pagamento);
        }
    } else {
        const reg = state.registrosPosVenda.find((r) => r.id === referencia_id);
        if (reg) {
            const itemIds = reg.itens.map(i => i.id);
            await get().registrarPagamentoEmLote(tipo, referencia_id, itemIds, forma_pagamento);
        }
    }
  },

  registrarPagamentoReserva: async (tipo, referencia_id, item_id, forma_pagamento) => {
      await get().registrarPagamentoEmLote(tipo, referencia_id, [item_id], forma_pagamento);
  },

  registrarPagamentoEmLote: async (tipo, referencia_id, itens_ids, forma_pagamento, valor_pago_custom) => {
    const state = get();
    let cliente_id = '';
    let cliente_nome = '';
    let valor_pagamento_total = 0;
    
    // Find parent and calculate total of selected items
    let updateData: any = {};
    let currentItens: PedidoItem[] = [];

    if (tipo === 'prevenda') {
      const pedido = state.pedidosPreVenda.find((p) => p.id === referencia_id);
      if (!pedido) return;
      cliente_id = pedido.cliente_id;
      currentItens = pedido.itens;
    } else {
      const reg = state.registrosPosVenda.find((r) => r.id === referencia_id);
      if (!reg) return;
      cliente_id = reg.cliente_id;
      currentItens = reg.itens;
    }
    
    // Filter items regarding ids
    // Fix: Handle 'balance-' synthetic IDs from getDevedores
    const hasBalanceItem = itens_ids.some(id => id.startsWith('balance-'));
    
    let itemsToPay = currentItens.filter(i => itens_ids.includes(i.id) && !i.paidAt);
    
    // If we are paying a balance item, or if we are paying a partial order (where items are not paid yet)
    // We should consider all unpaid items for calculation context
    if (itemsToPay.length === 0 && hasBalanceItem) {
        itemsToPay = currentItens.filter(i => !i.paidAt);
    }

    if (itemsToPay.length === 0) {
        console.warn('No items to pay or already paid.');
        return;
    }

    // Use custom value if provided, otherwise sum items
    valor_pagamento_total = valor_pago_custom !== undefined ? valor_pago_custom : itemsToPay.reduce((acc, i) => acc + i.subtotal, 0);
    
    cliente_nome = state.clientes.find((c) => c.id === cliente_id)?.nome || 'Cliente';
    const data_pagamento = today();

    // Prepare new items state
    const newItens = currentItens.map(i => {
        // Check if item is in the list OR if we are paying via balance synthetic item
        const isSelected = itens_ids.includes(i.id) || hasBalanceItem;
        
        if (isSelected && !i.paidAt) {
            return { ...i, paidAt: data_pagamento };
        }
        return i;
    });
    
    // Check parent status
    const allPaid = newItens.every(i => !!i.paidAt);
    const allDelivered = newItens.every(i => !!i.deliveredAt); 
    
    // Calculate new total paid
    const currentPaid = (tipo === 'prevenda' 
        ? state.pedidosPreVenda.find(p => p.id === referencia_id)?.valor_pago 
        : state.registrosPosVenda.find(r => r.id === referencia_id)?.valor_pago) || 0;

    let novo_valor_pago = currentPaid + valor_pagamento_total;
    
    // Determine new status
    let novoStatus: any = 'pendente'; // default
    if (tipo === 'posvenda') novoStatus = 'aberto';

    const parentTotal = (tipo === 'prevenda' 
        ? state.pedidosPreVenda.find(p => p.id === referencia_id)?.valor_total 
        : state.registrosPosVenda.find(r => r.id === referencia_id)?.valor_total) || 0;

    if (novo_valor_pago >= parentTotal - 0.01) { // tolerance
        novoStatus = 'pago';
        novo_valor_pago = parentTotal; // Cap at total
    } else if (novo_valor_pago > 0) {
        novoStatus = 'parcial';
    }

    // IF PARTIAL: Do NOT mark items as paidAt individually if we are just paying a lump sum that doesn't cover specific items?
    // OR: If we paid specific items, we mark them.
    // The previous logic marked items as paid if they were in the list.
    // Issue: If I select "Receber Tudo" (all items), but change value to 50%...
    // Then I am paying 50% of ALL items? Or paying some items?
    // User wants "Saldo Devedor".
    // Strategy: If partial payment, WE DO NOT MARK ITEMS AS PAID.
    // We only track the global 'valor_pago'.
    // Items remain 'open' until the full order is paid.
    
    let finalItens = newItens;
    if (novoStatus === 'parcial') {
        // Revert paidAt for items if it was set by this transaction
        // Actually, 'newItens' were just mapped above to set paidAt.
        // We should NOT set paidAt if it's partial.
        finalItens = currentItens; // Keep original items (unpaid)
    }

    updateData = { 
        itens: finalItens, 
        valor_pago: novo_valor_pago,
        status: novoStatus,
        ...(novoStatus === 'pago' ? { data_pagamento, forma_pagamento } : {}) 
    };

    // DB Ops
    const pagamento_id = uid();
    const novoPagamento: Pagamento = {
        id: pagamento_id, type: tipo, referencia_id, cliente_id, valor_pago: valor_pagamento_total, forma_pagamento, data_pagamento
    } as any; 
    novoPagamento.tipo = tipo;

    const novaReceita: Receita = {
        id: uid(),
        descricao: `Venda ${novoStatus === 'parcial' ? 'Parcial' : ''} - ${cliente_nome}`,
        categoria: 'Venda de produtos',
        valor: valor_pagamento_total,
        data_receita: data_pagamento,
        origem: 'pagamento',
        referencia_pagamento_id: pagamento_id,
        forma_recebimento: forma_pagamento,
        created_at: new Date().toISOString(), // TIMESTAMP
    };

    // 1. Update Parent
    const sourceTable = tipo === 'prevenda' ? 'pedidosPreVenda' : 'registrosPosVenda';
    await dbUpdate(sourceTable, referencia_id, updateData);
    
    // 2. Add Payment & Revenue
    await dbAdd('pagamentos', novoPagamento);
    await dbAdd('receitas', novaReceita);
    
    // 3. Update State
    set((s) => ({
      pedidosPreVenda:
        tipo === 'prevenda'
          ? s.pedidosPreVenda.map((p) =>
              p.id === referencia_id ? { ...p, ...updateData } : p
            )
          : s.pedidosPreVenda,
      registrosPosVenda:
        tipo === 'posvenda'
          ? s.registrosPosVenda.map((r) =>
              r.id === referencia_id ? { ...r, ...updateData } : r
            )
          : s.registrosPosVenda,
      pagamentos: [...s.pagamentos, novoPagamento],
      receitas: [...s.receitas, novaReceita],
    }));
  },

  addDespesa: async (data) => {
    const newDespesa: Despesa = { ...data, id: uid(), created_at: new Date().toISOString() };
    const res = await dbAdd('despesas', newDespesa);
    if (res.success) {
      set((s) => ({ despesas: [...s.despesas, newDespesa] }));
    } else {
      set({ error: 'Erro ao adicionar despesa.' });
    }
  },

  updateDespesa: async (id, data) => {
    const res = await dbUpdate('despesas', id, data);
    if (res.success) {
      set((s) => ({
        despesas: s.despesas.map((d) => (d.id === id ? { ...d, ...data } : d)),
      }));
    } else {
       set({ error: 'Erro ao atualizar despesa.' });
    }
  },

  deleteDespesa: async (id) => {
    const res = await dbDelete('despesas', id);
    if (res.success) {
       set((s) => ({ despesas: s.despesas.filter((d) => d.id !== id) }));
    } else {
        set({ error: 'Erro ao excluir despesa.' });
    }
  },

  addReceitaManual: async (data) => {
    const newReceita: Receita = { ...data, id: uid(), origem: 'manual', created_at: new Date().toISOString() };
    const res = await dbAdd('receitas', newReceita);
    if (res.success) {
        set((s) => ({ receitas: [...s.receitas, newReceita] }));
    } else {
        set({ error: 'Erro ao adicionar receita.' });
    }
  },

  getDevedores: () => {
    const state = get();
    const map = new Map<string, DevedorAgrupado>();

    state.pedidosPreVenda
      .filter((p) => p.status === 'pendente' || p.status === 'entregue' || p.status === 'parcial' || p.status === 'agendado')
      .forEach((p) => {
        const cliente = state.clientes.find((c) => c.id === p.cliente_id);
        if (!cliente) return;
        
        if (!map.has(p.cliente_id)) {
          map.set(p.cliente_id, { cliente, itens: [], total: 0 });
        }
        const entry = map.get(p.cliente_id)!;

        // Use itens array
        const itens = p.itens || [];
        // Fallback for legacy
        if (itens.length === 0 && p.produto_id) {
             // Only if not paid
             if (p.status === 'pago') return; 
             
             // Calculate remaining value for legacy or grouped items
             const valorRestante = p.valor_total - (p.valor_pago || 0);
             if (valorRestante <= 0.01) return; // Should be paid

             // Create a single item representing the whole order or remaining balance
             const produto = state.produtos.find((pr) => pr.id === p.produto_id);
             entry.itens.push({
                tipo: 'prevenda', id: p.id, itemId: p.id,
                descricao: (produto?.nome_sabor || 'Produto') + (p.status === 'parcial' ? ' (Restante)' : ''),
                valor: valorRestante,
                dias: daysBetween(p.data_pedido),
                data: p.data_pedido,
                paidAt: null
             });
        } else {
             // Granular Items Logic with Partial Support
             // If status is 'parcial', we might have unallocated payments.
             // Strategy: Show items as usual. But if 'parcial', maybe show a "Discount" item?
             // Or better: If 'parcial', we don't know WHICH item is paid.
             // So we should probably aggregate them if it's partial?
             // OR: Just list all unpaid items, but adjusting the TOTAL displayed in the card?
             // The 'total' property of DevedorAgrupado is calculated from items.
             
             // If I have 3 items of 50 (Total 150). I paid 50. Status Partial. Balance 100.
             // If I list 3 items of 50, Total is 150. Wrong.
             // If I list them, the user selects "Receber Tudo", defaults to 100.
             
             // Solution: If status is 'parcial', ignore individual items and show a single "Saldo Devedor" item?
             // This simplifies "Receber Tudo" logic for the next payment.
             
             if (p.status === 'parcial') {
                 const valorRestante = p.valor_total - (p.valor_pago || 0);
                  entry.itens.push({
                      tipo: 'prevenda', id: p.id, itemId: 'balance-' + p.id,
                      descricao: `Saldo Restante (Req. ${p.id.substr(0,4)})`,
                      valor: valorRestante,
                      dias: daysBetween(p.data_pedido),
                      data: p.data_pedido,
                      paidAt: null
                  });
             } else {
                itens.forEach(item => {
                    if (item.paidAt) return; // Skip paid
                    entry.itens.push({
                      tipo: 'prevenda', id: p.id, itemId: item.id,
                      descricao: item.produto_nome,
                      valor: item.subtotal,
                      dias: daysBetween(p.data_pedido),
                      data: p.data_pedido,
                      paidAt: item.paidAt,
                    });
                });
             }
        }
      });

    state.registrosPosVenda
      .filter((r) => r.status === 'aberto' || r.status === 'parcial')
      .forEach((r) => {
        const cliente = state.clientes.find((c) => c.id === r.cliente_id);
        if (!cliente) return;
        if (!map.has(r.cliente_id)) {
          map.set(r.cliente_id, { cliente, itens: [], total: 0 });
        }
        const entry = map.get(r.cliente_id)!;
        
        const itens = r.itens || [];
        // Flatten items for Devedores list? 
        // Plan says: group by order in store? 
        // No, plan says: "Devedores: Group by Client -> List Individual Items".
        // getDevedores currently returns DevedorAgrupado { itens: ... }
        // We should just ensure we export item ID and status correctly.
        
        if (itens.length === 0) {
             entry.itens.push({
              tipo: 'posvenda', id: r.id, itemId: r.id, // For legacy, itemId = orderId
              descricao: r.descricao,
              valor: r.valor_total,
              dias: daysBetween(r.data_registro),
              data: r.data_registro,
              paidAt: r.data_pagamento, // likely null
            });
        } else {
             if (r.status === 'parcial') {
                 const valorRestante = r.valor_total - (r.valor_pago || 0);
                  entry.itens.push({
                      tipo: 'posvenda', id: r.id, itemId: 'balance-' + r.id,
                      descricao: `Saldo Restante (Venda ${r.id.substr(0,4)})`,
                      valor: valorRestante,
                      dias: daysBetween(r.data_registro),
                      data: r.data_registro,
                      paidAt: null
                  });
             } else {
                 itens.forEach(item => {
                    if (item.paidAt) return; 
                    
                    entry.itens.push({
                      tipo: 'posvenda', id: r.id, itemId: item.id,
                      descricao: item.produto_nome,
                      valor: item.subtotal,
                      dias: daysBetween(r.data_registro),
                      data: r.data_registro,
                      paidAt: item.paidAt,
                    });
                 });
             }
        }
        
        // Recalc total based on unpaid items
        // The above only pushed unpaid items? Actually logic above `if (item.paidAt) return` ensures that.
        // But we need to make sure logic for prevenda matches.
        
      });
      
    // Re-verify PreVenda loop above (needs update for granular filter)
    // We need to re-write the getDevedores entirely to be safe.
    
    return Array.from(map.values()).map(d => ({
        ...d,
        total: d.itens.reduce((acc, i) => acc + i.valor, 0)
    })).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  },

  getClienteNome: (id) => get().clientes.find((c) => c.id === id)?.nome || 'Desconhecido',
  getProdutoNome: (id) => get().produtos.find((p) => p.id === id)?.nome_sabor || 'Desconhecido',

  getTop3Compradores: () => {
    const state = get();
    const map = new Map<string, { nome: string; total: number; qtd: number }>();
    
    // Fonte primária: tabela pagamentos (valor individual de cada transação com data precisa)
    state.pagamentos
      .filter(p => isInCurrentMonth(p.data_pagamento))
      .forEach(p => {
        if (p.valor_pago <= 0) return;
        if (!map.has(p.cliente_id)) {
          const cliente = state.clientes.find(c => c.id === p.cliente_id);
          if (!cliente) return;
          map.set(p.cliente_id, { nome: cliente.nome, total: 0, qtd: 0 });
        }
        const entry = map.get(p.cliente_id)!;
        entry.total += p.valor_pago;
        entry.qtd += 1;
      });
    
    // Fallback legacy: pedidos/registros com status 'pago' mas sem registro na tabela pagamentos
    // (dados anteriores à refatoração)
    const clientesJaContados = new Set(map.keys());
    
    state.pedidosPreVenda.forEach(p => {
      if (p.status !== 'pago') return;
      if (clientesJaContados.has(p.cliente_id)) return; // Já contabilizado via pagamentos
      
      let valorPago = p.valor_pago || 0;
      if (valorPago <= 0) valorPago = p.valor_total; // Fallback C2
      if (valorPago <= 0) return;
      
      const dateToCheck = p.data_pagamento || p.data_pedido;
      if (!isInCurrentMonth(dateToCheck)) return;
      
      if (!map.has(p.cliente_id)) {
        const cliente = state.clientes.find(c => c.id === p.cliente_id);
        if (!cliente) return;
        map.set(p.cliente_id, { nome: cliente.nome, total: 0, qtd: 0 });
      }
      const entry = map.get(p.cliente_id)!;
      entry.total += valorPago;
      entry.qtd += 1;
    });

    state.registrosPosVenda.forEach(r => {
      if (r.status !== 'pago') return;
      if (clientesJaContados.has(r.cliente_id)) return;
      
      let valorPago = r.valor_pago || 0;
      if (valorPago <= 0) valorPago = r.valor_total;
      if (valorPago <= 0) return;
      
      const dateToCheck = r.data_pagamento || r.data_registro;
      if (!isInCurrentMonth(dateToCheck)) return;
      
      if (!map.has(r.cliente_id)) {
        const cliente = state.clientes.find(c => c.id === r.cliente_id);
        if (!cliente) return;
        map.set(r.cliente_id, { nome: cliente.nome, total: 0, qtd: 0 });
      }
      const entry = map.get(r.cliente_id)!;
      entry.total += valorPago;
      entry.qtd += 1;
    });
    
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  },

  getTop3ProdutosMaisVendidos: () => {
    const state = get();
    const map = new Map<string, { nome: string; quantidade: number }>();
    
    // Helper para processar itens de um pedido/registro
    const processItens = (itens: PedidoItem[], legacyProdutoId?: string, legacyQtd?: number) => {
      if (itens.length === 0 && legacyProdutoId) {
        // Fallback legacy
        const produto = state.produtos.find(pr => pr.id === legacyProdutoId);
        if (produto) {
          if (!map.has(legacyProdutoId)) {
            map.set(legacyProdutoId, { nome: produto.nome_sabor, quantidade: 0 });
          }
          map.get(legacyProdutoId)!.quantidade += (legacyQtd || 1);
        }
      } else {
        itens.forEach(item => {
          // Ignorar itens manuais de pós-venda sem produto real
          if (item.produto_id === 'pos-venda-manual') {
            const key = `manual-${item.produto_nome}`;
            if (!map.has(key)) map.set(key, { nome: item.produto_nome || 'Venda Avulsa', quantidade: 0 });
            map.get(key)!.quantidade += item.quantidade;
          } else {
            if (!map.has(item.produto_id)) {
              map.set(item.produto_id, { nome: item.produto_nome || 'Produto', quantidade: 0 });
            }
            map.get(item.produto_id)!.quantidade += item.quantidade;
          }
        });
      }
    };
    
    // 1. Pré-Venda: filtrar mês atual, excluir cancelados, apenas pago/entregue
    state.pedidosPreVenda
      .filter(p => 
        isInCurrentMonth(p.data_pedido) && 
        p.status !== 'cancelado' &&
        (p.status === 'pago' || p.status === 'entregue' || p.status === 'parcial')
      )
      .forEach(p => processItens(p.itens || [], p.produto_id, p.quantidade));
    
    // 2. Pós-Venda: incluir registros do mês atual
    state.registrosPosVenda
      .filter(r => isInCurrentMonth(r.data_registro))
      .forEach(r => processItens(r.itens || []));
    
    return Array.from(map.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 3);
  }
}));
