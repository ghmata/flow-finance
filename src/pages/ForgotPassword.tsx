import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Schema ──────────────────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('Digite um e-mail válido'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

// ─── Componente ──────────────────────────────────────────────────────────────

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const [emailSent, setEmailSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    setAuthError(null);
    const { error } = await resetPassword(data.email);

    if (error) {
      setAuthError('Não foi possível enviar o e-mail. Tente novamente.');
      return;
    }

    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">E-mail enviado!</h1>
          <p className="text-muted-foreground">
            Verifique sua caixa de entrada e clique no link para redefinir sua senha.
          </p>
          <Link
            to="/login"
            id="forgot-back-to-login-link"
            className="inline-block text-primary hover:underline text-sm"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <span className="text-6xl">🧁</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Esqueci minha senha</h1>
          <p className="mt-2 text-muted-foreground">
            Informe seu e-mail e enviaremos um link de redefinição.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-6">
          {authError && (
            <div
              id="forgot-error"
              className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form id="forgot-password-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
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

            <Button
              id="forgot-submit-btn"
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Enviando...
                </span>
              ) : (
                'Enviar link de redefinição'
              )}
            </Button>
          </form>

          <Link
            to="/login"
            id="forgot-login-link"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
