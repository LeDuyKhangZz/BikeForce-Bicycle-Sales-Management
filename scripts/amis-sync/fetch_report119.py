"""
Report 119 -> Supabase. Ban tu dong cua crawl_nvkd.py, khong hoi y/n.
Chi ghi 4 cot cua rieng no, khong dung target_amount / current_amount.

Chay:  python fetch_report119.py            (thang hien tai)
       python fetch_report119.py 2026 7     (chi dinh ky)
       python fetch_report119.py 2026 8 --dry
"""

import base64
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env", encoding="utf-8-sig")

API_URL = "https://amisapp.misa.vn/crm/g2/api/report/Report/reportPaging"
TOKEN = os.getenv("AMIS_BEARER_TOKEN", "").strip()
COMPANY = os.getenv("AMIS_COMPANY_CODE", "BEDTGJL2").strip()
UNIT_ID = int(os.getenv("RPT_ROOT_UNIT_ID", "9"))
UNIT_TEXT = os.getenv("RPT_ROOT_UNIT_TEXT", "Phong kinh doanh")

SB_URL = (os.getenv("BIKEFORCE_SUPABASE_URL") or "").rstrip("/")
SB_KEY = os.getenv("BIKEFORCE_SERVICE_ROLE_KEY")

VN = timezone(timedelta(hours=7))
REPORT_ID = 119

COLUMNS = ["ID", "FormLayoutID", "FormLayoutIDText", "OwnerID", "OwnerIDText"]
METRICS = [
    "QuantityAccountInCharge", "QuantityAccountInteractive",
    "QuantityAccountSold", "QuantityAccountSoldThisPeriod",
    "RateAccountInCharge", "RateAccountInteractive",
    "NoOfOrders", "Sales", "ReturnSales", "NetSales",
]


def b64(t): return base64.b64encode(t.encode("utf-8")).decode("ascii")


def iso_ms(dt):
    u = dt.astimezone(timezone.utc)
    return u.strftime("%Y-%m-%dT%H:%M:%S.") + f"{u.microsecond // 1000:03d}Z"


def month_range(y, m):
    s = datetime(y, m, 1, tzinfo=VN)
    n = datetime(y + 1, 1, 1, tzinfo=VN) if m == 12 else datetime(y, m + 1, 1, tzinfo=VN)
    return s, n - timedelta(milliseconds=1)


