"""
Lấy báo cáo "Tổng hợp thanh toán công nợ khách hàng theo nhân viên"
tu AMIS KE TOAN (actapp.misa.vn).

    POST https://actapp.misa.vn/g1/api/report/v1/report/dynamic/v2/paging_filter

LUU Y - day la he thong KHAC voi AMIS CRM (amisapp.misa.vn):
    - Token / cookie rieng, khong dung chung duoc
    - Quy uoc ngay khac: p_to_date = ngay cuoi thang luc 00:00 gio VN
      (CRM dung 23:59:59.999) -> khong bung cong thuc tu script CRM sang

Cach lay token/cookie:
    1. Mo bao cao tren actapp.misa.vn
    2. F12 > Network > tim request co URL chua "report/dynamic/v2/paging_filter"
       (KHONG phai "account_object_get/paging_filter" - do la danh muc khach)
    3. Chuot phai > Copy > Copy as cURL
    4. Chep Authorization / Cookie / X-Device / X-MISA-Context vao .env
"""

import base64
import json
import os
import sys
import time
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------- CAU HINH

API_URL = "https://actapp.misa.vn/g1/api/report/v1/report/dynamic/v2/paging_filter"

BEARER_TOKEN = os.getenv("ACT_BEARER_TOKEN", "").strip()
COOKIE = os.getenv("ACT_COOKIE", "").strip()
DEVICE_ID = os.getenv("ACT_DEVICE", "").strip()
MISA_CONTEXT = os.getenv("ACT_MISA_CONTEXT", "").strip()

BRANCH_ID = os.getenv("ACT_BRANCH_ID", "64ef1827-297e-4286-8eb9-60af11b08215")

# 9999... = lay TAT CA. Dau phay cuoi chuoi la co y, MISA parse theo delimiter.
ALL_IDS = "99999999-9999-9999-9999-999999999999,"

PAGE_SIZE = 100          # gia tri UI co ho tro; 79 dong -> gon trong 1 trang
VN_TZ = timezone(timedelta(hours=7))

REPORT_ID = "SummaryCustomerReceivableByEmployee"

"""
p_session_key — KHONG phai chuoi tu sinh duoc.

Server dung no lam khoa tro toi bo du lieu da tinh cho phien lam viec. Key nay
ON DINH suot ca phien (khong doi khi doi trang / doi thang), va da xac minh con
dung duoc sau nhieu ngay. Khi that su het han -> mo lai bao cao tren trinh
duyet, copy cURL cua "report/dynamic/v2/paging_filter", giai ma truong
"parameters" (base64) va lay gia tri p_session_key moi.
"""
SESSION_KEY = os.getenv(
    "ACT_SESSION_KEY",
    "88da292da136153370c289dbb66a4c90db98976b29d08db42101586f9cee56b5",
).strip()

"""
Code 210 vs 211 — hai ma nghe nhu loi nhung khong phai.

  210 = server nhan yeu cau tinh lai, CHUA co du lieu. Chi gap khi
        `p_is_refresh = True`, va hoi lai bao nhieu lan cung van 210.
  211 = doc tu bo dem THANH CONG, kem du du lieu. Day la ma script nhan
        duoc o duong chay binh thuong.

Chu thich ban goc doan 211 la "session key het han" va dung chuong trinh ngay
tai do — sai, va mat mot buoi moi tim ra. Bang chung dut diem nam o
`diagnose_act.py`: cung mot `p_session_key`, chi doi `p_is_refresh` la ra 85 dong.
"""
CODE_CALCULATING = 210

# So lan hoi lai va khoang cho giua hai lan. 10 x 3s = 30 giay, du cho mot bao
# cao vai tram dong; bao cao lon hon thi tang RETRY_MAX chu dung tang RETRY_WAIT
# (cho lau moi lan khong lam server tinh nhanh hon).
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

# Khoi metadata bao cao - tinh, copy nguyen tu payload goc
REPORT_LIST = {
    "group_id": 7,
    "sort_order": 70380,
    "accounting_system": 0,
    "inv_type_id": 0,
    "report_type": 5,
    "report_style": 3,
    "inv_method": 0,
    "reftype_category": 0,
    "show_total_page_number": 0,
    "last_view_date": "2015-08-13T00:00:00.000+07:00",
    "is_beta": False,
    "is_invoice": False,
    "is_system": True,
    "is_show": True,
    "is_print_line_number": False,
    "report_id": REPORT_ID,
    "function_report_name": "func_rpt_sa_get_summary_customer_receivable_by_employee",
    "procedure_name": "Proc_SAR_GetSummaryCustomerReceivableByEmployee",
    "parameter_form_name": "/SA/SummaryCustomerReceivableByEmployeeParam.vue",
    "parameter_user_control": "/SA/SummaryCustomerReceivableByEmployeeViewer.vue",
    "report_name": "Tổng hợp thanh toán công nợ khách hàng theo nhân viên",
    "reftype_list": "/",
    "table_name": "sa_summary_customer_receivable_by_employee",
    "report_detail_id": "703",
    "is_favorite": False,
    "is_disabled": False,
    "summary_type": 1,
    "format_print_type": 0,
    "group_summary_type": 1,
    "is_pure": True,
    "preview_image": "TỔNG HỢP THANH TOÁN CÔNG NỢ KHÁCH HÀNG THEO NHÂN VIÊN.png",
    "is_tree": False,
    "sub_accounting_system": 0,
    "org_report_type": 0,
    "current_report_type": 0,
    "version": 2,
    "rp_function_name_async": (
        "func_rpt_sa_get_summary_customer_receivable_by_employee_v3"
    ),
    "state": 0,
    "is_created_from_old_db": False,
}


