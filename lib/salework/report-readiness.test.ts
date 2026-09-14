import { describe, expect, it, vi } from 'vitest';

import { openSaleWorkFilters, waitForSaleWorkIdle } from './report-readiness';

function timeoutError(): Error {
  const error = new Error('loading mask intercepts pointer events');
  error.name = 'TimeoutError';
  return error;
}

describe('openSaleWorkFilters', () => {
  it('waits for all visible masks to disappear before interaction', async () => {
    const waitFor = vi.fn().mockResolvedValue(undefined);
    const locator = vi.fn().mockReturnValue({ first: () => ({ waitFor }) });
    await waitForSaleWorkIdle({ locator });
    expect(locator).toHaveBeenCalledWith('.el-loading-mask:visible');
    expect(waitFor).toHaveBeenCalledWith({ state: 'hidden', timeout: 60_000 });
  });
  it('reloads and repeats preparation when the loading mask blocks the select', async () => {
    const reload = vi.fn().mockResolvedValue(null);
    const prepare = vi.fn().mockRejectedValueOnce(timeoutError()).mockResolvedValueOnce(undefined);
    const onRetry = vi.fn();
    await openSaleWorkFilters({ reload }, prepare, onRetry);
    expect(reload).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('fails after one reload rather than retrying forever', async () => {
    const reload = vi.fn().mockResolvedValue(null);
    const prepare = vi.fn().mockRejectedValue(timeoutError());
    await expect(openSaleWorkFilters({ reload }, prepare, vi.fn())).rejects.toThrow('chưa ghi dữ liệu');
    expect(reload).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledTimes(2);
  });

  it('does not retry authentication or other errors', async () => {
    const reload = vi.fn();
    const error = new Error('unauthorized');
    await expect(openSaleWorkFilters({ reload }, async () => { throw error; }, vi.fn())).rejects.toBe(error);
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload a ready page', async () => {
    const reload = vi.fn();
    await openSaleWorkFilters({ reload }, vi.fn().mockResolvedValue(undefined), vi.fn());
    expect(reload).not.toHaveBeenCalled();
  });
});
