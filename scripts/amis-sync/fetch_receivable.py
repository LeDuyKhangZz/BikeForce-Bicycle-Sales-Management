"""
Cong no da thu theo nhan vien (actapp.misa.vn) -> cot receive_amount.

Dua tren test_act_receivable.py (da chay dung), them phan ghi Supabase.

Chay:  python fetch_receivable.py            (thang hien tai)
       python fetch_receivable.py 2026 7
       python fetch_receivable.py 2026 8 --dry

Token ACT_* KHONG tu harvest duoc, phai lay tay ~24h/lan tu actapp.misa.vn.
"""

import base64
import json
import os
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env", encoding="utf-8-sig")

API_URL = "https://actapp.misa.vn/g1/api/report/v1/report/dynamic/v2/paging_filter"

BEARER_TOKEN = os.getenv("ACT_BEARER_TOKEN", "").strip()
DEVICE_ID = os.getenv("ACT_DEVICE", "").strip()
MISA_CONTEXT = os.getenv("ACT_MISA_CONTEXT", "").strip()
BRANCH_ID = os.getenv("ACT_BRANCH_ID", "64ef1827-297e-4286-8eb9-60af11b08215")
SESSION_KEY = os.getenv("ACT_SESSION_KEY", "").strip()

SB_URL = (os.getenv("BIKEFORCE_SUPABASE_URL") or "").rstrip("/")
SB_KEY = os.getenv("BIKEFORCE_SERVICE_ROLE_KEY")

ALL_IDS = "99999999-9999-9999-9999-999999999999,"
PAGE_SIZE = 100
VN_TZ = timezone(timedelta(hours=7))
REPORT_ID = "SummaryCustomerReceivableByEmployee"

CODE_CALCULATING = 210          # 210 = dang tinh; 211 = doc bo dem THANH CONG
RETRY_MAX = 10
RETRY_WAIT_SECONDS = 3

COLUMNS = [
    {"field": "employee_name", "dataformat": 12},
    {"field": "account_object_name", "dataformat": 12},
    {"field": "receive_amount", "dataformat": 2},
    {"field": "account_object_group_code", "dataformat": 12},
    {"field": "account_object_group_name", "dataformat": 12},
]

GROUP_KEY = [{"name": "employee_name", "formatType": 12}]

REPORT_LIST = {
    "group_id": 7, "sort_order": 70380, "accounting_system": 0,
    "inv_type_id": 0, "report_type": 5, "report_style": 3, "inv_method": 0,
    "reftype_category": 0, "show_total_page_number": 0,
    "last_view_date": "2015-08-13T00:00:00.000+07:00",
    "is_beta": False, "is_invoice": False, "is_system": True,
    "is_show": True, "is_print_line_number": False,
    "report_id": REPORT_ID,
    "function_report_name": "func_rpt_sa_get_summary_customer_receivable_by_employee",
    "procedure_name": "Proc_SAR_GetSummaryCustomerReceivableByEmployee",
    "parameter_form_name": "/SA/SummaryCustomerReceivableByEmployeeParam.vue",
    "parameter_user_control": "/SA/SummaryCustomerReceivableByEmployeeViewer.vue",
    "report_name": "Tổng hợp thanh toán công nợ khách hàng theo nhân viên",
    "reftype_list": "/",
    "table_name": "sa_summary_customer_receivable_by_employee",
    "report_detail_id": "703", "is_favorite": False, "is_disabled": False,
    "summary_type": 1, "format_print_type": 0, "group_summary_type": 1,
    "is_pure": True,
    "preview_image": "TỔNG HỢP THANH TOÁN CÔNG NỢ KHÁCH HÀNG THEO NHÂN VIÊN.png",
    "is_tree": False, "sub_accounting_system": 0, "org_report_type": 0,
    "current_report_type": 0, "version": 2,
    "rp_function_name_async": (
        "func_rpt_sa_get_summary_customer_receivable_by_employee_v3"
    ),
    "state": 0, "is_created_from_old_db": False,
}


def stop(message: str) -> None:
    print(f"\nLOI: {message}")
    sys.exit(1)


def b64(obj: Any) -> str:
    raw = obj if isinstance(obj, str) else json.dumps(obj, ensure_ascii=False)
    return base64.b64encode(raw.encode("utf-8")).decode("ascii")


def month_bounds_act(year: int, month: int) -> tuple[str, str]:
    """AMIS KE TOAN: to_date = ngay CUOI THANG luc 00:00 VN (khong phai 23:59)."""
    first = datetime(year, month, 1, tzinfo=VN_TZ)
    next_first = (datetime(year + 1, 1, 1, tzinfo=VN_TZ) if month == 12
                  else datetime(year, month + 1, 1, tzinfo=VN_TZ))
    last = next_first - timedelta(days=1)
    fmt = lambda d: d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    return fmt(first), fmt(last)


def to_number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def find_rows(node: Any) -> list[dict[str, Any]] | None:
    """Gom TAT CA dong chi tiet — du lieu long nhieu tang theo nhom nhan vien."""
    found: list[dict[str, Any]] = []
    seen: set[int] = set()
    has_container = False

    def walk(n: Any) -> None:
        nonlocal has_container
        if isinstance(n, list):
            for item in n:
                walk(item)
        elif isinstance(n, dict):
            if n.get("account_object_name"):
                if id(n) not in seen:
                    seen.add(id(n))
                    found.append(n)
                has_container = True
            for value in n.values():
                if isinstance(value, (list, dict)):
                    walk(value)

    walk(node)
    return None if (not has_container and not found) else found


