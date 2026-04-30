import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Schema de Validação ─────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('Digite um e-mail válido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000; // 30 segundos

// ─── Componente ──────────────────────────────────────────────────────────────

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const secondsLeft = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 1000) : 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    if (isLocked) return;

    setAuthError(null);

    const { error } = await signIn(data.email, data.password);

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setAttempts(0);
        setAuthError(
          `Muitas tentativas. Aguarde ${LOCKOUT_MS / 1000} segundos antes de tentar novamente.`
        );
        return;
      }

      // Tradução dos erros mais comuns do Supabase Auth
      const errorMap: Record<string, string> = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
        'Too many requests': 'Muitas tentativas. Aguarde um momento.',
      };

      setAuthError(errorMap[error.message] ?? 'Falha ao entrar. Tente novamente.');
      return;
    }

    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🧁</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">FlowFinance</h1>
          <p className="mt-2 text-muted-foreground">Entre na sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
          {/* Erro de autenticação */}
          {authError && (
            <div
              id="login-auth-error"
              className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Aviso de bloqueio */}
          {isLocked && (
            <div className="text-center text-sm text-muted-foreground">
              Formulário disponível em <strong>{secondsLeft}s</strong>
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  disabled={isLocked || isSubmitting}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Senha</Label>
                <Link
                  to="/forgot-password"
                  id="login-forgot-password-link"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  disabled={isLocked || isSubmitting}
                  {...register('password')}
                />
                <button
                  type="button"
                  id="login-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Tentativas restantes */}
            {attempts > 0 && !isLocked && (
              <p className="text-xs text-amber-500 text-center">
                {MAX_ATTEMPTS - attempts} tentativa(s) restante(s) antes do bloqueio temporário.
              </p>
            )}

            {/* Botão de submit */}
            <Button
              id="login-submit-btn"
              type="submit"
              className="w-full"
              disabled={isLocked || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Link para cadastro */}
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta?{' '}
            <Link
              to="/register"
              id="login-register-link"
              className="text-primary font-medium hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
