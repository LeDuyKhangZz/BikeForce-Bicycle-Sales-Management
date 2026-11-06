import { SiShopee, SiTiktok } from '@icons-pack/react-simple-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveMarketplaceAdTopUp } from '@/features/admin-ecommerce/actions';

type Props = { marketplaceCode: 'TIKTOK' | 'SHOPEE'; label: string; currentTotalDisplay: string };

export function AdTopUpForm({ marketplaceCode, label, currentTotalDisplay }: Props) {
  return (
    <form action={saveMarketplaceAdTopUp} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <input type="hidden" name="marketplace_code" value={marketplaceCode} />
      <p className="text-sm text-muted-foreground">Tổng đã nạp: <strong className="tabular-nums text-heading">{currentTotalDisplay}</strong></p>
      <label className="flex flex-col gap-1 text-sm font-semibold text-heading">
        <span className="flex items-center gap-2">
          {marketplaceCode === 'TIKTOK'
            ? <SiTiktok aria-hidden="true" size={18} color="#111827" />
            : <SiShopee aria-hidden="true" size={18} color="#ee4d2d" />}
          {label} · nhập số tiền nạp thêm
        </span>
        <Input name="amount" type="number" min="1" step="1" placeholder="Ví dụ: 22000000" required inputMode="numeric" />
      </label>
      <Button type="submit">Ghi nhận lần nạp</Button>
    </form>
  );
}
