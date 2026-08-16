"""
Lay bao cao "Thong ke khach hang theo don vi/NVKD" THEO TUNG NHAN VIEN.

Van de: phan cong nhan vien thay doi theo thang, nen khong the map cung
don vi -> nguoi. Script nay de bao cao tu tra ve ai thuoc dau trong ky do.

Cach lam:
  1. Thu goi thang o cap goc voi IsViewEmployee=true (nhanh nhat).
  2. Neu khong duoc -> duyet de quy cay don vi:
         goi unit X voi IsViewEmployee=false  -> ra cac don vi con
         khong con con nua (nut la)           -> goi IsViewEmployee=true -> ra nguoi

Dung chung token/cookie voi cac script CRM khac (amisapp.misa.vn/crm).
"""

import base64
import csv
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------- CAU HINH

API_URL = "https://amisapp.misa.vn/crm/g2/api/report/Report/reportPaging"

BEARER_TOKEN = os.getenv("AMIS_BEARER_TOKEN", "").strip()
COOKIE = os.getenv("AMIS_COOKIE", "").strip()
COMPANY_CODE = os.getenv("AMIS_COMPANY_CODE", "BEDTGJL2").strip()

REPORT_ID = 119

ROOT_UNIT_ID = int(os.getenv("RPT_ROOT_UNIT_ID", "1"))
ROOT_UNIT_TEXT = os.getenv("RPT_ROOT_UNIT_TEXT", "THỐNG ĐẠT GROUP")

REVENUE_STATUS_IDS = "3"
STATISTICALS_BY = "1,2,3"
PRODUCT_STATISTICS_ID = "1"
ANALYSIS_TYPE = 2
PAGE_SIZE = 200

MAX_DEPTH = 8
DELAY_SECONDS = 0.3          # tranh goi qua nhanh

VN_TZ = timezone(timedelta(hours=7))

COLUMNS = ["ID", "FormLayoutID", "FormLayoutIDText", "OwnerID", "OwnerIDText"]

METRICS = [
    "QuantityAccountInCharge",
    "QuantityAccountInteractive",
    "QuantityAccountSold",
    "QuantityAccountSoldThisPeriod",
    "RateAccountInCharge",
    "RateAccountInteractive",
    "NoOfOrders",
    "Sales",
    "ReturnSales",
    "NetSales",
]

CUSTOM_COLUMNS = ["Name"] + METRICS

LABELS = {
    "QuantityAccountInCharge": "SL KH phụ trách",
    "QuantityAccountInteractive": "SL KH tương tác",
    "QuantityAccountSold": "SL KH mua hàng",
    "QuantityAccountSoldThisPeriod": "SL KH mua trong kỳ",
    "RateAccountInCharge": "Tỷ lệ KH phụ trách",
    "RateAccountInteractive": "Tỷ lệ KH tương tác",
    "NoOfOrders": "Số đơn hàng",
    "Sales": "Doanh số",
    "ReturnSales": "Trả lại hàng bán",
    "NetSales": "Doanh số thuần",
}


# ------------------------------------------------------------ TIEN ICH

def stop(message: str) -> None:
    print(f"\nLOI: {message}")
    sys.exit(1)


def b64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def iso_ms(dt: datetime) -> str:
    u = dt.astimezone(timezone.utc)
    return u.strftime("%Y-%m-%dT%H:%M:%S.") + f"{u.microsecond // 1000:03d}Z"


def month_range_vn(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=VN_TZ)
    nxt = (
        datetime(year + 1, 1, 1, tzinfo=VN_TZ)
        if month == 12
        else datetime(year, month + 1, 1, tzinfo=VN_TZ)
    )
    return start, nxt - timedelta(milliseconds=1)


def to_number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def find_rows(node: Any) -> list[dict[str, Any]]:
    """Tim danh sach dong. Loai bo cac truong *IDs (danh sach hang nghin ID KH)."""
    def search(n: Any) -> list[dict[str, Any]] | None:
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

    rows = search(node) or []
    return [
        {k: v for k, v in row.items() if not k.endswith("IDs")}
        for row in rows
    ]


# ------------------------------------------------------------ GOI API

