import { useState } from 'react';
import { useStore } from '@/store/useStore';
import PagamentoModal from '@/components/PagamentoModal';

type AbaReceber = 'areceber' | 'pagos';

const Devedores = () => {
  const { pedidosPreVenda, getDevedores, getClienteNome, getProdutoNome } = useStore();
  const devedores = getDevedores();
  const totalGeral = devedores.reduce((acc, d) => acc + d.total, 0);

  const [aba, setAba] = useState<AbaReceber>('areceber');
  const [busca, setBusca] = useState('');

  const [pagModal, setPagModal] = useState<{
    tipo: 'prevenda' | 'posvenda';
    referenciaId: string;
    clienteNome: string;
    valor: number;
  } | null>(null);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  // Pagos/Não Entregues: pre-vendas that are 'pago' but were never delivered (status went pendente->pago)
  // Actually per user logic: pedidos that are paid but not yet delivered
  const pagosNaoEntregues = pedidosPreVenda.filter(
    (p) => p.status === 'pago' && !p.data_entrega
  );

  const totalPagosNE = pagosNaoEntregues.reduce((a, p) => a + p.valor_total, 0);

  // Sort alphabetically by client name
  const pagosNESorted = [...pagosNaoEntregues].sort((a, b) =>
    getClienteNome(a.cliente_id).localeCompare(getClienteNome(b.cliente_id))
  );

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
            <div className="card-elevated p-8 text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-lg font-semibold">Ninguém devendo!</p>
              <p className="text-muted-foreground">Todos os pagamentos estão em dia</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDevedores.map((dev) => (
                <div key={dev.cliente.id} className="card-elevated overflow-hidden">
                  <div className="gradient-primary p-4 text-primary-foreground flex items-center justify-between">
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
                    <div className="text-right">
                      <p className="text-xs opacity-80">Deve</p>
                      <p className="text-2xl font-bold">{fmt(dev.total)}</p>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    {dev.itens.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-muted rounded-xl p-3">
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
                                clienteNome: dev.cliente.nome,
                                valor: item.valor,
                              })
                            }
                            className="text-xs text-success font-semibold mt-1"
                          >
                            💵 Receber
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {dev.itens.length > 1 && (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() =>
                          setPagModal({
                            tipo: dev.itens[0].tipo,
                            referenciaId: dev.itens[0].id,
                            clienteNome: dev.cliente.nome,
                            valor: dev.itens[0].valor,
                          })
                        }
                        className="btn-success w-full text-base"
                      >
                        ✓ Receber Pagamento
                      </button>
                    </div>
                  )}
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
            <div className="card-elevated p-8 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-lg font-semibold">Nenhum pedido pago aguardando</p>
              <p className="text-muted-foreground">Todos os pedidos pagos foram entregues</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPagosNE.map((p) => (
                <div key={p.id} className="card-elevated p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{getProdutoNome(p.produto_id)}</p>
                    <p className="text-sm text-muted-foreground">👤 {getClienteNome(p.cliente_id)} • {p.quantidade}x</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-success/20 text-success">
                      ✅ Pago
                    </span>
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
          {...pagModal}
        />
      )}
    </div>
  );
};

export default Devedores;
