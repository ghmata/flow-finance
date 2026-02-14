import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type OrcTab = 'resumo' | 'receitas' | 'despesas';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#E11D48', '#6366F1', '#14B8A6'];

function getWeeksOfMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: { numero: number; inicio: Date; fim: Date; label: string }[] = [];
  let cur = new Date(first);
  let n = 1;
  while (cur <= last) {
    const end = new Date(cur);
    end.setDate(cur.getDate() + 6);
    const fim = end > last ? last : end;
    const fmtD = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    weeks.push({ numero: n, inicio: new Date(cur), fim, label: `Semana ${n} (${fmtD(cur)}-${fmtD(fim)})` });
    cur.setDate(cur.getDate() + 7);
    n++;
  }
  return weeks;
}

const Orcamento = () => {
  const { despesas, receitas, pagamentos, clientes, addDespesa, deleteDespesa, addReceitaManual } = useStore();
  const [tab, setTab] = useState<OrcTab>('resumo');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [showDespForm, setShowDespForm] = useState(false);
  const [dDesc, setDDesc] = useState('');
  const [dCat, setDCat] = useState('');
  const [dValor, setDValor] = useState('');
  const [dData, setDData] = useState(() => new Date().toISOString().slice(0, 10));
  const [dStatus, setDStatus] = useState<'pendente' | 'paga'>('pendente');

  const [showRecForm, setShowRecForm] = useState(false);
  const [rDesc, setRDesc] = useState('');
  const [rCat, setRCat] = useState('Venda de produtos');
  const [rValor, setRValor] = useState('');
  const [rData, setRData] = useState(() => new Date().toISOString().slice(0, 10));

  // Collapsible weeks
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set());
  const toggleWeek = (n: number) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  };

  const [year, month] = selectedDate.split('-').map(Number);
  const mesKey = selectedDate;
  const weeks = useMemo(() => getWeeksOfMonth(year, month - 1), [year, month]);

  const despMes = despesas.filter((d) => d.data_despesa.startsWith(mesKey));
  const recMes = receitas.filter((r) => r.data_receita.startsWith(mesKey));
  const totalDesp = despMes.reduce((a, d) => a + d.valor, 0);
  const totalRec = recMes.reduce((a, r) => a + r.valor, 0);
  const saldo = totalRec - totalDesp;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  const getEmojiCat = (cat: string) => CATEGORIAS_DESPESA.find((c) => c.nome === cat)?.emoji || '📌';

  const handleAddDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(dValor.replace(',', '.'));
    if (!dDesc.trim() || !dCat || isNaN(v) || v <= 0) return;
    addDespesa({ descricao: dDesc.trim(), categoria: dCat, valor: v, data_despesa: dData, status: dStatus });
    setDDesc(''); setDValor(''); setDCat(''); setShowDespForm(false);
  };

  const handleAddReceita = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(rValor.replace(',', '.'));
    if (!rDesc.trim() || isNaN(v) || v <= 0) return;
    addReceitaManual({ descricao: rDesc.trim(), categoria: rCat, valor: v, data_receita: rData });
    setRDesc(''); setRValor(''); setShowRecForm(false);
  };

  const barData = weeks.map((w) => {
    const inWeek = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= w.inicio && d <= w.fim;
    };
    return {
      semana: `S${w.numero}`,
      Receitas: recMes.filter((r) => inWeek(r.data_receita)).reduce((a, r) => a + r.valor, 0),
      Despesas: despMes.filter((d) => inWeek(d.data_despesa)).reduce((a, d) => a + d.valor, 0),
    };
  });

  const despPorCat = despMes.reduce<Record<string, number>>((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + d.valor;
    return acc;
  }, {});
  const pieData = Object.entries(despPorCat).map(([name, value]) => ({ name, value }));

  // Top 3 clients by total spent
  const topClientes = useMemo(() => {
    const clienteTotals = new Map<string, number>();
    pagamentos.forEach((p) => {
      clienteTotals.set(p.cliente_id, (clienteTotals.get(p.cliente_id) || 0) + p.valor_pago);
    });
    return Array.from(clienteTotals.entries())
      .map(([id, total]) => ({ nome: clientes.find((c) => c.id === id)?.nome || 'Desconhecido', total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [pagamentos, clientes]);

  const tabs: { key: OrcTab; label: string }[] = [
    { key: 'resumo', label: '📊 Resumo' },
    { key: 'receitas', label: '💰 Receitas' },
    { key: 'despesas', label: '💸 Despesas' },
  ];

  const mesLabel = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Orçamento</h1>

      {/* Month selector */}
      <div className="flex items-center justify-between mb-4 card-elevated p-3">
        <button onClick={prevMonth} className="text-2xl p-2 text-muted-foreground">‹</button>
        <p className="font-bold text-lg capitalize">{mesLabel}</p>
        <button onClick={nextMonth} className="text-2xl p-2 text-muted-foreground">›</button>
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

      {/* RESUMO */}
      {tab === 'resumo' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card-elevated p-3 text-center">
              <p className="text-xs text-muted-foreground">🔥 Receitas</p>
              <p className="font-bold text-success text-lg">{fmt(totalRec)}</p>
            </div>
            <div className="card-elevated p-3 text-center">
              <p className="text-xs text-muted-foreground">💎 Despesas</p>
              <p className="font-bold text-destructive text-lg">{fmt(totalDesp)}</p>
            </div>
            <div className="card-elevated p-3 text-center">
              <p className="text-xs text-muted-foreground">🏦 Saldo</p>
              <p className={`font-bold text-lg ${saldo >= 0 ? 'text-success' : 'text-warning'}`}>{fmt(saldo)}</p>
            </div>
          </div>

          {/* Weekly evolution chart */}
          {barData.some((b) => b.Receitas > 0 || b.Despesas > 0) && (
            <div className="card-elevated p-4">
              <h3 className="font-bold mb-3">📊 Evolução Semanal</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {pieData.length > 0 && (
            <div className="card-elevated p-4">
              <h3 className="font-bold mb-3">💸 Despesas por Categoria</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Collapsible weekly breakdown */}
          {weeks.map((w) => {
            const wDesp = despMes.filter((d) => { const dt = new Date(d.data_despesa); return dt >= w.inicio && dt <= w.fim; });
            const wRec = recMes.filter((r) => { const dt = new Date(r.data_receita); return dt >= w.inicio && dt <= w.fim; });
            const wTotalD = wDesp.reduce((a, d) => a + d.valor, 0);
            const wTotalR = wRec.reduce((a, r) => a + r.valor, 0);
            if (wTotalD === 0 && wTotalR === 0) return null;
            const collapsed = collapsedWeeks.has(w.numero);
            return (
              <div key={w.numero} className="card-elevated overflow-hidden">
                <button
                  onClick={() => toggleWeek(w.numero)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <h3 className="font-bold">{w.label}</h3>
                  <span className="text-xl text-muted-foreground">{collapsed ? '▸' : '▾'}</span>
                </button>
                {!collapsed && (
                  <div className="px-4 pb-4 space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">💰 Receitas</span><span className="font-bold text-success">+ {fmt(wTotalR)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">💸 Despesas</span><span className="font-bold text-destructive">- {fmt(wTotalD)}</span></div>
                    <hr className="border-border" />
                    <div className="flex justify-between">
                      <span className="font-semibold">Saldo</span>
                      <span className={`font-bold ${wTotalR - wTotalD >= 0 ? 'text-success' : 'text-warning'}`}>
                        {fmt(wTotalR - wTotalD)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Top 3 clients */}
          {topClientes.length > 0 && (
            <div className="card-elevated p-4">
              <h3 className="font-bold mb-3">🏆 Top Clientes</h3>
              <div className="space-y-2">
                {topClientes.map((c, i) => (
                  <div key={c.nome} className="flex items-center justify-between bg-muted rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <p className="font-semibold">{c.nome}</p>
                    </div>
                    <p className="font-bold text-primary">{fmt(c.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEITAS */}
      {tab === 'receitas' && (
        <div>
          <button onClick={() => setShowRecForm(!showRecForm)} className="btn-primary w-full mb-4">
            + Receita Manual
          </button>

          {showRecForm && (
            <form onSubmit={handleAddReceita} className="card-elevated p-5 mb-4 animate-slide-up space-y-3">
              <input className="input-lg" placeholder="Descrição *" value={rDesc} onChange={(e) => setRDesc(e.target.value)} required maxLength={200} />
              <select className="input-lg" value={rCat} onChange={(e) => setRCat(e.target.value)}>
                {CATEGORIAS_RECEITA.map((c) => (
                  <option key={c.nome} value={c.nome}>{c.emoji} {c.nome}</option>
                ))}
              </select>
              <input className="input-lg" placeholder="Valor (R$) *" value={rValor} onChange={(e) => setRValor(e.target.value)} required inputMode="decimal" />
              <input className="input-lg" type="date" value={rData} onChange={(e) => setRData(e.target.value)} required />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRecForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-success flex-1">Salvar</button>
              </div>
            </form>
          )}

          {recMes.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <p className="text-4xl mb-3">💰</p>
              <p className="text-muted-foreground">Nenhuma receita neste mês</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recMes.map((r) => (
                <div key={r.id} className="card-elevated p-3 flex items-center justify-between" style={{ backgroundColor: 'hsl(160 84% 39% / 0.05)' }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>💰</span>
                      <p className="font-semibold">{r.descricao}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        r.origem === 'pagamento' ? 'bg-success/20 text-success' : 'bg-accent text-accent-foreground'
                      }`}>
                        {r.origem === 'pagamento' ? 'Automática' : 'Manual'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>📅 {r.data_receita}</span>
                      {r.forma_recebimento && <span>💳 {r.forma_recebimento}</span>}
                    </div>
                  </div>
                  <p className="font-bold text-success text-lg ml-3">+ {fmt(r.valor)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DESPESAS */}
      {tab === 'despesas' && (
        <div>
          <button onClick={() => setShowDespForm(!showDespForm)} className="btn-primary w-full mb-4">
            + Nova Despesa
          </button>

          {showDespForm && (
            <form onSubmit={handleAddDespesa} className="card-elevated p-5 mb-4 animate-slide-up space-y-3">
              <input className="input-lg" placeholder="Descrição *" value={dDesc} onChange={(e) => setDDesc(e.target.value)} required maxLength={200} />
              <select className="input-lg" value={dCat} onChange={(e) => setDCat(e.target.value)} required>
                <option value="">Categoria *</option>
                {CATEGORIAS_DESPESA.map((c) => (
                  <option key={c.nome} value={c.nome}>{c.emoji} {c.nome}</option>
                ))}
              </select>
              <input className="input-lg" placeholder="Valor (R$) *" value={dValor} onChange={(e) => setDValor(e.target.value)} required inputMode="decimal" />
              <input className="input-lg" type="date" value={dData} onChange={(e) => setDData(e.target.value)} required />
              <select className="input-lg" value={dStatus} onChange={(e) => setDStatus(e.target.value as 'pendente' | 'paga')}>
                <option value="pendente">⏳ Pendente</option>
                <option value="paga">✅ Paga</option>
              </select>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDespForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" className="btn-primary flex-1">Salvar</button>
              </div>
            </form>
          )}

          {despMes.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <p className="text-4xl mb-3">💸</p>
              <p className="text-muted-foreground">Nenhuma despesa neste mês</p>
            </div>
          ) : (
            <div className="space-y-4">
              {weeks.map((w) => {
                const wDesp = despMes.filter((d) => { const dt = new Date(d.data_despesa); return dt >= w.inicio && dt <= w.fim; });
                if (wDesp.length === 0) return null;
                const sub = wDesp.reduce((a, d) => a + d.valor, 0);
                const collapsed = collapsedWeeks.has(w.numero + 100); // offset to avoid conflict
                return (
                  <div key={w.numero}>
                    <button
                      onClick={() => {
                        setCollapsedWeeks((prev) => {
                          const next = new Set(prev);
                          const key = w.numero + 100;
                          next.has(key) ? next.delete(key) : next.add(key);
                          return next;
                        });
                      }}
                      className="w-full flex items-center justify-between mb-2"
                    >
                      <h3 className="font-bold text-sm text-muted-foreground">{w.label}</h3>
                      <span className="text-sm text-muted-foreground">{collapsed ? '▸' : '▾'} {fmt(sub)}</span>
                    </button>
                    {!collapsed && (
                      <div className="space-y-2">
                        {wDesp.map((d) => (
                          <div key={d.id} className="card-elevated p-3 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span>{getEmojiCat(d.categoria)}</span>
                                <p className="font-semibold">{d.descricao}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>📅 {d.data_despesa}</span>
                                <span>📁 {d.categoria}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  d.status === 'pendente' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                                }`}>
                                  {d.status === 'pendente' ? '⏳ Pendente' : '✅ Paga'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-3">
                              <p className="font-bold text-destructive">{fmt(d.valor)}</p>
                              <button onClick={() => deleteDespesa(d.id)} className="text-destructive text-sm mt-1">🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Orcamento;
