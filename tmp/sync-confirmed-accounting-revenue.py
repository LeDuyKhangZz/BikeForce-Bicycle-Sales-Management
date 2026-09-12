import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

repo = Path(__file__).resolve().parent.parent
load_dotenv(repo / 'scripts/amis-sync/.env', override=True)
sys.path.insert(0, str(repo / 'scripts/amis-sync'))
import push_amis as push

name = 'Nguyễn Thị Như Quỳnh'
amount = push.pull_receivable(2026, 8).get(name)
if amount is None:
    raise RuntimeError('Không có dòng nguồn Kế toán đúng tên/kỳ.')
row = {'period_month': '2026-08-01', 'employee_name': name, 'receive_amount': amount}
response = requests.post(
    f'{push.SUPABASE_URL}/rest/v1/amis_employee_metrics',
    headers={'apikey': push.SERVICE_KEY, 'Authorization': f'Bearer {push.SERVICE_KEY}',
             'Prefer': 'resolution=merge-duplicates,return=representation'},
    json=[row], timeout=60,
)
if not response.ok:
    raise RuntimeError(f'Lỗi ghi nguồn công nợ HTTP {response.status_code}')
result = response.json()
if not isinstance(result, list) or len(result) != 1 or any(result[0].get(k) != v for k, v in row.items()):
    raise RuntimeError('Response sau ghi không khớp nguồn.')
print(f'Đã xác minh nguồn receive_amount tháng 2026-08: {amount:.0f}; không ghi cột CRM hay kỳ khác.')
