import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';
import { RouteLoading } from '@/components/ui/route-loading';

describe('loading feedback primitives', () => {
  it('route loading giữ ngữ nghĩa chờ, nhãn và khung nội dung', () => {
    const markup = renderToStaticMarkup(<RouteLoading label="Đang tải dữ liệu thử nghiệm…" />);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('data-route-loading="true"');
    expect(markup).toContain('data-loading-spinner="true"');
    expect(markup).toContain('Đang tải dữ liệu thử nghiệm…');
    expect(markup.match(/aria-hidden="true"/g)?.length ?? 0).toBeGreaterThan(4);
  });

  it('button loading tự khoá, đổi nhãn và không render nội dung cũ', () => {
    const markup = renderToStaticMarkup(
      <Button loading loadingText="Đang lưu hồ sơ…">
        Lưu hồ sơ
      </Button>,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('data-loading-spinner="true"');
    expect(markup).toContain('Đang lưu hồ sơ…');
    expect(markup).not.toContain('>Lưu hồ sơ<');
  });
});
