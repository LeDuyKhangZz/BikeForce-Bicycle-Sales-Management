"""Snapshot Report 119 riêng cho Tổng kết tháng 08/2026 Abraham (DEC-085).

Không sửa dòng AMIS thường, tháng khác hoặc dữ liệu SaleWork. Không mở browser.
Chạy: python scripts/amis-sync/sync_monthly_accounting_august.py [--write]
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / '.env', override=True)

import crawl_nvkd as nvkd
import push_amis as push

SNAPSHOT_KEY = '__MONTHLY119__:2026-08:10:60'


def fetch_snapshot() -> dict[str, object]:
    start, end = nvkd.month_range_vn(2026, 8)
    rows = nvkd.fetch(10, 'Phòng kế toán', True, start, end, 0)
    matches = [row for row in rows if row.get('ID') == 60
               and row.get('Name') == 'Kế Toán Bán Hàng']
    if len(matches) != 1:
        raise RuntimeError('Không tìm thấy duy nhất nhân viên 60 Kế Toán Bán Hàng trong Phòng kế toán.')
    row = matches[0]
    fields = {
        'sales': 'Sales', 'current_amount': 'Sales', 'net_sales': 'NetSales',
        'return_sales': 'ReturnSales', 'no_of_orders': 'NoOfOrders',
        'qty_account_in_charge': 'QuantityAccountInCharge',
        'qty_account_interactive': 'QuantityAccountInteractive',
        'qty_account_sold': 'QuantityAccountSold',
        'qty_account_sold_this_period': 'QuantityAccountSoldThisPeriod',
    }
    if any(not isinstance(row.get(source), (int, float)) for source in fields.values()):
        raise RuntimeError('Report 119 thiếu cột số liệu; không ghi số 0 thay dữ liệu thiếu.')
    return {
        'period_month': '2026-08-01', 'employee_name': SNAPSHOT_KEY,
        'org_unit_name': 'THỐNG ĐẠT GROUP > Phòng kế toán > Kế Toán Bán Hàng',
        **{target: int(row[source]) if target.startswith('qty_') or target == 'no_of_orders'
           else row[source] for target, source in fields.items()},
    }


def main() -> None:
    snapshot = fetch_snapshot()
    print(json.dumps(snapshot, ensure_ascii=True))
    if '--write' not in sys.argv:
        return
    if not push.SUPABASE_URL or not push.SERVICE_KEY:
        raise RuntimeError('Thiếu cấu hình đích tích hợp AMIS.')
    response = requests.post(
        f'{push.SUPABASE_URL}/rest/v1/amis_employee_metrics',
        headers={
            'apikey': push.SERVICE_KEY, 'Authorization': f'Bearer {push.SERVICE_KEY}',
            'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        json=[{**snapshot, 'synced_at': datetime.now(timezone.utc).isoformat()}],
        timeout=60,
    )
    if not response.ok:
        error = response.json()
        raise RuntimeError(f"Ghi snapshot thất bại HTTP {response.status_code}: {error.get('code')} {error.get('message')}")
    saved = response.json()
    if not isinstance(saved, list) or len(saved) != 1 or any(
        saved[0].get(key) != value for key, value in snapshot.items()
    ):
        raise RuntimeError('Dữ liệu trả về sau ghi không khớp snapshot Report 119.')
    print('Đã đồng bộ đúng một snapshot tháng 08/2026; các dòng AMIS thường giữ nguyên.')


if __name__ == '__main__':
    main()