def num(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def find_rows(node):
    def search(n):
        if isinstance(n, list):
            if n and isinstance(n[0], dict) and "NetSales" in n[0]:
                return [i for i in n if isinstance(i, dict)]
            for i in n:
                r = search(i)
                if r is not None:
                    return r
        elif isinstance(n, dict):
            for v in n.values():
                r = search(v)
                if r is not None:
                    return r
        return None
    return [{k: v for k, v in r.items() if not k.endswith("IDs")}
            for r in (search(node) or [])]


def fetch(from_d, to_d, period):
    body = {
        "Columns": b64(",".join(COLUMNS)),
        "CustomColumns": b64(",".join(["Name"] + METRICS)),
        "Sorts": [], "Start": 0, "Page": 1, "PageSize": 200, "Filters": [],
        "LayoutCode": "Report", "DefaultTotal": False,
        "IsMappingData": False, "IsApproved": False,
        "CustomPagingData": {
            "ID": REPORT_ID, "ReportDynamicID": 0,
            "Data": {
                "IsViewEmployee": True, "ProductCategoryIDs": None,
                "RevenueStatusIDs": "3", "StatisticalsBy": "1,2,3",
                "StatisticalsByText": "Don hang, Don hang cha, Tra lai hang ban",
                "Period": period, "FromDate": iso_ms(from_d), "ToDate": iso_ms(to_d),
                "AnalysisType": 2, "AnalysisTypeText": "Co cau to chuc",
                "OrganizationUnitID": UNIT_ID, "OrganizationUnitIDText": UNIT_TEXT,
                "MISACode": None, "ID": REPORT_ID, "ReportDynamicID": 0,
                "Config": {"GroupColumn": [], "Filter": [], "Formula": "", "FormulaContent": ""},
                "IsLastOrganization": 0, "WeekText": "", "HasPermission": True,
                "RevenueStatusIDsText": "Da ghi", "IsDisplay": True,
                "ProductStatisticsID": "1", "ProductStatisticsIDText": "Hang hoa",
            },
        },
        "IsUsedELTS": True, "ListGmailPage": [], "ListFacebookPage": {},
        "IsGetCache": False, "IsCheckInactive": False, "IsConverted": False,
        "SessionID": "78fdd0e3-5a9d-001a-7eb0-f3a2c3e3db80",
        "LayoutCodeCheckPermission": "Report",
        "AISearchKeyword": "", "SkipNormalSearch": False,
    }
    r = requests.post(API_URL, headers={
        "Accept": "application/json, text/plain, */*",
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "companycode": COMPANY, "layoutcode": "report",
        "X-MISA-Language": "vi-VN",
        "Origin": "https://amisapp.misa.vn",
        "Referer": f"https://amisapp.misa.vn/crm/report/view/{REPORT_ID}/0",
    }, json=body, timeout=90)

    if r.status_code in (401, 403):
        sys.exit("Token het han. Chay amis-harvest.ts truoc.")
    if not r.ok:
        sys.exit(f"HTTP {r.status_code}: {r.text[:400]}")
    return find_rows(r.json())


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv

    now = datetime.now(VN)
    if len(args) >= 2:
        year, month = int(args[0]), int(args[1])
    else:
        year, month = now.year, now.month

    prev = now.replace(day=1) - timedelta(days=1)
    if (year, month) == (prev.year, prev.month):
        period = 14
    elif (year, month) == (now.year, now.month):
        period = 13
    else:
        period = 0

    if not TOKEN:
        sys.exit("Thieu AMIS_BEARER_TOKEN trong .env")

    print("=" * 74)
    print(f"REPORT 119 — KHACH HANG THEO NVKD — thang {month:02d}/{year}")
    print("=" * 74)

    from_d, to_d = month_range(year, month)
    rows = fetch(from_d, to_d, period)
    if not rows:
        sys.exit("Khong co du lieu.")

    print(f"\n{'NHAN VIEN':<28}{'KH TT':>8}{'KH MUA':>8}{'DON':>6}{'DS THUAN':>18}")
    print("-" * 74)
    for x in sorted(rows, key=lambda r: -num(r.get("NetSales"))):
        print(f"{str(x.get('Name') or '')[:26]:<28}"
              f"{num(x.get('QuantityAccountInteractive')):>8,.0f}"
              f"{num(x.get('QuantityAccountSold')):>8,.0f}"
              f"{num(x.get('NoOfOrders')):>6,.0f}"
              f"{num(x.get('NetSales')):>18,.0f}")
    print("-" * 74)
    print(f"{'TONG':<28}{'':>8}{'':>8}"
          f"{sum(num(x.get('NoOfOrders')) for x in rows):>6,.0f}"
          f"{sum(num(x.get('NetSales')) for x in rows):>18,.0f}")

    if dry:
        print("\n[--dry] Khong ghi Supabase.")
        return
    if not SB_URL or not SB_KEY:
        print("\nThieu bien Supabase -> bo qua ghi.")
        return

    payload = [{
        "period_month": f"{year:04d}-{month:02d}-01",
        "employee_name": str(x.get("Name") or "").strip(),
        "net_sales": num(x.get("NetSales")),
        "sales": num(x.get("Sales")),
        "return_sales": num(x.get("ReturnSales")),
        "no_of_orders": int(num(x.get("NoOfOrders"))),
        "qty_account_in_charge": int(num(x.get("QuantityAccountInCharge"))),
        "qty_account_interactive": int(num(x.get("QuantityAccountInteractive"))),
        "qty_account_sold": int(num(x.get("QuantityAccountSold"))),
        "qty_account_sold_this_period": int(num(x.get("QuantityAccountSoldThisPeriod"))),
    } for x in rows if str(x.get("Name") or "").strip()]

    print(f"\nGhi {len(payload)} dong vao Supabase...")
    r = requests.post(
        f"{SB_URL}/rest/v1/amis_employee_metrics",
        headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                 "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=payload, timeout=60)
    print("OK" if r.ok else f"LOI HTTP {r.status_code}: {r.text[:400]}")


if __name__ == "__main__":
    main()
