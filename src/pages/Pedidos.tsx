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
import { Search, Eye, EyeOff, ShoppingCart, Plus, Trash2, CheckCircle, Package, Pencil, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, parseCurrency } from '@/utils/masks';
import { ClienteCombobox } from '@/components/pedidos/ClienteCombobox';
import { PedidoItemRow } from '@/components/pedidos/PedidoItemRow'; // We need this
import { PedidoItem } from '@/types'; // And this

type Tab = 'prevenda' | 'posvenda';

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

  // Pré-venda form
  const [showPvForm, setShowPvForm] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const novaReservaContentRef = useRef<HTMLDivElement>(null);
  
  // Blur focus when Dialog closes to prevent aria-hidden errors
  useEffect(() => {
      if (!showPvForm) {
          // Fecha Combobox primeiro
          setComboboxOpen(false);

          const timer = setTimeout(() => {
              const activeElement = document.activeElement as HTMLElement;
              // Check if focus is still inside the dialog content (or what was the dialog content)
              if (novaReservaContentRef.current?.contains(activeElement)) {
                  activeElement.blur();
              }
          }, 50); // Small delay to allow closing animation to start
          return () => clearTimeout(timer);
      }
  }, [showPvForm]);
  const [pvCliente, setPvCliente] = useState('');
  // New state for items
  const [pvItens, setPvItens] = useState<PedidoItem[]>([
    { id: 'init-1', produto_id: '', produto_nome: '', quantidade: 1, preco_unitario: 0, subtotal: 0 }
  ]);
  
  // Pós-venda form
  const [showPosForm, setShowPosForm] = useState(false);
  const [posCliente, setPosCliente] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [posValor, setPosValor] = useState('');
  const [openPosCliente, setOpenPosCliente] = useState(false); 

  // Edit pre-venda (Need to update this later for items, or disable edit for now?)
  // For MVP of this feature, maybe disable deep edit or just allow deleting/recreating.
  // The implementation plan didn't specify full edit support, but let's keep the state for now.
  const [editPvId, setEditPvId] = useState<string | null>(null);
  const [editPvQtd, setEditPvQtd] = useState(1);

  const valorTotalPV = pvItens.reduce((acc, item) => acc + item.subtotal, 0);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const [isSubmittingPv, setIsSubmittingPv] = useState(false);
  const novaReservaTitleRef = useRef<HTMLHeadingElement>(null);

  const handleAddItem = () => {
    setPvItens([...pvItens, { id: `new-${Date.now()}`, produto_id: '', produto_nome: '', quantidade: 1, preco_unitario: 0, subtotal: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    if (pvItens.length <= 1) return;
    setPvItens(pvItens.filter(i => i.id !== id));
  };

  const handleUpdateItem = (updatedItem: PedidoItem) => {
    setPvItens(pvItens.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const handlePreVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItens = pvItens.filter(i => i.produto_id && i.quantidade > 0);
    
    if (!pvCliente) {
        toast({ title: "Selecione um cliente", variant: "destructive" });
        return;
    }
    if (validItens.length === 0) {
        toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
        return;
    }
    
    setIsSubmittingPv(true);
    try {
      let success = false;
      if (editPvId) {
          success = await updatePreVenda(editPvId, { cliente_id: pvCliente, itens: validItens });
      } else {
          success = await addPreVenda(pvCliente, validItens);
      }

      if (success) {
        toast({ title: editPvId ? "Reserva atualizada!" : "Reserva criada!", className: "bg-success text-white border-none" });
        resetPvForm();
        setShowPvForm(false);
      } else {
        toast({ title: "Erro ao salvar reserva", variant: "destructive" });
      }
    } catch (error: unknown) {
      console.error('[Pedidos] Erro fatal (PreVenda):', error);
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro inesperado", description: msg, variant: "destructive" });
    } finally {
      setIsSubmittingPv(false);
    }
  };

  const resetPvForm = () => {
      setPvItens([{ id: `init-${Date.now()}`, produto_id: '', produto_nome: '', quantidade: 1, preco_unitario: 0, subtotal: 0 }]);
      setPvCliente('');
      setEditPvId(null);
  };

  const handleEditPreVenda = (pedido: any) => {
      setPvCliente(pedido.cliente_id);
      // Ensure we have a valid list for editing, copying to avoid mutation issues
      const itens = pedido.itens && pedido.itens.length > 0 
          ? pedido.itens.map((i: any) => ({ ...i })) 
          : [{ id: `legacy-${Date.now()}`, produto_id: pedido.produto_id, produto_nome: getProdutoNome(pedido.produto_id), quantidade: pedido.quantidade || 1, preco_unitario: pedido.valor_unitario || 0, subtotal: pedido.valor_total }];
      
      setPvItens(itens);
      setEditPvId(pedido.id);
      setShowPvForm(true);
  };

  const closePvForm = () => {
      setComboboxOpen(false); // Ensure combobox closes
      setShowPvForm(false);
      // resetPvForm() is called when opening or explicitly resetting, 
      // but let's keep it here if that was the intent, or maybe we want to preserve state?
      // The original code called resetPvForm().
      resetPvForm();
  };

  const [isSubmittingPos, setIsSubmittingPos] = useState(false);

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
      const isConcluido = p.status === 'pago' && !!p.data_entrega;
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prevenda', label: '🔖 Reservados' },
    { key: 'posvenda', label: '🛒 Pronta Entrega' },
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
        <button
          onClick={() => setTab('prevenda')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === 'prevenda' 
              ? 'bg-white text-primary shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="text-lg">📌</span> Reservados
        </button>
        <button
          onClick={() => setTab('posvenda')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            tab === 'posvenda' 
              ? 'bg-white text-primary shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="h-4 w-4" /> Pronta Entrega
        </button>
      </div>


      {/* CONTEÚDO - RESERVADOS */}
      {tab === 'prevenda' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* New Reservation Button (Floating or Top) */}
          <button 
            onClick={() => { resetPvForm(); setShowPvForm(true); }} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md rounded-2xl py-4 font-bold transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" /> Nova Reserva
          </button>

          {/* Nova Reserva Dialog */}
          {(() => {
            const FormContent = (
              <form onSubmit={handlePreVenda} className="space-y-4">
                {/* Form content preserved */}
              </form>
            );
            // ... (Dialog implementation is handled separately in return, keeping the logic simplified here for readability of the diff)
            // Actually, the previous implementation had the Dialog inside the map or return. 
            // I will implement the Dialog *outside* this block or keep it where it was if it was cleaner.
            // The previous code had a IIFE for the Dialog. I will keep the Dialog logic but clean up the structure.
            return (
              <Dialog 
                open={showPvForm} 
                onOpenChange={(open) => {
                  if (!open) {
                    setComboboxOpen(false);
                    setTimeout(() => setShowPvForm(false), 0); 
                  } else {
                    setShowPvForm(true);
                  }
                }}
              >
                <DialogContent
                  ref={novaReservaContentRef}
                  className="!flex !flex-col !bg-background !p-0 !gap-0 w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] h-[85dvh] max-h-[85dvh] rounded-2xl sm:max-w-xl sm:h-[80vh] sm:rounded-2xl overflow-hidden shadow-xl"
                  style={{ display: 'flex', flexDirection: 'column', height: '85dvh', width: 'calc(100vw - 24px)', maxWidth: 'calc(100vw - 24px)', padding: 0, gap: 0 }}
                  onOpenAutoFocus={(event) => { event.preventDefault(); novaReservaTitleRef.current?.focus(); }}
                >
                  <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle ref={novaReservaTitleRef} tabIndex={-1} className="text-xl font-semibold">
                       {editPvId ? '✏️ Editar Reserva' : '📦 Nova Reserva'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                       {editPvId ? 'Altere os dados da reserva abaixo.' : 'Preencha os dados abaixo para criar uma reserva.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                        <form id="nova-reserva-form" onSubmit={handlePreVenda} className="space-y-4">
                            {clientes.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">⚠️ Cadastre clientes primeiro</p>
                            ) : (
                            <>
                                <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-semibold">Cliente</label>
                                <ClienteCombobox 
                                  value={pvCliente} 
                                  onChange={setPvCliente}
                                  open={comboboxOpen}
                                  onOpenChange={setComboboxOpen}
                                />
                                </div>

                                <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-semibold">Itens do Pedido</label>
                                    <button type="button" onClick={handleAddItem} className="text-xs text-primary font-bold flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
                                        <Plus className="h-3 w-3" /> Adicionar
                                    </button>
                                </div>
                                
                                {pvItens.map((item, index) => (
                                    <PedidoItemRow
                                        key={item.id}
                                        item={item}
                                        onUpdate={handleUpdateItem}
                                        onRemove={() => handleRemoveItem(item.id)}
                                        canRemove={pvItens.length > 1}
                                    />
                                ))}
                                </div>
                            </>
                            )}
                        </form>
                  </div>

                  <div className="p-4 border-t bg-background mt-auto sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="bg-accent/50 rounded-xl p-3 mb-3 flex justify-between items-center">
                            <span className="text-sm font-medium text-muted-foreground">Total a Pagar</span>
                            <span className="text-2xl font-bold text-primary">{fmt(valorTotalPV)}</span>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={closePvForm} className="btn-secondary flex-1 h-12 rounded-xl font-semibold text-base" disabled={isSubmittingPv}>
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                form="nova-reserva-form" 
                                className="btn-primary flex-1 h-12 rounded-xl font-bold text-base shadow-md active:scale-95 transition-all" 
                                disabled={isSubmittingPv}
                            >
                                {isSubmittingPv ? <span className="animate-spin mr-2">⏳</span> : null}
                                {isSubmittingPv ? 'Salvando...' : 'Confirmar'}
                            </button>
                        </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })()}

          {/* LISTA DE RESERVAS */}
          {reservados.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={busca ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva'}
              description={busca ? 'Tente buscar por outro cliente.' : 'Crie uma nova reserva para começar.'}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reservados.map((p) => {
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
                         subtotal: p.valor_total
                     }];
                }

                return (
                  <div key={p.id} className="bg-white rounded-3xl p-5 shadow-sm border border-border/40 hover:shadow-md transition-shadow relative overflow-hidden group">
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
                                 <span className="text-[10px]">📅</span> {p.data_pedido}
                             </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3">
                            {/* Checkbox-like Edit (Visual only based on request, or actual edit check?) 
                                The image shows a checkbox "Editar". It might mean "Select to edit" or just "Edit Mode".
                                Given functionality, buttons are safer. I'll use text buttons as per implementation plan.
                            */}
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
