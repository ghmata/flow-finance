import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useLocation } from 'react-router-dom';

type Tab = 'prevenda' | 'posvenda' | 'produtos';

const Pedidos = () => {
  const {
    clientes, produtos, pedidosPreVenda, registrosPosVenda,
    addPreVenda, addPosVenda, entregarPreVenda, addProduto, deleteProduto,
    deletePreVenda, deletePosVenda,
    getClienteNome, getProdutoNome,
  } = useStore();

  const location = useLocation();
  const [tab, setTab] = useState<Tab>(location.state?.tab || 'prevenda');
  const [busca, setBusca] = useState('');

  // Pré-venda form
  const [showPvForm, setShowPvForm] = useState(false);
  const [pvCliente, setPvCliente] = useState('');
  const [pvProduto, setPvProduto] = useState('');
  const [pvQtd, setPvQtd] = useState(1);

  // Pós-venda form
  const [showPosForm, setShowPosForm] = useState(false);
  const [posCliente, setPosCliente] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [posValor, setPosValor] = useState('');
  const [posClienteBusca, setPosClienteBusca] = useState('');
  const [showPosDropdown, setShowPosDropdown] = useState(false);

  // Produto form
  const [showProdForm, setShowProdForm] = useState(false);
  const [prodNome, setProdNome] = useState('');
  const [prodPreco, setProdPreco] = useState('');

  // Edit pre-venda
  const [editPvId, setEditPvId] = useState<string | null>(null);
  const [editPvQtd, setEditPvQtd] = useState(1);

  const selectedProd = produtos.find((p) => p.id === pvProduto);
  const valorTotalPV = selectedProd ? pvQtd * selectedProd.preco_unitario : 0;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const handlePreVenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pvCliente || !pvProduto || pvQtd < 1) return;
    addPreVenda(pvCliente, pvProduto, pvQtd);
    setPvQtd(1);
    setShowPvForm(false);
  };

  const handlePosVenda = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(posValor.replace(',', '.'));
    if (!posCliente || !posDesc.trim() || isNaN(v) || v <= 0) return;
    addPosVenda(posCliente, posDesc.trim(), 1, v);
    setPosDesc('');
    setPosValor('');
    setPosCliente('');
    setPosClienteBusca('');
    setShowPosForm(false);
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

  // Filter pos-venda client dropdown
  const filteredPosClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(posClienteBusca.toLowerCase())
  );

  // Sort reservados: paid+not delivered first (alphabetically), then rest by date
  const reservados = useMemo(() => {
    const filtered = pedidosPreVenda.filter((p) =>
      getClienteNome(p.cliente_id).toLowerCase().includes(busca.toLowerCase())
    );
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
  }, [pedidosPreVenda, busca, getClienteNome]);

  const posVendaList = useMemo(() => {
    return registrosPosVenda.filter((r) =>
      getClienteNome(r.cliente_id).toLowerCase().includes(busca.toLowerCase())
    );
  }, [registrosPosVenda, busca, getClienteNome]);

  // Check 10+ days overdue
  const isOverdue = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / 86400000) > 10;
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prevenda', label: '🔖 Reservados' },
    { key: 'posvenda', label: '🛒 Pronta Entrega' },
    { key: 'produtos', label: '🍰 Produtos' },
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">🛒 Vendas</h1>

      <input
        className="input-lg mb-4"
        placeholder="🔍 Buscar por cliente..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

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
          <button onClick={() => setShowPvForm(!showPvForm)} className="btn-primary w-full mb-4">
            + Nova Reserva
          </button>

          {showPvForm && (
            <form onSubmit={handlePreVenda} className="card-elevated p-5 mb-4 animate-slide-up space-y-4">
              <h2 className="font-bold text-lg">📦 Nova Reserva</h2>
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
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setShowPvForm(false)} className="btn-secondary flex-1">Cancelar</button>
                        <button type="submit" className="btn-primary flex-1">Criar Reserva</button>
                      </div>
                    </>
                  )}
                </>
              )}
            </form>
          )}

          {reservados.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-muted-foreground">Nenhuma reserva</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reservados.map((p) => {
                const isPaidNotDelivered = p.status === 'pago' && !p.data_entrega;
                const canBeDelivered = !p.data_entrega;
                return (
                  <div key={p.id} className={`card-elevated p-4 ${isPaidNotDelivered ? 'border-2 border-destructive' : ''}`}>
                    {editPvId === p.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setEditPvQtd(Math.max(1, editPvQtd - 1))} className="btn-secondary py-2 px-4 text-lg">−</button>
                          <span className="text-xl font-bold">{editPvQtd}</span>
                          <button type="button" onClick={() => setEditPvQtd(editPvQtd + 1)} className="btn-secondary py-2 px-4 text-lg">+</button>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditPvId(null)} className="btn-secondary flex-1 py-2 text-sm">Cancelar</button>
                          <button onClick={() => { /* would need updatePreVenda */ setEditPvId(null); }} className="btn-primary flex-1 py-2 text-sm">Salvar</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-lg">{getProdutoNome(p.produto_id)}</p>
                            <p className="text-sm text-muted-foreground">👤 {getClienteNome(p.cliente_id)}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                p.status === 'pago' ? 'bg-success/20 text-success' :
                                p.status === 'entregue' ? 'bg-primary/20 text-primary' :
                                'bg-warning/20 text-warning'
                              }`}>
                                {p.status === 'pago' ? '✅ Pago' : p.status === 'entregue' ? '📦 Entregue' : '⏳ Pendente'}
                              </span>
                              <span className="text-xs text-muted-foreground">📅 {p.data_pedido}</span>
                              <span className="text-xs text-muted-foreground">Qtd: {p.quantidade}</span>
                              {isPaidNotDelivered && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-destructive/20 text-destructive">
                                  🚨 Pedido já pago!
                                </span>
                              )}
                              {isOverdue(p.data_pedido) && p.status !== 'pago' && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-destructive/20 text-destructive">
                                  ⚠️ +10 dias
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="font-bold text-primary text-lg">{fmt(p.valor_total)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 border-t border-border pt-2">
                          {canBeDelivered && (
                            <button onClick={() => entregarPreVenda(p.id)} className="text-sm font-semibold text-primary bg-accent px-3 py-1.5 rounded-lg">
                              📦 Entregar
                            </button>
                          )}
                          <button onClick={() => { setEditPvId(p.id); setEditPvQtd(p.quantidade); }} className="text-sm font-semibold text-primary px-3 py-1.5 rounded-lg">
                            ✏️ Editar
                          </button>
                          <button onClick={() => deletePreVenda(p.id)} className="text-sm font-semibold text-destructive px-3 py-1.5 rounded-lg">
                            🗑️ Excluir
                          </button>
                        </div>
                      </>
                    )}
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
                  <div className="relative">
                    <input
                      className="input-lg"
                      placeholder="Buscar cliente..."
                      value={posClienteBusca}
                      onChange={(e) => { setPosClienteBusca(e.target.value); setShowPosDropdown(true); }}
                      onFocus={() => setShowPosDropdown(true)}
                    />
                    {showPosDropdown && filteredPosClientes.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto mt-1">
                        {filteredPosClientes.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setPosCliente(c.id);
                              setPosClienteBusca(c.nome);
                              setShowPosDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-accent text-base font-medium border-b border-border last:border-b-0"
                          >
                            {c.nome}
                          </button>
                        ))}
                      </div>
                    )}
                    {posCliente && <p className="text-xs text-success mt-1">✓ {clientes.find(c => c.id === posCliente)?.nome}</p>}
                  </div>
                  <input className="input-lg" placeholder="Descrição *" value={posDesc} onChange={(e) => setPosDesc(e.target.value)} required maxLength={200} />
                  <input className="input-lg" placeholder="Valor (R$) *" value={posValor} onChange={(e) => setPosValor(e.target.value)} required inputMode="decimal" />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowPosForm(false)} className="btn-secondary flex-1">Cancelar</button>
                    <button type="submit" className="btn-primary flex-1">Registrar</button>
                  </div>
                </>
              )}
            </form>
          )}

          {posVendaList.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-muted-foreground">Nenhuma venda pronta entrega</p>
            </div>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRODUTOS */}
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
