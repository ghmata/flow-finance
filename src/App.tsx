import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import Devedores from "./pages/Devedores";
import Pedidos from "./pages/Pedidos";
import Orcamento from "./pages/Orcamento";
import NotFound from "./pages/NotFound";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthGuard from "./components/AuthGuard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import { AuthProvider } from "./contexts/AuthContext";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

// Import hook
import { useScheduler } from "@/hooks/useScheduler";

const queryClient = new QueryClient();

// ─── Layout Protegido ─────────────────────────────────────────────────────────
// Componente interno que requer autenticação e inicializa o store de dados.
const ProtectedLayout = () => {
  useScheduler(); // Inicia scheduler em background

  const initStore = useStore((state) => state.init);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // seedDatabase() removido — dados vêm do Dexie/Supabase (Fase 3)
        initStore();
      } catch (error) {
        console.error("Falha ao inicializar app:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, [initStore]);

  // Guard: re-inicializa o store quando o app volta do background.
  // Previne o erro NotFound causado por tab discarding do navegador.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const state = useStore.getState();
        // Se o store perdeu os dados (navegador descartou a tab), re-inicializa
        if (state.clientes.length === 0 && !state.isLoading) {
          console.log("[App] Re-inicializando store após retorno do background...");
          initStore();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [initStore]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground animate-pulse">Preparando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar visível apenas no desktop */}
      <Sidebar />

      {/* Área principal */}
      <main className="flex-1 md:ml-64 relative pb-24 md:pb-6">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/devedores" element={<Devedores />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/orcamento" element={<Orcamento />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {/* BottomNav visível apenas no mobile */}
      <BottomNav />
    </div>
  );
};

// ─── App Root ────────────────────────────────────────────────────────────────

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Routes>
              {/* Rotas públicas — acessíveis sem autenticação */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Rotas protegidas — AuthGuard redireciona para /login se sem sessão */}
              <Route
                path="/*"
                element={
                  <AuthGuard>
                    <ProtectedLayout />
                  </AuthGuard>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