# ------------------------------------------------------------ TIEN ICH

def stop(message: str) -> None:
    print(f"\nLOI: {message}")
    sys.exit(1)


def b64(obj: Any) -> str:
    raw = obj if isinstance(obj, str) else json.dumps(obj, ensure_ascii=False)
    return base64.b64encode(raw.encode("utf-8")).decode("ascii")


def month_bounds_act(year: int, month: int) -> tuple[str, str]:
    """Bien ngay theo quy uoc AMIS KE TOAN.

    from = ngay 1 luc 00:00 gio VN
    to   = ngay CUOI THANG luc 00:00 gio VN  (KHONG phai 23:59:59)
    Ca hai deu gui len duoi dang UTC.
    """
    first = datetime(year, month, 1, tzinfo=VN_TZ)
    if month == 12:
        next_first = datetime(year + 1, 1, 1, tzinfo=VN_TZ)
    else:
        next_first = datetime(year, month + 1, 1, tzinfo=VN_TZ)
    last = next_first - timedelta(days=1)

    fmt = lambda d: d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    return fmt(first), fmt(last)


def to_number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def find_rows(node: Any) -> list[dict[str, Any]] | None:
    """Gom TAT CA dong chi tiet trong response.

    Bao cao gom nhom theo employee_name nen du lieu nam long nhieu tang
    (moi nhom nhan vien co mang con rieng). Phai duyet het cay va gop lai,
    khong duoc dung o mang dau tien tim thay.
    """
    found: list[dict[str, Any]] = []
    seen: set[int] = set()
    has_container = False

    def walk(n: Any) -> None:
        nonlocal has_container
        if isinstance(n, list):
            for item in n:
                walk(item)
        elif isinstance(n, dict):
            # Dong chi tiet = co ten khach hang
            if n.get("account_object_name"):
                if id(n) not in seen:
                    seen.add(id(n))
                    found.append(n)
                has_container = True
            # Van di tiep: dong cha co the chua mang con
            for value in n.values():
                if isinstance(value, (list, dict)):
                    walk(value)

    walk(node)

    if not has_container and not found:
        return None
    return found


# ------------------------------------------------------------ GOI API

def build_parameters(from_date: str, to_date: str) -> str:
    params = {
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
       # ⚠ PHAI la False. Do bang `diagnose_act.py` ngay 15/08/2026:
        #   True  -> Code 210, Total=0   (server nhan viec, du lieu chua san)
        #   False -> Code 211, Total=85  (doc bo dem, co du du lieu)
        # Giao dien web gui True vi no la thu TAO ra bo dem; script chi DOC.
        "p_is_refresh": False,
        "p_session_key": SESSION_KEY,
    }
    return b64(params)


