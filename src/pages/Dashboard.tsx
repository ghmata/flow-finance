import { useStore } from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Dashboard = () => {
  const { clientes, pedidosPreVenda, registrosPosVenda, pagamentos, despesas, receitas, getDevedores } = useStore();
  const devedores = getDevedores();

  const totalDevedores = devedores.reduce((acc, d) => acc + d.total, 0);
  const totalRecebido = pagamentos.reduce((acc, p) => acc + p.valor_pago, 0);
  const pedidosPendentes = pedidosPreVenda.filter((p) => p.status === 'pendente').length;
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
  const totalReceitas = receitas.reduce((acc, r) => acc + r.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  // Despesas por categoria
  const despPorCat = despesas.reduce<Record<string, number>>((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + d.valor;
    return acc;
  }, {});
  const pieData = Object.entries(despPorCat).map(([name, value]) => ({ name, value }));

  // Últimos 4 meses receitas vs despesas
  const now = new Date();
  const barData = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short' });
    const rec = receitas.filter((r) => r.data_receita.startsWith(mesKey)).reduce((a, r) => a + r.valor, 0);
    const desp = despesas.filter((dp) => dp.data_despesa.startsWith(mesKey)).reduce((a, dp) => a + dp.valor, 0);
    return { mes: mesLabel, receitas: rec, despesas: desp };
  });

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">💰 A Receber</p>
          <p className="text-xl font-bold text-primary">{fmt(totalDevedores)}</p>
          <p className="text-xs text-muted-foreground">{devedores.length} pessoa(s)</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">✅ Recebido</p>
          <p className="text-xl font-bold text-success">{fmt(totalRecebido)}</p>
          <p className="text-xs text-muted-foreground">{pagamentos.length} pagamento(s)</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">📦 Pendentes</p>
          <p className="text-xl font-bold text-warning">{pedidosPendentes}</p>
          <p className="text-xs text-muted-foreground">pedidos pré-venda</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">📊 Saldo</p>
          <p className={`text-xl font-bold ${saldo >= 0 ? 'text-success' : 'text-warning'}`}>
            {fmt(saldo)}
          </p>
          <p className="text-xs text-muted-foreground">receitas - despesas</p>
        </div>
      </div>

      {barData.some((b) => b.receitas > 0 || b.despesas > 0) && (
        <div className="card-elevated p-4 mb-4">
          <h3 className="font-bold mb-3">📈 Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="receitas" fill="#10B981" name="Receitas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="#EF4444" name="Despesas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {pieData.length > 0 && (
        <div className="card-elevated p-4 mb-4">
          <h3 className="font-bold mb-3">💸 Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {clientes.length === 0 && (
        <div className="card-elevated p-8 text-center">
          <p className="text-4xl mb-3">🚀</p>
          <p className="text-lg font-semibold mb-1">Bem-vindo!</p>
          <p className="text-muted-foreground">
            Comece cadastrando seus <strong>clientes</strong> e <strong>produtos</strong> para criar pedidos.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
