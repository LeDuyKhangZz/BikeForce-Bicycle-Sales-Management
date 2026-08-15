"""
Chẩn đoán Code 210 của báo cáo công nợ AMIS Kế toán.

Đã loại trừ được: p_session_key (giống hệt browser), p_is_refresh (đã True),
isViewMCP (đã True), ACT_DEVICE và SessionId trong X-MISA-Context (đã khớp).

Script này thử LẦN LƯỢT vài biến thể để tìm ra thứ còn thiếu. Mỗi biến thể chỉ
đổi ĐÚNG MỘT thứ so với bản đang chạy, nên cái nào ra dữ liệu thì đó là nguyên
nhân.

Chạy:
    python diagnose_act.py
"""

import base64
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from dotenv import load_dotenv

# Dùng lại nguyên cấu hình của script chính — không chép lại hằng số.
import test_act_receivable as act

load_dotenv()

TIMEOUT = 90


def summarize(payload: dict[str, Any]) -> str:
    """Rút gọn phản hồi thành một dòng đọc được."""
    code = payload.get("Code")
    data = payload.get("Data")

    total = None
    if isinstance(data, dict):
        total = data.get("Total")
        rows = 0
    elif isinstance(data, list):
        rows = len(data)
    else:
        rows = 0

    detail = act.find_rows(payload)
    detail_count = len(detail) if detail else 0

    return (
        f"Code={code}  Total={total}  nhom={rows}  dong_chi_tiet={detail_count}"
    )


def call(label: str, headers: dict[str, str], body: dict[str, Any]) -> None:
    print(f"\n--- {label} ---")

    try:
        response = requests.post(act.API_URL, headers=headers, json=body, timeout=TIMEOUT)
    except requests.RequestException as error:
        print(f"  LOI KET NOI: {error}")
        return

    print(f"  HTTP {response.status_code}")

    if not response.ok:
        print(f"  {response.text[:300]}")
        return

    try:
        payload = response.json()
    except ValueError:
        print(f"  Khong phai JSON: {response.text[:200]}")
        return

    print(f"  {summarize(payload)}")

    detail = act.find_rows(payload)
    if detail:
        print(f"  >>> CO DU LIEU. Vi du: {detail[0].get('account_object_name')} "
              f"= {detail[0].get('receive_amount')}")


def base_headers() -> dict[str, str]:
    return {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": f"Bearer {act.BEARER_TOKEN}",
        "Content-Type": "application/json",
        "Cookie": act.COOKIE,
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


def base_body(from_date: str, to_date: str) -> dict[str, Any]:
    return {
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


def main() -> None:
    now_vn = datetime.now(act.VN_TZ)
    year = int(os.getenv("ACT_YEAR", now_vn.year))
    month = int(os.getenv("ACT_MONTH", now_vn.month))
    from_date, to_date = act.month_bounds_act(year, month)

    print("=" * 72)
    print(f"CHAN DOAN ACT — Ky {month:02d}/{year}")
    print(f"FromDate: {from_date}")
    print(f"ToDate  : {to_date}")
    print("=" * 72)

    # 0. Bản đang chạy — mốc so sánh.
    call("0. Ban dang chay (mac dinh)", base_headers(), base_body(from_date, to_date))

    # 1. Thêm X-MISA-AccessToken. Response header của browser liệt kê nó trong
    #    `Access-Control-Allow-Headers`, nghĩa là server CHẤP NHẬN header này —
    #    có thể nó dùng để phân giải phiên thay vì Authorization.
    headers = base_headers()
    headers["X-MISA-AccessToken"] = act.BEARER_TOKEN
    call("1. Them X-MISA-AccessToken", headers, base_body(from_date, to_date))

    # 2. Thêm cả cụm X-MISA-* mà server khai báo chấp nhận.
    headers = base_headers()
    headers["X-MISA-AccessToken"] = act.BEARER_TOKEN
    headers["X-MISA-BranchID"] = act.BRANCH_ID
    headers["X-MISA-Language"] = "vi"
    headers["X-MISA-WorkingBook"] = "0"
    headers["X-MISA-ClientType"] = "1"
    call("2. Them tron bo X-MISA-*", headers, base_body(from_date, to_date))

    # 3. `actionLoadReport: 0`. Bản đang chạy gửi 1 = "nạp báo cáo"; 0 có thể là
    #    "đọc kết quả đã nạp" — đúng bước hai của một luồng bất đồng bộ.
    body = base_body(from_date, to_date)
    body["actionLoadReport"] = 0
    call("3. actionLoadReport = 0", base_headers(), body)

    # 4. `p_is_refresh: False`. Nếu browser đã nạp xong bộ đệm thì đọc lại bộ
    #    đệm mới là đường đúng, còn `True` bắt tính lại từ đầu mỗi lần.
    original = act.build_parameters

    def params_no_refresh(f: str, t: str) -> str:
        decoded = json.loads(base64.b64decode(original(f, t)))
        decoded["p_is_refresh"] = False
        return act.b64(decoded)

    body = base_body(from_date, to_date)
    body["parameters"] = params_no_refresh(from_date, to_date)
    call("4. p_is_refresh = False", base_headers(), body)

    # 5. Cả hai: actionLoadReport 0 + p_is_refresh False.
    body = base_body(from_date, to_date)
    body["actionLoadReport"] = 0
    body["parameters"] = params_no_refresh(from_date, to_date)
    call("5. actionLoadReport=0 + p_is_refresh=False", base_headers(), body)

    print()
    print("=" * 72)
    print("DOC KET QUA")
    print("=" * 72)
    print(
        "\n  Bien the nao in ra dong '>>> CO DU LIEU' thi do la cach dung.\n"
        "  Bao lai cho toi so thu tu do, se sua thang vao test_act_receivable.py.\n"
        "\n  Neu KHONG cai nao ra du lieu: bo dem ben server gan voi phien trinh\n"
        "  duyet chu khong gan voi token. Khi do phai mo bao cao tren browser\n"
        "  NGAY TRUOC khi chay script, moi lan."
    )


if __name__ == "__main__":
    main()