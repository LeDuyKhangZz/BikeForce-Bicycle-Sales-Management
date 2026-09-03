"""
Lấy bảng "Doanh số đã ghi CÓ TÍNH TRẢ HÀNG" từ AMIS CRM.

Endpoint nội bộ (KHÔNG phải public API):
    POST https://amisapp.misa.vn/crm/g2/api/dashboard/Dashboard/2/data

Widget nay gop 2 loai chung tu:
    IsParentSaleOrderID = "1,3"  ->  Don hang + Tra lai hang ban
Va lay 2 trang thai ghi doanh so:
    RevenueStatusIDs    = "3,4"  ->  Da ghi + Tu choi ghi

Xac thuc bang Bearer token + Cookie cua phien trinh duyet (~24 gio).

Cach lay token/cookie:
    1. Mo https://amisapp.misa.vn/crm/dashboard/main
    2. F12 -> Network -> bam nut reload cua rieng widget
    3. Chuot phai request "data" -> Copy -> Copy as cURL
    4. Chep Authorization (bo chu "Bearer ") va Cookie vao .env
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------- CAU HINH

BEARER_TOKEN = os.getenv("AMIS_BEARER_TOKEN", "").strip()
COOKIE = os.getenv("AMIS_COOKIE", "").strip()
COMPANY_CODE = os.getenv("AMIS_COMPANY_CODE", "BEDTGJL2").strip()

# ---- Dinh danh widget "Doanh so da ghi CO TINH TRA HANG" ----
# Luu y: DASHBOARD_TYPE nam luon trong duong dan URL
DASHBOARD_TYPE = 2
DASHBOARD_ID = 7
DASHBOARD_KEY = "ExpectedRevenueStatus"
DASHBOARD_SYS_NAME = "Dashboard_ExpectedAmountStatus"
DASHBOARD_FULL_NAME = "Doanh số đã ghi CÓ TÍNH TRẢ HÀNG"

DASHBOARD_URL = (
    f"https://amisapp.misa.vn/crm/g2/api/dashboard/Dashboard/{DASHBOARD_TYPE}/data"
)

# ---- Bo loc nghiep vu (giu nguyen y het Dashboard dang dung) ----
ANALYSIS_TYPE = 2                # 2  = "Co cau to chuc"
REPORT_TYPE = "5"                # "Gia tri don hang"
REVENUE_STATUS_IDS = "3,4"       # "Da ghi, Tu choi ghi"
PARENT_SALE_ORDER_IDS = "1,3"    # "Don hang, Tra lai hang ban"  <- phan CO TINH TRA HANG
PAGE_INDEX = 2

ORG_UNIT_ID = int(os.getenv("AMIS_ORG_UNIT_ID", "1"))
ORG_UNIT_TEXT = os.getenv("AMIS_ORG_UNIT_TEXT", "THỐNG ĐẠT GROUP")
MISA_CODE = os.getenv("AMIS_MISA_CODE", "0001")

VN_TZ = timezone(timedelta(hours=7))


# ------------------------------------------------------------ TIEN ICH

def stop(message: str) -> None:
    print(f"\nLOI: {message}")
    sys.exit(1)


def iso_ms(dt: datetime) -> str:
    """Doi datetime -> chuoi UTC dang 2026-07-31T17:00:00.000Z (co mili giay)."""
    dt_utc = dt.astimezone(timezone.utc)
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt_utc.microsecond // 1000:03d}Z"


def month_range_vn(year: int, month: int) -> tuple[datetime, datetime]:
    """Tra ve (dau thang 00:00:00.000, cuoi thang 23:59:59.999) theo gio VN."""
    start = datetime(year, month, 1, 0, 0, 0, 0, tzinfo=VN_TZ)
    if month == 12:
        next_start = datetime(year + 1, 1, 1, tzinfo=VN_TZ)
    else:
        next_start = datetime(year, month + 1, 1, tzinfo=VN_TZ)
    return start, next_start - timedelta(milliseconds=1)


def dashboard_period(year: int, month: int, now_vn: datetime | None = None) -> int:
    """Mã kỳ AMIS: 13 tháng này, 14 tháng trước, 0 cho tháng tùy chọn."""
    current = now_vn or datetime.now(VN_TZ)
    previous = current.replace(day=1) - timedelta(days=1)

    if (year, month) == (current.year, current.month):
        return 13
    if (year, month) == (previous.year, previous.month):
        return 14
    return 0


def to_number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def find_employee_data(node: Any) -> list[dict[str, Any]] | None:
    """Tim de quy key 'EmployeeData' trong response."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key.lower() == "employeedata" and isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]
        for value in node.values():
            found = find_employee_data(value)
            if found is not None:
                return found
    elif isinstance(node, list):
        for item in node:
            found = find_employee_data(item)
            if found is not None:
                return found
    return None


