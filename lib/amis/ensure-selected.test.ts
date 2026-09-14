import { describe, expect, it, vi } from 'vitest';
import { ensureSelected } from './ensure-selected';

describe('AMIS select all persisted state', () => {
  it('does not toggle off select all already restored by MISA', async () => {
    const select = vi.fn();
    await ensureSelected({ isChecked: async () => true, select });
    expect(select).not.toHaveBeenCalled();
  });
  it('selects an unchecked filter', async () => {
    const select = vi.fn().mockResolvedValue(undefined);
    await ensureSelected({ isChecked: async () => false, select });
    expect(select).toHaveBeenCalledOnce();
  });
  it('propagates selection failure rather than submitting an incomplete filter', async () => {
    const error = new Error('selection blocked');
    await expect(ensureSelected({ isChecked: async () => false, select: async () => { throw error; } })).rejects.toBe(error);
  });
});
