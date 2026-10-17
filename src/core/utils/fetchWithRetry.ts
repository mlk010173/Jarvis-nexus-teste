/**
 * JARVIS NEXUS - Resilient Fetch with Timeout and Exponential Backoff
 */

export interface FetchRetryOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  initialDelayMs?: number;
}

export class FetchError extends Error {
  status?: number;
  isTimeout: boolean;
  isNetworkError: boolean;

  constructor(message: string, status?: number, isTimeout = false, isNetworkError = false) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.isTimeout = isTimeout;
    this.isNetworkError = isNetworkError;
  }
}

export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchRetryOptions = {}
): Promise<T> {
  const {
    timeoutMs = 8000,
    maxRetries = 2,
    initialDelayMs = 300,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new FetchError(
            'Limite de requisições excedido. Aguarde alguns instantes.',
            429
          );
        }
        if (response.status >= 500 && attempt < maxRetries) {
          // Retry on 5xx errors
          throw new FetchError(
            `Erro no servidor (${response.status}). Tentando novamente...`,
            response.status
          );
        }
        throw new FetchError(
          `Falha na comunicação (${response.status}): ${response.statusText}`,
          response.status
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeoutId);

      const isAbort = (err as Error).name === 'AbortError';
      const isOnlineCheck = typeof navigator !== 'undefined' ? !navigator.onLine : false;
      const isNet = isOnlineCheck || (err instanceof TypeError);

      if (isAbort) {
        lastError = new FetchError(
          'A requisição excedeu o tempo limite. Verifique sua conexão.',
          408,
          true,
          false
        );
      } else if (err instanceof FetchError) {
        lastError = err;
      } else {
        lastError = new FetchError(
          isNet
            ? 'Sem conexão com a internet ou servidor inacessível.'
            : (err as Error).message || 'Erro inesperado na chamada.',
          undefined,
          false,
          isNet
        );
      }

      // If we still have retries and it's a transient failure, wait with exponential backoff
      if (attempt < maxRetries && (isAbort || isNet || (lastError as FetchError).status === 500)) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  throw lastError || new FetchError('Falha ao comunicar com o serviço.');
}
