import { useState, useMemo } from 'react';
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
import { Search, Eye, EyeOff, ShoppingCart, Plus, Trash2, CheckCircle, Package } from "lucide-react";
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
    addPreVenda, addPosVenda, entregarPreVenda,
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
      const success = await addPreVenda(pvCliente, validItens);
      if (success) {
        toast({ title: "Reserva criada!", className: "bg-success text-white border-none" });
        setPvItens([{ id: `init-${Date.now()}`, produto_id: '', produto_nome: '', quantidade: 1, preco_unitario: 0, subtotal: 0 }]);
        setPvCliente('');
        setShowPvForm(false);
      } else {
        toast({ title: "Erro ao criar reserva", variant: "destructive" });
      }
    } catch (error: unknown) {
      console.error('[Pedidos] Erro fatal (PreVenda):', error);
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast({ title: "Erro inesperado", description: msg, variant: "destructive" });
    } finally {
      setIsSubmittingPv(false);
    }
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
    <div className="page-container">
      <h1 className="page-title">🛒 Vendas</h1>

      <div className="flex gap-2 mb-4">
        <input
          className="input-lg flex-1"
          placeholder="🔍 Buscar por cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          onClick={() => setShowConcluidos(!showConcluidos)}
          className={`px-3 rounded-lg border text-2xl transition-colors ${
            showConcluidos ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input text-muted-foreground'
          }`}
          title={showConcluidos ? "Ocultar finalizados" : "Mostrar finalizados"}
        >
          {showConcluidos ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
        </button>
      </div>

      <div className="flex gap-1 mb-5 bg-muted rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>


      {/* RESERVADOS */}
      {tab === 'prevenda' && (
        <div>
          <button onClick={() => setShowPvForm(true)} className="btn-primary w-full mb-4">
            + Nova Reserva
          </button>

          
          {/* Nova Reserva Modal (Responsive) */}
          {(() => {
                        
            const FormContent = (
              <form onSubmit={handlePreVenda} className="space-y-4 px-4 sm:px-0">
                {clientes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">⚠️ Cadastre clientes primeiro</p>
                ) : (
                  <>
                    {/* Cliente */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold">Cliente</label>
                      <ClienteCombobox value={pvCliente} onChange={setPvCliente} />
                    </div>

                    {/* Itens */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <label className="text-sm font-semibold">Itens do Pedido</label>
                          <button type="button" onClick={handleAddItem} className="text-xs text-primary font-bold flex items-center gap-1">
                              <Plus className="h-3 w-3" /> Adicionar Produto
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

                    <div className="bg-accent rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-3xl font-bold text-primary">{fmt(valorTotalPV)}</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowPvForm(false)} className="btn-secondary flex-1 h-auto min-h-12 py-3" disabled={isSubmittingPv}>Cancelar</button>
                      <button type="submit" className="btn-primary flex-1 h-auto min-h-12 py-3 whitespace-normal leading-tight" disabled={isSubmittingPv}>
                        {isSubmittingPv ? <span className="animate-spin mr-2">⏳</span> : null}
                        {isSubmittingPv ? 'Salvando...' : 'Criar Reserva'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            );

            // Mobile-friendly Dialog (prevents nested drawer issues)
            return (
              <Dialog open={showPvForm} onOpenChange={setShowPvForm}>
                <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-6">
                  <DialogHeader>
                    <DialogTitle>📦 Nova Reserva</DialogTitle>
                    <DialogDescription>
                      Preencha os dados abaixo para criar uma nova reserva.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-1">
                    {FormContent}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })()}

          {reservados.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={busca ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva'}
              description={busca ? 'Tente buscar por outro cliente.' : 'Crie uma nova reserva para começar.'}
              actionLabel={!busca ? "Nova Reserva" : undefined}
              onAction={!busca ? () => setShowPvForm(true) : undefined}
            />
          ) : (
            <div className="space-y-2">
              {reservados.map((p) => {
                const isPaidNotDelivered = p.status === 'pago' && !p.data_entrega;
                const canBeDelivered = !p.data_entrega;
                
                // Determine items to display
                let displayItems = p.itens || [];
                // Fallback for non-migrated legacy data references (just in case)
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
                  <div key={p.id} className={`card-elevated p-4 ${isPaidNotDelivered ? 'border-2 border-destructive' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold mb-1">👤 {getClienteNome(p.cliente_id)}</p>
                        
                        {/* Items List */}
                        <div className="space-y-2 mb-2">
                            {displayItems.map((item, idx) => {
                                const itemPaid = !!item.paidAt;
                                const itemDelivered = !!item.deliveredAt;
                                
                                return (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-base bg-muted/30 p-2 rounded-lg">
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="font-bold text-primary">{item.quantidade}x</span>
                                      <span className={itemPaid && itemDelivered ? 'text-success' : 'text-foreground'}>{item.produto_nome}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="flex gap-1">
                                            {itemPaid ? (
                                                <span className="px-1.5 py-0.5 rounded bg-success/20 text-success font-semibold flex items-center gap-1" title={`Pago em ${item.paidAt}`}>
                                                    💵 Pago
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning font-semibold flex items-center gap-1">
                                                    ⏳ A Pagar
                                                </span>
                                            )}
                                            
                                            {itemDelivered ? (
                                                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold flex items-center gap-1" title={`Entregue em ${item.deliveredAt}`}>
                                                    🚚 Entregue
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-semibold flex items-center gap-1">
                                                    📦 Pendente
                                                </span>
                                            )}
                                        </div>
                                        
                                        {!itemDelivered && (
                                            <button 
                                                onClick={() => entregarPreVenda(p.id)} 
                                                className="bg-accent px-2 py-1 rounded hover:bg-accent/80 transition-colors ml-1"
                                                title="Marcar como entregue"
                                            >
                                                Entregar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            p.status === 'pago' ? 'bg-success/20 text-success' :
                            p.status === 'entregue' ? 'bg-primary/20 text-primary' :
                            'bg-warning/20 text-warning'
                          }`}>
                            {p.status === 'pago' ? '✅ Concluído' : p.status === 'entregue' ? '📦 Entregue' : '⏳ Pendente'}
                          </span>
                          <span className="text-xs text-muted-foreground">📅 {p.data_pedido}</span>
                          
                          {isOverdue(p.data_pedido) && p.status !== 'pago' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-destructive/20 text-destructive">
                              ⚠️ +10 dias
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="font-bold text-primary text-xl">{fmt(p.valor_total)}</p>
                        
                        {/* Receber Tudo Button */}
                        {p.status !== 'pago' && (
                            <button
                                onClick={() => {
                                    // Use new function to pay all items
                                    // Assuming 'Pix' as default or generic payment for button
                                    const { registrarPagamento } = useStore.getState();
                                    registrarPagamento('prevenda', p.id, 'Dinheiro/Pix');
                                    toast({ title: "Pagamento registrado!", className: "bg-success text-white" });
                                }}
                                className="text-xs bg-success hover:bg-success/90 text-success-foreground px-3 py-1.5 rounded-lg font-bold shadow-sm transition-transform active:scale-95"
                            >
                                💵 Receber Tudo
                            </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 border-t border-border pt-2 justify-end">
                       <button 
                            onClick={() => setDeleteState({ id: p.id, type: 'prevenda', nome: 'Reserva' })} 
                            className="text-sm font-semibold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </button>
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
        <div>
          <button onClick={() => setShowPosForm(!showPosForm)} className="btn-primary w-full mb-4">
            + Nova Pronta Entrega
          </button>

          {showPosForm && (
            <form onSubmit={handlePosVenda} className="card-elevated p-5 mb-4 animate-slide-up space-y-4">
              <h2 className="font-bold text-lg">🛒 Nova Pronta Entrega</h2>
              {clientes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">⚠️ Cadastre clientes primeiro</p>
              ) : (
                <>
                  {/* Searchable client dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold">Cliente</label>
                    <ClienteCombobox value={posCliente} onChange={setPosCliente} />
                  </div>
                  <input className="input-lg" placeholder="Descrição (opcional)" value={posDesc} onChange={(e) => setPosDesc(e.target.value)} maxLength={200} />
                  <input className="input-lg" placeholder="Valor (R$) *" value={posValor} onChange={(e) => setPosValor(formatCurrency(e.target.value))} required inputMode="decimal" />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowPosForm(false)} className="btn-secondary flex-1" disabled={isSubmittingPos}>Cancelar</button>
                    <button type="submit" className="btn-primary flex-1" disabled={isSubmittingPos}>
                      {isSubmittingPos ? <span className="animate-spin mr-2">⏳</span> : null}
                      {isSubmittingPos ? 'Salvando...' : 'Registrar'}
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
            <div className="space-y-2">
              {posVendaList.map((r) => (
                <div key={r.id} className="card-elevated p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-lg">{r.descricao}</p>
                      <p className="text-sm text-muted-foreground">👤 {getClienteNome(r.cliente_id)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          r.status === 'pago' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                          {r.status === 'pago' ? '✅ Pago' : '⏳ Pagamento pendente'}
                        </span>
                        <span className="text-xs text-muted-foreground">📅 {r.data_registro}</span>
                        <span className="text-xs text-muted-foreground">Qtd: {r.quantidade}</span>
                      </div>
                    </div>
                    <p className="font-bold text-primary text-lg">{fmt(r.valor_total)}</p>
                    <button onClick={() => setDeleteState({ id: r.id, type: 'posvenda', nome: 'Venda ' + r.descricao })} className="text-sm font-semibold text-destructive px-3 py-1.5 rounded-lg ml-2">
                        🗑️
                    </button>
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
