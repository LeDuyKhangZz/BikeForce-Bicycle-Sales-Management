/**
 * Unit test cho `lib/navigation/nav-items.ts` — PHASE 7 (Sales) và PHASE 8 (Admin).
 *
 * Hai lỗi mà file này tồn tại để chặn: **không tab nào sáng** trên một trang con
 * hợp lệ, và **tab sai sáng** vì khớp tiền tố ngắn hơn (`/admin` nuốt hết mọi
 * route Admin).
 */
import { describe, expect, it } from 'vitest';

import {
  ADMIN_NAV_ITEMS,
  ADMIN_SIDEBAR_ITEMS,
  activeNavKey,
  SALES_NAV_ITEMS,
  type NavItem,
} from './nav-items';

/**
 * Trần **6 mục** — DEC-018 nới bởi **DEC-072**, người dùng yêu cầu trực tiếp.
 *
 * ⚠ Đây là trần THẬT, không phải con số cho đẹp: ở 375px, 6 mục chia nhau ~62px
 * mỗi mục. Mục thứ bảy đưa xuống ~53px, hẹp hơn sàn 44px cộng lề chạm hai bên,
 * và nhãn chữ sẽ vỡ ba dòng. Muốn thêm nữa thì phải đổi kiểu điều hướng chứ
 * không phải nới tiếp con số này.
 */
const MAX_NAV_ITEMS = 6;

describe('cấu hình nav — ràng buộc DEC-018 (nới bởi DEC-072)', () => {
  it.each([
    ['Sales', SALES_NAV_ITEMS, 4],
    ['Admin', ADMIN_NAV_ITEMS, 6],
  ])('%s có đúng %s mục', (_label, items, expected) => {
    expect(items).toHaveLength(expected);
    expect(items.length).toBeLessThanOrEqual(MAX_NAV_ITEMS);
  });

  // Nhãn dài là thứ làm vỡ bottom nav trước cả số lượng mục. Ngưỡng lấy từ mục
  // dài nhất đang có ("Tổng quan" — 9 ký tự), không phải một con số bịa ra.
  it.each([
    ['Sales', SALES_NAV_ITEMS],
    ['Admin', ADMIN_NAV_ITEMS],
  ])('%s: nhãn đủ ngắn để bottom nav 375px không vỡ', (_label, items) => {
    for (const item of items) {
      expect(item.label.length, item.label).toBeLessThanOrEqual(9);
    }
  });

  it.each([
    ['Sales', SALES_NAV_ITEMS],
    ['Admin', ADMIN_NAV_ITEMS],
  ])('%s: mọi mục có nhãn chữ không rỗng — nav không bao giờ chỉ có icon', (_label, items) => {
    for (const item of items) {
      expect(item.label.trim().length).toBeGreaterThan(0);
    }
  });

  it.each([
    ['Sales', SALES_NAV_ITEMS],
    ['Admin', ADMIN_NAV_ITEMS],
  ])('%s: key và href đều duy nhất', (_label, items) => {
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.href)).size).toBe(items.length);
  });

  it.each([
    ['Sales', SALES_NAV_ITEMS],
    ['Admin', ADMIN_NAV_ITEMS],
  ])('%s: href của mục luôn nằm trong tập tiền tố của chính nó', (_label, items) => {
    for (const item of items) {
      expect(item.matchPrefixes).toContain(item.href);
    }
  });

  it('mỗi href tự làm sáng chính mục của nó', () => {
    for (const items of [SALES_NAV_ITEMS, ADMIN_NAV_ITEMS]) {
      for (const item of items) {
        expect(activeNavKey(items, item.href), item.href).toBe(item.key);
      }
    }
  });
});

