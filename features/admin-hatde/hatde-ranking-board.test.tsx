import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { HatdeSnapshotViewModel } from '@/lib/hatde/view-model';
import { HatdeRankingBoard } from './hatde-ranking-board';

describe('HatdeRankingBoard', () => {
  it('hiển thị số liệu snapshot và giữ chi nhánh 0 đồng', () => {
    const report: HatdeSnapshotViewModel = {
      id: '17abcf76-a9e4-42e4-8b99-e785b0e39fb3',
      reportDate: '2026-10-11',
      reportDateDisplay: '11/10/2026',
      reportTime: '14:35',
      totalRevenueDisplay: '125.430.000 VND',
      totalTransactionsDisplay: '85',
      branches: [{
        rank: 1,
        code: 'cn_15h',
        name: '15H',
        revenueDisplay: '0 VND',
        transactionsDisplay: '0',
        vsYesterday: { value: -100, display: '-100%', direction: 'DOWN' },
        vsLastWeek: { value: 0, display: '0%', direction: 'UNCHANGED' },
      }],
    };

    const html = renderToStaticMarkup(<HatdeRankingBoard report={report} />);
    expect(html).toContain('14:35');
    expect(html).toContain('0 VND');
    expect(html).toContain('aria-label="0 giao dịch"');
    expect(html).toContain('125.430.000 VND');
    expect(html).toContain('Tổng doanh thu');
    expect(html).toContain('Tổng giao dịch');
    expect(html).toContain('85 giao dịch');
    expect(html).toContain('hatde-poster-background');
  });
});
