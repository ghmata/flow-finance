import { useState } from 'react';
import { useStore } from '@/store/useStore';
import PagamentoModal from '@/components/PagamentoModal';

const Devedores = () => {
  const getDevedores = useStore((s) => s.getDevedores);
  const devedores = getDevedores();
  const totalGeral = devedores.reduce((acc, d) => acc + d.total, 0);

  const [pagModal, setPagModal] = useState<{
    tipo: 'prevenda' | 'posvenda';
    referenciaId: string;
    clienteNome: string;
    valor: number;
  } | null>(null);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <div className="page-container">
      <h1 className="page-title">💰 Devedores</h1>

      <div className="gradient-primary rounded-2xl p-5 text-primary-foreground mb-5">
        <p className="text-sm opacity-90">Total a receber</p>
        <p className="text-3xl font-bold">{fmt(totalGeral)}</p>
        <p className="text-sm opacity-80">{devedores.length} pessoa(s) devendo</p>
      </div>

      {devedores.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-lg font-semibold">Ninguém devendo!</p>
          <p className="text-muted-foreground">Quando houver entregas pendentes de pagamento, aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devedores.map((dev) => (
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
                        📅 há {item.dias} dia(s) • {item.tipo === 'prevenda' ? '📦 Pré-venda' : '🛒 Pós-venda'}
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