describe('activeNavKey — Sales (FR-021, FR-022)', () => {
  it.each([
    ['dashboard hôm nay', '/sales/today', 'SALES_TODAY'],
    ['form cam kết sáng', '/sales/today/morning', 'SALES_TODAY'],
    ['form cuối ngày', '/sales/today/evening', 'SALES_TODAY'],
    ['danh sách lịch sử', '/sales/history', 'SALES_HISTORY'],
    // Màn hình con của lịch sử — nếu chỗ này trả null thì bottom nav tắt hết.
    ['chi tiết một báo cáo', '/sales/reports/8f1c-…', 'SALES_HISTORY'],
    ['tài khoản', '/sales/account', 'SALES_ACCOUNT'],
  ])('%s → %s', (_label, pathname, expected) => {
    expect(activeNavKey(SALES_NAV_ITEMS, pathname)).toBe(expected);
  });

  it('query string và trailing slash không làm mất active state', () => {
    expect(activeNavKey(SALES_NAV_ITEMS, '/sales/history/')).toBe('SALES_HISTORY');
  });

  it.each([
    ['route của vai khác', '/admin/reports'],
    ['trang đăng nhập', '/login'],
    ['gốc', '/'],
    ['tiền tố GIỐNG nhưng không phải đoạn đường dẫn thật', '/sales/todayxyz'],
    ['chuỗi rỗng', ''],
  ])('%s → null, không tab nào sáng nhầm', (_label, pathname) => {
    expect(activeNavKey(SALES_NAV_ITEMS, pathname)).toBeNull();
  });
});

describe('activeNavKey — Admin: tiền tố dài nhất thắng', () => {
  it.each([
    ['tổng quan', '/admin', 'ADMIN_OVERVIEW'],
    // Bài quan trọng nhất: `/admin` là tiền tố của tất cả, nhưng không được thắng.
    ['danh sách báo cáo', '/admin/reports', 'ADMIN_REPORTS'],
    ['chi tiết báo cáo', '/admin/reports/8f1c', 'ADMIN_REPORTS'],
    ['xem trước báo cáo nhân viên', '/admin/report-previews', 'ADMIN_REPORTS'],
    ['phân tích tháng thuộc nhóm Báo cáo', '/admin/analytics', 'ADMIN_REPORTS'],
    ['danh sách Sales', '/admin/sales', 'ADMIN_SALES'],
    ['tạo Sales', '/admin/sales/new', 'ADMIN_SALES'],
    ['chi tiết Sales', '/admin/sales/8f1c', 'ADMIN_SALES'],
    ['tài khoản Admin', '/admin/account', 'ADMIN_ACCOUNT'],
  ])('%s → %s', (_label, pathname, expected) => {
    expect(activeNavKey(ADMIN_NAV_ITEMS, pathname)).toBe(expected);
  });

  it('không phụ thuộc thứ tự khai báo mảng', () => {
    const reversed: readonly NavItem[] = [...ADMIN_NAV_ITEMS].reverse();

    for (const pathname of ['/admin', '/admin/reports/1', '/admin/sales/new', '/admin/account']) {
      expect(activeNavKey(reversed, pathname), pathname).toBe(
        activeNavKey(ADMIN_NAV_ITEMS, pathname),
      );
    }
  });

  it('đúng MỘT mục sáng tại mọi đường dẫn hợp lệ', () => {
    for (const pathname of [
      '/admin',
      '/admin/reports',
      '/admin/reports/1',
      '/admin/analytics',
      '/admin/sales',
      '/admin/sales/new',
      '/admin/account',
    ]) {
      const key = activeNavKey(ADMIN_NAV_ITEMS, pathname);
      expect(key).not.toBeNull();
      expect(ADMIN_NAV_ITEMS.filter((item) => item.key === key)).toHaveLength(1);
    }
  });
});

describe('activeNavKey — module SaleWork trên sidebar Admin', () => {
  it('làm sáng đúng mục SaleWork khi mở module', () => {
    expect(activeNavKey([...ADMIN_NAV_ITEMS, ...ADMIN_SIDEBAR_ITEMS], '/admin/salework')).toBe(
      'ADMIN_SALEWORK',
    );
  });

  it('không thêm SaleWork vào bottom nav chính', () => {
    expect(ADMIN_NAV_ITEMS.some((item) => item.key === 'ADMIN_SALEWORK')).toBe(false);
  });
});
