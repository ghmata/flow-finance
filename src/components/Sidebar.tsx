import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp
} from 'lucide-react';

const tabs = [
  { path: '/', label: 'Início', icon: BarChart3 },
  { path: '/pedidos', label: 'Vendas', icon: ShoppingCart },
  { path: '/devedores', label: 'A Receber', icon: DollarSign },
  { path: '/orcamento', label: 'Orçamento', icon: TrendingUp },
  { path: '/produtos', label: 'Produtos', icon: Package },
  { path: '/clientes', label: 'Clientes', icon: Users },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-card border-r border-border z-50 shadow-sm">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <span className="text-3xl">🧁</span>
          FlowFinance
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${
                active 
                  ? 'bg-primary/10 text-primary hover:bg-primary/20 shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted text-foreground'
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
              <span>{tab.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          v1.0.0
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