# ------------------------------------------------------------ GOI API

def build_param(from_date: datetime, to_date: datetime, period: int) -> str:
    """Dung chuoi Param.

    QUAN TRONG: AMIS nhan Param duoi dang JSON string long trong JSON,
    khong phai object -> phai json.dumps() truoc khi nhet vao body.
    """
    param = {
        "Period": period,
        "ToDate": iso_ms(to_date),
        "DateData": {
            "FromDate": iso_ms(from_date),
            "ToDate": iso_ms(to_date),
            "Period": period,
        },
        "FromDate": iso_ms(from_date),
        "IsGetNew": False,
        "MISACode": MISA_CODE,
        "PageIndex": PAGE_INDEX,
        "EmployeeID": None,
        "IsGetCache": False,
        "ReportType": REPORT_TYPE,
        "DashboardID": DASHBOARD_ID,
        "ReloadAllBy": 999,
        "AnalysisType": ANALYSIS_TYPE,
        "DashboardKey": DASHBOARD_KEY,
        "IsChangedAll": False,
        "DashboardName": DASHBOARD_SYS_NAME,
        "DashboardType": DASHBOARD_TYPE,
        "HasPermission": True,
        "EmployeeIDText": None,
        "IsViewEmployee": True,
        "ReportTypeText": "Giá trị đơn hàng",
        "AnalysisTypeText": "Cơ cấu tổ chức",
        "IsGetCacheClient": False,
        "RevenueStatusIDs": REVENUE_STATUS_IDS,
        "DashboardFullName": DASHBOARD_FULL_NAME,
        "IsLastOrganization": 0,
        "OrganizationUnitID": ORG_UNIT_ID,
        "IsParentSaleOrderID": PARENT_SALE_ORDER_IDS,
        "IsParentSaleOrderIDs": PARENT_SALE_ORDER_IDS,
        "RevenueStatusIDsText": "Đã ghi,Từ chối ghi",
        "OrganizationUnitIDText": ORG_UNIT_TEXT,
        "UserOrganizationUnitID": ORG_UNIT_ID,
        "IsIncludeDraftSaleOrder": False,
        "IsParentSaleOrderIDText": "Đơn hàng,Trả lại hàng bán",
        "IsParentSaleOrderIDsText": (
            "ReportOpportunityStage.IsChildSaleOrder,LayoutCode.ReturnSale"
        ),
        "UserOrganizationUnitIDText": ORG_UNIT_TEXT,
        "IsSaleOrderAndParentSaleOrder": False,
    }
    return json.dumps(param, ensure_ascii=False)


def fetch_dashboard(
    from_date: datetime,
    to_date: datetime,
    period: int,
) -> dict[str, Any]:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json",
        "companycode": COMPANY_CODE,
        "layoutcode": "dashboard",
        "X-MISA-Language": "vi-VN",
        "Origin": "https://amisapp.misa.vn",
        "Referer": "https://amisapp.misa.vn/crm/dashboard/main",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
        ),
    }

    body = {
        "DashboardType": DASHBOARD_TYPE,
        "IsGetNew": True,
        "Param": build_param(from_date, to_date, period),
        "DashboardID": DASHBOARD_ID,
        "DashboardName": DASHBOARD_FULL_NAME,
    }

    response = requests.post(DASHBOARD_URL, headers=headers, json=body, timeout=60)
    print(f"HTTP {response.status_code}")

    if response.status_code in (401, 403):
        stop(
            "Token het han hoac khong hop le.\n"
            "  -> Mo lai trinh duyet, F12 > Network, copy Authorization + Cookie moi vao .env"
        )

    if not response.ok:
        stop(f"API tra ve loi. Noi dung: {response.text[:800]}")

    try:
        return response.json()
    except ValueError:
        stop(f"API khong tra JSON: {response.text[:500]}")
        return {}


