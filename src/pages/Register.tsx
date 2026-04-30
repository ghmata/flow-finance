import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Schema de Validação ─────────────────────────────────────────────────────

const registerSchema = z
  .object({
    nome: z
      .string()
      .min(2, 'Nome deve ter ao menos 2 caracteres')
      .max(80, 'Nome muito longo'),
    email: z
      .string()
      .min(1, 'E-mail é obrigatório')
      .email('Digite um e-mail válido'),
    password: z
      .string()
      .min(8, 'Senha deve ter ao menos 8 caracteres')
      .regex(/[A-Z]/, 'Senha deve ter ao menos 1 letra maiúscula')
      .regex(/[0-9]/, 'Senha deve ter ao menos 1 número'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Componente ──────────────────────────────────────────────────────────────

const Register = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password', '');

  // Indicadores de força da senha
  const passwordChecks = {
    length: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
  };

  const onSubmit = async (data: RegisterFormData) => {
    setAuthError(null);

    const { error } = await signUp(data.email, data.password, data.nome);

    if (error) {
      const errorMap: Record<string, string> = {
        'User already registered': 'Este e-mail já está cadastrado. Tente fazer login.',
        'Password should be at least 6 characters': 'Senha muito curta.',
      };
      setAuthError(errorMap[error.message] ?? 'Falha ao criar conta. Tente novamente.');
      return;
    }

    // Supabase envia e-mail de confirmação — informa o usuário
    setEmailConfirmationSent(true);
  };

  // Tela de confirmação de e-mail enviado
  if (emailConfirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Verifique seu e-mail</h1>
          <p className="text-muted-foreground">
            Enviamos um link de confirmação para o seu e-mail. Clique no link para ativar sua conta
            e depois faça login.
          </p>
          <Button
            id="register-go-login-btn"
            onClick={() => navigate('/login', { replace: true })}
            className="w-full max-w-xs mx-auto"
          >
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🧁</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Criar Conta</h1>
          <p className="mt-2 text-muted-foreground">Comece a usar o FlowFinance gratuitamente</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
          {authError && (
            <div
              id="register-auth-error"
              className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form id="register-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="register-nome">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-nome"
                  type="text"
                  autoComplete="name"
                  placeholder="Seu nome"
                  className="pl-10"
                  disabled={isSubmitting}
                  {...register('nome')}
                />
              </div>
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome.message}</p>
              )}
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="register-email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  disabled={isSubmitting}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="register-password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  disabled={isSubmitting}
                  {...register('password')}
                />
                <button
                  type="button"
                  id="register-toggle-password"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Indicadores de força */}
              {passwordValue && (
                <ul className="space-y-1 text-xs mt-1">
                  <li className={passwordChecks.length ? 'text-green-500' : 'text-muted-foreground'}>
                    {passwordChecks.length ? '✓' : '○'} Mínimo 8 caracteres
                  </li>
                  <li className={passwordChecks.uppercase ? 'text-green-500' : 'text-muted-foreground'}>
                    {passwordChecks.uppercase ? '✓' : '○'} 1 letra maiúscula
                  </li>
                  <li className={passwordChecks.number ? 'text-green-500' : 'text-muted-foreground'}>
                    {passwordChecks.number ? '✓' : '○'} 1 número
                  </li>
                </ul>
              )}

              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmar senha */}
            <div className="space-y-2">
              <Label htmlFor="register-confirm-password">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  disabled={isSubmitting}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  id="register-toggle-confirm"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              id="register-submit-btn"
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Criando conta...
                </span>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link
              to="/login"
              id="register-login-link"
              className="text-primary font-medium hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
