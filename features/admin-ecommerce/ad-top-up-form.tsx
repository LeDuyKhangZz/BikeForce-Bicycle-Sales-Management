import { SiShopee, SiTiktok } from '@icons-pack/react-simple-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveMarketplaceAdTopUp } from '@/features/admin-ecommerce/actions';

type Props = { marketplaceCode: 'TIKTOK' | 'SHOPEE'; label: string; amount: number };
export function AdTopUpForm({ marketplaceCode, label, amount }: Props) {
  return <form action={saveMarketplaceAdTopUp} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end">
    <input type="hidden" name="marketplace_code" value={marketplaceCode} />
    <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-heading"><span className="flex items-center gap-2">{marketplaceCode === 'TIKTOK' ? <SiTiktok aria-hidden="true" size={18} color="#111827" /> : <SiShopee aria-hidden="true" size={18} color="#ee4d2d" />}{label}</span>
      <Input name="amount" type="number" min="0" step="1" defaultValue={amount} required inputMode="numeric" />
    </label>
    <Button type="submit">Lưu</Button>
  </form>;
}
