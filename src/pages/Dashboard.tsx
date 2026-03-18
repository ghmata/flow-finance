import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, User, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Dashboard = () => {
  const { 
    clientes, pedidosPreVenda, registrosPosVenda, pagamentos, despesas, receitas, 
    getDevedores, getTop3Compradores, getTop3ProdutosMaisVendidos 
  } = useStore();
  const navigate = useNavigate();
  const devedores = getDevedores();
  const top3Compradores = getTop3Compradores();
  const top3Produtos = getTop3ProdutosMaisVendidos();


  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const totalDevedores = devedores.reduce((acc, d) => acc + d.total, 0);
  const totalRecebido = pagamentos.reduce((acc, p) => acc + p.valor_pago, 0);
  const pedidosPendentes = pedidosPreVenda.filter((p) => p.status === 'pendente').length;
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
  const totalReceitas = receitas.reduce((acc, r) => acc + r.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  const despPorCat = despesas.reduce<Record<string, number>>((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + d.valor;
    return acc;
  }, {});
  const pieData = Object.entries(despPorCat).map(([name, value]) => ({ name, value }));

  const now = new Date();
  const barData = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short' });
    const rec = receitas.filter((r) => r.data_receita.startsWith(mesKey)).reduce((a, r) => a + r.valor, 0);
    const desp = despesas.filter((dp) => dp.data_despesa.startsWith(mesKey)).reduce((a, dp) => a + dp.valor, 0);
    return { mes: mesLabel, receitas: rec, despesas: desp };
  });

  const quickActions = [
    { label: '📦 Nova Reserva', action: () => navigate('/pedidos', { state: { tab: 'prevenda' } }) },
    { label: '🛒 Nova Pronta Entrega', action: () => navigate('/pedidos', { state: { tab: 'posvenda' } }) },
    { label: '💸 Nova Despesa', action: () => navigate('/orcamento', { state: { tab: 'despesas' } }) },
    { label: '🍰 Cadastrar Produto', action: () => navigate('/pedidos', { state: { tab: 'produtos' } }) },
    { label: '👤 Cadastrar Cliente', action: () => navigate('/clientes', { state: { showForm: true } }) },
  ];

  const medalhas = ['🥇', '🥈', '🥉'];

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Início</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">💰 A Receber</p>
            <p className="text-xl font-bold text-primary">{fmt(totalDevedores)}</p>
            <p className="text-xs text-muted-foreground">{devedores.length} pessoa(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">✅ Recebido</p>
            <p className="text-xl font-bold text-success">{fmt(totalRecebido)}</p>
            <p className="text-xs text-muted-foreground">{pagamentos.length} pagamento(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">📦 Pendentes</p>
            <p className="text-xl font-bold text-warning">{pedidosPendentes}</p>
            <p className="text-xs text-muted-foreground">reservas pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">📊 Saldo</p>
            <p className={`text-xl font-bold ${saldo >= 0 ? 'text-success' : 'text-warning'}`}>
              {fmt(saldo)}
            </p>
            <p className="text-xs text-muted-foreground">receitas - despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-bold mb-3">⚡ Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className="bg-accent text-accent-foreground font-semibold py-3 px-3 rounded-xl text-sm active:scale-95 transition-transform text-left"
              >
                {qa.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Top 3 Compradores */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Top Compradores
              <span className="text-xs text-muted-foreground font-normal capitalize">({mesAtual})</span>
            </h3>
            {top3Compradores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento este mês</p>
            ) : (
              <div className="space-y-2.5">
                {top3Compradores.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{medalhas[i]}</span>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.qtd} compra(s)</p>
                      </div>
                    </div>
                    <span className="font-bold text-primary text-sm">{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 3 Produtos */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" /> Produtos Mais Vendidos
              <span className="text-xs text-muted-foreground font-normal capitalize">({mesAtual})</span>
            </h3>
            {top3Produtos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma venda este mês</p>
            ) : (
              <div className="space-y-2.5">
                {top3Produtos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{medalhas[i]}</span>
                      <p className="font-semibold text-sm">{p.nome}</p>
                    </div>
                    <span className="font-bold text-primary text-sm">×{p.quantidade}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {barData.some((b) => b.receitas > 0 || b.despesas > 0) && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">📈 Evolução Mensal</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: 'white', borderRadius: '8px' }} />
                <Bar dataKey="receitas" fill="#10B981" name="Receitas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#EF4444" name="Despesas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {pieData.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3">💸 Despesas por Categoria</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: 'white', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {clientes.length === 0 && (
        <Card className="text-center p-8">
          <CardContent>
            <p className="text-4xl mb-3">🚀</p>
            <p className="text-lg font-semibold mb-1">Bem-vindo!</p>
            <p className="text-muted-foreground">
              Comece cadastrando seus <strong>clientes</strong> e <strong>produtos</strong> para criar pedidos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
