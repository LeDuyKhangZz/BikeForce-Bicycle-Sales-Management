"""Doc doanh so don hang theo khach hang tu AMIS CRM report 44/0."""

import base64
import math
import os
import uuid
from calendar import monthrange
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env", encoding="utf-8-sig", override=True)

API_URL = "https://amisapp.misa.vn/crm/g2/api/report/Report/reportPaging"
REPORT_ID = 44
PAGE_SIZE = 200
VN = timezone(timedelta(hours=7))

REPORT_COLUMNS = [
    "ID", "OUEIDCode", "OUEIDText",
    *[f"ColSales{index}" for index in range(13)],
    "ColTotalSales", "FormLayoutID", "FormLayoutIDText", "OwnerID", "OwnerIDText",
]


def b64(value):
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def shift_month(year, month, offset):
    absolute = year * 12 + month - 1 + offset
    return absolute // 12, absolute % 12 + 1


def report_range(year, month):
    start_year, start_month = shift_month(year, month, -12)
    last_day = monthrange(year, month)[1]
    return (
        f"{start_year:04d}-{start_month:02d}-01T00:00:00.000+07:00",
        f"{year:04d}-{month:02d}-{last_day:02d}T23:59:59.999+07:00",
        f"{start_month:02d}/{start_year:04d} - {month:02d}/{year:04d}",
    )


def current_period():
    now = datetime.now(VN)
    last_day = monthrange(now.year, now.month)[1]
    start = datetime(now.year, now.month, 1, tzinfo=VN).astimezone(timezone.utc)
    end = datetime(now.year, now.month, last_day, 23, 59, 59, 999000, tzinfo=VN).astimezone(timezone.utc)
    return (
        start.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        end.strftime("%Y-%m-%dT%H:%M:%S.999Z"),
    )


def build_body(year, month, page):
    from_period, to_period, text_period = report_range(year, month)
    current_from, current_to = current_period()
    return {
        "Columns": b64(",".join(REPORT_COLUMNS)),
        "Sorts": [], "Start": (page - 1) * PAGE_SIZE, "Page": page,
        "PageSize": PAGE_SIZE, "Filters": [], "LayoutCode": "Report",
        "DefaultTotal": False, "IsMappingData": False, "IsApproved": False,
        "CustomPagingData": {
            "ID": REPORT_ID, "ReportDynamicID": 0,
            "Data": {
                "PeriodTypeID": 2, "PeriodTypeIDText": "Thang",
                "IsParentSaleOrderID": "1,3",
                "IsParentSaleOrderIDText": "Don hang,Tra lai hang ban",
                "FromDatePeriod": from_period, "ToDatePeriod": to_period,
                "TextPeriod": text_period,
                "FromDatePeriod1": None, "ToDatePeriod1": None,
                "FromDatePeriod2": None, "ToDatePeriod2": None,
                "IsViewAccount": True, "IsViewTreeAccountCategory": False,
                "Period": 13, "FromDate": current_from, "ToDate": current_to,
                "AnalysisType": 2, "AnalysisTypeText": "Co cau to chuc",
                "OrganizationUnitID": 1, "OrganizationUnitIDText": "THONG DAT GROUP",
                "MISACode": "0001", "ID": REPORT_ID, "ReportDynamicID": 0,
                "Config": {"GroupColumn": [], "Filter": [], "Formula": "", "FormulaContent": ""},
                "WeekText": "", "HasPermission": True,
                "RevenueStatusIDs": "3", "EmployeeID": None,
                "IsCompareWithPreviousPeriod": False,
                "AccountTypeIDs": None, "AccountTypeIDsText": None,
                "IsDisplay": True, "EmployeeIDText": "",
                "ProductStatisticsID": "1", "ProductStatisticsIDText": "Hang hoa",
                "RevenueStatusIDsText": "Da ghi",
            },
        },
        "IsUsedELTS": True, "ListGmailPage": [], "ListFacebookPage": {},
        "IsGetCache": True, "IsCheckInactive": False, "IsConverted": False,
        "SessionID": str(uuid.uuid4()), "LayoutCodeCheckPermission": "Report",
        "AISearchKeyword": "", "SkipNormalSearch": False,
    }


def request_headers(token, company):
    return {
        "Accept": "application/json, text/plain, */*",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "companycode": company,
        "layoutcode": "report",
        "X-MISA-Language": "vi-VN",
        "Origin": "https://amisapp.misa.vn",
        "Referer": "https://amisapp.misa.vn/crm/report/view/44/0",
    }


def parse_page(payload):
    if not isinstance(payload, dict) or payload.get("Success") is not True:
        raise ValueError("Report 44 tra trang thai khong thanh cong.")
    rows = payload.get("Data")
    total = payload.get("Total")
    if not isinstance(rows, list) or not isinstance(total, int) or total < 0:
        raise ValueError("Report 44 tra cau truc phan trang khong hop le.")
    parsed = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Report 44 co dong khong hop le.")
        code = row.get("OUEIDCode")
        name = row.get("OUEIDText")
        amount = row.get("ColSales12")
        if not isinstance(code, str) or not code.strip() or not isinstance(name, str):
            raise ValueError("Report 44 thieu ma hoac ten khach hang.")
        if not isinstance(amount, (int, float)) or isinstance(amount, bool) or not math.isfinite(amount):
            raise ValueError(f"Report 44 co doanh so khong hop le cho {code}.")
        parsed.append((code.strip().upper(), name.strip(), round(amount)))
    return parsed, total


