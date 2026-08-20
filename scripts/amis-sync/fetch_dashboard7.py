"""
Lay 'Doanh so da ghi CO TINH TRA HANG' (DashboardID 7) -> Supabase.

Chay:  python fetch_dashboard7.py              (thang hien tai)
       python fetch_dashboard7.py 2026 7       (chi dinh ky)
       python fetch_dashboard7.py 2026 8 --dry (khong ghi)
"""

import calendar
import json
import os
import sys
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv

from pathlib import Path
load_dotenv(Path(__file__).resolve().parent / ".env")
TOKEN = os.getenv("AMIS_BEARER_TOKEN")
COOKIE = os.getenv("AMIS_COOKIE")
COMPANY = os.getenv("AMIS_COMPANY_CODE", "BEDTGJL2")
ORG_UNIT_ID = int(os.getenv("AMIS_ORG_UNIT_ID", "4"))
ORG_UNIT_TEXT = os.getenv("AMIS_ORG_UNIT_TEXT", "VAN THINH")

SB_URL = (os.getenv("BIKEFORCE_SUPABASE_URL") or "").rstrip("/")
SB_KEY = os.getenv("BIKEFORCE_SERVICE_ROLE_KEY")

URL = "https://amisapp.misa.vn/crm/g1/api/dashboard/Dashboard/2/data"
VN = timezone(timedelta(hours=7))


def period_utc(year, month):
    last = calendar.monthrange(year, month)[1]
    f = datetime(year, month, 1, 0, 0, 0, tzinfo=VN).astimezone(timezone.utc)
    t = datetime(year, month, last, 23, 59, 59, 999000, tzinfo=VN).astimezone(timezone.utc)
    fmt = "%Y-%m-%dT%H:%M:%S.%f"
    return f.strftime(fmt)[:-3] + "Z", t.strftime(fmt)[:-3] + "Z"


def fetch(year, month):
    from_d, to_d = period_utc(year, month)
    param = {
        "Period": 13, "FromDate": from_d, "ToDate": to_d,
        "DateData": {"FromDate": from_d, "ToDate": to_d, "Period": 13},
        "IsGetNew": True, "MISACode": "0001/0013", "PageIndex": 1,
        "EmployeeID": None, "IsGetCache": False, "ReportType": "5",
        "DashboardID": 7, "ReloadAllBy": 999, "AnalysisType": 2,
        "DashboardKey": "ExpectedRevenueStatus", "IsChangedAll": False,
        "DashboardName": "Dashboard_ExpectedAmountStatus", "DashboardType": 2,
        "HasPermission": True, "EmployeeIDText": None, "IsViewEmployee": True,
        "IsGetCacheClient": False, "RevenueStatusIDs": "3,4",
        "IsLastOrganization": 0, "OrganizationUnitID": ORG_UNIT_ID,
        "IsParentSaleOrderID": "1,3", "IsParentSaleOrderIDs": "1,3",
        "OrganizationUnitIDText": ORG_UNIT_TEXT,
        "UserOrganizationUnitID": 1, "IsIncludeDraftSaleOrder": False,
        "IsSaleOrderAndParentSaleOrder": False,
    }
    r = requests.post(
        URL,
        headers={
            "Accept": "application/json, text/plain, */*",
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "Cookie": COOKIE,
            "companycode": COMPANY,
            "layoutcode": "dashboard",
            "X-MISA-Language": "vi-VN",
            "Origin": "https://amisapp.misa.vn",
            "Referer": "https://amisapp.misa.vn/crm/dashboard/main",
        },
        json={
            "DashboardType": 2, "IsGetNew": True,
            "Param": json.dumps(param, ensure_ascii=False),
            "DashboardID": 7,
            "DashboardName": "Doanh so da ghi CO TINH TRA HANG",
        },
        timeout=60,
    )
    if r.status_code == 401:
        sys.exit("Token het han. Lay lai AMIS_BEARER_TOKEN + AMIS_COOKIE.")
    if not r.ok:
        sys.exit(f"HTTP {r.status_code}: {r.text[:400]}")

    d = r.json().get("Data") or r.json().get("data")
    if isinstance(d, str):
        d = json.loads(d)
    return d


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv

    if len(args) >= 2:
        year, month = int(args[0]), int(args[1])
    else:
        n = datetime.now(VN)
        year, month = n.year, n.month

    if not TOKEN or not COOKIE:
        sys.exit("Thieu AMIS_BEARER_TOKEN / AMIS_COOKIE trong .env")

    print("=" * 78)
    print(f"DOANH SO DA GHI CO TINH TRA HANG — thang {month:02d}/{year}")
    print("=" * 78)

    data = fetch(year, month)
    emps = data.get("EmployeeData") or []
    summ = data.get("SummaryData") or {}

    print(f"\n{'NHAN VIEN':<28}{'MUC TIEU':>16}{'DA THUC HIEN':>18}{'%':>9}")
    print("-" * 78)
    for e in sorted(emps, key=lambda x: -(x.get("CurrentAmount") or 0)):
        print(f"{e['FullName'][:26]:<28}"
              f"{e.get('TargetAmount', 0):>16,.0f}"
              f"{e.get('CurrentAmount', 0):>18,.0f}"
              f"{(e.get('CurrentPercent') or 0) * 100:>8.2f}%")
    print("-" * 78)
    print(f"{'TONG':<28}"
          f"{summ.get('TargetAmount', 0):>16,.0f}"
          f"{summ.get('CurrentAmount', 0):>18,.0f}"
          f"{(summ.get('CurrentPercent') or 0) * 100:>8.2f}%")

    if dry:
        print("\n[--dry] Khong ghi Supabase.")
        return
    if not SB_URL or not SB_KEY:
        print("\nThieu BIKEFORCE_SUPABASE_URL / SERVICE_ROLE_KEY -> bo qua ghi.")
        return

    payload = [{
        "period_month": f"{year:04d}-{month:02d}-01",
        "employee_name": e["FullName"],
        "target_amount": e.get("TargetAmount") or 0,
        "current_amount": e.get("CurrentAmount") or 0,
        "org_unit_name": ORG_UNIT_TEXT,
    } for e in emps]

    print(f"\nGhi {len(payload)} dong vao Supabase...")
    r = requests.post(
        f"{SB_URL}/rest/v1/amis_employee_metrics",
        headers={
            "apikey": SB_KEY,
            "Authorization": f"Bearer {SB_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        json=payload, timeout=60,
    )
    print("OK" if r.ok else f"LOI HTTP {r.status_code}: {r.text[:500]}")


if __name__ == "__main__":
    main()
