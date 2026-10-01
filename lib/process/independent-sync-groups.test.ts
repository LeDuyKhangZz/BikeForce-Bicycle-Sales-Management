import { describe, expect, it, vi } from 'vitest';

import { runIndependentSyncGroups } from './independent-sync-groups';

describe('runIndependentSyncGroups', () => {
  it('vẫn chạy SaleWork khi AMIS thất bại', async () => {
    const saleWork = vi.fn(async () => {});

    const errors = await runIndependentSyncGroups([
      { name: 'AMIS', run: async () => { throw new Error('báo cáo rỗng'); } },
      { name: 'SaleWork', run: saleWork },
    ]);

    expect(saleWork).toHaveBeenCalledOnce();
    expect(errors).toEqual(['AMIS: báo cáo rỗng']);
  });

  it('trả tất cả lỗi sau khi đã thử mọi nguồn', async () => {
    const errors = await runIndependentSyncGroups([
      { name: 'AMIS', run: async () => { throw new Error('lỗi A'); } },
      { name: 'SaleWork', run: async () => { throw new Error('lỗi B'); } },
    ]);

    expect(errors).toEqual(['AMIS: lỗi A', 'SaleWork: lỗi B']);
  });
});