def parse_range_page(payload):
    if not isinstance(payload, dict) or payload.get("Success") is not True:
        raise ValueError("Report 44 tra trang thai khong thanh cong.")
    rows = payload.get("Data")
    total = payload.get("Total")
    if not isinstance(rows, list) or not isinstance(total, int) or total < 0:
        raise ValueError("Report 44 tra cau truc phan trang khong hop le.")
    parsed = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Report 44 co dong khong hop le.")
        code = row.get("OUEIDCode")
        name = row.get("OUEIDText")
        if not isinstance(code, str) or not code.strip() or not isinstance(name, str):
            raise ValueError("Report 44 thieu ma hoac ten khach hang.")
        amounts = []
        for index in range(13):
            amount = row.get(f"ColSales{index}")
            if not isinstance(amount, (int, float)) or isinstance(amount, bool) or not math.isfinite(amount):
                raise ValueError(f"Report 44 co doanh so khong hop le cho {code}, cot {index}.")
            amounts.append(round(amount))
        parsed.append((code.strip().upper(), name.strip(), amounts))
    return parsed, total


def merge_customer_rows(result, rows):
    for code, name, amount in rows:
        if code in result:
            # Report 44 co the co nhieu account cung ma. Ma khach hang la khoa
            # lien ket nghiep vu, nen doanh so thang phai la tong cac dong cung ma.
            result[code]["order_sales"] += amount
        else:
            result[code] = {"name": name, "order_sales": amount}


def merge_customer_range_rows(result, rows):
    for code, name, amounts in rows:
        if code in result:
            previous = result[code]["order_sales"]
            result[code]["order_sales"] = [
                previous[index] + amount for index, amount in enumerate(amounts)
            ]
        else:
            result[code] = {"name": name, "order_sales": amounts}


def fetch_customer_sales_range(year, month, token=None, company=None, session=requests):
    auth_token = (token or os.getenv("AMIS_BEARER_TOKEN", "")).strip()
    company_code = (company or os.getenv("AMIS_COMPANY_CODE", "BEDTGJL2")).strip()
    if not auth_token:
        raise RuntimeError("Thieu AMIS_BEARER_TOKEN de doc report 44.")

    page = 1
    expected_total = None
    result = {}
    while True:
        response = session.post(
            API_URL,
            headers=request_headers(auth_token, company_code),
            json=build_body(year, month, page),
            timeout=90,
        )
        if response.status_code in (401, 403):
            raise RuntimeError("Token AMIS het han khi doc report 44.")
        if not response.ok:
            raise RuntimeError(f"Report 44 loi HTTP {response.status_code}: {response.text[:400]}")
        rows, total = parse_range_page(response.json())
        if expected_total is None:
            expected_total = total
        elif total != expected_total:
            raise RuntimeError("Tong so ma report 44 thay doi giua cac trang.")
        merge_customer_range_rows(result, rows)
        if len(rows) < PAGE_SIZE:
            break
        page += 1

    if len(result) != expected_total:
        raise RuntimeError(f"Report 44 cao {len(result)}/{expected_total} ma khach hang.")
    return result


def fetch_customer_monthly_sales(year, month, token=None, company=None, session=requests):
    range_rows = fetch_customer_sales_range(year, month, token, company, session)
    return {
        code: {"name": row["name"], "order_sales": row["order_sales"][12]}
        for code, row in range_rows.items()
    }


def snapshot_rows(year, month, range_rows):
    months = [shift_month(year, month, offset) for offset in range(-12, 1)]
    return [
        {
            "period_month": f"{period_year:04d}-{period_month:02d}-01",
            "customer_code": code,
            "customer_name": row["name"],
            "order_sales": row["order_sales"][index],
        }
        for code, row in range_rows.items()
        for index, (period_year, period_month) in enumerate(months)
    ]


def replace_snapshot(year, month, rows):
    supabase_url = (os.getenv("BIKEFORCE_SUPABASE_URL") or "").rstrip("/")
    service_key = (os.getenv("BIKEFORCE_SERVICE_ROLE_KEY") or "").strip()
    if not supabase_url or not service_key:
        raise RuntimeError("Thieu bien Supabase de ghi report 44.")
    start_year, start_month = shift_month(year, month, -12)
    response = requests.post(
        f"{supabase_url}/rest/v1/rpc/replace_misa_report44_customer_sales",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        },
        json={
            "p_from_month": f"{start_year:04d}-{start_month:02d}-01",
            "p_to_month": f"{year:04d}-{month:02d}-01",
            "p_rows": rows,
        },
        timeout=180,
    )
    if not response.ok:
        raise RuntimeError(f"Ghi report 44 loi HTTP {response.status_code}: {response.text[:400]}")
    return response.json()


def main():
    if len(sys.argv) < 3:
        raise SystemExit("Cach chay: python fetch_report44.py NAM THANG [--write]")
    year = int(sys.argv[1])
    month = int(sys.argv[2])
    if month < 1 or month > 12:
        raise SystemExit("Thang phai nam trong 1..12.")
    range_rows = fetch_customer_sales_range(year, month)
    rows = snapshot_rows(year, month, range_rows)
    from_year, from_month = shift_month(year, month, -12)
    print(
        f"Report 44: {len(range_rows)} ma, {len(rows)} dong thang, "
        f"ky {from_month:02d}/{from_year}-{month:02d}/{year}."
    )
    if "--write" not in sys.argv:
        print("Dry run: khong ghi Supabase.")
        return
    inserted = replace_snapshot(year, month, rows)
    print(f"Da thay snapshot report 44: {inserted} dong.")


if __name__ == "__main__":
    main()
