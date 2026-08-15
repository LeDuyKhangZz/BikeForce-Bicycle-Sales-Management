"""
Dò sâu `/SaleOrders` và `/Contacts` của API CÔNG KHAI.

Bối cảnh: `probe_amis_public_api.py` đã xác nhận
  • Token OAuth **không** dùng được cho endpoint nội bộ (trả 500).
  • Nhưng `/SaleOrders` và `/Contacts` của API công khai **trả 200**.

Nếu `/SaleOrders` có đủ ba thứ — người phụ trách, ngày, số tiền, trạng thái ghi
doanh số — thì tự cộng lấy được doanh số theo nhân viên, và cả bài toán cookie
hết hạn biến mất vĩnh viễn.

Script này CHỈ ĐỌC. Nó in ra:
  1. Toàn bộ tên cột của một đơn hàng
  2. Một bản ghi đầy đủ để đọc giá trị thật
  3. Các cột nghi là "người phụ trách" và "trạng thái"
  4. Thử phân trang + lọc theo ngày

Chạy:
    python probe_sale_orders.py
"""

import json
import os
import sys
from collections import Counter
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

TIMEOUT = 60


def stop(message: str) -> None:
    print(f"\nLOI: {message}")
    sys.exit(1)


def find_access_token(value: Any) -> str | None:
    """Chép nguyên từ `sync_amis_to_supabase.py` — đã chứng minh chạy được."""
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
    response = requests.post(
        f"{API_BASE}/Account",
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        json={"client_id": CLIENT_ID, "client_secret": CLIENT_SECRET},
        timeout=TIMEOUT,
    )

    if not response.ok:
        stop(f"HTTP {response.status_code} khi lay token: {response.text[:300]}")

    token = find_access_token(response.json())
    if not token:
        stop("Khong tim thay access token trong phan hoi.")

    print("LAY TOKEN OAUTH THANH CONG\n")
    return token


def headers_for(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Clientid": str(CLIENT_ID),
        "Accept": "application/json",
    }


def extract_list(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data")
    if data is None:
        data = payload.get("Data")

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            return []

    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]

    if isinstance(data, dict):
        for key in ("data", "Data", "items", "Items", "records", "Records"):
            value = data.get(key)
            if isinstance(value, list):
                return [item for item in value if isinstance(item, dict)]

    return []


def fetch(token: str, path: str, params: dict[str, Any]) -> dict[str, Any] | None:
    try:
        response = requests.get(
            f"{API_BASE}{path}",
            headers=headers_for(token),
            params=params,
            timeout=TIMEOUT,
        )
    except requests.RequestException as error:
        print(f"  LOI KET NOI: {error}")
        return None

    print(f"  HTTP {response.status_code}  params={params}")

    if not response.ok:
        print(f"  {response.text[:300]}")
        return None

    try:
        return response.json()
    except ValueError:
        print(f"  Khong phai JSON: {response.text[:200]}")
        return None


# ------------------------------------------------------------ PHAN TICH

"""
Từ khoá nhận diện cột. AMIS đặt tên không nhất quán giữa các API nên dò bằng
chuỗi con thay vì so khớp tuyệt đối.
"""
OWNER_HINTS = ("owner", "employee", "sale", "assign", "staff", "user")
STATUS_HINTS = ("status", "state", "revenue", "approve", "book")
DATE_HINTS = ("date", "time", "created", "modified")
AMOUNT_HINTS = ("amount", "total", "value", "price", "money")


def classify_columns(columns: list[str]) -> None:
    """Nhóm tên cột theo vai trò nghi ngờ, để mắt người soi nhanh."""

    def matching(hints: tuple[str, ...]) -> list[str]:
        return [
            column
            for column in columns
            if any(hint in column.lower() for hint in hints)
        ]

    print("\n--- COT NGHI LA NGUOI PHU TRACH ---")
    for column in matching(OWNER_HINTS):
        print(f"  {column}")

    print("\n--- COT NGHI LA TRANG THAI ---")
    for column in matching(STATUS_HINTS):
        print(f"  {column}")

    print("\n--- COT NGHI LA NGAY ---")
    for column in matching(DATE_HINTS):
        print(f"  {column}")

    print("\n--- COT NGHI LA SO TIEN ---")
    for column in matching(AMOUNT_HINTS):
        print(f"  {column}")


