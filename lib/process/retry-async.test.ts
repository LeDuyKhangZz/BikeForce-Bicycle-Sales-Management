import { describe, expect, it, vi } from 'vitest';

import { retryAsync } from './retry-async';

describe('retryAsync', () => {
  it('chờ và thử lại lỗi tranh profile rồi trả kết quả thành công', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('browser exitCode=21'))
      .mockResolvedValue('OK');

    await expect(
      retryAsync(operation, {
        maxAttempts: 3,
        delayMs: 0,
        shouldRetry: (error) => error instanceof Error && error.message.includes('exitCode=21'),
      }),
    ).resolves.toBe('OK');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('không thử lại lỗi không thuộc nhóm có thể phục hồi', async () => {
    const operation = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('Sai mật khẩu'));

    await expect(
      retryAsync(operation, {
        maxAttempts: 3,
        delayMs: 0,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow('Sai mật khẩu');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
