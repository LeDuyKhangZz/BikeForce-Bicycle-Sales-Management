import { describe, expect, it } from 'vitest';

import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  BACKGROUND_COLOR,
  PWA_ICONS,
  THEME_COLOR,
  buildManifest,
} from '@/lib/pwa/manifest';

/**
 * FR-036 chỉ có một câu — "PWA manifest + Add to Home Screen" — nên phần lớn nội
 * dung của nó là **ràng buộc kỹ thuật của trình duyệt**, thứ không hiện ra ở bất
 * kỳ màn hình nào và vì thế không ai phát hiện khi nó hỏng: thiếu icon 512,
 * `display` bị đổi, hay `start_url` trỏ vào một route có bảo vệ. Bài test này
 * khoá đúng những điều kiện đó.
 *
 * Điều nó **không** kiểm được, và phải kiểm bằng thiết bị thật: bản thân thao
 * tác "Thêm vào màn hình chính" trên Chrome mobile và Safari mobile.
 */

const manifest = buildManifest();

describe('buildManifest — điều kiện cài đặt được của FR-036', () => {
  it('display là standalone, không phải browser', () => {
    // DEC-024. `browser` làm PWA mở ra kèm thanh địa chỉ ⇒ mất toàn bộ giá trị
    // của "Thêm vào màn hình chính".
    expect(manifest.display).toBe('standalone');
  });

  it('start_url và scope đều là gốc site', () => {
    // `app/page.tsx` phân luồng theo role (FR-004). Trỏ start_url thẳng vào
    // /sales/today sẽ đá Admin về dashboard của họ ngay khi mở app — chạy được
    // nhưng thừa một vòng redirect, và sai nếu sau này có thêm vai.
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
  });

  it('có đủ icon 192 và 512 cho purpose "any"', () => {
    const any = (PWA_ICONS ?? []).filter((icon) => icon.purpose === 'any');

    expect(any.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512']);
  });

  it('có đủ icon 192 và 512 cho purpose "maskable"', () => {
    // Thiếu bản maskable thì Android tự đắp icon vào một hình vuông trắng rồi
    // mới bo góc — icon hiện ra có viền trắng thừa quanh nền xanh.
    const maskable = (PWA_ICONS ?? []).filter((icon) => icon.purpose === 'maskable');

    expect(maskable.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512']);
  });

  it('bản maskable và bản any là hai file khác nhau', () => {
    // Vùng an toàn 80% của maskable buộc nét vẽ phải nhỏ hơn hẳn; dùng chung một
    // file thì một trong hai ngữ cảnh chắc chắn sai lề.
    const srcByPurpose = new Map<string, string[]>();
    for (const icon of PWA_ICONS ?? []) {
      const key = String(icon.purpose);
      srcByPurpose.set(key, [...(srcByPurpose.get(key) ?? []), String(icon.src)]);
    }

    const any = srcByPurpose.get('any') ?? [];
    const maskable = srcByPurpose.get('maskable') ?? [];

    expect(any.some((src) => maskable.includes(src))).toBe(false);
  });

  it('mọi icon là đường dẫn tuyệt đối tới /icons/ và khai đúng type PNG', () => {
    // Đường dẫn tương đối được giải theo URL của manifest, không theo route hiện
    // tại — đúng ở đây nhưng là một cái bẫy im lặng nếu manifest đổi chỗ. Tuyệt
    // đối thì không có cách nào hiểu sai.
    for (const icon of PWA_ICONS ?? []) {
      expect(String(icon.src).startsWith('/icons/')).toBe(true);
      expect(icon.type).toBe('image/png');
    }
  });

  it('icons trong manifest đúng bằng PWA_ICONS', () => {
    expect(manifest.icons).toBe(PWA_ICONS);
  });
});

describe('buildManifest — nhận diện và màu', () => {
  it('short_name đủ ngắn để không bị cắt dưới icon màn hình chính', () => {
    // Android hiển thị khoảng 12 ký tự trước khi cắt bằng dấu ba chấm.
    expect(APP_SHORT_NAME.length).toBeLessThanOrEqual(12);
    expect(manifest.short_name).toBe(APP_SHORT_NAME);
  });

  it('name và description không rỗng', () => {
    expect(APP_NAME.trim()).not.toBe('');
    expect(APP_DESCRIPTION.trim()).not.toBe('');
    expect(manifest.name).toBe(APP_NAME);
    expect(manifest.description).toBe(APP_DESCRIPTION);
  });

  it('theme_color và background_color đều TRẮNG (DEC-046)', () => {
    // Trắng là chủ đạo: thanh trạng thái nối liền header trắng, màn hình chờ
    // trùng nền icon. Đổi sang xanh thương hiệu sẽ tạo một vệt màu cắt ngang
    // đỉnh màn hình và một ô vuông trắng nổi trên splash — cả hai đều là lỗi
    // thị giác chỉ thấy khi đã cài app, nên bài này khoá lại từ trước.
    expect(THEME_COLOR).toBe('#ffffff');
    expect(BACKGROUND_COLOR).toBe('#ffffff');
    expect(manifest.theme_color).toBe(THEME_COLOR);
    expect(manifest.background_color).toBe(BACKGROUND_COLOR);
  });

  it('khai lang tiếng Việt', () => {
    expect(manifest.lang).toBe('vi');
  });
});

describe('buildManifest — phạm vi v1 (DEC-024)', () => {
  it('không khai bất kỳ trường nào ngụ ý chạy offline', () => {
    // v1 KHÔNG có service worker. `serviceworker` là trường manifest đã lỗi thời
    // nhưng vẫn là dấu hiệu rõ nhất cho thấy ai đó đang kéo offline sync vào v1
    // mà không qua DEC mới.
    expect(Object.keys(manifest)).not.toContain('serviceworker');
  });

  it('không khoá hướng màn hình', () => {
    // v1 không có bố cục riêng cho landscape; khoá hướng là ràng buộc chưa tài
    // liệu nào yêu cầu.
    expect(manifest.orientation).toBeUndefined();
  });
});