def summarize_owners(rows: list[dict[str, Any]], columns: list[str]) -> None:
    """Đếm số đơn theo từng cột nghi là người phụ trách.

    Cột nào cho ra vài chục giá trị khác nhau, mỗi giá trị lặp nhiều lần, thì
    rất có thể đó là cột nhân viên. Cột nào gần như mỗi dòng một giá trị thì là
    khoá của đơn hàng chứ không phải người.
    """
    candidates = [
        column
        for column in columns
        if any(hint in column.lower() for hint in OWNER_HINTS)
        and "id" not in column.lower()[-3:]
    ]

    if not candidates:
        print("\n(Khong co cot nao nghi la ten nguoi phu trach.)")
        return

    print("\n--- PHAN BO GIA TRI CUA CAC COT NGHI LA NGUOI ---")

    for column in candidates:
        values = [
            str(row.get(column) or "").strip()
            for row in rows
            if str(row.get(column) or "").strip()
        ]

        if not values:
            continue

        counter = Counter(values)
        print(f"\n  {column}  ({len(counter)} gia tri khac nhau / {len(values)} dong)")

        for value, count in counter.most_common(8):
            print(f"    {value[:44]:<46} {count} don")


def probe_sale_orders(token: str) -> None:
    print("=" * 72)
    print("/SaleOrders — CAU TRUC")
    print("=" * 72)

    payload = fetch(token, "/SaleOrders", {"page": 1, "pageSize": 100})
    if payload is None:
        return

    rows = extract_list(payload)
    print(f"\n  So dong tra ve: {len(rows)}")

    # Khoá phân trang nằm ở cấp payload, không nằm trong data
    for key in ("total", "Total", "total_pages", "TotalPages", "total_records"):
        if key in payload:
            print(f"  {key}: {payload[key]}")

    if not rows:
        print("\n  Khong co dong nao. Kiem tra quyen cua AppID tren AMIS.")
        return

    columns = sorted(rows[0].keys())
    print(f"\n--- {len(columns)} COT ---")
    for index in range(0, len(columns), 3):
        print("  " + "".join(f"{column:<34}" for column in columns[index : index + 3]))

    classify_columns(columns)
    summarize_owners(rows, columns)

    print("\n--- MOT BAN GHI DAY DU ---")
    print(json.dumps(rows[0], ensure_ascii=False, indent=2, default=str)[:3000])


def probe_date_filter(token: str) -> None:
    """Thử lọc theo ngày — cần thiết nếu muốn cộng theo tháng."""
    print()
    print("=" * 72)
    print("/SaleOrders — THU LOC THEO NGAY")
    print("=" * 72)

    for params in (
        {"page": 1, "pageSize": 5, "fromDate": "2026-08-01", "toDate": "2026-08-31"},
        {"page": 1, "pageSize": 5, "from_date": "2026-08-01", "to_date": "2026-08-31"},
        {"page": 1, "pageSize": 5, "bookDate": "2026-08-01"},
    ):
        payload = fetch(token, "/SaleOrders", params)
        if payload is not None:
            rows = extract_list(payload)
            dates = [str(row.get("book_date") or "")[:10] for row in rows]
            print(f"    -> {len(rows)} dong, book_date: {dates}")


def probe_contacts(token: str) -> None:
    print()
    print("=" * 72)
    print("/Contacts — CAU TRUC")
    print("=" * 72)

    payload = fetch(token, "/Contacts", {"page": 1, "pageSize": 20})
    if payload is None:
        return

    rows = extract_list(payload)
    print(f"\n  So dong tra ve: {len(rows)}")

    if not rows:
        return

    columns = sorted(rows[0].keys())
    print(f"\n--- {len(columns)} COT ---")
    for index in range(0, len(columns), 3):
        print("  " + "".join(f"{column:<34}" for column in columns[index : index + 3]))

    classify_columns(columns)


def main() -> None:
    if not CLIENT_ID:
        stop("Thieu AMIS_CLIENT_ID trong .env")
    if not CLIENT_SECRET:
        stop("Thieu AMIS_CLIENT_SECRET trong .env")

    print("=" * 72)
    print("DO SAU API CONG KHAI")
    print(f"API_BASE: {API_BASE}")
    print("=" * 72)
    print()

    token = get_access_token()

    probe_sale_orders(token)
    probe_date_filter(token)
    probe_contacts(token)

    print()
    print("=" * 72)
    print("CAN TIM GI TRONG KET QUA TREN")
    print("=" * 72)
    print(
        "\n  1. Mot cot chua TEN nhan vien (khong phai uuid) — de nhom doanh so.\n"
        "  2. Mot cot TRANG THAI de loc 'da ghi doanh so'.\n"
        "  3. Loc theo ngay co an khong (xem phan THU LOC THEO NGAY).\n"
        "\n  Du ca ba -> viet lai duoc bang OAuth, bo han cookie.\n"
        "  Thieu (1) -> chi cong duoc TONG toan cong ty, khong tach theo nguoi."
    )


if __name__ == "__main__":
    main()