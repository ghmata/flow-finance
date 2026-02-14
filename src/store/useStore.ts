import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Cliente, Produto, PedidoPreVenda, RegistroPosVenda,
  Pagamento, Despesa, Receita, DevedorAgrupado,
} from '@/types';

function uid() {
  return crypto.randomUUID();
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

  // Clientes
  addCliente: (nome: string, telefone?: string, observacoes?: string) => void;
  updateCliente: (id: string, data: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;

  // Produtos
  addProduto: (nome_sabor: string, preco_unitario: number) => void;
  updateProduto: (id: string, data: Partial<Produto>) => void;
  deleteProduto: (id: string) => void;

  // Pré-venda
  addPreVenda: (cliente_id: string, produto_id: string, quantidade: number) => void;
  entregarPreVenda: (id: string) => void;
  deletePreVenda: (id: string) => void;

  // Pós-venda
  addPosVenda: (cliente_id: string, descricao: string, quantidade: number, valor_total: number) => void;
  deletePosVenda: (id: string) => void;

  // Pagamento
  registrarPagamento: (tipo: 'prevenda' | 'posvenda', referencia_id: string, forma_pagamento: string) => void;

  // Despesas
  addDespesa: (data: Omit<Despesa, 'id'>) => void;
  updateDespesa: (id: string, data: Partial<Despesa>) => void;
  deleteDespesa: (id: string) => void;

  // Receitas
  addReceitaManual: (data: Omit<Receita, 'id' | 'origem'>) => void;

  // Computed
  getDevedores: () => DevedorAgrupado[];
  getClienteNome: (id: string) => string;
  getProdutoNome: (id: string) => string;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      clientes: [],
      produtos: [],
      pedidosPreVenda: [],
      registrosPosVenda: [],
      pagamentos: [],
      despesas: [],
      receitas: [],

      addCliente: (nome, telefone, observacoes) =>
        set((s) => ({
          clientes: [...s.clientes, { id: uid(), nome, telefone, observacoes, created_at: today() }],
        })),

      updateCliente: (id, data) =>
        set((s) => ({
          clientes: s.clientes.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),

      deleteCliente: (id) =>
        set((s) => ({ clientes: s.clientes.filter((c) => c.id !== id) })),

      addProduto: (nome_sabor, preco_unitario) =>
        set((s) => ({
          produtos: [...s.produtos, { id: uid(), nome_sabor, preco_unitario, ativo: true, created_at: today() }],
        })),

      updateProduto: (id, data) =>
        set((s) => ({
          produtos: s.produtos.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),

      deleteProduto: (id) =>
        set((s) => ({ produtos: s.produtos.filter((p) => p.id !== id) })),

      addPreVenda: (cliente_id, produto_id, quantidade) => {
        const produto = get().produtos.find((p) => p.id === produto_id);
        if (!produto) return;
        const valor_unitario = produto.preco_unitario;
        const valor_total = quantidade * valor_unitario;
        set((s) => ({
          pedidosPreVenda: [
            ...s.pedidosPreVenda,
            {
              id: uid(), cliente_id, produto_id, quantidade,
              valor_unitario, valor_total, status: 'pendente',
              data_pedido: today(),
            },
          ],
        }));
      },

      deletePreVenda: (id) =>
        set((s) => ({ pedidosPreVenda: s.pedidosPreVenda.filter((p) => p.id !== id) })),

      deletePosVenda: (id) =>
        set((s) => ({ registrosPosVenda: s.registrosPosVenda.filter((r) => r.id !== id) })),

      entregarPreVenda: (id) =>
        set((s) => ({
          pedidosPreVenda: s.pedidosPreVenda.map((p) =>
            p.id === id ? { ...p, status: 'entregue' as const, data_entrega: today() } : p
          ),
        })),

      addPosVenda: (cliente_id, descricao, quantidade, valor_total) =>
        set((s) => ({
          registrosPosVenda: [
            ...s.registrosPosVenda,
            { id: uid(), cliente_id, descricao, quantidade, valor_total, status: 'aberto' as const, data_registro: today() },
          ],
        })),

      registrarPagamento: (tipo, referencia_id, forma_pagamento) => {
        const state = get();
        let valor_pago = 0;
        let cliente_id = '';
        let cliente_nome = '';

        if (tipo === 'prevenda') {
          const pedido = state.pedidosPreVenda.find((p) => p.id === referencia_id);
          if (!pedido) return;
          valor_pago = pedido.valor_total;
          cliente_id = pedido.cliente_id;
        } else {
          const reg = state.registrosPosVenda.find((r) => r.id === referencia_id);
          if (!reg) return;
          valor_pago = reg.valor_total;
          cliente_id = reg.cliente_id;
        }

        cliente_nome = state.clientes.find((c) => c.id === cliente_id)?.nome || 'Cliente';

        const pagamento_id = uid();
        const data_pagamento = today();

        set((s) => ({
          pedidosPreVenda:
            tipo === 'prevenda'
              ? s.pedidosPreVenda.map((p) =>
                  p.id === referencia_id ? { ...p, status: 'pago' as const, data_pagamento, forma_pagamento } : p
                )
              : s.pedidosPreVenda,
          registrosPosVenda:
            tipo === 'posvenda'
              ? s.registrosPosVenda.map((r) =>
                  r.id === referencia_id ? { ...r, status: 'pago' as const, data_pagamento, forma_pagamento } : r
                )
              : s.registrosPosVenda,
          pagamentos: [
            ...s.pagamentos,
            { id: pagamento_id, tipo, referencia_id, cliente_id, valor_pago, forma_pagamento, data_pagamento },
          ],
          receitas: [
            ...s.receitas,
            {
              id: uid(),
              descricao: `Venda - ${cliente_nome}`,
              categoria: 'Venda de produtos',
              valor: valor_pago,
              data_receita: data_pagamento,
              origem: 'pagamento' as const,
              referencia_pagamento_id: pagamento_id,
              forma_recebimento: forma_pagamento,
            },
          ],
        }));
      },

      addDespesa: (data) =>
        set((s) => ({ despesas: [...s.despesas, { ...data, id: uid() }] })),

      updateDespesa: (id, data) =>
        set((s) => ({ despesas: s.despesas.map((d) => (d.id === id ? { ...d, ...data } : d)) })),

      deleteDespesa: (id) =>
        set((s) => ({ despesas: s.despesas.filter((d) => d.id !== id) })),

      addReceitaManual: (data) =>
        set((s) => ({ receitas: [...s.receitas, { ...data, id: uid(), origem: 'manual' as const }] })),

      getDevedores: () => {
        const state = get();
        const map = new Map<string, DevedorAgrupado>();

        state.pedidosPreVenda
          .filter((p) => p.status === 'entregue')
          .forEach((p) => {
            const cliente = state.clientes.find((c) => c.id === p.cliente_id);
            if (!cliente) return;
            const produto = state.produtos.find((pr) => pr.id === p.produto_id);
            if (!map.has(p.cliente_id)) {
              map.set(p.cliente_id, { cliente, itens: [], total: 0 });
            }
            const entry = map.get(p.cliente_id)!;
            entry.itens.push({
              tipo: 'prevenda', id: p.id,
              descricao: produto?.nome_sabor || 'Produto',
              valor: p.valor_total,
              dias: daysBetween(p.data_entrega || p.data_pedido),
              data: p.data_entrega || p.data_pedido,
            });
            entry.total += p.valor_total;
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
            entry.itens.push({
              tipo: 'posvenda', id: r.id,
              descricao: r.descricao,
              valor: r.valor_total,
              dias: daysBetween(r.data_registro),
              data: r.data_registro,
            });
            entry.total += r.valor_total;
          });

        return Array.from(map.values()).sort((a, b) => b.total - a.total);
      },

      getClienteNome: (id) => get().clientes.find((c) => c.id === id)?.nome || 'Desconhecido',
      getProdutoNome: (id) => get().produtos.find((p) => p.id === id)?.nome_sabor || 'Desconhecido',
    }),
    { name: 'pedidos-app-storage' }
  )
);
