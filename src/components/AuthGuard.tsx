import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Protege rotas autenticadas.
 * - Enquanto verifica sessão: exibe spinner centralizado.
 * - Sem sessão ativa: redireciona para /login.
 * - Com sessão: renderiza os filhos normalmente.
 */
const AuthGuard = ({ children }: AuthGuardProps) => {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-lg text-muted-foreground animate-pulse">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
