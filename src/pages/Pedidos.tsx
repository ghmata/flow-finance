import { useState } from 'react';
import { useStore } from '@/store/useStore';

type Tab = 'prevenda' | 'posvenda' | 'historico' | 'produtos';

const Pedidos = () => {
  const {
    clientes, produtos, pedidosPreVenda, registrosPosVenda,
    addPreVenda, addPosVenda, entregarPreVenda, addProduto, deleteProduto,
    getClienteNome, getProdutoNome,
  } = useStore();

  const [tab, setTab] = useState<Tab>('prevenda');

  // Pré-venda form
  const [pvCliente, setPvCliente] = useState('');
  const [pvProduto, setPvProduto] = useState('');
  const [pvQtd, setPvQtd] = useState(1);

  // Pós-venda form
  const [posCliente, setPosCliente] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [posQtd, setPosQtd] = useState(1);
  const [posValor, setPosValor] = useState('');

  // Produto form
  const [showProdForm, setShowProdForm] = useState(false);
  const [prodNome, setProdNome] = useState('');
  const [prodPreco, setProdPreco] = useState('');

  const selectedProd = produtos.find((p) => p.id === pvProduto);
  const valorTotalPV = selectedProd ? pvQtd * selectedProd.preco_unitario : 0;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const handlePreVenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pvCliente || !pvProduto || pvQtd < 1) return;
    addPreVenda(pvCliente, pvProduto, pvQtd);
    setPvQtd(1);
  };

  const handlePosVenda = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(posValor.replace(',', '.'));
    if (!posCliente || !posDesc.trim() || isNaN(v) || v <= 0) return;
    addPosVenda(posCliente, posDesc.trim(), posQtd, v);
    setPosDesc('');
    setPosValor('');
    setPosQtd(1);
  };

  const handleAddProduto = (e: React.FormEvent) => {
    e.preventDefault();
    const preco = parseFloat(prodPreco.replace(',', '.'));
    if (!prodNome.trim() || isNaN(preco) || preco <= 0) return;
    addProduto(prodNome.trim(), preco);
    setProdNome('');
    setProdPreco('');
    setShowProdForm(false);
  };

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'prevenda', label: 'Pré-venda', emoji: '📦' },
    { key: 'posvenda', label: 'Pós-venda', emoji: '🛒' },
    { key: 'historico', label: 'Histórico', emoji: '📋' },
    { key: 'produtos', label: 'Produtos', emoji: '🍰' },
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">📦 Pedidos</h1>

      <div className="flex gap-1 mb-5 bg-muted rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {tab === 'prevenda' && (
        <form onSubmit={handlePreVenda} className="card-elevated p-5 space-y-4">
          <h2 className="font-bold text-lg">📦 Nova Pré-venda</h2>
          {clientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">⚠️ Cadastre clientes primeiro</p>
          ) : (
            <>
              <select className="input-lg" value={pvCliente} onChange={(e) => setPvCliente(e.target.value)} required>
                <option value="">Selecione o cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>

              {produtos.filter((p) => p.ativo).length === 0 ? (
                <p className="text-muted-foreground text-center py-2">⚠️ Cadastre produtos primeiro</p>
              ) : (
                <>
                  <select className="input-lg" value={pvProduto} onChange={(e) => setPvProduto(e.target.value)} required>
                    <option value="">Selecione o produto...</option>
                    {produtos.filter((p) => p.ativo).map((p) => (
                      <option key={p.id} value={p.id}>{p.nome_sabor} - {fmt(p.preco_unitario)}</option>
                    ))}
                  </select>

                  <div>
                    <label className="text-sm font-semibold mb-1 block">Quantidade</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setPvQtd(Math.max(1, pvQtd - 1))} className="btn-secondary py-3 px-5 text-xl">−</button>
                      <span className="text-2xl font-bold min-w-[3rem] text-center">{pvQtd}</span>
                      <button type="button" onClick={() => setPvQtd(pvQtd + 1)} className="btn-secondary py-3 px-5 text-xl">+</button>
                    </div>
                  </div>

                  {selectedProd && (
                    <div className="bg-accent rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-3xl font-bold text-primary">{fmt(valorTotalPV)}</p>
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full">Criar Pedido</button>
                </>
              )}
            </>
          )}
        </form>
      )}

      {tab === 'posvenda' && (
        <form onSubmit={handlePosVenda} className="card-elevated p-5 space-y-4">
          <h2 className="font-bold text-lg">🛒 Nova Pós-venda</h2>
          {clientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">⚠️ Cadastre clientes primeiro</p>
          ) : (
            <>
              <select className="input-lg" value={posCliente} onChange={(e) => setPosCliente(e.target.value)} required>
                <option value="">Selecione o cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <input className="input-lg" placeholder="Descrição *" value={posDesc} onChange={(e) => setPosDesc(e.target.value)} required maxLength={200} />
              <div>
                <label className="text-sm font-semibold mb-1 block">Quantidade</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setPosQtd(Math.max(1, posQtd - 1))} className="btn-secondary py-3 px-5 text-xl">−</button>
                  <span className="text-2xl font-bold min-w-[3rem] text-center">{posQtd}</span>
                  <button type="button" onClick={() => setPosQtd(posQtd + 1)} className="btn-secondary py-3 px-5 text-xl">+</button>
                </div>
              </div>
              <input className="input-lg" placeholder="Valor total (R$) *" value={posValor} onChange={(e) => setPosValor(e.target.value)} required inputMode="decimal" />
              <button type="submit" className="btn-primary w-full">Registrar Venda</button>
            </>
          )}
        </form>
      )}

      {tab === 'historico' && (
        <div className="space-y-3">
          {pedidosPreVenda.length === 0 && registrosPosVenda.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-muted-foreground">Nenhum pedido ainda</p>
            </div>
          ) : (
            <>
              {pedidosPreVenda.map((p) => (
                <div key={p.id} className="card-elevated p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{getProdutoNome(p.produto_id)}</p>
                      <p className="text-sm text-muted-foreground">👤 {getClienteNome(p.cliente_id)} • {p.quantidade}x</p>
                    </div>
                    <p className="font-bold text-primary">{fmt(p.valor_total)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      p.status === 'pendente' ? 'bg-warning/20 text-warning' :
                      p.status === 'entregue' ? 'bg-primary/20 text-primary' :
                      'bg-success/20 text-success'
                    }`}>
                      {p.status === 'pendente' ? '⏳ Pendente' : p.status === 'entregue' ? '📦 Entregue' : '✅ Pago'}
                    </span>
                    {p.status === 'pendente' && (
                      <button onClick={() => entregarPreVenda(p.id)} className="text-sm font-semibold text-primary bg-accent px-4 py-2 rounded-lg">
                        📦 Marcar Entregue
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {registrosPosVenda.map((r) => (
                <div key={r.id} className="card-elevated p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{r.descricao}</p>
                      <p className="text-sm text-muted-foreground">👤 {getClienteNome(r.cliente_id)} • {r.quantidade}x • 🛒 Pós-venda</p>
                    </div>
                    <p className="font-bold text-primary">{fmt(r.valor_total)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    r.status === 'aberto' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                  }`}>
                    {r.status === 'aberto' ? '⏳ Aberto' : '✅ Pago'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'produtos' && (
        <div>
          <button onClick={() => setShowProdForm(!showProdForm)} className="btn-primary w-full mb-4">
            + Novo Produto
          </button>

          {showProdForm && (
            <form onSubmit={handleAddProduto} className="card-elevated p-5 mb-4 animate-slide-up space-y-3">
              <input className="input-lg" placeholder="Nome / Sabor *" value={prodNome} onChange={(e) => setProdNome(e.target.value)} required maxLength={100} />
              <input className="input-lg" placeholder="Preço unitário (R$) *" value={prodPreco} onChange={(e) => setProdPreco(e.target.value)} required inputMode="decimal" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowProdForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Salvar</button>
              </div>
            </form>
          )}

          {produtos.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <p className="text-4xl mb-3">🍰</p>
              <p className="text-muted-foreground">Nenhum produto cadastrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {produtos.map((p) => (
                <div key={p.id} className="card-elevated p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold">{p.nome_sabor}</p>
                    <p className="text-success font-semibold">{fmt(p.preco_unitario)}</p>
                  </div>
                  <button onClick={() => deleteProduto(p.id)} className="text-destructive text-xl p-2">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Pedidos;
