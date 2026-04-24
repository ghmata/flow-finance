import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos"; // Added import
import Devedores from "./pages/Devedores";
import Pedidos from "./pages/Pedidos";
import Orcamento from "./pages/Orcamento";
import NotFound from "./pages/NotFound";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import { BackupBanner } from "./components/BackupBanner";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { seedDatabase } from "@/lib/seed-database";

const queryClient = new QueryClient();

// Import hook
import { useScheduler } from "@/hooks/useScheduler";

const App = () => {
  useScheduler(); // Start background scheduler
  
  // Import verification script (helper) - Uncomment to run verification
  // import("@/test/verify-schedule");

  const initStore = useStore((state) => state.init);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await seedDatabase();
        initStore();
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, [initStore]);

  // Guard: re-inicializa o store quando o app volta do background
  // Previne o erro NotFound causado por tab discarding do navegador
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
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="flex min-h-screen bg-background text-foreground">
          {/* Sidebar visible only on desktop */}
          <Sidebar />

          {/* Main content area */}
          <main className="flex-1 md:ml-64 relative pb-24 md:pb-6">
            <BackupBanner />
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

          {/* BottomNav visible only on mobile */}
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
