import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, CheckCircle2,
  Package, ShoppingCart, Wallet, Cake,
  ArrowRight, Star, AlertTriangle
} from 'lucide-react';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Bom dia', emoji: '☀️' };
  if (h < 18) return { text: 'Boa tarde', emoji: '🌤️' };
  return { text: 'Boa noite', emoji: '🌙' };
};

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const Dashboard = () => {
  const {
    clientes, pedidosPreVenda, registrosPosVenda, pagamentos, despesas, receitas,
    getDevedores
  } = useStore();
  const navigate = useNavigate();
  const devedores = getDevedores();
  const greeting = getGreeting();

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // A Receber — Total
  const totalDevedores = devedores.reduce((acc, d) => acc + d.total, 0);

  // Recebido — Semanal
  const startOfWeek = getStartOfWeek();
  const recebidoSemanal = pagamentos
    .filter((p) => new Date(p.data_pagamento) >= startOfWeek)
    .reduce((acc, p) => acc + p.valor_pago, 0);
  const pgtosSemana = pagamentos.filter((p) => new Date(p.data_pagamento) >= startOfWeek).length;

  // Saldo — Mensal
  const mesKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const receitasMes = receitas.filter((r) => r.data_receita.startsWith(mesKey)).reduce((acc, r) => acc + r.valor, 0);
  const despesasMes = despesas.filter((d) => d.data_despesa.startsWith(mesKey)).reduce((acc, d) => acc + d.valor, 0);
  const saldoMensal = receitasMes - despesasMes;

  // Atrasados — Pedidos pendentes com mais de 10 dias
  const isOverdue = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / 86400000) > 10;
  };
  const atrasados = pedidosPreVenda.filter((p) => p.status === 'pendente' && isOverdue(p.data_pedido)).length;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;



  const despPorCat = despesas.reduce<Record<string, number>>((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + d.valor;
    return acc;
  }, {});
  const pieData = Object.entries(despPorCat).map(([name, value]) => ({ name, value }));

  const now = new Date();
  const barData = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short' });
    const rec = receitas.filter((r) => r.data_receita.startsWith(mk)).reduce((a, r) => a + r.valor, 0);
    const desp = despesas.filter((dp) => dp.data_despesa.startsWith(mk)).reduce((a, dp) => a + dp.valor, 0);
    return { mes: mesLabel, receitas: rec, despesas: desp };
  });

  const quickActions = [
    { label: 'Nova Reserva', icon: Package, action: () => navigate('/pedidos', { state: { tab: 'prevenda', openModal: 'novaReserva' } }), color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'Pronta Entrega', icon: ShoppingCart, action: () => navigate('/pedidos', { state: { tab: 'posvenda' } }), color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Nova Despesa', icon: Wallet, action: () => navigate('/orcamento', { state: { tab: 'despesas' } }), color: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'Novo Produto', icon: Cake, action: () => navigate('/pedidos', { state: { tab: 'produtos' } }), color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="page-container pb-24 md:pb-6 !pt-0 !px-0">
      {/* === HERO ZONE: Gradient covers greeting + KPI cards === */}
      <div className="relative bg-gradient-to-br from-[#1e1b5e] via-[#2d2a8a] to-[#4338ca] px-5 pt-8 pb-8 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-20 -left-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute bottom-4 right-8 w-20 h-20 rounded-full bg-indigo-400/10" />

        {/* Greeting */}
        <div className="relative mb-2">
          <p className="text-indigo-300 text-xs font-medium">Mais um mês</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">
            {greeting.text}, Otoniel {greeting.emoji}
          </h1>
        </div>

        {/* Month badge */}
        <p className="relative text-white text-lg font-bold capitalize mb-6">
          {mesAtual}
        </p>

        {/* KPI Cards — Glassmorphism */}
        <div className="relative grid grid-cols-2 gap-3">
          {/* A Receber */}
          <button
            onClick={() => navigate('/devedores')}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-left transition-all active:scale-[0.97] hover:bg-white/15"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-amber-400/20 p-1.5 rounded-lg">
                <DollarSign className="h-4 w-4 text-amber-300" />
              </div>
              <span className="text-xs font-medium text-white/70">A Receber</span>
            </div>
            <p className="text-xl font-bold text-white tracking-tight">{fmt(totalDevedores)}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{devedores.length} pessoa(s)</p>
          </button>

          {/* Recebido — Semanal */}
          <button
            onClick={() => navigate('/devedores')}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-left transition-all active:scale-[0.97] hover:bg-white/15"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-emerald-400/20 p-1.5 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              </div>
              <span className="text-xs font-medium text-white/70">Recebido</span>
            </div>
            <p className="text-xl font-bold text-white tracking-tight">{fmt(recebidoSemanal)}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{pgtosSemana} pgto(s) esta semana</p>
          </button>

          {/* Atrasados */}
          <button
            onClick={() => navigate('/devedores')}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-left transition-all active:scale-[0.97] hover:bg-white/15"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${atrasados > 0 ? 'bg-red-400/20' : 'bg-orange-400/20'}`}>
                <AlertTriangle className={`h-4 w-4 ${atrasados > 0 ? 'text-red-300' : 'text-orange-300'}`} />
              </div>
              <span className="text-xs font-medium text-white/70">Atrasados</span>
            </div>
            <p className={`text-xl font-bold tracking-tight ${atrasados > 0 ? 'text-red-300' : 'text-white'}`}>
              {atrasados}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">dívidas +10 dias</p>
          </button>

          {/* Saldo — Mensal */}
          <button
            onClick={() => navigate('/orcamento')}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 text-left transition-all active:scale-[0.97] hover:bg-white/15"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${saldoMensal >= 0 ? 'bg-emerald-400/20' : 'bg-red-400/20'}`}>
                {saldoMensal >= 0
                  ? <TrendingUp className="h-4 w-4 text-emerald-300" />
                  : <TrendingDown className="h-4 w-4 text-red-300" />
                }
              </div>
              <span className="text-xs font-medium text-white/70">Saldo</span>
            </div>
            <p className={`text-xl font-bold tracking-tight ${saldoMensal >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {fmt(saldoMensal)}
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">receitas − despesas do mês</p>
          </button>
        </div>
      </div>

      {/* === CONTENT ZONE: White background === */}
      <div className="px-5 pt-6 space-y-5">

        {/* Ações Rápidas */}
        <div>
          <h2 className="text-sm font-bold text-foreground/80 mb-3 flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" /> Ações Rápidas
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-semibold border transition-all active:scale-[0.97] ${qa.color}`}
              >
                <qa.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{qa.label}</span>
              </button>
            ))}
          </div>
        </div>



        {/* Evolução Mensal */}
        {barData.some((b) => b.receitas > 0 || b.despesas > 0) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-foreground/80">Evolução Mensal</h3>
              <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Receitas</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Despesas</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Últimos 4 meses</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barGap={4}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                />
                <Bar dataKey="receitas" fill="#10B981" name="Receitas" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" fill="#F87171" name="Despesas" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Despesas por Categoria */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/50">
            <h3 className="text-sm font-bold text-foreground/80 mb-1">Despesas por Categoria</h3>
            <p className="text-xs text-muted-foreground mb-3">Distribuição dos seus gastos</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Welcome State */}
        {clientes.length === 0 && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-8 text-center border border-indigo-100">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚀</span>
            </div>
            <p className="text-lg font-bold text-foreground mb-1">Bem-vindo, Otoniel!</p>
            <p className="text-sm text-muted-foreground mb-4">
              Comece cadastrando seus <strong>clientes</strong> e <strong>produtos</strong> para criar pedidos.
            </p>
            <button
              onClick={() => navigate('/clientes', { state: { showForm: true } })}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all text-sm"
            >
              Cadastrar Primeiro Cliente <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
