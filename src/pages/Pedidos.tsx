import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useIsMobile } from '@/hooks/use-mobile';
import { Search, Eye, EyeOff, ShoppingCart, Plus, Trash2, CheckCircle, Package, Pencil, Truck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, parseCurrency } from '@/utils/masks';
import { ClienteCombobox } from '@/components/pedidos/ClienteCombobox';
import { PedidoItemRow } from '@/components/pedidos/PedidoItemRow'; // We need this
import { PedidoItem, PedidoPreVenda } from '@/types'; // And this
import { format, parseISO, isToday, isTomorrow, isYesterday, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovaReservaModal } from '@/components/pedidos/NovaReservaModal';

type Tab = 'prevenda' | 'posvenda';

const Pedidos = () => {
  const {
    clientes, produtos, pedidosPreVenda, registrosPosVenda,
    addPreVenda, updatePreVenda, addPosVenda, entregarPreVenda, entregarItem,
    deletePreVenda, deletePosVenda,
    getClienteNome, getProdutoNome,
  } = useStore();
  const isLoading = useStore((s) => s.isLoading);
  const { toast } = useToast();

  const location = useLocation();
  const [tab, setTab] = useState<Tab>(location.state?.tab || 'prevenda');
  const isMobile = useIsMobile();
  const [busca, setBusca] = useState('');
  const [showConcluidos, setShowConcluidos] = useState(false);

  // Auto-open modal when redirected from Dashboard
  useEffect(() => {
    if (location.state?.openModal === 'novaReserva') {
      setShowNovaReservaModal(true);
      // Clean up state to prevent re-opening on navigation
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Delete state
  const [deleteState, setDeleteState] = useState<{ id: string; type: 'prevenda' | 'posvenda'; nome: string } | null>(null);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteState) return;
    let success = false;

    if (deleteState.type === 'prevenda') success = await deletePreVenda(deleteState.id);
    else if (deleteState.type === 'posvenda') success = await deletePosVenda(deleteState.id);

    if (success) {
      toast({ title: "Item excluído com sucesso!" });
    } else {
      toast({ title: "Erro ao excluir item", variant: "destructive" });
    }
    setDeleteState(null);
  }, [deleteState, deletePreVenda, deletePosVenda, toast]);

  // Modal state
  const [showNovaReservaModal, setShowNovaReservaModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PedidoPreVenda | null>(null);

  const handleEditPreVenda = useCallback((pedido: PedidoPreVenda) => {
      setEditingOrder(pedido);
      setShowNovaReservaModal(true);
  }, []);

  const handleOpenNovaReserva = useCallback(() => {
      setEditingOrder(null);
      setShowNovaReservaModal(true);
  }, []);

  const [isSubmittingPos, setIsSubmittingPos] = useState(false);
  
  // Pós-venda form
  const [showPosForm, setShowPosForm] = useState(false);
  const [posCliente, setPosCliente] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [posValor, setPosValor] = useState('');
  const [openPosCliente, setOpenPosCliente] = useState(false); 

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  // ... (handlePosVenda remains same mostly, handled separately or skipped here)
  const handlePosVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseCurrency(posValor);
    if (!posCliente || isNaN(v) || v <= 0) return;
    
    setIsSubmittingPos(true);
    try {
      const success = await addPosVenda(posCliente, posDesc.trim(), 1, v);
      if (success) {
        toast({ title: "Venda registrada!", className: "bg-success text-white border-none" });
        setPosDesc('');
        setPosValor('');
        setPosCliente('');
        setShowPosForm(false);
      } else {
        toast({ title: "Erro ao registrar venda", variant: "destructive" });
      }
    } catch (error: unknown) {
      console.error('[Pedidos] Erro fatal (PosVenda):', error);
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro inesperado", description: msg, variant: "destructive" });
    } finally {
      setIsSubmittingPos(false);
    }
  };

  // Sort reservados: paid+not delivered first (alphabetically), then rest by date
  const reservados = useMemo(() => {
    const filtered = pedidosPreVenda.filter((p) => {
      const matchSearch = getClienteNome(p.cliente_id).toLowerCase().includes(busca.toLowerCase());
      const isConcluido = p.status === 'pago' || p.status === 'entregue' || p.status === 'cancelado';
      return matchSearch && (showConcluidos || !isConcluido);
    });
    return [...filtered].sort((a, b) => {
      const aPaidNotDelivered = a.status === 'pago' && !a.data_entrega;
      const bPaidNotDelivered = b.status === 'pago' && !b.data_entrega;
      if (aPaidNotDelivered && !bPaidNotDelivered) return -1;
      if (!aPaidNotDelivered && bPaidNotDelivered) return 1;
      if (aPaidNotDelivered && bPaidNotDelivered) {
        return getClienteNome(a.cliente_id).localeCompare(getClienteNome(b.cliente_id));
      }
      return 0;
    });
  }, [pedidosPreVenda, busca, getClienteNome, showConcluidos]);

  // Collapsible state for date groups
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  
  const toggleDay = (date: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  
  // Group by date
  const groupedReservados = useMemo(() => {
     const groups: Record<string, PedidoPreVenda[]> = {};
     
     reservados.forEach(p => {
         // Use scheduledDate if available, otherwise 'sem_data' or maybe data_pedido?
         // If status is 'agendado', it SHOULD have a date.
         // If it's 'pendente', it might be timeless queue.
         const dateKey = p.scheduledDate || 'sem_data';
         if (!groups[dateKey]) groups[dateKey] = [];
         groups[dateKey].push(p);
     });
     
     // Sort keys: 'sem_data' last? Dates chronological.
     const keys = Object.keys(groups).sort((a, b) => {
         if (a === 'sem_data') return 1;
         if (b === 'sem_data') return -1;
         return a.localeCompare(b);
     });
     
     return keys.map(key => ({
         date: key,
         orders: groups[key]
     }));
  }, [reservados]);

  const formatDateHeader = (dateStr: string) => {
      if (dateStr === 'sem_data') return '📅 Sem Agendamento / Fila';
      try {
          const date = parseISO(dateStr);
          if (!isValid(date)) return 'Data Inválida';
          
          let prefix = '';
          if (isToday(date)) prefix = 'Hoje, ';
          else if (isTomorrow(date)) prefix = 'Amanhã, ';
          else if (isYesterday(date)) prefix = 'Ontem, ';
          
          return `${prefix}${format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}`;
      } catch (e) {
          return dateStr;
      }
  };

  const posVendaList = useMemo(() => {
    return registrosPosVenda.filter((r) => {
      const matchSearch = getClienteNome(r.cliente_id).toLowerCase().includes(busca.toLowerCase());
      const isConcluido = r.status === 'pago';
      return matchSearch && (showConcluidos || !isConcluido);
    });
  }, [registrosPosVenda, busca, getClienteNome, showConcluidos]);

  // Check 10+ days overdue
  const isOverdue = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / 86400000) > 10;
  };

  // ========== RESUMO DO DIA ==========
  const [showDaySummary, setShowDaySummary] = useState(true);

  const todaySummary = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = pedidosPreVenda.filter(p => {
      if (p.status === 'cancelado') return false;
      return p.scheduledDate === todayStr;
    });

    const productMap = new Map<string, { total: number; delivered: number }>();

    todayOrders.forEach(p => {
      let items = p.itens || [];
      if (items.length === 0 && p.produto_id) {
        items = [{
          id: 'legacy',
          produto_id: p.produto_id,
          produto_nome: getProdutoNome(p.produto_id),
          quantidade: p.quantidade || 1,
          preco_unitario: p.valor_unitario || 0,
          subtotal: p.valor_total,
          paidAt: null,
          deliveredAt: p.data_entrega || null,
        }];
      }

      items.forEach(item => {
        const key = item.produto_nome;
        const existing = productMap.get(key) || { total: 0, delivered: 0 };
        existing.total += item.quantidade;
        if (item.deliveredAt) existing.delivered += item.quantidade;
        productMap.set(key, existing);
      });
    });

    return Array.from(productMap.entries())
      .map(([name, data]) => ({ name, ...data, pending: data.total - data.delivered }))
      .sort((a, b) => b.pending - a.pending);
  }, [pedidosPreVenda, getProdutoNome]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prevenda', label: '🔖 Reservados' },
    { key: 'posvenda', label: '🛒 Pronta Entrega' },
  ];

  return (
    <div className="page-container pb-24 md:pb-6 !pt-0 !px-0">
      {/* === HERO ZONE === */}
      <div className="relative bg-gradient-to-br from-[#1e1b5e] via-[#2d2a8a] to-[#4338ca] px-5 pt-8 pb-6 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-16 -left-6 w-28 h-28 rounded-full bg-white/5" />

        <h1 className="relative text-2xl font-bold text-white mb-4">Vendas</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            className="w-full backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* Tabs — Glassmorphism */}
        <div className="relative flex gap-1.5 backdrop-blur-xl bg-white/10 rounded-xl p-1 border border-white/15">
          <button
            onClick={() => setTab('prevenda')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'prevenda'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <span className="text-sm">📌</span> Reservados
          </button>
          <button
            onClick={() => setTab('posvenda')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'posvenda'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" /> Pronta Entrega
          </button>
        </div>
      </div>

      {/* === CONTENT ZONE === */}
      <div className="px-5 pt-5 space-y-5">

        {/* CONTEÚDO - RESERVADOS */}
        {tab === 'prevenda' && (
          <div className="space-y-5">
            {/* Toggle: Ver Concluídos */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowConcluidos(!showConcluidos)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                  showConcluidos
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-secondary/50 text-muted-foreground border-border/40 hover:text-foreground"
                )}
                aria-label={showConcluidos ? "Ocultar pedidos concluídos" : "Mostrar pedidos concluídos"}
              >
                {showConcluidos ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showConcluidos ? 'Ocultar Concluídos' : 'Ver Concluídos'}
              </button>
            </div>

            {/* === PAINEL RESERVADOS DO DIA === */}
            {todaySummary.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
                <button
                  onClick={() => setShowDaySummary(!showDaySummary)}
                  className="w-full bg-gradient-to-r from-[#1e1b5e] to-[#4338ca] p-4 flex items-center justify-between"
                  aria-expanded={showDaySummary}
                  aria-label="Resumo dos reservados do dia"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-white/15 rounded-lg p-1.5">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-bold text-white">Produção do Dia</span>
                    <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                      {todaySummary.reduce((s, p) => s + p.pending, 0)} pendentes
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white/60 transition-transform duration-200 ${showDaySummary ? 'rotate-180' : ''}`} />
                </button>

                {showDaySummary && (
                  <div className="p-3 space-y-2 bg-gray-50/50">
                    {todaySummary.map(product => {
                      const pct = product.total > 0 ? Math.round((product.delivered / product.total) * 100) : 0;
                      const allDone = product.pending === 0;

                      return (
                        <div key={product.name} className={`p-3 rounded-xl border shadow-sm ${allDone ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-border/60'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className={`text-sm font-semibold ${allDone ? 'text-emerald-700 line-through' : 'text-foreground'}`}>
                              {product.name}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                {product.delivered}/{product.total}
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {!allDone && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Faltam <span className="font-bold text-indigo-600">{product.pending}</span> un.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Nova Reserva Modal */}
            <NovaReservaModal 
              open={showNovaReservaModal} 
              onOpenChange={setShowNovaReservaModal}
              editId={editingOrder?.id}
              initialData={editingOrder}
              onSuccess={() => {
                  setShowNovaReservaModal(false);
                  setEditingOrder(null);
              }}
            />

            {/* LISTA DE RESERVAS */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-border/40 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : reservados.length > 0 ? (
              <div className="space-y-6">
                {groupedReservados.map((group) => (
                  <div key={group.date}>
                    {/* Date Header */}
                    <button 
                      className="w-full flex items-center justify-between mb-3 px-1"
                      onClick={() => toggleDay(group.date)}
                      aria-expanded={!collapsedDays.has(group.date)}
                      aria-label={`Grupo de pedidos: ${formatDateHeader(group.date)}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-indigo-600">📅</span>
                        <h3 className="text-sm font-bold text-foreground capitalize">
                          {formatDateHeader(group.date)}
                        </h3>
                        <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                          {group.orders.length}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {collapsedDays.has(group.date) ? '▸' : '▾'}
                      </span>
                    </button>

                    {!collapsedDays.has(group.date) && (
                    <div className="space-y-4">
                      {group.orders.map((p) => {
                        const isPaidNotDelivered = p.status === 'pago' && !p.data_entrega;
                        const canBeDelivered = !p.data_entrega;
                        const overdue = p.status === 'pendente' && isOverdue(p.data_pedido);
                        
                        let displayItems = p.itens || [];
                        if (displayItems.length === 0 && p.produto_id) {
                            displayItems = [{
                                id: 'legacy',
                                produto_id: p.produto_id,
                                produto_nome: getProdutoNome(p.produto_id),
                                quantidade: p.quantidade || 1,
                                preco_unitario: p.valor_unitario || 0,
                                subtotal: p.valor_total,
                                paidAt: null,
                                deliveredAt: null
                            }];
                        }

                        const headerGradient = isPaidNotDelivered
                          ? 'from-orange-500 to-amber-500'
                          : overdue
                            ? 'from-red-600 to-red-500'
                            : p.status === 'pago'
                              ? 'from-emerald-600 to-emerald-500'
                              : 'from-[#1e1b5e] to-[#4338ca]';

                        return (
                        <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
                          {/* Client Header — colored by status */}
                          <div className={`bg-gradient-to-r ${headerGradient} p-4 text-white relative`}>
                            {isPaidNotDelivered && (
                              <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                PAGO / NÃO ENTREGUE
                              </span>
                            )}
                            {overdue && !isPaidNotDelivered && (
                              <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                                ⚠️ +10 dias
                              </span>
                            )}

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="bg-white/15 rounded-full p-2 flex-shrink-0">
                                  <span className="text-lg">👤</span>
                                </div>
                                <p className="font-bold text-base truncate">{getClienteNome(p.cliente_id)}</p>
                              </div>
                              <p className="text-lg font-bold flex-shrink-0">{fmt(p.valor_total)}</p>
                            </div>
                          </div>

                          {/* Items list */}
                          <div className="p-3 space-y-2 bg-gray-50/50">
                            {displayItems.map((item, idx) => {
                              const itemPaid = !!item.paidAt;
                              const itemDelivered = !!item.deliveredAt;

                              return (
                                <div key={idx} className="bg-white border border-border/60 rounded-xl p-3 shadow-sm space-y-2">
                                  {/* Row 1: Product info */}
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-sm break-words flex-1">{item.produto_nome}</p>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className="text-xs font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-md">
                                        {item.quantidade}x
                                      </span>
                                      {itemPaid ? (
                                        <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                                          Pago
                                        </span>
                                      ) : (
                                        <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-900 rounded">
                                          A Pagar
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Row 2: Deliver action */}
                                  {!itemDelivered && (
                                    <button 
                                      onClick={() => entregarItem(p.id, item.id)}
                                      className="w-full text-xs font-semibold py-2.5 min-h-[44px] rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                      aria-label={`Entregar ${item.produto_nome}`}
                                    >
                                      <CheckCircle className="h-4 w-4" /> Entregar
                                    </button>
                                  )}
                                  {itemDelivered && (
                                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                                      <CheckCircle className="h-3 w-3" /> Entregue
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Entregar Todos */}
                          {canBeDelivered && (
                            <div className="px-3 pb-3">
                              <button 
                                onClick={() => entregarPreVenda(p.id)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                              >
                                <Truck className="h-4 w-4" /> Entregar Todos
                              </button>
                            </div>
                          )}

                          {/* Footer Info & Actions */}
                          <div className="px-3 py-3 bg-gray-50 border-t border-border/30 space-y-3">
                            {/* Status & Date */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                p.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : 
                                p.status === 'entregue' ? 'bg-indigo-50 text-indigo-700' : 
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {p.status === 'pago' ? <CheckCircle className="h-3 w-3" /> : <span className="text-xs">⏳</span>}
                                {p.status === 'pago' ? 'Concluído' : p.status === 'entregue' ? 'Entregue' : 'Pendente'}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                <span className="text-xs flex-shrink-0">📅</span>
                                <span className="truncate">{p.scheduledDate ? formatDateHeader(p.scheduledDate) : p.data_pedido}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              {p.status !== 'pago' && (
                                <button 
                                  onClick={() => handleEditPreVenda(p)} 
                                  className="flex-1 text-sm font-medium text-blue-600 flex items-center justify-center gap-1.5 transition-colors min-h-[44px] px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 active:scale-[0.98]"
                                  aria-label={`Editar reserva de ${getClienteNome(p.cliente_id)}`}
                                >
                                  <Pencil className="h-4 w-4" /> Editar
                                </button>
                              )}
                              <button 
                                onClick={() => setDeleteState({ id: p.id, type: 'prevenda', nome: 'Reserva' })} 
                                className={`${p.status !== 'pago' ? 'flex-1' : 'w-full'} text-sm font-medium text-red-600 transition-colors min-h-[44px] px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 active:scale-[0.98] flex items-center justify-center gap-1.5`}
                                aria-label={`Excluir reserva de ${getClienteNome(p.cliente_id)}`}
                              >
                                <Trash2 className="h-4 w-4" /> Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ShoppingCart}
                title={busca ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva'}
                description={busca ? 'Tente buscar por outro cliente.' : 'Crie uma nova reserva para começar.'}
              />
            )}
          </div>
        )}

        {/* PRONTA ENTREGA */}
        {tab === 'posvenda' && (
          <div className="space-y-5">
            {showPosForm && (
              <form onSubmit={handlePosVenda} className="bg-white rounded-2xl p-5 shadow-sm border border-border/50 space-y-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" /> Nova Venda Direta
                </h2>
                {clientes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">⚠️ Cadastre clientes primeiro</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold">Cliente</label>
                      <ClienteCombobox value={posCliente} onChange={setPosCliente} />
                    </div>
                    <input className="input-lg" placeholder="Descrição (Ex: Bolo de Pote)" value={posDesc} onChange={(e) => setPosDesc(e.target.value)} maxLength={200} />
                    <input className="input-lg" placeholder="Valor (R$) *" value={posValor} onChange={(e) => setPosValor(formatCurrency(e.target.value))} required inputMode="decimal" />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowPosForm(false)} className="btn-secondary flex-1" disabled={isSubmittingPos}>Cancelar</button>
                      <button type="submit" className="btn-primary flex-1" disabled={isSubmittingPos}>
                        {isSubmittingPos ? <span className="animate-spin mr-2">⏳</span> : null}
                        {isSubmittingPos ? 'Salvando...' : 'Registrar Venda'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {posVendaList.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title={busca ? 'Nenhuma venda encontrada' : 'Nenhuma venda pronta entrega'}
                description="Registre vendas diretas (sem reserva) aqui."
                actionLabel={!busca ? "Registrar Venda" : undefined}
                onAction={!busca ? () => setShowPosForm(true) : undefined}
              />
            ) : (
              <div className="space-y-4">
                {posVendaList.map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50">
                    {/* Header — Emerald for completed, Indigo for pending */}
                    <div className={`bg-gradient-to-r ${r.status === 'pago' ? 'from-emerald-600 to-emerald-500' : 'from-[#1e1b5e] to-[#4338ca]'} p-4 text-white`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-base truncate">{r.descricao}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs text-white/60">👤</span>
                            <p className="text-xs text-white/70">{getClienteNome(r.cliente_id)}</p>
                          </div>
                        </div>
                        <p className="text-lg font-bold flex-shrink-0">{fmt(r.valor_total)}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 bg-gray-50 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                          r.status === 'pago' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {r.status === 'pago' ? <CheckCircle className="h-3 w-3" /> : <span className="text-xs">⏳</span>}
                          {r.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">📅 {r.data_registro}</span>
                      </div>
                      <button 
                        onClick={() => setDeleteState({ id: r.id, type: 'posvenda', nome: 'Venda ' + r.descricao })} 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2.5 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Excluir"
                        aria-label={`Excluir ${r.descricao}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={tab === 'prevenda' ? handleOpenNovaReserva : () => setShowPosForm(!showPosForm)}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 rounded-full w-14 h-14 flex items-center justify-center transition-all active:scale-95"
        aria-label={tab === 'prevenda' ? 'Criar nova reserva' : 'Nova pronta entrega'}
      >
        <Plus className="h-6 w-6" />
      </button>

      <AlertDialog open={!!deleteState} onOpenChange={() => setDeleteState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{deleteState?.nome}</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Pedidos;
