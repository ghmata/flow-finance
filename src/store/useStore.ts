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
  addPreVenda: (cliente_id: string, itens: PedidoItem[]) => Promise<boolean>;
  entregarPreVenda: (id: string) => Promise<boolean>;
  entregarItem: (pedido_id: string, item_id: string) => Promise<boolean>; // Granular delivery
  deletePreVenda: (id: string) => Promise<boolean>;

  // Pós-venda
  addPosVenda: (cliente_id: string, descricao: string, quantidade: number, valor_total: number, itens?: PedidoItem[]) => Promise<boolean>;
  deletePosVenda: (id: string) => Promise<boolean>;

  // Pagamento
  // Pagamento Granular
  registrarPagamentoReserva: (tipo: 'prevenda' | 'posvenda', referencia_id: string, item_id: string, forma_pagamento: string) => Promise<void>;
  registrarPagamentoEmLote: (tipo: 'prevenda' | 'posvenda', referencia_id: string, itens_ids: string[], forma_pagamento: string) => Promise<void>;
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
  getTop3ProdutosMaisReservados: () => { nome: string; quantidade: number }[];
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

  addPreVenda: async (cliente_id, itens) => {
    console.log('[addPreVenda] Iniciando...', { cliente_id, itensCount: itens.length });
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
        status: 'pendente',
        data_pedido: today(),
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

  registrarPagamentoEmLote: async (tipo, referencia_id, itens_ids, forma_pagamento) => {
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
    // Check which ones are NOT paid yet to avoid double charging revenue?
    // Or just pay them. Let's assume UI filters. But for revenue safely, only sum unpaying ones.
    const itemsToPay = currentItens.filter(i => itens_ids.includes(i.id) && !i.paidAt);
    if (itemsToPay.length === 0) {
        console.warn('No items to pay or already paid.');
        return;
    }

    valor_pagamento_total = itemsToPay.reduce((acc, i) => acc + i.subtotal, 0);
    cliente_nome = state.clientes.find((c) => c.id === cliente_id)?.nome || 'Cliente';
    const data_pagamento = today();

    // Prepare new items state
    const newItens = currentItens.map(i => {
        if (itens_ids.includes(i.id) && !i.paidAt) {
            return { ...i, paidAt: data_pagamento };
        }
        return i;
    });
    
    // Check parent status
    const allPaid = newItens.every(i => !!i.paidAt);
    const allDelivered = newItens.every(i => !!i.deliveredAt); // assuming deliveredAt exists or treated elsewhere
    
    // Update parent status based on new state
    // logic: if all paid -> 'pago'. If all paid + delivered -> 'pago' (implicitly delivered)
    // Actually, simple logic:
    let novoStatus = 'pendente';
    if (allPaid) novoStatus = 'pago'; 
    // Note: If deliveries happen, status might be 'entregue' if not all paid. 
    // If all paid, status becomes 'pago' (which usually implies transaction closed, but delivery might be pending).
    // Let's keep specific logic: 'pago' overrides 'entregue' or 'pendente'? 
    // Usually: 'pago' means fully paid. 'entregue' means delivered.
    // If allPaid, set 'pago'. 
    
    updateData = { itens: newItens, ...(allPaid ? { status: 'pago', data_pagamento, forma_pagamento } : {}) };

    // DB Ops
    const pagamento_id = uid();
    const novoPagamento: Pagamento = {
        id: pagamento_id, type: tipo, referencia_id, cliente_id, valor_pago: valor_pagamento_total, forma_pagamento, data_pagamento
    } as any; // Cast because 'type' vs 'tipo' in interface? Interface says 'tipo'. Let's check interface. Interface says 'tipo'.

    // Wait, interface Pagamento uses 'tipo', but code above used 'type' in my thought? No, strict.
    novoPagamento.tipo = tipo; // Correction

    const novaReceita: Receita = {
        id: uid(),
        descricao: `Venda Parcial - ${cliente_nome}`,
        categoria: 'Venda de produtos',
        valor: valor_pagamento_total,
        data_receita: data_pagamento,
        origem: 'pagamento',
        referencia_pagamento_id: pagamento_id,
        forma_recebimento: forma_pagamento,
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
    const newDespesa: Despesa = { ...data, id: uid() };
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
    const newReceita: Receita = { ...data, id: uid(), origem: 'manual' };
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
      .filter((p) => p.status === 'pendente' || p.status === 'entregue')
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
             
             const produto = state.produtos.find((pr) => pr.id === p.produto_id);
             entry.itens.push({
                tipo: 'prevenda', id: p.id, itemId: p.id,
                descricao: produto?.nome_sabor || 'Produto',
                valor: p.valor_total,
                dias: daysBetween(p.data_entrega || p.data_pedido),
                data: p.data_entrega || p.data_pedido,
                paidAt: null
             });
        } else {
            itens.forEach(item => {
                if (item.paidAt) return; // Skip paid
                entry.itens.push({
                  tipo: 'prevenda', id: p.id, itemId: item.id,
                  descricao: item.produto_nome,
                  valor: item.subtotal,
                  dias: daysBetween(p.data_entrega || p.data_pedido),
                  data: p.data_entrega || p.data_pedido,
                  paidAt: item.paidAt,
                });
            });
        }
      });

    state.registrosPosVenda
      .filter((r) => r.status === 'aberto')
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
             itens.forEach(item => {
                if (item.paidAt) return; // Skip paid items in "Devedores" view? Or show them? 
                // Usually "Devedores" means "Unpaid".
                // So filter out paid items.
                
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
    
    // Filter orders by current month using date-utils
    const pedidosDoMes = [
      ...state.pedidosPreVenda.filter(p => isInCurrentMonth(p.data_pedido)),
      ...state.registrosPosVenda.filter(p => isInCurrentMonth(p.data_registro))
    ];
    
    const map = new Map<string, { nome: string; total: number; qtd: number }>();
    
    pedidosDoMes.forEach(p => {
       const cliente = state.clientes.find(c => c.id === p.cliente_id);
       if (!cliente) return;
       
       if (!map.has(p.cliente_id)) {
         map.set(p.cliente_id, { nome: cliente.nome, total: 0, qtd: 0 });
       }
       const entry = map.get(p.cliente_id)!;
       entry.total += p.valor_total;
       entry.qtd += 1;
    });
    
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  },

  getTop3ProdutosMaisReservados: () => {
    const state = get();
    // Only PedidosPreVenda have products
    const pedidosDoMes = state.pedidosPreVenda.filter(p => isInCurrentMonth(p.data_pedido));
    
    const map = new Map<string, { nome: string; quantidade: number }>();
    
    pedidosDoMes.forEach(p => {
       // Iterate over items if available (migration compatible)
       const itens = p.itens || [];
       // Fallback for migrated data if itens is empty but legacy fields exist (though migration should have fixed this)
       if (itens.length === 0 && p.produto_id) {
           const produto = state.produtos.find(pr => pr.id === p.produto_id);
           if (produto) {
                if (!map.has(p.produto_id)) {
                    map.set(p.produto_id, { nome: produto.nome_sabor, quantidade: 0 });
                }
                const entry = map.get(p.produto_id)!;
                entry.quantidade += p.quantidade;
           }
       } else {
           itens.forEach(item => {
               if (!map.has(item.produto_id)) {
                 map.set(item.produto_id, { nome: item.produto_nome || 'Produto', quantidade: 0 });
               }
               const entry = map.get(item.produto_id)!;
               entry.quantidade += item.quantidade;
           });
       }
    });
    
    return Array.from(map.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 3);
  }
}));
