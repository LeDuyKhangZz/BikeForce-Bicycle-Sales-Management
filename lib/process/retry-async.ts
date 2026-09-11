export type RetryAsyncOptions = Readonly<{
  maxAttempts: number;
  delayMs: number;
  shouldRetry: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}>;

export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: RetryAsyncOptions,
): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === options.maxAttempts || !options.shouldRetry(error)) throw error;
      options.onRetry?.(attempt, error);
      await new Promise<void>((resolveDelay) => {
        setTimeout(resolveDelay, options.delayMs);
      });
    }
  }

  throw new Error('Không thể hoàn tất thao tác retry.');
}
