import { useState, useCallback } from 'react';
import { AIServiceError } from '../lib/ai-service';
import { toast } from '../components/ui/Toast';

interface UseAIOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export function useAI<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: UseAIOptions = {},
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TResult | null>(null);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fn(...args);
        setData(result);
        if (options.successMessage) {
          toast('success', options.successMessage);
        }
        options.onSuccess?.(result);
        return result;
      } catch (err: any) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);

        let msg = options.errorMessage || e.message;

        if (err instanceof AIServiceError) {
          if (err.code === 'RATE_LIMIT') {
            msg =
              "⏳ Juda ko'p so'rov. Iltimos, 10 soniyadan so'ng qayta urinib ko'ring.";
          } else if (err.code === 'NO_API_KEY') {
            msg = "🔑 AI xizmati sozlanmagan. Administratorga murojaat qiling.";
          } else if (err.code === 'NETWORK') {
            msg = "🌐 Internet aloqasi yo'q yoki sekin.";
          } else if (err.code === 'PARSE') {
            msg = "🤖 AI javobini o'qib bo'lmadi. Qayta urinib ko'ring.";
          }
        }

        toast('error', msg);
        options.onError?.(e);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fn, options],
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return { run, isLoading, error, data, reset };
}