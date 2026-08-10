/**
 * Điều hướng chính của hai vai — DEC-018, `docs/05 §10`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  VÌ SAO Ở `lib/` CHỨ KHÔNG NẰM TRONG COMPONENT NAV
 * ─────────────────────────────────────────────────────────────────────────
 *  Câu hỏi "đang ở trang nào thì tab nào sáng" nghe như chuyện trình bày, nhưng
 *  nó là một phép **khớp tiền tố có thứ tự ưu tiên** và nó sai rất dễ:
 *  `/sales/reports/<id>` phải làm sáng tab **Lịch sử** (người dùng tới đó từ
 *  danh sách), còn `/sales/today/evening` phải làm sáng tab **Hôm nay**. Không
 *  có tab nào sáng, hoặc hai tab cùng sáng, là lỗi chỉ lộ ra khi bấm tay.
 *  Tách thành hàm thuần thì nó kiểm được bằng unit test (AGENTS.md §1.3).
 *
 *  Ở đây CHỈ có `key`, `label`, `href` và tập tiền tố. **Icon nằm ở component** —
 *  `lib/` không import `lucide-react`, không biết gì về React.
 */

export type NavKey =
  | 'SALES_TODAY'
  | 'SALES_HISTORY'
  | 'SALES_ACCOUNT'
  | 'ADMIN_OVERVIEW'
  | 'ADMIN_REPORTS'
  | 'ADMIN_SALES'
  | 'ADMIN_ACCOUNT';

export type NavItem = {
  readonly key: NavKey;
  /** Nhãn chữ — BẮT BUỘC. Bottom nav luôn có icon **và** chữ (DEC-018). */
  readonly label: string;
  readonly href: string;
  /**
   * Mọi tiền tố đường dẫn thuộc về mục này. Luôn chứa chính `href`, cộng các
   * nhánh con không nằm dưới `href` về mặt chuỗi (`/sales/reports/*` thuộc về
   * tab Lịch sử chứ không phải một tab riêng).
   */
  readonly matchPrefixes: readonly string[];
};

/** Bottom nav Sales — đúng 3 mục, dưới trần 5 mục của DEC-018. */
export const SALES_NAV_ITEMS: readonly NavItem[] = [
  {
    key: 'SALES_TODAY',
    label: 'Hôm nay',
    href: '/sales/today',
    matchPrefixes: ['/sales/today'],
  },
  {
    key: 'SALES_HISTORY',
    label: 'Lịch sử',
    href: '/sales/history',
    // `/sales/reports/<id>` là màn hình CON của lịch sử (FR-022 mở từ FR-021),
    // nên nó giữ tab Lịch sử sáng thay vì làm tắt hết cả ba.
    matchPrefixes: ['/sales/history', '/sales/reports'],
  },
  {
    key: 'SALES_ACCOUNT',
    label: 'Tài khoản',
    href: '/sales/account',
    matchPrefixes: ['/sales/account'],
  },
];

/** Bottom nav Admin — đúng 4 mục (DEC-018), dùng từ Phase 8. */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  {
    key: 'ADMIN_OVERVIEW',
    label: 'Tổng quan',
    href: '/admin',
    // Cố ý CHỈ khớp chính nó: `/admin` là tiền tố của mọi route Admin, để
    // nguyên thì tab Tổng quan sáng ở khắp nơi.
    matchPrefixes: ['/admin'],
  },
  {
    key: 'ADMIN_REPORTS',
    label: 'Báo cáo',
    href: '/admin/reports',
    matchPrefixes: ['/admin/reports', '/admin/analytics'],
  },
  {
    key: 'ADMIN_SALES',
    label: 'Sales',
    href: '/admin/sales',
    matchPrefixes: ['/admin/sales'],
  },
  {
    key: 'ADMIN_ACCOUNT',
    label: 'Tài khoản',
    href: '/admin/account',
    matchPrefixes: ['/admin/account'],
  },
];

/**
 * `pathname` khớp `prefix` khi nó **là** tiền tố đó hoặc nằm dưới nó một đoạn
 * đường dẫn thật.
 *
 * So sánh bằng `startsWith(prefix)` trần là sai: `/sales/todayxyz` sẽ khớp
 * `/sales/today`. Phải đòi ký tự kế tiếp là `/`.
 */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Mục điều hướng đang hoạt động, hoặc `null` nếu đường dẫn không thuộc mục nào.
 *
 * **Tiền tố dài nhất thắng.** Nếu không, `/admin/reports` sẽ khớp cả `/admin`
 * (Tổng quan) lẫn `/admin/reports` (Báo cáo) và kết quả phụ thuộc vào thứ tự
 * khai báo mảng — một sự phụ thuộc ngầm mà không ai nhớ khi thêm mục mới.
 */
export function activeNavKey(items: readonly NavItem[], pathname: string): NavKey | null {
  if (typeof pathname !== 'string' || pathname === '') return null;

  let bestKey: NavKey | null = null;
  let bestLength = -1;

  for (const item of items) {
    for (const prefix of item.matchPrefixes) {
      if (matchesPrefix(pathname, prefix) && prefix.length > bestLength) {
        bestKey = item.key;
        bestLength = prefix.length;
      }
    }
  }

  return bestKey;
}