def fetch_page(from_date: str, to_date: str, page_index: int) -> dict[str, Any]:
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json",
        # Cookie DA BO — `test_no_cookie.py` ngay 15/08/2026 do duoc: endpoint
        # nay chi can Bearer + X-Device + X-MISA-Context, bo cookie van tra du
        # 85 dong. Moi sang chi phai thay MOT thu la token.
        "X-Device": DEVICE_ID,
        "X-MISA-Context": MISA_CONTEXT,
        "Origin": "https://actapp.misa.vn",
        "Referer": (
            "https://actapp.misa.vn/app/RP/ReportList/RPDynamicViewer/"
            f"{REPORT_ID}"
        ),
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
        ),
    }

    body = {
        # ⚠ Copy y het request that cua giao dien web. Ban dau dung
        # `isOnlyData: True` + `isViewMCP: False` de "lay it du lieu hon", va
        # khong bao gio ra du lieu. Hai khoa nay la mot phan cua khoa bo dem
        # ben server — dung toi uu lai.
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
        stop(
            "Token het han hoac khong hop le.\n"
            "  -> Lay lai Authorization + Cookie + X-MISA-Context tu trinh duyet"
        )

    if not response.ok:
        stop(f"API tra ve loi: {response.text[:800]}")

    try:
        return response.json()
    except ValueError:
        stop(f"API khong tra JSON: {response.text[:500]}")
        return {}


def fetch_page_awaited(
    from_date: str, to_date: str, page_index: int
) -> dict[str, Any]:
    """Goi mot trang, cho neu server bao dang tinh (Code 210).

    Duong chay binh thuong tra 211 ngay lan dau nen vong cho khong kich hoat.
    Giu lai de phong ca bo dem chua kip tao.
    """
    payload = fetch_page(from_date, to_date, page_index)

    if payload.get("Code") != CODE_CALCULATING:
        return payload

    print("  Server dang tinh bao cao (Code 210). Cho va hoi lai...")

    for attempt in range(1, RETRY_MAX + 1):
        time.sleep(RETRY_WAIT_SECONDS)
        payload = fetch_page(from_date, to_date, page_index)

        if payload.get("Code") != CODE_CALCULATING:
            print(f"  Co du lieu sau {attempt} lan hoi lai.")
            return payload

        print(f"    lan {attempt}/{RETRY_MAX} — van dang tinh")

    stop(
        f"Server tinh qua {RETRY_MAX * RETRY_WAIT_SECONDS} giay van chua xong.\n"
        "  -> Mo bao cao tren trinh duyet MOT LAN roi chay lai ngay. Hanh dong\n"
        "     do tao san bo dem tren server voi dung p_session_key hien tai."
    )
    return {}


def fetch_all(from_date: str, to_date: str) -> list[dict[str, Any]]:
    all_rows: list[dict[str, Any]] = []
    page = 1

    while page <= 50:
        payload = fetch_page_awaited(from_date, to_date, page)

        if page == 1:
            with open("receivable_raw.json", "w", encoding="utf-8") as fp:
                json.dump(payload, fp, ensure_ascii=False, indent=2)

        rows = find_rows(payload)

        if rows is None:
            stop(
                f"Khong tim thay dong du lieu (Code={payload.get('Code')}).\n"
                "  -> Mo receivable_raw.json de xem cau truc thuc te."
            )

        if not rows:
            break

        print(f"  Trang {page}: {len(rows)} dong")
        all_rows.extend(rows)

        # Du lieu long theo nhom -> so dong chi tiet khong bang pageSize.
        # Dua vao so NHOM tra ve de quyet dinh con trang tiep hay khong.
        groups = payload.get("Data")
        group_count = len(groups) if isinstance(groups, list) else 0
        if group_count < PAGE_SIZE:
            break
        page += 1

    return all_rows


# ------------------------------------------------------------ HIEN THI

def print_report(rows: list[dict[str, Any]]) -> None:
    """Gom nhom theo nhan vien -> khach hang, giong bo cuc tren web."""
    grouped: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()

    for row in rows:
        employee = str(row.get("employee_name") or "").strip()
        if not employee:
            employee = "(khong xac dinh)"
        grouped.setdefault(employee, []).append(row)

    grand_total = 0.0

    for employee, items in grouped.items():
        subtotal = sum(to_number(item.get("receive_amount")) for item in items)
        grand_total += subtotal

        print(f"\n{employee}  ({len(items)})".ljust(62) + f"{subtotal:>18,.0f}")
        print("-" * 80)

        for item in items:
            customer = str(item.get("account_object_name") or "")
            amount = to_number(item.get("receive_amount"))
            group_name = str(item.get("account_object_group_name") or "")
            print(f"   {customer[:52]:<55}{amount:>16,.0f}  {group_name}")

    print("\n" + "=" * 80)
    print(f"{'TỔNG CỘNG':<57}{grand_total:>18,.0f}")
    print(f"{'Tổng số bản ghi':<57}{len(rows):>18}")
    print("=" * 80)


def export_csv(rows: list[dict[str, Any]], path: str = "cong_no.csv") -> None:
    import csv

    fields = [
        "employee_name",
        "account_object_name",
        "receive_amount",
        "account_object_group_code",
        "account_object_group_name",
    ]

    with open(path, "w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDa xuat CSV -> {path}")


# ------------------------------------------------------------ MAIN

def main() -> None:
    for name, value in (
        ("ACT_BEARER_TOKEN", BEARER_TOKEN),
        ("ACT_DEVICE", DEVICE_ID),
        ("ACT_MISA_CONTEXT", MISA_CONTEXT),
    ):
        if not value:
            stop(f"Thieu {name} trong .env")

    now_vn = datetime.now(VN_TZ)
    year = int(os.getenv("ACT_YEAR", now_vn.year))
    month = int(os.getenv("ACT_MONTH", now_vn.month))

    from_date, to_date = month_bounds_act(year, month)

    print("=" * 80)
    print("TONG HOP THANH TOAN CONG NO KHACH HANG THEO NHAN VIEN")
    print(f"Ky        : Thang {month:02d}/{year}")
    print(f"FromDate  : {from_date}")
    print(f"ToDate    : {to_date}   (quy uoc AMIS KT: ngay cuoi thang 00:00 VN)")
    print(f"Chi nhanh : {BRANCH_ID}")
    print("=" * 80)

    rows = fetch_all(from_date, to_date)

    if not rows:
        stop("Khong co du lieu. Kiem tra lai ky bao cao hoac chi nhanh.")

    print_report(rows)
    export_csv(rows)


if __name__ == "__main__":
    main()