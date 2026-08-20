"""
Lấy báo cáo "Thống kê khách hàng theo đơn vị/NVKD" tu AMIS CRM.

    POST https://amisapp.misa.vn/crm/g2/api/report/Report/reportPaging

Dung chung token/cookie voi test_amis_revenue.py (cung he amisapp.misa.vn/crm)
-> khong can them bien .env nao moi.

Quy uoc ngay: giong dashboard CRM
    FromDate = ngay 1 luc 00:00:00.000 VN
    ToDate   = ngay cuoi thang luc 23:59:59.999 VN
(KHAC voi AMIS Ke toan - ben do dung ngay cuoi thang luc 00:00)
"""

import base64
import json
import os
import sys
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

REPORT_ID = 119                  # "Thong ke khach hang theo don vi/NVKD"

# Doi so nay de xem don vi khac. 9 = "Phong kinh doanh".
# Muon xem toan bo tap doan thi thu ORG_UNIT_ID=1 (THONG DAT GROUP).
ORG_UNIT_ID = int(os.getenv("RPT_ORG_UNIT_ID", "9"))
ORG_UNIT_TEXT = os.getenv("RPT_ORG_UNIT_TEXT", "Phòng kinh doanh")

# false = xem theo don vi; true = tach chi tiet tung nhan vien
IS_VIEW_EMPLOYEE = os.getenv("RPT_VIEW_EMPLOYEE", "false").lower() == "true"

REVENUE_STATUS_IDS = "3"         # "Da ghi"
STATISTICALS_BY = "1,2,3"        # Don hang, Don hang cha, Tra lai hang ban
PRODUCT_STATISTICS_ID = "1"      # "Hang hoa"
ANALYSIS_TYPE = 2                # "Co cau to chuc"

PAGE_SIZE = 200
VN_TZ = timezone(timedelta(hours=7))

COLUMNS = ["ID", "FormLayoutID", "FormLayoutIDText", "OwnerID", "OwnerIDText"]

