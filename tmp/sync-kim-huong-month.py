import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

repo = Path(__file__).resolve().parent.parent
load_dotenv(repo / 'scripts/amis-sync/.env', override=True)
sys.path.insert(0, str(repo / 'scripts/amis-sync'))
import push_amis as push

name = 'Nguyễn Thị Kim Hương'
row = push.pull_nvkd(2026, 8, 0)[name]
revenue = push.pull_revenue(2026, 8).get(name)
if revenue is None:
    raise RuntimeError('Không có dòng dashboard cùng tên/kỳ.')
row.update(revenue)
receivable = push.pull_receivable(2026, 8).get(name)
if receivable is None:
    raise RuntimeError('Không có dòng Kế toán cùng tên/kỳ.')
row['receive_amount'] = receivable
response = requests.post(
    f'{push.SUPABASE_URL}/rest/v1/amis_employee_metrics',
    headers={'apikey': push.SERVICE_KEY, 'Authorization': f'Bearer {push.SERVICE_KEY}',
             'Prefer': 'resolution=merge-duplicates,return=representation'},
    json=[row], timeout=60,
)
if not response.ok:
    raise RuntimeError(f'Lỗi ghi Kim Hương HTTP {response.status_code}')
saved = response.json()
if not isinstance(saved, list) or len(saved) != 1 or any(saved[0].get(k) != v for k, v in row.items()):
    raise RuntimeError('Response sau ghi không khớp nguồn Kim Hương.')
print(f'Da dong bo duy nhat Kim Huong 2026-08: doanh so {row["current_amount"]:.0f}, doanh thu {receivable:.0f}, KH {row["qty_account_sold_this_period"]}, don {row["no_of_orders"]}.')
