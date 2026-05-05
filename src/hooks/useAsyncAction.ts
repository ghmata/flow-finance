import { useState, useCallback, useRef } from 'react';

interface UseAsyncActionOptions {
  resetErrorAfterMs?: number;
}

interface UseAsyncActionReturn<TArgs extends unknown[], TResult> {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  isPending: boolean;
  error: string | null;
}

/**
 * Hook reutilizável para proteger operações assíncronas contra dupla execução.
 *
 * Enquanto a Promise está em andamento, chamadas subsequentes são ignoradas
 * e `isPending` é `true` — ideal para desabilitar botões de submit.
 *
 * @example
 * const { execute: handleSave, isPending } = useAsyncAction(
 *   async (nome: string) => addCliente(nome)
 * );
 *
 * <Button onClick={() => handleSave('João')} disabled={isPending}>
 *   {isPending ? 'Salvando...' : 'Salvar'}
 * </Button>
 */
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options?: UseAsyncActionOptions
): UseAsyncActionReturn<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const execute = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    // Lock por ref para evitar race condition entre setState e re-render
    if (lockRef.current) return undefined;

    lockRef.current = true;
    setIsPending(true);
    setError(null);

    try {
      const result = await action(...args);
      return result;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      return undefined;
    } finally {
      lockRef.current = false;
      setIsPending(false);

      if (options?.resetErrorAfterMs) {
        setTimeout(() => setError(null), options.resetErrorAfterMs);
      }
    }
  }, [action, options?.resetErrorAfterMs]);

  return { execute, isPending, error };
}
