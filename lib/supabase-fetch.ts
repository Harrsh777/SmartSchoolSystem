/**
 * Shared utility for creating a fetch wrapper with timeout and retry support
 * Used by all Supabase clients to prevent connection timeout errors
 */

/**
 * Custom fetch wrapper with timeout and retry support
 * Prevents connection timeout errors by setting a maximum request duration
 * and retrying failed requests
 */
export function createFetchWithTimeout(timeoutMs: number = 30000, maxRetries: number = 2) {
  return async function fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
    retryCount: number = 0
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      // Retry on 5xx errors or network errors
      if ((response.status >= 500 || response.status === 0) && retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithTimeout(input, init, retryCount + 1);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry on network errors (timeout, connection errors)
      if (retryCount < maxRetries && (
        (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch failed'))) ||
        (error instanceof TypeError && error.message.includes('fetch failed'))
      )) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithTimeout(input, init, retryCount + 1);
      }
      
      // If it's an abort error, throw a more descriptive timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(
          `Request timeout after ${timeoutMs}ms: ${typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'request'}`
        );
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }
      throw error;
    }
  };
}

/**
 * Get default fetch options for Supabase clients
 */
export function getSupabaseFetchOptions() {
  const timeoutMs = parseInt(process.env.SUPABASE_FETCH_TIMEOUT_MS || '30000', 10);
  const maxRetries = parseInt(process.env.SUPABASE_FETCH_MAX_RETRIES || '2', 10);
  const fetchWithTimeout = createFetchWithTimeout(timeoutMs, maxRetries);
  
  return {
    global: {
      fetch: fetchWithTimeout,
    },
  };
}
