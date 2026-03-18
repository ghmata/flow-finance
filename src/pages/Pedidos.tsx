import { useState, useMemo, useRef, useEffect } from 'react';
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
import { Search, Eye, EyeOff, ShoppingCart, Plus, Trash2, CheckCircle, Package, Pencil, Truck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, parseCurrency } from '@/utils/masks';
import { ClienteCombobox } from '@/components/pedidos/ClienteCombobox';
import { PedidoItemRow } from '@/components/pedidos/PedidoItemRow'; // We need this
import { PedidoItem, PedidoPreVenda } from '@/types'; // And this
import { format, parseISO, isToday, isTomorrow, isYesterday, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovaReservaModal } from '@/components/pedidos/NovaReservaModal';

type Tab = 'prevenda' | 'posvenda' | 'resumo';

const Pedidos = () => {
  const {
    clientes, produtos, pedidosPreVenda, registrosPosVenda,
    addPreVenda, updatePreVenda, addPosVenda, entregarPreVenda, entregarItem,
    deletePreVenda, deletePosVenda,
    getClienteNome, getProdutoNome,
  } = useStore();
  const { toast } = useToast();

  const location = useLocation();
  const [tab, setTab] = useState<Tab>(location.state?.tab || 'prevenda');
  const isMobile = useIsMobile();
  const [busca, setBusca] = useState('');
  const [showConcluidos, setShowConcluidos] = useState(false);

  // Delete state
  const [deleteState, setDeleteState] = useState<{ id: string; type: 'prevenda' | 'posvenda'; nome: string } | null>(null);

  const handleConfirmDelete = async () => {
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
  };

  // Modal state
  const [showNovaReservaModal, setShowNovaReservaModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PedidoPreVenda | null>(null);

  const handleEditPreVenda = (pedido: PedidoPreVenda) => {
      setEditingOrder(pedido);
      setShowNovaReservaModal(true);
  };

  const handleOpenNovaReserva = () => {
      setEditingOrder(null);
      setShowNovaReservaModal(true);
  };

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
      const isConcluido = (p.status === 'pago' && !!p.data_entrega) || p.status === 'entregue';
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

  // Resumo de reservas ativas agrupadas por dia e produto
  const resumoPorDia = useMemo(() => {
    // Filtrar apenas pedidos ativos (não pagos, não cancelados, não entregues com data_entrega)
    const pedidosAtivos = pedidosPreVenda.filter(p => {
      const isConcluido = (p.status === 'pago' && !!p.data_entrega) || p.status === 'entregue' || p.status === 'cancelado';
      return !isConcluido;
    });

    // Agrupar por scheduledDate -> produto -> quantidade
    const dayMap = new Map<string, Map<string, { nome: string; quantidade: number }>>();

    pedidosAtivos.forEach(p => {
      const dateKey = p.scheduledDate || 'sem_data';
      if (!dayMap.has(dateKey)) dayMap.set(dateKey, new Map());
      const prodMap = dayMap.get(dateKey)!;

      const itens = p.itens || [];
      if (itens.length === 0 && p.produto_id) {
        // Legacy
        const nome = getProdutoNome(p.produto_id);
        const qty = p.quantidade || 1;
        if (!prodMap.has(p.produto_id)) prodMap.set(p.produto_id, { nome, quantidade: 0 });
        prodMap.get(p.produto_id)!.quantidade += qty;
      } else {
        itens.forEach(item => {
          // Subtrair itens já entregues
          if (item.deliveredAt) return;
          if (!prodMap.has(item.produto_id)) prodMap.set(item.produto_id, { nome: item.produto_nome, quantidade: 0 });
          prodMap.get(item.produto_id)!.quantidade += item.quantidade;
        });
      }
    });

    // Converter para array ordenada por data
    const keys = Array.from(dayMap.keys()).sort((a, b) => {
      if (a === 'sem_data') return 1;
      if (b === 'sem_data') return -1;
      return a.localeCompare(b);
    });

    return keys.map(key => {
      const prodMap = dayMap.get(key)!;
      const produtos = Array.from(prodMap.values())
        .filter(p => p.quantidade > 0)
        .sort((a, b) => b.quantidade - a.quantidade);
      const totalUnidades = produtos.reduce((acc, p) => acc + p.quantidade, 0);
      return { date: key, produtos, totalUnidades };
    }).filter(g => g.totalUnidades > 0);
  }, [pedidosPreVenda, getProdutoNome]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prevenda', label: '🔖 Reservados' },
    { key: 'posvenda', label: '🛒 Pronta Entrega' },
    { key: 'resumo', label: '📊 Resumo' },
  ];

  return (
    <div className="page-container pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vendas</h1>
        {/* Search Input - Compact */}
         <div className="relative w-40 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full bg-secondary/50 border-none rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
         </div>
      </div>

      {/* TABS - Segmented Control Style */}
      <div className="flex p-1 mb-6 bg-secondary/50 rounded-2xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>


      {/* CONTEÚDO - RESERVADOS */}
      {tab === 'prevenda' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* New Reservation Button (Floating or Top) */}
          <button 
            onClick={handleOpenNovaReserva} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-2xl py-4 font-bold transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" /> Nova Reserva
          </button>

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
          {reservados.length > 0 ? (
            <div className="space-y-8">
              {groupedReservados.map((group) => (
                <div key={group.date} className="card-elevated overflow-hidden bg-white shadow-sm rounded-xl border border-border/50">
                    <button 
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                        onClick={() => toggleDay(group.date)}
                    >
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-foreground/80 capitalize">
                                {formatDateHeader(group.date)}
                            </h3>
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {group.orders.length}
                            </span>
                        </div>
                        <span className="text-xl text-muted-foreground mr-2 transform transition-transform duration-200">
                             {collapsedDays.has(group.date) ? '▸' : '▾'}
                        </span>
                    </button>

                    {!collapsedDays.has(group.date) && (
                    <div className="p-4 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.orders.map((p) => {
                        const isPaidNotDelivered = p.status === 'pago' && !p.data_entrega;
                        const canBeDelivered = !p.data_entrega;
                        
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

                        return (
                        <div key={p.id} className={`bg-white rounded-3xl p-5 shadow-sm border hover:shadow-md transition-shadow relative overflow-hidden group ${
                            isPaidNotDelivered ? 'border-orange-400 ring-1 ring-orange-400 bg-orange-50/30' : 'border-border/40'
                        }`}>
                            {isPaidNotDelivered && (
                                <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
                                    PAGO / NÃO ENTREGUE
                                </div>
                            )}
                            {/* Header: Cliente e Valor */}
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <span className="text-xs font-bold">👤</span>
                                    </div>
                                    <p className="font-bold text-lg text-foreground/90">{getClienteNome(p.cliente_id)}</p>
                                </div>
                                <span className="text-xl font-bold text-primary tracking-tight">
                                    {fmt(p.valor_total)}
                                </span>
                            </div>

                            {/* Lista de Itens */}
                            <div className="space-y-2 mb-4 bg-muted/30 p-2 rounded-2xl">
                                {displayItems.map((item, idx) => {
                                    const itemPaid = !!item.paidAt;
                                    const itemDelivered = !!item.deliveredAt;

                                    return (
                                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-border/40 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <p className="font-medium text-sm truncate max-w-[120px]">{item.produto_nome}</p>
                                                <span className="text-xs font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-md flex-shrink-0">
                                                    {item.quantidade}x
                                                </span>
                                                {itemPaid ? (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-success/10 text-success rounded flex-shrink-0">
                                                        Pago
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded flex-shrink-0">
                                                        A Pagar
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {!itemDelivered && (
                                                <button 
                                                    onClick={() => entregarItem(p.id, item.id)}
                                                    className="ml-2 text-xs font-medium px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                                >
                                                    <CheckCircle className="h-3 w-3" /> Entregar
                                                </button>
                                            )}
                                            {itemDelivered && (
                                                <span className="ml-2 text-[10px] font-bold text-primary/70 flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" /> Ok
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Entregar Todos Button */}
                            {canBeDelivered && (
                                <button 
                                    onClick={() => entregarPreVenda(p.id)}
                                    className="w-full bg-success hover:bg-success/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-success/20 active:scale-[0.98] transition-all mb-4 flex items-center justify-center gap-2"
                                >
                                    Entregar Todos
                                </button>
                            )}

                            {/* Footer Info & Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                {/* Left: Status & Date */}
                                <div className="flex items-center gap-3">
                                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                        p.status === 'pago' ? 'bg-success/15 text-success' : 
                                        p.status === 'entregue' ? 'bg-primary/10 text-primary' : 
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {p.status === 'pago' ? <CheckCircle className="h-3 w-3" /> : <span className="text-xs">⏳</span>}
                                        {p.status === 'pago' ? 'Concluído' : p.status === 'entregue' ? 'Entregue' : 'Pendente'}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                        {/* Show scheduled date if exists, else created date */}
                                        <span className="text-[10px]">📅</span> {p.scheduledDate ? formatDateHeader(p.scheduledDate) : p.data_pedido}
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div className="flex items-center gap-3">
                                    {p.status !== 'pago' && (
                                        <button 
                                            onClick={() => handleEditPreVenda(p)} 
                                            className="text-sm font-medium text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors"
                                        >
                                            <Pencil className="h-3 w-3" /> Editar
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setDeleteState({ id: p.id, type: 'prevenda', nome: 'Reserva' })} 
                                        className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                    </div>
                    )} {/* End collapsed check */}
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button onClick={() => setShowPosForm(!showPosForm)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-2xl py-4 font-bold transition-all flex items-center justify-center gap-2">
            <Plus className="h-5 w-5" /> Nova Pronta Entrega
          </button>

          {showPosForm && (
            <form onSubmit={handlePosVenda} className="bg-white rounded-3xl p-6 shadow-sm border border-border/40 animate-slide-up space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Nova Venda Direta
              </h2>
              {clientes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">⚠️ Cadastre clientes primeiro</p>
              ) : (
                <>
                  {/* Searchable client dropdown */}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posVendaList.map((r) => (
                <div key={r.id} className="bg-white rounded-3xl p-5 shadow-sm border border-border/40 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-lg text-foreground/90 leading-tight">{r.descricao}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground mb-3">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px]">👤</div>
                          <p className="text-sm font-medium">{getClienteNome(r.cliente_id)}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                          r.status === 'pago' ? 'bg-success/15 text-success' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {r.status === 'pago' ? <CheckCircle className="h-3 w-3" /> : <span className="text-xs">⏳</span>}
                          {r.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            📅 {r.data_registro}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right flex flex-col items-end justify-between self-stretch">
                        <p className="font-bold text-primary text-xl tracking-tight">{fmt(r.valor_total)}</p>
                        
                        <button 
                            onClick={() => setDeleteState({ id: r.id, type: 'posvenda', nome: 'Venda ' + r.descricao })} 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded-xl transition-all"
                            title="Excluir"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA RESUMO DE RESERVAS */}
      {tab === 'resumo' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header com total geral */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-5 w-5 opacity-90" />
              <p className="text-sm opacity-90 font-medium">Resumo de Reservas Ativas</p>
            </div>
            <p className="text-3xl font-bold">
              {resumoPorDia.reduce((acc, g) => acc + g.totalUnidades, 0)} unidades
            </p>
            <p className="text-sm opacity-80 mt-1">
              em {resumoPorDia.length} dia(s) agendado(s)
            </p>
          </div>

          {resumoPorDia.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhuma reserva ativa"
              description="Quando houver reservas pendentes, o resumo aparecerá aqui agrupado por dia."
            />
          ) : (
            <div className="space-y-4">
              {resumoPorDia.map((group) => (
                <div key={group.date} className="bg-white rounded-2xl shadow-sm border border-border/40 overflow-hidden">
                  {/* Header do dia */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-foreground/90 capitalize">
                        📅 {formatDateHeader(group.date)}
                      </h3>
                      <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                        {group.totalUnidades} un.
                      </span>
                    </div>
                  </div>

                  {/* Lista de produtos */}
                  <div className="p-3 space-y-2">
                    {group.produtos.map((prod, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 border border-border/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
                            📦
                          </div>
                          <p className="font-semibold text-sm text-foreground/90">{prod.nome}</p>
                        </div>
                        <span className="text-lg font-bold text-indigo-600">×{prod.quantidade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
