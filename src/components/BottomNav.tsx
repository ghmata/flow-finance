import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Início', emoji: '📊' },
  { path: '/clientes', label: 'Clientes', emoji: '👥' },
  { path: '/devedores', label: 'A Receber', emoji: '💰' },
  { path: '/pedidos', label: 'Vendas', emoji: '🛒' },
  { path: '/orcamento', label: 'Orçamento', emoji: '💸' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-2 px-1 min-w-[64px] transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="text-2xl mb-0.5">{tab.emoji}</span>
              <span className={`text-xs font-medium ${active ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
              {active && (
                <div className="w-5 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
