import { useState } from 'react';
import { useStore } from '@/store/useStore';
import PagamentoModal from '@/components/PagamentoModal';
import { EmptyState } from '@/components/ui/empty-state';
import { PartyPopper, PackageCheck, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
    isBatch?: boolean;
    batchItemIds?: string[];
  } | null>(null);

  const [expandedClients, setExpandedClients] = useState<string[]>([]);
  const toggleClient = (id: string) => {
      setExpandedClients(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  // Pagos/Não Entregues: pre-vendas that are 'pago' but were never delivered (status went pendente->pago)
  const pagosNaoEntregues = pedidosPreVenda.filter(
    (p) => p.status === 'pago' && !p.data_entrega
  );

  const totalPagosNE = pagosNaoEntregues.reduce((a, p) => a + p.valor_total, 0);

  // Sort by paidAt date (oldest first) or by client name if dates are equal?
  // User usually wants to see oldest pending deliveries first.
  const pagosNESorted = [...pagosNaoEntregues].sort((a, b) => {
      // If we have items with paidAt, we should probably use that.
      // But `pagosNaoEntregues` are Orders (PreVenda). 
      // Their `data_pagamento` field should be set if status is 'pago'.
      const dateA = a.data_pagamento || a.data_pedido;
      const dateB = b.data_pagamento || b.data_pedido;
      return dateA.localeCompare(dateB);
  });

  // Filter devedores
  const filteredDevedores = devedores.filter((d) =>
    d.cliente.nome.toLowerCase().includes(busca.toLowerCase())
  );
  const filteredPagosNE = pagosNESorted.filter((p) =>
    getClienteNome(p.cliente_id).toLowerCase().includes(busca.toLowerCase())
  );

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
                      
                      {/* Batch payment button logic would go here if implemented properly */}
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
            <p className="text-sm opacity-80">{pagosNaoEntregues.length} pedido(s) aguardando entrega</p>
          </div>

          {filteredPagosNE.length === 0 ? (
            <EmptyState
              icon={PackageCheck}
              title="Nenhum pedido aguardando"
              description="Todos os pedidos pagos foram entregues."
            />
          ) : (
            <div className="space-y-2">
              {filteredPagosNE.map((p) => (
                <div key={p.id} className="card-elevated p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{getProdutoNome(p.produto_id || '')}</p> 
                    <p className="text-sm text-muted-foreground">👤 {getClienteNome(p.cliente_id)} • {p.quantidade || 0}x</p>
                    <div className="flex gap-1 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-success/20 text-success">
                        ✅ Pago
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-600">
                        📦 Não Entregue
                        </span>
                    </div>
                  </div>
                  <p className="font-bold text-primary text-lg">{fmt(p.valor_total)}</p>
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
          // Pass granular props check if PagamentoModal supports it?
          // We need to modify PagamentoModal to support granular payment logic
          // Or we pass a custom onConfirm?
          // Let's modify PagamentoModal next.
          itemId={pagModal.itemId}
        />
      )}
    </div>
  );
};


export default Devedores;
