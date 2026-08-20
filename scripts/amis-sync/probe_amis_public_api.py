"""
Dò xem có thể BỎ HẲN cookie phiên hay không.

Vấn đề đang gặp: `test_amis_revenue.py`, `test_crm_customer_stats.py`,
`crawl_nvkd.py` và `test_act_receivable.py` đều dùng Bearer + Cookie copy tay
từ F12, hết hạn sau ~24h. Riêng `sync_amis_to_supabase.py` (tồn kho) thì không:
nó lấy token bằng `client_id` + `client_secret` qua `/Account` nên chạy mãi.

Script này trả lời DỨT ĐIỂM hai câu:

  A. Token OAuth của API công khai có dùng được cho endpoint NỘI BỘ không?
     (nếu có → sửa 3 script kia là xong, hết cảnh dán cookie mỗi ngày)

  B. API công khai có sẵn endpoint nào trả doanh số / khách hàng / công nợ
     theo nhân viên không? (nếu có → viết lại sạch, không cần endpoint nội bộ)

Chạy:
    python probe_amis_public_api.py

Chỉ ĐỌC, không ghi gì. An toàn chạy bất cứ lúc nào.
"""

import json
import os
import sys
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv(
    "AMIS_API_BASE",
    "https://crmconnect.misa.vn/api/v2",
).rstrip("/")

CLIENT_ID = os.getenv("AMIS_CLIENT_ID")
CLIENT_SECRET = os.getenv("AMIS_CLIENT_SECRET")
COMPANY_CODE = os.getenv("AMIS_COMPANY_CODE", "BEDTGJL2").strip()

TIMEOUT = 30


def stop(message: str) -> None:
    print(f"\nLOI: {message}")
    sys.exit(1)


def find_access_token(value: Any) -> str | None:
    """Tìm access token trong nhiều cấu trúc phản hồi AMIS khác nhau.

    Chép nguyên từ `sync_amis_to_supabase.py` — đã chứng minh chạy được.
    """
    if isinstance(value, dict):
        for key, child_value in value.items():
            normalized_key = (
                str(key).strip().lower().replace("_", "").replace("-", "")
            )
            if normalized_key in {
                "accesstoken",
                "token",
                "bearertoken",
                "authorizationtoken",
            }:
                if isinstance(child_value, str) and child_value.strip():
                    return child_value.strip()

        for key in ("data", "Data", "result", "Result"):
            if key in value:
                token = find_access_token(value[key])
                if token:
                    return token

        for child_value in value.values():
            if isinstance(child_value, (dict, list)):
                token = find_access_token(child_value)
                if token:
                    return token

    elif isinstance(value, list):
        for item in value:
            token = find_access_token(item)
            if token:
                return token

    elif isinstance(value, str):
        text_value = value.strip()
        if text_value.startswith(("{", "[")):
            try:
                return find_access_token(json.loads(text_value))
            except json.JSONDecodeError:
                return None
        if len(text_value) >= 40 and " " not in text_value:
            return text_value

    return None


def get_access_token() -> str:
    """Lấy token OAuth — cùng đường mà script tồn kho đang đi."""
    response = requests.post(
        f"{API_BASE}/Account",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        json={"client_id": CLIENT_ID, "client_secret": CLIENT_SECRET},
        timeout=TIMEOUT,
    )

    print(f"HTTP /Account: {response.status_code}")

    try:
        payload = response.json()
    except ValueError:
        stop(f"AMIS khong tra JSON: {response.text[:300]}")

    token = find_access_token(payload)

    if not token:
        print(json.dumps(payload, ensure_ascii=False, indent=2)[:1000])
        stop("Khong tim thay access token. Kiem tra AMIS_CLIENT_ID / SECRET.")

    print("LAY TOKEN OAUTH THANH CONG\n")
    return token


def public_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Clientid": str(CLIENT_ID),
        "Accept": "application/json",
    }


# --------------------------------------------------------- CAU HOI B

"""
Danh sách endpoint ĐOÁN của API công khai.

Không có tài liệu công khai đầy đủ nên đây là phỏng đoán theo quy ước đặt tên
mà `/Stocks` và `/Stocks/product_ledger` đã cho thấy. Mỗi cái chỉ tốn một
request; cái nào trả 200 là một đường đi sạch.
"""
CANDIDATE_ENDPOINTS = [
    # Danh mục
    "/Users",
    "/Employees",
    "/Accounts",
    "/Contacts",
    "/Organizations",
    "/OrganizationUnits",
    # Nghiệp vụ bán hàng
    "/SaleOrders",
    "/Orders",
    "/Opportunities",
    "/Quotes",
    "/Invoices",
    # Doanh số / công nợ
    "/Revenues",
    "/Sales",
    "/SaleOrders/revenue",
    "/Reports",
    "/Dashboards",
    "/Debts",
    "/Receivables",
]


