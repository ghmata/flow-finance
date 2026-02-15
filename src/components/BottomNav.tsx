import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  MoreHorizontal,
  LucideIcon
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = 
  | { type: 'link'; path: string; label: string; icon: LucideIcon }
  | { type: 'menu'; label: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { type: 'link', path: '/', label: 'Início', icon: BarChart3 },
  { type: 'link', path: '/pedidos', label: 'Vendas', icon: ShoppingCart },
  { type: 'link', path: '/devedores', label: 'A Receber', icon: DollarSign },
  { type: 'link', path: '/orcamento', label: 'Orçamento', icon: TrendingUp },
  { type: 'menu', label: 'Mais', icon: MoreHorizontal }, // Special item
];

const moreMenuItems = [
  { path: '/produtos', label: 'Produtos', icon: Package },
  { path: '/clientes', label: 'Clientes', icon: Users },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom md:hidden shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
      <div className="flex justify-around items-center max-w-lg mx-auto h-16">
        {navItems.map((item) => {
          if (item.type === 'menu') {
            return (
              <Sheet key="menu" open={isMoreOpen} onOpenChange={setIsMoreOpen}>
                <SheetTrigger asChild>
                  <button
                    className="flex flex-col items-center justify-center gap-1 min-w-[64px] h-full px-1 transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Mais opções"
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-[10px] font-medium leading-none">{item.label}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-xl px-4 pb-8">
                  <SheetHeader className="mb-4 text-left">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="grid gap-2">
                    {moreMenuItems.map((menuItem) => {
                      const isActive = location.pathname === menuItem.path;
                      return (
                        <button
                          key={menuItem.path}
                          onClick={() => {
                            navigate(menuItem.path);
                            setIsMoreOpen(false);
                          }}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                            isActive 
                              ? 'bg-primary/10 text-primary font-semibold' 
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <menuItem.icon className="h-5 w-5" />
                          <span className="text-base">{menuItem.label}</span>
                          {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            );
          }

          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-full px-1 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`h-6 w-6 transition-transform ${active ? 'scale-110' : ''}`} />
              <span className={`text-[10px] font-medium leading-none ${active ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 w-8 h-1 rounded-b-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
