import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import PagamentoModal from '@/components/PagamentoModal';
import { EmptyState } from '@/components/ui/empty-state';
import { PartyPopper, PackageCheck, CheckCircle, ChevronDown, ChevronUp, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AbaReceber = 'areceber' | 'pagos';

const Devedores = () => {
  const { pedidosPreVenda, getDevedores, getClienteNome, getProdutoNome, registrarPagamentoReserva, registrarPagamentoEmLote } = useStore();
  const devedores = getDevedores();
  const totalGeral = devedores.reduce((acc, d) => acc + d.total, 0);

  const [aba, setAba] = useState<AbaReceber>('areceber');
  const [busca, setBusca] = useState('');

  // Payment Modal State
  const [pagModal, setPagModal] = useState<{
    tipo: 'prevenda' | 'posvenda';
    referenciaId: string;
    itemId: string; // Granular item ID
    clienteNome: string;
    valor: number;
    isBatch?: boolean; // New flag
    batchItemIds?: string[];
  } | null>(null);

  const [expandedClients, setExpandedClients] = useState<string[]>([]);
  const toggleClient = (id: string) => {
      setExpandedClients(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };
  
  // Helper to handle batch payment logic
  const processBatchPayment = (clienteId: string, formaPagamento: string, valorPago?: number) => {
      // Find the client data
      const dev = devedores.find(d => d.cliente.id === clienteId);
      if (!dev) return;

      const unpaidItems = dev.itens.filter((i: any) => !i.paidAt);
      
      // Calculate total debt for proportional distribution if valorPago is present
      const totalDebt = unpaidItems.reduce((acc: number, i: any) => acc + i.valor, 0);

      // Group by Order ID (referenciaId)
      const ordersMap = new Map<string, { itemIds: string[], total: number }>();
      unpaidItems.forEach((i: any) => {
          const refId = i.id; // Order ID
          if (!ordersMap.has(refId)) {
                ordersMap.set(refId, { itemIds: [], total: 0 });
          }
          const entry = ordersMap.get(refId)!;
          entry.itemIds.push(i.itemId);
          entry.total += i.valor;
      });
      
      const { registrarPagamentoEmLote } = useStore.getState();
      
      ordersMap.forEach(({ itemIds, total }, orderId) => {
          const tipo = unpaidItems.find((i: any) => i.id === orderId)?.tipo || 'prevenda';
          
          let orderPaymentValue: number | undefined = undefined;
          if (valorPago !== undefined && totalDebt > 0) {
              // Proportional payment: (OrderTotal / TotalDebt) * GlobalPayment
              orderPaymentValue = (total / totalDebt) * valorPago;
          }

          registrarPagamentoEmLote(tipo as any, orderId, itemIds, formaPagamento, orderPaymentValue);
      });
  };


  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;



  // Filter devedores
  const filteredDevedores = devedores.filter((d) =>
    d.cliente.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Group Pagos/Não Entregues by Client like Devedores
  const groupedPagosNE = useMemo(() => {
      const map = new Map<string, { cliente: any, itens: any[], total: number }>();
      
      // Filter PreVenda items that are paid but not delivered
      pedidosPreVenda.forEach(p => {
          // Logic: An item is "Paid/Not Delivered" if:
          // 1. The whole order is NOT 'entregue' (completed)
          // 2. The item has been paid OR the whole order is 'pago' (legacy)
          
          if (p.status === 'entregue') return; // If order is fully delivered/completed, skip.

          // Legacy check: if entire order is 'pago' 
          // Note: We used to check !p.data_entrega, but if data_entrega is used for scheduling, that's wrong.
          // We rely on status !== 'entregue'. 
          const isLegacyPaid = p.status === 'pago';
          
          const cliente = useStore.getState().clientes.find(c => c.id === p.cliente_id);
          if (!cliente) return;

          if (!map.has(p.cliente_id)) {
              map.set(p.cliente_id, { cliente, itens: [], total: 0 });
          }
          const entry = map.get(p.cliente_id)!;

          const itens = p.itens || [];
          
          if (itens.length === 0 && p.produto_id && isLegacyPaid) {
               // Legacy item
               entry.itens.push({
                   id: p.id,
                   itemId: p.id,
                   descricao: getProdutoNome(p.produto_id),
                   valor: p.valor_total,
                   data: p.data_pagamento || p.data_pedido,
                   quantidade: p.quantidade || 1
               });
               entry.total += p.valor_total;
          } else {
               // Granular items
               itens.forEach(item => {
                   // Item is paid AND NOT delivered
                   // Check if item specific delivery exists (not implemented yet, fallback to order delivery)
                   // If order has no data_entrega, we assume items are not delivered.
                   
                   // Logic: Show item if it has paidAt AND NOT deliveredAt
                   if (item.paidAt && !item.deliveredAt) {
                       entry.itens.push({
                           id: p.id,
                           itemId: item.id,
                           descricao: item.produto_nome,
                           valor: item.subtotal,
                           data: item.paidAt,
                           quantidade: item.quantidade
                       });
                       entry.total += item.subtotal;
                   } else if (isLegacyPaid && !item.deliveredAt) {
                        // Fallback: Order is marked paid, but items might not have paidAt if they are old?
                        // If order is 'pago', all items should be considered paid.
                       entry.itens.push({
                           id: p.id,
                           itemId: item.id,
                           descricao: item.produto_nome,
                           valor: item.subtotal,
                           data: p.data_pagamento || p.data_pedido,
                           quantidade: item.quantidade
                       });
                       entry.total += item.subtotal;
                   }
               });
          }
      });

      return Array.from(map.values())
        .filter(g => g.itens.length > 0)
        .sort((a, b) => a.cliente.nome.localeCompare(b.cliente.nome));

  }, [pedidosPreVenda, busca]); // Add dependencies

  const filteredPagosNE = groupedPagosNE.filter((g) =>
    g.cliente.nome.toLowerCase().includes(busca.toLowerCase())
  );
  

  const totalPagosNE = groupedPagosNE.reduce((acc, g) => acc + g.total, 0);

  const abas = [
    { key: 'areceber' as const, label: '💰 A Receber' },
    { key: 'pagos' as const, label: '✅ Pagos/Não Entregues' },
  ];

  const handleBatchPayment = (dev: any) => {
      // Find all unpaid items for this client from the current view
      // The devedores list (filteredDevedores) already contains only unpaid items usually?
      // getDevedores return items. If we want to verify, we check item.paidAt
      const unpaidItems = dev.itens.filter((i: any) => !i.paidAt);
      const itemIds = unpaidItems.map((i: any) => i.itemId || i.id);
      
      // We need to support batch payment across different orders/reservations?
      // Our store function `registrarPagamentoEmLote` takes `referencia_id` (parent ID).
      // If a client has multiple orders, we can't do it in ONE store call if the store ref expects a single parent.
      // Store: `registrarPagamentoEmLote(tipo, referencia_id, itens_ids, ...)`
      // This implies it only works for a single Reference (Order).
      
      // If the client has multiple orders, we need to call it multiple times or refactor store to handle multiple parents.
      // For now, let's implement "Receber Tudo" as: "Receber tudo DESTE Pedido" if we group by order.
      // BUT, the UI groups by CLIENT.
      
      // If we want to pay EVERYTHING for the client, we have to iterate their orders.
      // This might be complex for the modal which expects a single ref.
      
      // Compromise: The "Receber Pagamento" button on the card (Client) will just open a confirmation
      // and then we loop through orders.
      // Wait, `pagModal` is designed for a single payment logic in UI probably (based on existing component).
      
      // Let's customize `PagamentoModal` or generic confirmation?
      // Actually, let's look at `PagamentoModal`. It calls `registrarPagamento`.
      
      // Use existing modal reused for batch?
      // We'll pass a special `onConfirm` callback to it if we want custom logic.
      // But `PagamentoModal` is coupled to `useStore` inside it.
      // We need to refactor `PagamentoModal` or just call store directly after our own confirmation.
      
      // Let's stick to granular "Receber Item" for now as priority.
      // And for "Receber Tudo", maybe we iterate? 
      // Or we just don't offer "Receber Tudo" across multiple orders yet to avoid complexity?
      // The user PLAN said: "Receber tudo de um pedido".
      
      // Let's implement Granular Item Payment first.
  };

  return (
    <div className="page-container">
      <h1 className="page-title">💰 A Receber</h1>

      <input
        className="input-lg mb-4"
        placeholder="🔍 Buscar cliente..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="flex gap-1 mb-5 bg-muted rounded-xl p-1">
        {abas.map((a) => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              aba === a.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'areceber' && (
        <>
          <div className="gradient-warning rounded-2xl p-5 text-warning-foreground mb-5">
            <p className="text-sm opacity-90">Total a Receber</p>
            <p className="text-3xl font-bold">{fmt(totalGeral)}</p>
            <p className="text-sm opacity-80">{devedores.length} pessoa(s) devendo</p>
          </div>

          {filteredDevedores.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="Ninguém devendo!"
              description="Todos os pagamentos estão em dia."
            />
          ) : (
            <div className="space-y-4">
              {filteredDevedores.map((dev) => (
                <div key={dev.cliente.id} className="card-elevated overflow-hidden">
                  <div className="gradient-primary p-4 text-primary-foreground flex items-center justify-between cursor-pointer" onClick={() => toggleClient(dev.cliente.id)}>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-foreground/20 rounded-full p-2.5">
                        <span className="text-2xl">👤</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{dev.cliente.nome}</h3>
                        {dev.cliente.telefone && (
                          <p className="text-sm opacity-90">📱 {dev.cliente.telefone}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                       <div>
                          <p className="text-xs opacity-80">Deve</p>
                          <p className="text-2xl font-bold">{fmt(dev.total)}</p>
                       </div>
                       {expandedClients.includes(dev.cliente.id) ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>

                  {/* Items List - Always show or only when expanded? Let's show always for visibility vs interaction? 
                      User asked for grouping. Collapsed by default is cleaner.
                  */}
                  {expandedClients.includes(dev.cliente.id) && (
                  <div className="p-4 space-y-2 bg-muted/10">
                    {dev.itens.map((item) => (
                      <div key={`${item.id}-${item.itemId}`} className="flex items-center justify-between bg-white border border-border rounded-xl p-3 shadow-sm">
                        <div>
                          <p className="font-semibold">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            📅 há {item.dias} dia(s) • {item.tipo === 'prevenda' ? '📦 Reserva' : '🛒 Pronta Entrega'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-primary">{fmt(item.valor)}</p>
                          <button
                            onClick={() =>
                              setPagModal({
                                tipo: item.tipo,
                                referenciaId: item.id,
                                itemId: item.itemId || item.id,
                                clienteNome: dev.cliente.nome,
                                valor: item.valor,
                              })
                            }
                            className="text-xs font-semibold mt-1 bg-success/10 text-success px-2 py-1 rounded hover:bg-success/20 transition-colors"
                          >
                            💵 Pagar Item
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                  
                  {/* Footer Actions */}
                  <div className="px-4 py-3 bg-muted/30 border-t flex justify-end">
                      <button
                        onClick={() => toggleClient(dev.cliente.id)}
                        className="text-xs text-muted-foreground underline mr-auto"
                      >
                        {expandedClients.includes(dev.cliente.id) ? 'Ocultar itens' : `Ver ${dev.itens.length} itens`}
                      </button>
                      
                      {/* Batch Payment Button */}
                      <Button
                        onClick={() => {
                            setPagModal({
                                tipo: 'prevenda', // Dummy
                                referenciaId: dev.cliente.id, // We use this as client ID for batch
                                itemId: '', 
                                clienteNome: dev.cliente.nome,
                                valor: dev.total,
                                isBatch: true
                            });
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl shadow-sm transition-all ml-2 h-10"
                      >
                        <CircleDollarSign className="mr-2 h-4 w-4" />
                        Receber Tudo ({fmt(dev.total)})
                      </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {aba === 'pagos' && (
        <>
          <div className="bg-gradient-to-r from-primary to-primary/70 rounded-2xl p-5 text-primary-foreground mb-5">
            <p className="text-sm opacity-90">Valor Pago/Não Entregue</p>
            <p className="text-3xl font-bold">{fmt(totalPagosNE)}</p>
            <p className="text-sm opacity-80">{groupedPagosNE.length} cliente(s) aguardando entrega</p>
          </div>

          {filteredPagosNE.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="Nenhum pedido aguardando"
              description="Todos os pedidos pagos foram entregues."
            />
          ) : (
            <div className="space-y-4">
              {filteredPagosNE.map((group) => (
                <div key={group.cliente.id} className="card-elevated overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleClient(group.cliente.id)}>
                     <div className="flex items-center gap-3">
                       <div className="bg-primary/20 rounded-full p-2.5 text-primary">
                         <span className="text-2xl">👤</span>
                       </div>
                       <div>
                         <h3 className="text-xl font-bold text-foreground">{group.cliente.nome}</h3>
                         <p className="text-sm text-muted-foreground">{group.itens.length} item(s) pago(s)</p>
                       </div>
                     </div>
                     <div className="text-right flex items-center gap-2">
                        <div>
                           <p className="text-xs text-muted-foreground">Total Pago</p>
                           <p className="text-xl font-bold text-primary">{fmt(group.total)}</p>
                        </div>
                        {expandedClients.includes(group.cliente.id) ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                     </div>
                  </div>

                  {expandedClients.includes(group.cliente.id) && (
                  <div className="p-4 space-y-2 bg-muted/10">
                    {group.itens.map((item) => (
                      <div key={`${item.id}-${item.itemId}`} className="flex items-center justify-between bg-white border border-border rounded-xl p-3 shadow-sm">
                        <div>
                          <p className="font-semibold">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            📅 Pago em {new Date(item.data).toLocaleDateString('pt-BR')} • {item.quantidade}x
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="font-bold text-lg text-primary">{fmt(item.valor)}</p>
                          
                           {/* Action to Deliver Individual Item? Store supports entregarPreVenda (full) or granular? 
                               We have `entregarItem` in store but need to export it to component.
                               Let's use useStore() hook to get it.
                           */}
                           <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Call store action
                                    const { entregarItem, entregarPreVenda } = useStore.getState();
                                    // If item.itemId is same as item.id (legacy), call entregarPreVenda
                                    if (item.itemId === item.id) {
                                        entregarPreVenda(item.id);
                                    } else {
                                        entregarItem(item.id, item.itemId);
                                    }
                                }}
                            >
                                <CheckCircle className="h-3 w-3 mr-1" /> Entregar
                            </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {pagModal && (
        <PagamentoModal
          open
          onClose={() => setPagModal(null)}
          tipo={pagModal.tipo}
          referenciaId={pagModal.referenciaId}
          clienteNome={pagModal.clienteNome}
          valor={pagModal.valor}
          itemId={pagModal.itemId}
          onConfirm={pagModal.isBatch 
            ? (forma, valor) => processBatchPayment(pagModal.referenciaId, forma, valor) 
            : undefined
          }
        />
      )}
    </div>
  );
};


export default Devedores;