def fetch(
    unit_id: int,
    unit_text: str,
    view_employee: bool,
    from_date: datetime,
    to_date: datetime,
    period: int,
) -> list[dict[str, Any]]:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json",
        # Cookie DA BO — `test_no_cookie.py` ngay 15/08/2026 do duoc: endpoint
        # nay chi can Bearer token, bo cookie van tra du du lieu.
        "companycode": COMPANY_CODE,
        "layoutcode": "report",
        "X-MISA-Language": "vi-VN",
        "Origin": "https://amisapp.misa.vn",
        "Referer": f"https://amisapp.misa.vn/crm/report/view/{REPORT_ID}/0",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
        ),
    }

    body = {
        "Columns": b64(",".join(COLUMNS)),
        "CustomColumns": b64(",".join(CUSTOM_COLUMNS)),
        "Sorts": [],
        "Start": 0,
        "Page": 1,
        "PageSize": PAGE_SIZE,
        "Filters": [],
        "LayoutCode": "Report",
        "DefaultTotal": False,
        "IsMappingData": False,
        "IsApproved": False,
        "CustomPagingData": {
            "ID": REPORT_ID,
            "ReportDynamicID": 0,
            "Data": {
                "IsViewEmployee": view_employee,
                "ProductCategoryIDs": None,
                "RevenueStatusIDs": REVENUE_STATUS_IDS,
                "StatisticalsBy": STATISTICALS_BY,
                "StatisticalsByText": "Đơn hàng, Đơn hàng cha, Trả lại hàng bán",
                "Period": period,
                "FromDate": iso_ms(from_date),
                "ToDate": iso_ms(to_date),
                "AnalysisType": ANALYSIS_TYPE,
                "AnalysisTypeText": "Cơ cấu tổ chức",
                "OrganizationUnitID": unit_id,
                "OrganizationUnitIDText": unit_text,
                "MISACode": None,
                "ID": REPORT_ID,
                "ReportDynamicID": 0,
                "Config": {
                    "GroupColumn": [],
                    "Filter": [],
                    "Formula": "",
                    "FormulaContent": "",
                },
                "IsLastOrganization": 0,
                "WeekText": "",
                "HasPermission": True,
                "RevenueStatusIDsText": "Đã ghi",
                "IsDisplay": True,
                "ProductStatisticsID": PRODUCT_STATISTICS_ID,
                "ProductStatisticsIDText": "Hàng hóa",
            },
        },
        "IsUsedELTS": True,
        "ListGmailPage": [],
        "ListFacebookPage": {},
        "IsGetCache": False,
        "IsCheckInactive": False,
        "IsConverted": False,
        "SessionID": "78fdd0e3-5a9d-001a-7eb0-f3a2c3e3db80",
        "LayoutCodeCheckPermission": "Report",
        "AISearchKeyword": "",
        "SkipNormalSearch": False,
    }

    response = requests.post(API_URL, headers=headers, json=body, timeout=90)

    if response.status_code in (401, 403):
        stop("Token het han. Lay lai AMIS_BEARER_TOKEN.")
    if not response.ok:
        stop(f"HTTP {response.status_code}: {response.text[:400]}")

    time.sleep(DELAY_SECONDS)
    return find_rows(response.json())


# ------------------------------------------------------------ DUYET CAY

