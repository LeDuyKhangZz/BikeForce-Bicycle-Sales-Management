import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Fingerprint, PackageCheck } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { linkCustomerIdentity, linkProductAlias } from '@/features/admin-master-data/actions';
import { requireRole } from '@/features/auth/queries';
import { createClient } from '@/lib/supabase/server';
import { parsePageParam } from '@/lib/reports/pagination';
import {
  listCustomerIdentityCandidates,
  listCustomerIdentityReview,
  listUnmappedProductAliases,
} from '@/services/admin-master-data';

export const metadata: Metadata = { title: 'Chuẩn hóa dữ liệu · BikeForce' };

type RawParam = string | string[] | undefined;
type Props = { searchParams: Promise<Record<string, RawParam>> };

function first(value: RawParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(key: 'customers' | 'unmatched' | 'products', page: number): string {
  const params = new URLSearchParams({ [key]: String(page) });
  return `/admin/master-data?${params.toString()}`;
}

export default async function AdminMasterDataPage({ searchParams }: Props) {
  await requireRole('ADMIN');
  const params = await searchParams;
  const customerPage = parsePageParam(first(params.customers));
  const unmatchedPage = parsePageParam(first(params.unmatched));
  const productPage = parsePageParam(first(params.products));
  const supabase = await createClient();
  const [customers, customerReview, products] = await Promise.all([
    listCustomerIdentityCandidates(supabase, customerPage),
    listCustomerIdentityReview(supabase, unmatchedPage),
    listUnmappedProductAliases(supabase, productPage),
  ]);
  const result = first(params.result);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-semibold tracking-wide text-accent-text uppercase">Quản trị · Chất lượng dữ liệu</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading">Chuẩn hóa khách hàng và sản phẩm</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Dữ liệu nguồn và lịch sử đơn hàng được giữ nguyên. Các liên kết dưới đây chỉ hợp nhất cách nhận diện trong những phần tiếp theo.
        </p>
      </header>

      {result === 'customer-linked' && <Notice>Đã liên kết khách SaleWork với khách MISA.</Notice>}
      {result === 'product-linked' && <Notice>Đã lưu mã sản phẩm nguồn làm alias của biến thể MISA.</Notice>}
      {result?.endsWith('error') && <Notice error>Không lưu được. Kiểm tra rằng migration đã được áp dụng và dữ liệu vẫn khớp quy tắc.</Notice>}

      <section aria-labelledby="customer-links-title" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Fingerprint aria-hidden="true" className="size-5 text-primary" />
          <div>
            <h2 id="customer-links-title" className="text-lg font-bold text-heading">Khớp chính xác · {customers.total} cặp</h2>
            <p className="text-sm text-muted-foreground">Số điện thoại sau chuẩn hóa trùng hoàn toàn; Admin duyệt từng cặp, không tự gộp.</p>
          </div>
        </div>
        {customers.rows.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">Không còn cặp SaleWork/Zalo và MISA chưa được duyệt trong trang này.</Card>
        ) : customers.rows.map((row, index) => (
          <Card key={`${row.source_customer_id}-${row.canonical_customer_id}`} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">SALEWORK / ZALO</p>
              <p className="mt-1 break-words font-semibold text-heading">{row.source_name}</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">{row.source_code ?? row.source_id} · {row.normalized_phone}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">ỨNG VIÊN MISA · MÃ {row.canonical_code ?? 'chưa có mã'}</p>
              <p className="mt-1 break-words font-semibold text-heading">{row.canonical_name}</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">Cùng số {row.normalized_phone}</p>
            </div>
            <form action={linkCustomerIdentity}>
              <input type="hidden" name="sourceId" value={row.source_customer_id} />
              <input type="hidden" name="canonicalId" value={row.canonical_customer_id} />
              <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:w-auto">
                <Check aria-hidden="true" className="size-4" /> Duyệt liên kết
              </button>
            </form>
            {index === 0 && row.total_count > 50 && <p className="text-xs text-muted-foreground lg:col-span-3">Có {row.total_count} cặp ứng viên. Danh sách hiển thị 50 cặp mỗi trang.</p>}
          </Card>
        ))}
        <PageNav label="ứng viên khách hàng" page={customerPage} total={customers.total} href={(page) => pageHref('customers', page)} />
      </section>

      <section aria-labelledby="customer-review-title" className="flex flex-col gap-3">
        <div>
          <h2 id="customer-review-title" className="text-lg font-bold text-heading">Chưa khớp hoặc cần rà soát · {customerReview.total} khách</h2>
          <p className="text-sm text-muted-foreground">Hiện toàn bộ khách SaleWork/Zalo chưa có liên kết và chưa có MISA đủ điều kiện khớp chính xác. Gợi ý theo 7 số cuối hoặc tên chỉ để đối chiếu; không thể duyệt liên kết nếu số điện thoại chưa khớp hoàn toàn.</p>
        </div>
        {customerReview.rows.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">Không còn khách nào cần rà soát.</Card>
        ) : customerReview.rows.map((row, index) => (
          <Card key={row.source_customer_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">SALEWORK / ZALO · {row.source_code ?? row.source_id}</p>
              <p className="mt-1 break-words font-semibold text-heading">{row.source_name}</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">SĐT gốc: {row.phone_raw || 'không có'} · Chuẩn hóa: {row.normalized_phone || 'không hợp lệ/để trống'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reviewReasonLabel(row.review_reason)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">GỢI Ý MISA ĐỂ KIỂM TRA</p>
              {row.suggested_misa.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">Chưa tìm thấy gợi ý theo số điện thoại hoặc tên.</p>
              ) : (
                <ul className="mt-1 flex flex-col gap-2">
                  {row.suggested_misa.map((candidate) => (
                    <li key={candidate.id} className="break-words text-sm text-heading">
                      {candidate.customer_name} · mã {candidate.customer_code || 'chưa có'} · SĐT {candidate.normalized_phone || 'không có'}
                      <span className="block text-xs text-muted-foreground">{suggestionReasonLabel(candidate.match_reason)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {index === 0 && row.total_count > 50 && <p className="text-xs text-muted-foreground lg:col-span-2">Có {row.total_count} khách cần rà soát; hiển thị 50 khách mỗi trang.</p>}
          </Card>
        ))}
        <PageNav label="khách cần rà soát" page={unmatchedPage} total={customerReview.total} href={(page) => pageHref('unmatched', page)} />
      </section>

      <section aria-labelledby="product-links-title" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <PackageCheck aria-hidden="true" className="size-5 text-primary" />
          <div>
            <h2 id="product-links-title" className="text-lg font-bold text-heading">Mã sản phẩm alias cần gán</h2>
            <p className="text-sm text-muted-foreground">Chọn mã MISA cùng màu và kích thước. Tên/mã khác nhau không tự ghép.</p>
          </div>
        </div>
        {products.rows.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">Không có mã sản phẩm nguồn nào đang chờ gán.</Card>
        ) : products.rows.map((row, index) => (
          <Card key={row.source_product_id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{row.source_system} · {row.source_id}</p>
              <p className="mt-1 break-words font-semibold text-heading">{row.product_name}</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">Mã {row.product_code} · màu {row.color || 'không phân biệt'} · size {row.size || 'không phân biệt'}</p>
            </div>
            <form id={`product-map-${row.source_product_id}`} action={linkProductAlias} className="min-w-0">
              <input type="hidden" name="sourceId" value={row.source_product_id} />
              <label htmlFor={`canonical-${row.source_product_id}`} className="mb-1 block text-sm font-medium">Biến thể chuẩn MISA</label>
              <select id={`canonical-${row.source_product_id}`} name="canonicalId" required disabled={row.misa_variants.length === 0} className="min-h-12 w-full rounded-md border border-input-border bg-background px-3 text-base text-foreground">
                <option value="">{row.misa_variants.length ? 'Chọn mã và biến thể' : 'Chưa có biến thể MISA cùng màu/size'}</option>
                {row.misa_variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>{variant.product_code} · {variant.product_name} · {variant.color || '—'} · {variant.size || '—'}</option>
                ))}
              </select>
            </form>
            <button type="submit" form={`product-map-${row.source_product_id}`} disabled={row.misa_variants.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Check aria-hidden="true" className="size-4" /> Gán alias
            </button>
            {index === 0 && row.total_count > 50 && <p className="text-xs text-muted-foreground lg:col-span-3">Có {row.total_count} alias chưa gán. Danh sách hiển thị 50 dòng mỗi trang.</p>}
          </Card>
        ))}
        <PageNav label="alias sản phẩm" page={productPage} total={products.total} href={(page) => pageHref('products', page)} />
      </section>
    </div>
  );
}

function reviewReasonLabel(reason: string): string {
  if (reason === 'missing_or_invalid_phone') return 'Thiếu số điện thoại hợp lệ.';
  if (reason === 'exact_phone_but_no_eligible_misa_code') return 'Có MISA cùng số điện thoại nhưng chưa có mã khách đủ điều kiện.';
  return 'Không có MISA trùng chính xác số điện thoại.';
}

function suggestionReasonLabel(reason: string): string {
  if (reason === 'same_phone_but_misa_code_missing') return 'Số điện thoại trùng chính xác; MISA chưa có mã khách.';
  if (reason === 'same_last_7_phone_digits_review_manually') return 'Trùng 7 số cuối; cần xác minh thủ công.';
  return 'Tên sau chuẩn hóa giống nhau; cần xác minh thủ công.';
}

function Notice({ children, error = false }: { children: string; error?: boolean }) {
  return <p role="status" className={`rounded-md border border-input-border p-3 text-sm ${error ? 'bg-background text-destructive' : 'bg-status-info-bg text-status-info-fg'}`}>{children}</p>;
}

function PageNav({ label, page, total, href }: { label: string; page: number; total: number; href: (page: number) => string }) {
  const pageCount = Math.max(1, Math.ceil(total / 50));
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={`Phân trang ${label}`} className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">Trang {page}/{pageCount} · {total} mục</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="inline-flex min-h-11 items-center rounded-md border border-input-border px-4 text-sm" href={href(page - 1)}>Trước</Link>}
        {page < pageCount && <Link className="inline-flex min-h-11 items-center rounded-md border border-input-border px-4 text-sm" href={href(page + 1)}>Sau</Link>}
      </div>
    </nav>
  );
}
