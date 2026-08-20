"""
Test DUT DIEM: ba nguon AMIS co that su can COOKIE khong?

─────────────────────────────────────────────────────────────────────────
 VI SAO CAN FILE NAY
─────────────────────────────────────────────────────────────────────────
Hai script do truoc do tra loi hai cau HOI KHAC NHAU, va toi da gop ket luan
cua chung lai mot cach voi vang:

  • `probe_amis_public_api.py` thu token OAuth + body TOI GIAN vao dashboard
    va report -> HTTP 500. Nhung body toi gian thi 500 cung co the do THIEU
    THAM SO, khong nhat thiet do thieu cookie.

  • `diagnose_act.py` thu 6 bien the cho cong no, nhung CA SAU deu co cookie.
    Chua bao gio thu bo cookie ra.

File nay bit ca hai lo hong: dung DUNG BODY da biet chay duoc, roi lan luot
tat tung thu xac thuc mot.

Voi moi endpoint, thu 4 to hop:
    1. Bearer + Cookie   (ban dang chay — moc so sanh)
    2. Bearer, KHONG cookie
    3. Cookie, KHONG bearer
    4. Khong ca hai

To hop nao ra du lieu ma khong can cookie -> chay tu dong duoc 5 phut/lan,
khong can Playwright, khong can dan tay moi sang.

⚠ CHI DOC. Khong ghi gi vao dau.

Chay:
    python test_no_cookie.py
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from dotenv import load_dotenv

# Dung lai nguyen cau hinh cua ba script that — khong chep lai hang so nao,
# de bao dam body gui di GIONG HET ban dang chay duoc.
import test_act_receivable as act
import test_amis_revenue as revenue
import crawl_nvkd as nvkd

load_dotenv()

TIMEOUT = 90
VN_TZ = timezone(timedelta(hours=7))


# ------------------------------------------------------------ TIEN ICH

def verdict(payload: dict[str, Any] | None, row_count: int) -> str:
    if payload is None:
        return "KHONG GOI DUOC"
    if row_count > 0:
        return f"CO DU LIEU ({row_count} dong)"
    return f"RONG (Code={payload.get('Code')})"


def try_call(
    label: str,
    url: str,
    headers: dict[str, str],
    body: dict[str, Any],
    count_rows,
) -> bool:
    """Goi mot lan, in ket qua, tra ve True neu CO du lieu."""
    try:
        response = requests.post(url, headers=headers, json=body, timeout=TIMEOUT)
    except requests.RequestException as error:
        print(f"    {label:<28} LOI KET NOI: {error}")
        return False

    if not response.ok:
        print(f"    {label:<28} HTTP {response.status_code}")
        return False

    try:
        payload = response.json()
    except ValueError:
        print(f"    {label:<28} HTTP 200 nhung khong phai JSON")
        return False

    rows = count_rows(payload)
    mark = ">>>" if rows > 0 else "   "
    print(f"{mark} {label:<28} HTTP 200  {verdict(payload, rows)}")

    return rows > 0


def variants(base: dict[str, str], token: str, cookie: str) -> list[tuple[str, dict[str, str]]]:
    """Bon to hop xac thuc, tren cung mot bo header con lai."""
    with_both = dict(base)
    with_both["Authorization"] = f"Bearer {token}"
    with_both["Cookie"] = cookie

    token_only = dict(base)
    token_only["Authorization"] = f"Bearer {token}"

    cookie_only = dict(base)
    cookie_only["Cookie"] = cookie

    neither = dict(base)

    return [
        ("1. Bearer + Cookie", with_both),
        ("2. Bearer, KHONG cookie", token_only),
        ("3. Cookie, KHONG bearer", cookie_only),
        ("4. Khong ca hai", neither),
    ]


# --------------------------------------------------- NGUON 1: CONG NO (ACT)

def count_act_rows(payload: dict[str, Any]) -> int:
    rows = act.find_rows(payload)
    return len(rows) if rows else 0


def test_act(year: int, month: int) -> None:
    print("\n" + "=" * 72)
    print("NGUON 1 — CONG NO (actapp.misa.vn)")
    print("=" * 72)

    from_date, to_date = act.month_bounds_act(year, month)

    base = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "X-Device": act.DEVICE_ID,
        "X-MISA-Context": act.MISA_CONTEXT,
        "Origin": "https://actapp.misa.vn",
        "Referer": (
            "https://actapp.misa.vn/app/RP/ReportList/RPDynamicViewer/"
            f"{act.REPORT_ID}"
        ),
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
        ),
    }

    # Body DUNG Y HET ban dang chay duoc (p_is_refresh=False, isViewMCP=True).
    body = {
        "isViewMCP": True,
        "parameters": act.build_parameters(from_date, to_date),
        "report_id": act.b64(act.REPORT_ID),
        "actionLoadReport": 1,
        "reportList": act.REPORT_LIST,
        "group_key": json.dumps(act.GROUP_KEY, ensure_ascii=False),
        "pageIndex": 1,
        "pageSize": act.PAGE_SIZE,
        "useSp": False,
        "columns": json.dumps(act.COLUMNS, ensure_ascii=False),
    }

    for label, headers in variants(base, act.BEARER_TOKEN, act.COOKIE):
        try_call(label, act.API_URL, headers, body, count_act_rows)


# ------------------------------------------- NGUON 2: DASHBOARD DOANH SO

def count_dashboard_rows(payload: dict[str, Any]) -> int:
    rows = revenue.find_employee_data(payload)
    return len(rows) if rows else 0


def test_dashboard(year: int, month: int) -> None:
    print("\n" + "=" * 72)
    print("NGUON 2 — DASHBOARD DOANH SO (amisapp.misa.vn/crm/g2)")
    print("=" * 72)

    from_date, to_date = revenue.month_range_vn(year, month)

    base = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "companycode": revenue.COMPANY_CODE,
        "layoutcode": "dashboard",
        "X-MISA-Language": "vi-VN",
        "Origin": "https://amisapp.misa.vn",
        "Referer": "https://amisapp.misa.vn/crm/dashboard/main",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
        ),
    }

    # ⚠ Day la khac biet quan trong so voi `probe_amis_public_api.py`: body
    # DAY DU tu `build_param()`, khong phai body toi gian. Neu truoc do 500 la
    # do thieu tham so chu khong do thieu cookie thi lan nay se lo ra.
    body = {
        "DashboardType": revenue.DASHBOARD_TYPE,
        "IsGetNew": True,
        "Param": revenue.build_param(from_date, to_date),
        "DashboardID": revenue.DASHBOARD_ID,
        "DashboardName": revenue.DASHBOARD_FULL_NAME,
    }

    for label, headers in variants(base, revenue.BEARER_TOKEN, revenue.COOKIE):
        try_call(label, revenue.DASHBOARD_URL, headers, body, count_dashboard_rows)


# ----------------------------------------------- NGUON 3: REPORT 119 (NVKD)

def count_report_rows(payload: dict[str, Any]) -> int:
    return len(nvkd.find_rows(payload))


def test_report119(year: int, month: int, period: int) -> None:
    print("\n" + "=" * 72)
    print("NGUON 3 — REPORT 119 / NVKD (amisapp.misa.vn/crm/g2)")
    print("=" * 72)

    from_date, to_date = nvkd.month_range_vn(year, month)

    base = {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "companycode": nvkd.COMPANY_CODE,
        "layoutcode": "report",
        "X-MISA-Language": "vi-VN",
        "Origin": "https://amisapp.misa.vn",
        "Referer": f"https://amisapp.misa.vn/crm/report/view/{nvkd.REPORT_ID}/0",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
        ),
    }

    # Dung lai nguyen body cua `crawl_nvkd.fetch()` — chep tay vi ham do goi
    # requests ben trong, khong tach body ra duoc.
    body = {
        "Columns": nvkd.b64(",".join(nvkd.COLUMNS)),
        "CustomColumns": nvkd.b64(",".join(nvkd.CUSTOM_COLUMNS)),
        "Sorts": [],
        "Start": 0,
        "Page": 1,
        "PageSize": nvkd.PAGE_SIZE,
        "Filters": [],
        "LayoutCode": "Report",
        "DefaultTotal": False,
        "IsMappingData": False,
        "IsApproved": False,
        "CustomPagingData": {
            "ID": nvkd.REPORT_ID,
            "ReportDynamicID": 0,
            "Data": {
                "IsViewEmployee": True,
                "ProductCategoryIDs": None,
                "RevenueStatusIDs": nvkd.REVENUE_STATUS_IDS,
                "StatisticalsBy": nvkd.STATISTICALS_BY,
                "StatisticalsByText": "Đơn hàng, Đơn hàng cha, Trả lại hàng bán",
                "Period": period,
                "FromDate": nvkd.iso_ms(from_date),
                "ToDate": nvkd.iso_ms(to_date),
                "AnalysisType": nvkd.ANALYSIS_TYPE,
                "AnalysisTypeText": "Cơ cấu tổ chức",
                "OrganizationUnitID": nvkd.ROOT_UNIT_ID,
                "OrganizationUnitIDText": nvkd.ROOT_UNIT_TEXT,
                "MISACode": None,
                "ID": nvkd.REPORT_ID,
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
                "ProductStatisticsID": nvkd.PRODUCT_STATISTICS_ID,
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

    for label, headers in variants(base, nvkd.BEARER_TOKEN, nvkd.COOKIE):
        try_call(label, nvkd.API_URL, headers, body, count_report_rows)


# ------------------------------------------------------------------- MAIN

def main() -> None:
    now_vn = datetime.now(VN_TZ)
    year = int(os.getenv("TEST_YEAR", now_vn.year))
    month = int(os.getenv("TEST_MONTH", now_vn.month))

    prev = now_vn.replace(day=1) - timedelta(days=1)
    if (year, month) == (now_vn.year, now_vn.month):
        period = 13
    elif (year, month) == (prev.year, prev.month):
        period = 14
    else:
        period = 0

    print("=" * 72)
    print(f"TEST: BA NGUON AMIS CO CAN COOKIE KHONG?   Ky {month:02d}/{year}")
    print("=" * 72)
    print(
        "\nMoi nguon thu 4 to hop xac thuc, dung DUNG BODY da biet chay duoc.\n"
        "Dong nao co dau '>>>' la to hop do LAY DUOC du lieu.\n"
    )

    if not act.BEARER_TOKEN:
        print("(!) Thieu ACT_BEARER_TOKEN — bo qua nguon cong no.")
    else:
        test_act(year, month)

    if not revenue.BEARER_TOKEN:
        print("\n(!) Thieu AMIS_BEARER_TOKEN — bo qua dashboard va report 119.")
    else:
        test_dashboard(year, month)
        test_report119(year, month, period)

    print()
    print("=" * 72)
    print("DOC KET QUA")
    print("=" * 72)
    print(
        "\n  To hop 2 (Bearer, KHONG cookie) co '>>>'  -> BO DUOC COOKIE.\n"
        "     Chay tu dong 5 phut/lan nhu app ton kho, khong can Playwright.\n"
        "\n  Chi to hop 1 co '>>>'                     -> COOKIE LA BAT BUOC.\n"
        "     Phai dan tay moi sang, hoac dung Playwright tu dang nhap.\n"
        "\n  To hop 4 co '>>>'                         -> endpoint mo hoan toan\n"
        "     (rat kho xay ra, nhung neu vay thi khoi can xac thuc gi ca).\n"
        "\n  ⚠ Neu MOI to hop deu rong ke ca to hop 1: token da het han, khong\n"
        "     ket luan duoc gi. Lay token moi roi chay lai."
    )


if __name__ == "__main__":
    main()