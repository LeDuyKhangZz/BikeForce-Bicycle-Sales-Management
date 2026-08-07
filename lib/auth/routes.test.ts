import { describe, expect, it } from 'vitest';

import {
  ADMIN_HOME,
  LOGIN_PATH,
  SALES_HOME,
  dashboardPathFor,
  isPublicPath,
  requiredRoleForPath,
  sanitizeNextPath,
} from './routes';

/** TẦNG 1 — unit thuần, không I/O (docs/08 §2.2). */

describe('isPublicPath', () => {
  it('chỉ /login là public', () => {
    expect(isPublicPath(LOGIN_PATH)).toBe(true);
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath(SALES_HOME)).toBe(false);
    expect(isPublicPath(ADMIN_HOME)).toBe(false);
  });
});

describe('dashboardPathFor', () => {
  it('mỗi role về đúng dashboard của mình', () => {
    expect(dashboardPathFor('ADMIN')).toBe(ADMIN_HOME);
    expect(dashboardPathFor('SALES')).toBe(SALES_HOME);
  });
});

describe('requiredRoleForPath', () => {
  it('mọi route dưới /sales cần role SALES', () => {
    expect(requiredRoleForPath('/sales')).toBe('SALES');
    expect(requiredRoleForPath('/sales/today')).toBe('SALES');
    expect(requiredRoleForPath('/sales/today/morning')).toBe('SALES');
    expect(requiredRoleForPath('/sales/reports/abc-123')).toBe('SALES');
  });

  it('mọi route dưới /admin cần role ADMIN', () => {
    expect(requiredRoleForPath('/admin')).toBe('ADMIN');
    expect(requiredRoleForPath('/admin/reports')).toBe('ADMIN');
    expect(requiredRoleForPath('/admin/sales/new')).toBe('ADMIN');
  });

  it('BR-022 — route ảnh chỉ cần "đã đăng nhập", quyền từng id do RLS quyết định', () => {
    expect(requiredRoleForPath('/api/reports/abc-123/share-image')).toBeNull();
  });

  it('không khớp nhầm tiền tố của route khác', () => {
    // '/salesforce' KHÔNG được coi là route của group (sales).
    expect(requiredRoleForPath('/salesforce')).toBeNull();
    expect(requiredRoleForPath('/administration')).toBeNull();
    expect(requiredRoleForPath('/')).toBeNull();
  });
});

describe('sanitizeNextPath — chống open redirect', () => {
  it('chấp nhận đường dẫn nội bộ', () => {
    expect(sanitizeNextPath('/sales/history')).toBe('/sales/history');
    expect(sanitizeNextPath('/admin/reports?month=2026-08')).toBe('/admin/reports?month=2026-08');
  });

  it('từ chối URL tuyệt đối', () => {
    expect(sanitizeNextPath('https://evil.example/steal')).toBeNull();
    expect(sanitizeNextPath('http://evil.example')).toBeNull();
  });

  it('từ chối dạng protocol-relative //host mà trình duyệt hiểu là tuyệt đối', () => {
    expect(sanitizeNextPath('//evil.example/steal')).toBeNull();
  });

  it('từ chối dạng /\\host — biến thể mà nhiều bộ lọc bỏ sót', () => {
    expect(sanitizeNextPath('/\\evil.example')).toBeNull();
  });

  it('từ chối ký tự điều khiển dùng để chẻ header', () => {
    expect(sanitizeNextPath('/sales\r\nSet-Cookie: a=b')).toBeNull();
    expect(sanitizeNextPath('/sales\u0000')).toBeNull();
    expect(sanitizeNextPath('/sales\u007f')).toBeNull();
  });

  it('KHÔNG chặn nhầm khoảng trắng thường — nó không phải ký tự điều khiển', () => {
    expect(sanitizeNextPath('/admin/reports?q=Le Duy')).toBe('/admin/reports?q=Le Duy');
  });

  it('từ chối chính /login để không tạo vòng lặp redirect', () => {
    expect(sanitizeNextPath('/login')).toBeNull();
    expect(sanitizeNextPath('/login?next=/sales')).toBeNull();
  });

  it('từ chối giá trị rỗng, null, undefined', () => {
    expect(sanitizeNextPath('')).toBeNull();
    expect(sanitizeNextPath(null)).toBeNull();
    expect(sanitizeNextPath(undefined)).toBeNull();
  });
});