CUSTOM_COLUMNS = [
    "Name",
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

# Nhan hien thi cho tung cot
LABELS = {
    "Name": "Đơn vị",
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

MONEY_FIELDS = {"Sales", "ReturnSales", "NetSales"}
RATE_FIELDS = {"RateAccountInCharge", "RateAccountInteractive"}


# ------------------------------------------------------------ TIEN ICH

def stop(message: str) -> None:
    print(f"\nLOI: {message}")
    sys.exit(1)


def b64(text: str) -> str:
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def iso_ms(dt: datetime) -> str:
    dt_utc = dt.astimezone(timezone.utc)
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt_utc.microsecond // 1000:03d}Z"


def month_range_vn(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=VN_TZ)
    if month == 12:
        nxt = datetime(year + 1, 1, 1, tzinfo=VN_TZ)
    else:
        nxt = datetime(year, month + 1, 1, tzinfo=VN_TZ)
    return start, nxt - timedelta(milliseconds=1)


def to_number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def find_rows(node: Any) -> list[dict[str, Any]] | None:
    """Tim danh sach dong co chua cot 'NetSales' hoac 'Name'."""
    if isinstance(node, list):
        if node and isinstance(node[0], dict) and (
            "NetSales" in node[0] or "QuantityAccountInCharge" in node[0]
        ):
            return [item for item in node if isinstance(item, dict)]
        for item in node:
            found = find_rows(item)
            if found is not None:
                return found
    elif isinstance(node, dict):
        for value in node.values():
            found = find_rows(value)
            if found is not None:
                return found
    return None


# ------------------------------------------------------------ GOI API

def fetch(from_date: datetime, to_date: datetime, period: int) -> dict[str, Any]:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json",
        "Cookie": COOKIE,
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
                "IsViewEmployee": IS_VIEW_EMPLOYEE,
                "ProductCategoryIDs": None,
                "RevenueStatusIDs": REVENUE_STATUS_IDS,
                "StatisticalsBy": STATISTICALS_BY,
                "StatisticalsByText": "Đơn hàng, Đơn hàng cha, Trả lại hàng bán",
                "Period": period,
                "FromDate": iso_ms(from_date),
                "ToDate": iso_ms(to_date),
                "AnalysisType": ANALYSIS_TYPE,
                "AnalysisTypeText": "Cơ cấu tổ chức",
                "OrganizationUnitID": ORG_UNIT_ID,
                "OrganizationUnitIDText": ORG_UNIT_TEXT,
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
    print(f"HTTP {response.status_code}")

    if response.status_code in (401, 403):
        stop("Token het han. Lay lai AMIS_BEARER_TOKEN + AMIS_COOKIE.")

    if not response.ok:
        stop(f"API tra ve loi: {response.text[:800]}")

    try:
        return response.json()
    except ValueError:
        stop(f"API khong tra JSON: {response.text[:500]}")
        return {}


# ------------------------------------------------------------ HIEN THI

def print_table(rows: list[dict[str, Any]]) -> None:
    show = [
        "Name",
        "QuantityAccountInCharge",
        "QuantityAccountInteractive",
        "QuantityAccountSold",
        "QuantityAccountSoldThisPeriod",
        "NoOfOrders",
        "Sales",
        "ReturnSales",
        "NetSales",
    ]

    widths = {"Name": 26}
    for field in show[1:]:
        widths[field] = max(len(LABELS[field]), 16) + 2

    header = f"{LABELS['Name']:<{widths['Name']}}"
    header += "".join(f"{LABELS[f]:>{widths[f]}}" for f in show[1:])
    print("\n" + header)
    print("-" * len(header))

    totals = {f: 0.0 for f in show[1:]}

    for row in rows:
        name = str(row.get("Name") or "")[:24]
        line = f"{name:<{widths['Name']}}"
        for field in show[1:]:
            value = to_number(row.get(field))
            totals[field] += value
            line += f"{value:>{widths[field]},.0f}"
        print(line)

    print("-" * len(header))
    total_line = f"{'TỔNG':<{widths['Name']}}"
    total_line += "".join(f"{totals[f]:>{widths[f]},.0f}" for f in show[1:])
    print(total_line)
    print(f"\nSo dong: {len(rows)}")


def export_csv(rows: list[dict[str, Any]], path: str = "thong_ke_kh.csv") -> None:
    import csv

    with open(path, "w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.writer(fp)
        writer.writerow([LABELS.get(c, c) for c in CUSTOM_COLUMNS])
        for row in rows:
            writer.writerow([row.get(c, "") for c in CUSTOM_COLUMNS])

    print(f"Da xuat CSV -> {path}  (day du {len(CUSTOM_COLUMNS)} cot)")


# ------------------------------------------------------------ MAIN

def main() -> None:
    if not BEARER_TOKEN:
        stop("Thieu AMIS_BEARER_TOKEN trong .env")
    if not COOKIE:
        stop("Thieu AMIS_COOKIE trong .env")

    now_vn = datetime.now(VN_TZ)

    # Mac dinh: THANG TRUOC (giong man hinh dang mo). Ghi de bang .env neu can.
    prev = now_vn.replace(day=1) - timedelta(days=1)
    year = int(os.getenv("RPT_YEAR", prev.year))
    month = int(os.getenv("RPT_MONTH", prev.month))

    if (year, month) == (prev.year, prev.month):
        period = 14          # Thang truoc
    elif (year, month) == (now_vn.year, now_vn.month):
        period = 13          # Thang nay
    else:
        period = 0           # Tuy chon

    from_date, to_date = month_range_vn(year, month)

    print("=" * 70)
    print("THONG KE KHACH HANG THEO DON VI / NVKD")
    print(f"Ky        : Thang {month:02d}/{year}  (Period={period})")
    print(f"FromDate  : {iso_ms(from_date)}")
    print(f"ToDate    : {iso_ms(to_date)}")
    print(f"Don vi    : {ORG_UNIT_TEXT}  (ID={ORG_UNIT_ID})")
    print(f"Chi tiet NV: {'Co' if IS_VIEW_EMPLOYEE else 'Khong'}")
    print("=" * 70)

    payload = fetch(from_date, to_date, period)

    with open("customer_stats_raw.json", "w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, indent=2)
    print("Da luu response goc -> customer_stats_raw.json")

    rows = find_rows(payload)

    if rows is None:
        stop(
            "Khong tim thay dong du lieu trong response.\n"
            "  -> Mo customer_stats_raw.json de xem cau truc thuc te."
        )
    if not rows:
        stop("Khong co du lieu. Kiem tra lai ky bao cao hoac OrganizationUnitID.")

    print_table(rows)
    export_csv(rows)


if __name__ == "__main__":
    main()