# ------------------------------------------------------------ HIEN THI

def print_table(rows: list[dict[str, Any]]) -> None:
    header = (
        f"{'Nhân viên':<28}{'Mục tiêu':>18}{'Đã thực hiện':>18}"
        f"{'% ĐTH':>9}{'Còn thực hiện':>18}"
    )
    print("\n" + header)
    print("-" * len(header))

    total_target = 0.0
    total_current = 0.0

    for row in rows:
        name = str(row.get("FullName") or "(khong ten)")
        target = to_number(row.get("TargetAmount"))
        current = to_number(row.get("CurrentAmount"))
        percent = to_number(row.get("CurrentPercent"))
        remaining = to_number(row.get("RemainingAmount"))

        # AMIS dung -1.0 lam co "khong ap dung" cho phan tram
        target_text = f"{target:,.0f}" if target > 0 else "-"
        percent_text = f"{percent * 100:.2f}%" if percent >= 0 else "-"
        remaining_text = f"{remaining:,.0f}" if target > 0 else "-"

        print(
            f"{name[:27]:<28}{target_text:>18}{current:>18,.0f}"
            f"{percent_text:>9}{remaining_text:>18}"
        )

        total_target += target
        total_current += current

    total_percent = (total_current / total_target * 100) if total_target else 0.0

    print("-" * len(header))
    print(
        f"{'TỔNG':<28}{total_target:>18,.0f}{total_current:>18,.0f}"
        f"{total_percent:>8.2f}%{total_target - total_current:>18,.0f}"
    )


# ------------------------------------------------------------ MAIN

def main() -> None:
    if not BEARER_TOKEN:
        stop("Thieu AMIS_BEARER_TOKEN trong .env")
  

    args = sys.argv[1:]
    now_vn = datetime.now(VN_TZ)

    if len(args) == 0:
        year, month = now_vn.year, now_vn.month
    elif len(args) == 2:
        try:
            year, month = int(args[0]), int(args[1])
            month_range_vn(year, month)
        except (TypeError, ValueError):
            stop("Thang/nam khong hop le. Vi du: python test_amis_revenue.py 2026 8")
    else:
        stop("Cach chay: python test_amis_revenue.py [NAM THANG]")

    from_date, to_date = month_range_vn(year, month)
    period = dashboard_period(year, month, now_vn)

    print("=" * 68)
    print(f"Widget   : {DASHBOARD_FULL_NAME}")
    print(f"Endpoint : .../Dashboard/{DASHBOARD_TYPE}/data   (DashboardID={DASHBOARD_ID})")
    print(f"Ky       : {month:02d}/{year} (Period={period})")
    print(f"FromDate : {iso_ms(from_date)}   ({from_date:%d/%m/%Y %H:%M} VN)")
    print(f"ToDate   : {iso_ms(to_date)}   ({to_date:%d/%m/%Y %H:%M} VN)")
    print(f"Don vi   : {ORG_UNIT_TEXT}")
    print(f"Chung tu : Don hang + Tra lai hang ban")
    print(f"Trang thai: Da ghi + Tu choi ghi")
    print("=" * 68)

    payload = fetch_dashboard(from_date, to_date, period)

    with open("dashboard_raw.json", "w", encoding="utf-8") as fp:
        json.dump(payload, fp, ensure_ascii=False, indent=2)
    print("Da luu response goc -> dashboard_raw.json")

    rows = find_employee_data(payload)

    if rows is None:
        stop(
            "Khong tim thay 'EmployeeData' trong response.\n"
            "  -> Mo dashboard_raw.json de xem cau truc thuc te."
        )

    if not rows:
        stop("EmployeeData rong. Kiem tra lai khoang ngay hoac OrganizationUnitID.")

    print(f"\nSo dong nhan vien: {len(rows)}")
    print_table(rows)


if __name__ == "__main__":
    main()
