import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { HatdeSnapshotViewModel } from '@/lib/hatde/view-model';
import { HatdeDashboard } from './hatde-dashboard';

function report(branchCount: number): HatdeSnapshotViewModel {
  return {
    id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
    reportDate: '2026-10-11',
    reportDateDisplay: '11/10/2026',
    reportTime: '12:25',
    totalRevenueDisplay: '9.999.999.999 VND',
    totalTransactionsDisplay: '105',
    branches: Array.from({ length: branchCount }, (_, index) => ({
      rank: index + 1,
      code: `branch-${index}`,
      name: `Chi nhánh ${index + 1}`,
      revenueDisplay: `${index + 1}.000.000 VND`,
      transactionsDisplay: `${index + 1}`,
      vsYesterday: { value: -55.6, display: '-55,6%', direction: 'DOWN' },
      vsLastWeek: { value: 100, display: '+100%', direction: 'UP' },
    })),
  };
}

describe('HatdeDashboard', () => {
  it.each([1, 4, 6])('render đủ %i chi nhánh', (branchCount) => {
    const html = renderToStaticMarkup(
      <HatdeDashboard report={report(branchCount)} availableTimes={['12:25']} selectedDate="2026-10-11" />,
    );
    expect((html.match(/Chi nhánh \d/g) ?? [])).toHaveLength(branchCount);
    expect(html).toContain('9.999.999.999 VND');
  });

  it('hiển thị dấu và tone xanh/đỏ cho phần trăm', () => {
    const html = renderToStaticMarkup(
      <HatdeDashboard report={report(1)} availableTimes={[]} />,
    );
    expect(html).toContain('-55,6%');
    expect(html).toContain('+100%');
    expect(html).toContain('bg-status-missed-bg');
    expect(html).toContain('bg-status-exceeded-bg');
  });

  it('hiển thị chi nhánh 0 đồng và 0 giao dịch', () => {
    const zeroReport = report(6);
    const firstBranch = zeroReport.branches[0];
    if (firstBranch === undefined) throw new Error('Thiếu fixture chi nhánh Hạt Dẻ.');
    zeroReport.branches[0] = {
      ...firstBranch,
      revenueDisplay: '0 VND',
      transactionsDisplay: '0',
    };
    const html = renderToStaticMarkup(
      <HatdeDashboard report={zeroReport} availableTimes={[]} />,
    );
    expect(html).toContain('0 VND');
    expect(html).toContain('0 giao dịch');
    expect((html.match(/Chi nhánh \d/g) ?? [])).toHaveLength(6);
  });
});