def crawl(
    from_date: datetime, to_date: datetime, period: int
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    visited: set[int] = set()
    stats = {"units": 0, "calls": 0}

    def walk(unit_id: int, unit_name: str, path: list[str], depth: int) -> None:
        if depth > MAX_DEPTH or unit_id in visited:
            return
        visited.add(unit_id)
        stats["units"] += 1

        indent = "  " * depth
        children = fetch(unit_id, unit_name, False, from_date, to_date, period)
        stats["calls"] += 1

        # Loai dong tro ve chinh no (tranh de quy vo han)
        children = [c for c in children if int(to_number(c.get("ID"))) != unit_id]

        if children:
            print(f"{indent}{unit_name}  ({len(children)} don vi con)")
            for child in children:
                child_id = int(to_number(child.get("ID")))
                child_name = str(child.get("Name") or f"Unit {child_id}")
                if child_id:
                    walk(child_id, child_name, path + [unit_name], depth + 1)
            return

        # Nut la -> lay danh sach nhan vien
        employees = fetch(unit_id, unit_name, True, from_date, to_date, period)
        stats["calls"] += 1
        print(f"{indent}{unit_name}  -> {len(employees)} nhan vien")

        for emp in employees:
            row = {
                "Đường dẫn": " > ".join(path + [unit_name]),
                "Đơn vị": unit_name,
                "Nhân viên": str(emp.get("Name") or ""),
            }
            for field in METRICS:
                row[LABELS[field]] = to_number(emp.get(field))
            results.append(row)

    print("\nDang duyet cay don vi...\n")
    walk(ROOT_UNIT_ID, ROOT_UNIT_TEXT, [], 0)
    print(f"\nDa duyet {stats['units']} don vi, {stats['calls']} request.")
    return results


# ------------------------------------------------------------ HIEN THI

def print_table(rows: list[dict[str, Any]]) -> None:
    if not rows:
        return

    header = (
        f"{'Nhân viên':<26}{'Đơn vị':<22}"
        f"{'SL KH PT':>10}{'Đơn hàng':>10}"
        f"{'Doanh số':>18}{'Trả hàng':>16}{'DS thuần':>18}"
    )
    print("\n" + header)
    print("-" * len(header))

    totals = {k: 0.0 for k in ("SL KH phụ trách", "Số đơn hàng", "Doanh số",
                               "Trả lại hàng bán", "Doanh số thuần")}

    for row in sorted(rows, key=lambda r: -r["Doanh số thuần"]):
        print(
            f"{row['Nhân viên'][:24]:<26}{row['Đơn vị'][:20]:<22}"
            f"{row['SL KH phụ trách']:>10,.0f}{row['Số đơn hàng']:>10,.0f}"
            f"{row['Doanh số']:>18,.0f}{row['Trả lại hàng bán']:>16,.0f}"
            f"{row['Doanh số thuần']:>18,.0f}"
        )
        for key in totals:
            totals[key] += row[key]

    print("-" * len(header))
    print(
        f"{'TỔNG':<26}{'':<22}"
        f"{totals['SL KH phụ trách']:>10,.0f}{totals['Số đơn hàng']:>10,.0f}"
        f"{totals['Doanh số']:>18,.0f}{totals['Trả lại hàng bán']:>16,.0f}"
        f"{totals['Doanh số thuần']:>18,.0f}"
    )
    print(f"\nSo nhan vien: {len(rows)}")


def export_csv(rows: list[dict[str, Any]], path: str) -> None:
    if not rows:
        return
    with open(path, "w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"Da xuat CSV -> {path}")


# ------------------------------------------------------------ MAIN

def main() -> None:
    if not BEARER_TOKEN:
        stop("Thieu AMIS_BEARER_TOKEN trong .env")

    now_vn = datetime.now(VN_TZ)
    prev = now_vn.replace(day=1) - timedelta(days=1)
    year = int(os.getenv("RPT_YEAR", prev.year))
    month = int(os.getenv("RPT_MONTH", prev.month))

    if (year, month) == (prev.year, prev.month):
        period = 14
    elif (year, month) == (now_vn.year, now_vn.month):
        period = 13
    else:
        period = 0

    from_date, to_date = month_range_vn(year, month)

    print("=" * 70)
    print("THONG KE KHACH HANG THEO TUNG NHAN VIEN KINH DOANH")
    print(f"Ky   : Thang {month:02d}/{year}")
    print(f"Goc  : {ROOT_UNIT_TEXT} (ID={ROOT_UNIT_ID})")
    print("=" * 70)

    # --- Thu cach nhanh: goi thang cap goc voi IsViewEmployee=true ---
    print("\nThu cach 1: goi truc tiep cap goc voi IsViewEmployee=true...")
    flat = fetch(ROOT_UNIT_ID, ROOT_UNIT_TEXT, True, from_date, to_date, period)
    print(f"  -> tra ve {len(flat)} dong")

    if len(flat) > 1:
        print("  Co ve da ra danh sach nhan vien. Kiem tra vai ten dau:")
        for item in flat[:5]:
            print(f"     - {item.get('Name')}")
        answer = input("\n  Day co phai TEN NGUOI khong? (y/n): ").strip().lower()
        if answer == "y":
            rows = []
            for emp in flat:
                row = {
                    "Đường dẫn": ROOT_UNIT_TEXT,
                    "Đơn vị": ROOT_UNIT_TEXT,
                    "Nhân viên": str(emp.get("Name") or ""),
                }
                for field in METRICS:
                    row[LABELS[field]] = to_number(emp.get(field))
                rows.append(row)
            print_table(rows)
            export_csv(rows, "nvkd_theo_nguoi.csv")
            return

    # --- Cach 2: duyet de quy ---
    print("\nChuyen sang cach 2: duyet de quy cay don vi.")
    rows = crawl(from_date, to_date, period)

    if not rows:
        stop("Khong lay duoc nhan vien nao. Kiem tra RPT_ROOT_UNIT_ID.")

    print_table(rows)
    export_csv(rows, "nvkd_theo_nguoi.csv")


if __name__ == "__main__":
    main()