def probe_public_endpoints(token: str) -> list[tuple[str, int, int]]:
    """Thử từng endpoint, ghi lại mã HTTP và số bản ghi trả về."""
    headers = public_headers(token)
    results: list[tuple[str, int, int]] = []

    print("=" * 70)
    print("CAU HOI B — API CONG KHAI CO GI?")
    print("=" * 70)

    for path in CANDIDATE_ENDPOINTS:
        try:
            response = requests.get(
                f"{API_BASE}{path}",
                headers=headers,
                params={"page": 1, "pageSize": 1},
                timeout=TIMEOUT,
            )
        except requests.RequestException as error:
            print(f"  {path:<28} LOI KET NOI: {error}")
            continue

        record_count = 0
        preview = ""

        if response.ok:
            try:
                payload = response.json()
                data = payload.get("data") or payload.get("Data")

                if isinstance(data, str):
                    try:
                        data = json.loads(data)
                    except json.JSONDecodeError:
                        pass

                if isinstance(data, list):
                    record_count = len(data)
                    if data and isinstance(data[0], dict):
                        preview = ", ".join(list(data[0].keys())[:6])
                elif isinstance(data, dict):
                    record_count = 1
                    preview = ", ".join(list(data.keys())[:6])
            except ValueError:
                preview = "(khong phai JSON)"

        marker = "OK  " if response.ok else "    "
        print(f"{marker}{path:<28} HTTP {response.status_code}", end="")

        if preview:
            print(f"  -> {preview}")
        else:
            print()

        results.append((path, response.status_code, record_count))

    return results


# --------------------------------------------------------- CAU HOI A

def probe_internal_with_oauth(token: str) -> None:
    """Thử token OAuth trên hai endpoint nội bộ đang phải dùng cookie.

    Nếu một trong hai trả 200 thì cả bài toán token hết hạn biến mất.
    """
    print()
    print("=" * 70)
    print("CAU HOI A — TOKEN OAUTH CO DUNG DUOC CHO ENDPOINT NOI BO?")
    print("=" * 70)

    common = {
        "Accept": "application/json, text/plain, */*",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "companycode": COMPANY_CODE,
        "X-MISA-Language": "vi-VN",
        "Origin": "https://amisapp.misa.vn",
    }

    # 1. Dashboard doanh so — nguon cua test_amis_revenue.py
    print("\n[1] Dashboard doanh so (amisapp.misa.vn/crm/g2/api/dashboard)")
    try:
        response = requests.post(
            "https://amisapp.misa.vn/crm/g2/api/dashboard/Dashboard/2/data",
            headers={**common, "layoutcode": "dashboard"},
            json={
                "DashboardType": 2,
                "IsGetNew": True,
                "Param": json.dumps({"DashboardID": 7}, ensure_ascii=False),
                "DashboardID": 7,
                "DashboardName": "Doanh số đã ghi CÓ TÍNH TRẢ HÀNG",
            },
            timeout=TIMEOUT,
        )
        print(f"    HTTP {response.status_code}")
        print(f"    {response.text[:300]}")
    except requests.RequestException as error:
        print(f"    LOI KET NOI: {error}")

    # 2. Report 119 — nguon cua crawl_nvkd.py
    print("\n[2] Report 119 (amisapp.misa.vn/crm/g2/api/report)")
    try:
        response = requests.post(
            "https://amisapp.misa.vn/crm/g2/api/report/Report/reportPaging",
            headers={**common, "layoutcode": "report"},
            json={
                "Page": 1,
                "PageSize": 1,
                "LayoutCode": "Report",
                "CustomPagingData": {"ID": 119, "ReportDynamicID": 0, "Data": {}},
            },
            timeout=TIMEOUT,
        )
        print(f"    HTTP {response.status_code}")
        print(f"    {response.text[:300]}")
    except requests.RequestException as error:
        print(f"    LOI KET NOI: {error}")


def main() -> None:
    if not CLIENT_ID:
        stop("Thieu AMIS_CLIENT_ID trong .env")
    if not CLIENT_SECRET:
        stop("Thieu AMIS_CLIENT_SECRET trong .env")

    print("=" * 70)
    print("DO KHA NANG BO COOKIE PHIEN")
    print(f"API_BASE: {API_BASE}")
    print("=" * 70)
    print()

    token = get_access_token()

    results = probe_public_endpoints(token)
    probe_internal_with_oauth(token)

    # --- Ket luan ---
    working = [path for path, status, _ in results if status == 200]

    print()
    print("=" * 70)
    print("KET LUAN")
    print("=" * 70)

    if working:
        print(f"\nCo {len(working)} endpoint cong khai tra 200:")
        for path in working:
            print(f"  - {path}")
        print(
            "\n-> Neu mot trong so nay co du lieu doanh so / khach hang theo\n"
            "   nhan vien thi viet lai sach duoc, khong can cookie."
        )
    else:
        print(
            "\nKhong endpoint cong khai nao ngoai /Stocks tra 200.\n"
            "-> API cong khai cua goi hien tai chi mo phan TON KHO."
        )

    print(
        "\nVoi CAU HOI A: xem hai ma HTTP o tren.\n"
        "  200 -> sua duoc, bo cookie.\n"
        "  401/403 -> endpoint noi bo doi session dang nhap that,\n"
        "             token OAuth khong thay the duoc. Phai giu cach dan\n"
        "             cookie thu cong, hoac lien he MISA xin mo API."
    )


if __name__ == "__main__":
    main()