def build_parameters(from_date: str, to_date: str) -> str:
    return b64({
        "p_branch_id": f"{BRANCH_ID},",
        "p_include_dependent_branch": False,
        "p_from_date": from_date,
        "p_to_date": to_date,
        "p_aog_misa_code_id": "",
        "p_customer_filter": "",
        "p_org_misa_code_id": "",
        "p_employee_filter": "",
        "p_list_customer_id": ALL_IDS,
        "p_list_employee_id": ALL_IDS,
        "p_is_management_book": False,
        # PHAI la False: True -> Code 210 (chua co du lieu).
        "p_is_refresh": False,
        "p_session_key": SESSION_KEY,
    })


def fetch_page(from_date: str, to_date: str, page_index: int) -> dict[str, Any]:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json",
        "X-Device": DEVICE_ID,
        "X-MISA-Context": MISA_CONTEXT,
        "Origin": "https://actapp.misa.vn",
        "Referer": (
            f"https://actapp.misa.vn/app/RP/ReportList/RPDynamicViewer/{REPORT_ID}"
        ),
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
        ),
    }

    body = {
        # PHAI la True — la mot phan cua khoa bo dem phia server.
        "isViewMCP": True,
        "parameters": build_parameters(from_date, to_date),
        "report_id": b64(REPORT_ID),
        "actionLoadReport": 1,
        "reportList": REPORT_LIST,
        "group_key": json.dumps(GROUP_KEY, ensure_ascii=False),
        "pageIndex": page_index,
        "pageSize": PAGE_SIZE,
        "useSp": False,
        "columns": json.dumps(COLUMNS, ensure_ascii=False),
    }

    response = requests.post(API_URL, headers=headers, json=body, timeout=90)

    if response.status_code in (401, 403):
        stop("ACT token het han. Lay lai tu actapp.misa.vn (F12 -> paging_filter).")
    if not response.ok:
        stop(f"HTTP {response.status_code}: {response.text[:600]}")

    try:
        return response.json()
    except ValueError:
        stop(f"Khong tra JSON: {response.text[:400]}")
        return {}


def fetch_page_awaited(from_date: str, to_date: str, page_index: int) -> dict[str, Any]:
    payload = fetch_page(from_date, to_date, page_index)
    if payload.get("Code") != CODE_CALCULATING:
        return payload

    print("  Server dang tinh (Code 210). Cho va hoi lai...")
    for attempt in range(1, RETRY_MAX + 1):
        time.sleep(RETRY_WAIT_SECONDS)
        payload = fetch_page(from_date, to_date, page_index)
        if payload.get("Code") != CODE_CALCULATING:
            print(f"  Co du lieu sau {attempt} lan hoi lai.")
            return payload
        print(f"    lan {attempt}/{RETRY_MAX} — van dang tinh")

    stop("Server tinh qua lau. Mo bao cao tren trinh duyet MOT LAN roi chay lai.")
    return {}


def fetch_all(from_date: str, to_date: str) -> list[dict[str, Any]]:
    all_rows: list[dict[str, Any]] = []
    page = 1

    while page <= 50:
        payload = fetch_page_awaited(from_date, to_date, page)
        rows = find_rows(payload)

        if rows is None:
            out = Path(__file__).resolve().parent / "receivable_raw.json"
            out.write_text(json.dumps(payload, ensure_ascii=False, indent=2),
                           encoding="utf-8")
            stop(f"Khong tim thay dong (Code={payload.get('Code')}). Xem {out.name}.")

        if not rows:
            break

        print(f"  Trang {page}: {len(rows)} dong")
        all_rows.extend(rows)

        groups = payload.get("Data")
        if not isinstance(groups, list) or len(groups) < PAGE_SIZE:
            break
        page += 1

    return all_rows


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv

    for name, value in (("ACT_BEARER_TOKEN", BEARER_TOKEN),
                        ("ACT_DEVICE", DEVICE_ID),
                        ("ACT_MISA_CONTEXT", MISA_CONTEXT),
                        ("ACT_SESSION_KEY", SESSION_KEY)):
        if not value:
            stop(f"Thieu {name} trong .env")

    now_vn = datetime.now(VN_TZ)
    year, month = ((int(args[0]), int(args[1])) if len(args) >= 2
                   else (now_vn.year, now_vn.month))

    from_date, to_date = month_bounds_act(year, month)

    print("=" * 66)
    print(f"CONG NO DA THU THEO NHAN VIEN — thang {month:02d}/{year}")
    print("=" * 66)

    rows = fetch_all(from_date, to_date)
    if not rows:
        stop("Khong co du lieu.")

    agg: dict[str, float] = defaultdict(float)
    for row in rows:
        name = str(row.get("employee_name") or "").strip()
        if name:
            agg[name] += to_number(row.get("receive_amount"))

    print(f"\n{'NHAN VIEN':<38}{'DA THU':>20}")
    print("-" * 66)
    for name, amount in sorted(agg.items(), key=lambda kv: -kv[1]):
        print(f"{name[:36]:<38}{amount:>20,.0f}")
    print("-" * 66)
    print(f"{'TONG':<38}{sum(agg.values()):>20,.0f}")

    if dry:
        print("\n[--dry] Khong ghi Supabase.")
        return
    if not SB_URL or not SB_KEY:
        print("\nThieu bien Supabase -> bo qua ghi.")
        return

    payload = [{
        "period_month": f"{year:04d}-{month:02d}-01",
        "employee_name": name,
        "receive_amount": round(amount, 2),
    } for name, amount in agg.items()]

    print(f"\nGhi {len(payload)} dong vao Supabase...")
    response = requests.post(
        f"{SB_URL}/rest/v1/amis_employee_metrics",
        headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}",
                 "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=payload, timeout=60)
    print("OK" if response.ok
          else f"LOI HTTP {response.status_code}: {response.text[:400]}")


if __name__ == "__main__":
    main()