import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <AlertTriangle className="h-16 w-16 text-warning mb-4" />
          <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={this.handleReset}
              variant="outline"
              className="min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="min-h-[44px]"
            >
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
