"""
Đẩy số liệu MISA AMIS vào Supabase của BikeForce.

Chạy trên máy cá nhân, KHÔNG deploy. Lý do: 3/4 nguồn dùng cookie phiên
trình duyệt (~24h) và ACT còn cần p_session_key không tự sinh được.

Mỗi nguồn chạy độc lập: một nguồn hỏng không kéo sập các nguồn còn lại, và
**cũng không xoá dữ liệu cũ của nguồn đó** — xem chú thích của `upsert()`.

Cần trong .env (cùng thư mục):
    BIKEFORCE_SUPABASE_URL=http://127.0.0.1:54321
    BIKEFORCE_SERVICE_ROLE_KEY=sb_secret_...

Chạy:
    python push_amis.py

Chọn kỳ khác (mặc định là tháng hiện tại):
    $env:PUSH_YEAR="2026"; $env:PUSH_MONTH="7"; python push_amis.py
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import requests # type: ignore
from dotenv import load_dotenv # type: ignore

# Tái sử dụng nguyên logic đã kiểm chứng từ các script cũ.
import test_amis_revenue as revenue_mod
import test_act_receivable as receivable_mod
import crawl_nvkd as nvkd_mod

load_dotenv(override=True)

SUPABASE_URL = os.getenv("BIKEFORCE_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.getenv("BIKEFORCE_SERVICE_ROLE_KEY", "").strip()

VN_TZ = timezone(timedelta(hours=7))

"""
Cột chia theo NGUỒN, không gộp thành một danh sách chung.

Đây là bản sửa của một lỗi mất dữ liệu thật: bản trước gửi đủ 14 cột ở mọi lần
chạy, cột nào không lấy được thì để `None`. PostgREST hiểu `None` là NULL, nên
một lần ACT hết `p_session_key` là **xoá sạch cột công nợ** đã đồng bộ thành
công hôm trước — số 146.617.500đ biến thành `—` trên tấm ảnh mà không ai biết
vì sao.

Nay nguồn nào hỏng thì cột của nó **bị bỏ hẳn khỏi payload**, và UPSERT của
Postgres giữ nguyên giá trị đang có. Ảnh in số hơi cũ, nhưng không bao giờ mất.
"""

# Khoá chính — luôn có mặt trong mọi payload.
KEY_COLUMNS = ["period_month", "employee_name"]

# Nguồn 1 — CRM report 119 (`crawl_nvkd.py`).
NVKD_COLUMNS = [
    "net_sales",
    "sales",
    "return_sales",
    "no_of_orders",
    "qty_account_in_charge",
    "qty_account_interactive",
    "qty_account_sold",
    "qty_account_sold_this_period",
    "org_unit_name",
]

# Nguồn 2 — CRM dashboard doanh số (`test_amis_revenue.py`).
REVENUE_COLUMNS = ["target_amount", "current_amount"]

# Nguồn 3 — AMIS Kế toán (`test_act_receivable.py`).
RECEIVABLE_COLUMNS = ["receive_amount"]


def to_number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def period_month(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}-01"


def upsert(rows: list[dict[str, Any]], columns: list[str]) -> None:
    """Ghi vào Supabase qua PostgREST.

    `Prefer: resolution=merge-duplicates` = UPSERT theo primary key
    (`period_month`, `employee_name`).

    ⚠ `columns` chỉ chứa cột của những nguồn CHẠY ĐƯỢC trong lần này. Cột của
    nguồn hỏng bị bỏ hẳn khỏi payload thay vì gửi `None`: gửi `None` là ghi NULL
    đè lên số cũ còn tốt, tức một lần token hết hạn xoá mất dữ liệu đã đồng bộ
    thành công hôm trước.

    PostgREST vẫn đòi mọi object trong mảng có CÙNG bộ key (PGRST102), nên vẫn
    phải chuẩn hoá — chỉ khác là chuẩn hoá về tập cột HẸP HƠN.
    """
    if not rows:
        print("  (khong co dong nao de ghi)")
        return

    if len(columns) <= len(KEY_COLUMNS):
        print("  Khong nguon nao chay duoc — khong ghi gi de giu nguyen so cu.")
        return

    payload = [{column: row.get(column) for column in columns} for row in rows]

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/amis_employee_metrics",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        },
        json=payload,
        timeout=60,
    )

    if not response.ok:
        print(f"  LOI ghi Supabase HTTP {response.status_code}")
        print(f"  {response.text[:400]}")
        return

    data_columns = [c for c in columns if c not in KEY_COLUMNS]
    print(f"  Da ghi {len(payload)} dong, {len(data_columns)} cot du lieu.")
    print(f"  Cot: {', '.join(data_columns)}")


# --------------------------------------------- NGUON 1: NVKD (CRM report 119)

def pull_nvkd(year: int, month: int, period: int) -> dict[str, dict[str, Any]]:
    """Doanh số + thống kê khách hàng theo từng nhân viên."""
    from_date, to_date = nvkd_mod.month_range_vn(year, month)

    rows = nvkd_mod.fetch(
        nvkd_mod.ROOT_UNIT_ID,
        nvkd_mod.ROOT_UNIT_TEXT,
        True,  # IsViewEmployee -> tách theo người
        from_date,
        to_date,
        period,
    )

    result: dict[str, dict[str, Any]] = {}

    for row in rows:
        name = str(row.get("Name") or "").strip()
        if not name:
            continue

        result[name] = {
            "period_month": period_month(year, month),
            "employee_name": name,
            "net_sales": to_number(row.get("NetSales")),
            "sales": to_number(row.get("Sales")),
            "return_sales": to_number(row.get("ReturnSales")),
            "no_of_orders": int(to_number(row.get("NoOfOrders"))),
            "qty_account_in_charge": int(
                to_number(row.get("QuantityAccountInCharge"))
            ),
            "qty_account_interactive": int(
                to_number(row.get("QuantityAccountInteractive"))
            ),
            "qty_account_sold": int(to_number(row.get("QuantityAccountSold"))),
            "qty_account_sold_this_period": int(
                to_number(row.get("QuantityAccountSoldThisPeriod"))
            ),
            "org_unit_name": nvkd_mod.ROOT_UNIT_TEXT,
        }

    return result


# ------------------------------------------ NGUON 2: dashboard doanh so (CRM)

def pull_revenue(year: int, month: int) -> dict[str, dict[str, float]]:
    """Mục tiêu / đã thực hiện theo nhân viên.

    ⚠ `current_amount` là con số thẻ ảnh dùng cho dòng "Doanh số đã ghi", KHÔNG
    phải `net_sales` của nguồn 1. Dashboard lọc "Đã ghi + Từ chối ghi" còn report
    119 chỉ "Đã ghi" — chênh ~50 triệu ở kỳ 08/2026. Ghép `target_amount` của
    dashboard với `net_sales` của report cho ra tỉ lệ sai (11,2% thay vì 17,4%).
    """
    from_date, to_date = revenue_mod.month_range_vn(year, month)
    payload = revenue_mod.fetch_dashboard(from_date, to_date)
    rows = revenue_mod.find_employee_data(payload) or []

    result: dict[str, dict[str, float]] = {}

    for row in rows:
        name = str(row.get("FullName") or "").strip()
        if not name:
            continue

        result[name] = {
            "target_amount": to_number(row.get("TargetAmount")),
            "current_amount": to_number(row.get("CurrentAmount")),
        }

    return result


# ------------------------------------------------- NGUON 3: cong no (ACT KT)

def pull_receivable(year: int, month: int) -> dict[str, float]:
    """Cộng dồn công nợ đã thu theo nhân viên.

    Con số này khớp cột "Số tiền thanh toán" ở dòng tổng của mỗi nhân viên trên
    báo cáo `SummaryCustomerReceivableByEmployee` của actapp.misa.vn.
    """
    from_date, to_date = receivable_mod.month_bounds_act(year, month)
    rows = receivable_mod.fetch_all(from_date, to_date)

    totals: dict[str, float] = {}

    for row in rows:
        name = str(row.get("employee_name") or "").strip()
        if not name:
            continue
        totals[name] = totals.get(name, 0.0) + to_number(row.get("receive_amount"))

    return totals


# ------------------------------------------------------------------- MAIN

def main() -> None:
    if not SUPABASE_URL:
        sys.exit("Thieu BIKEFORCE_SUPABASE_URL trong .env")
    if not SERVICE_KEY:
        sys.exit("Thieu BIKEFORCE_SERVICE_ROLE_KEY trong .env")

    now_vn = datetime.now(VN_TZ)
    year = int(os.getenv("PUSH_YEAR", now_vn.year))
    month = int(os.getenv("PUSH_MONTH", now_vn.month))

    prev = now_vn.replace(day=1) - timedelta(days=1)
    if (year, month) == (now_vn.year, now_vn.month):
        period = 13  # Thang nay
    elif (year, month) == (prev.year, prev.month):
        period = 14  # Thang truoc
    else:
        period = 0  # Tuy chon

    print("=" * 70)
    print(f"DAY SO LIEU AMIS -> BIKEFORCE   |   Ky: {month:02d}/{year}")
    print(f"Dich: {SUPABASE_URL}")
    print("=" * 70)

    merged: dict[str, dict[str, Any]] = {}

    # Chỉ cột của nguồn CHẠY ĐƯỢC mới được thêm vào đây. Đó là toàn bộ cơ chế
    # chống ghi đè NULL — xem chú thích của `upsert()`.
    columns: list[str] = list(KEY_COLUMNS)

    def slot(name: str) -> dict[str, Any]:
        """Lấy (hoặc tạo) dòng dữ liệu của một nhân viên."""
        return merged.setdefault(
            name,
            {"period_month": period_month(year, month), "employee_name": name},
        )

    # --- Nguon 1: NVKD ---
    print("\n[1/3] NVKD (CRM report 119)...")
    try:
        merged = pull_nvkd(year, month, period)
        columns.extend(NVKD_COLUMNS)
        print(f"  Lay duoc {len(merged)} nhan vien.")
    except SystemExit:
        print("  BO QUA: token CRM het han. Cot doanh so GIU NGUYEN gia tri cu.")
    except Exception as error:
        print(f"  BO QUA: {error}")

    # --- Nguon 2: dashboard doanh so ---
    print("\n[2/3] Dashboard doanh so (CRM)...")
    try:
        for name, values in pull_revenue(year, month).items():
            slot(name).update(values)
        columns.extend(REVENUE_COLUMNS)
        print("  OK.")
    except SystemExit:
        print("  BO QUA: token CRM het han. Cot muc tieu GIU NGUYEN gia tri cu.")
    except Exception as error:
        print(f"  BO QUA: {error}")

    # --- Nguon 3: cong no ---
    print("\n[3/3] Cong no (AMIS Ke toan)...")
    try:
        for name, amount in pull_receivable(year, month).items():
            slot(name)["receive_amount"] = amount
        columns.extend(RECEIVABLE_COLUMNS)
        print("  OK.")
    except SystemExit:
        print("  BO QUA: ACT_SESSION_KEY het han. Cot cong no GIU NGUYEN gia tri cu.")
    except Exception as error:
        print(f"  BO QUA: {error}")

    # --- Ghi vao Supabase ---
    print("\nGhi vao Supabase...")
    upsert(list(merged.values()), columns)

    if merged:
        print("\nTen nhan vien da day len:")
        for name in sorted(merged):
            print("  -", name)
        print(
            "\n-> Mo Studio > profiles, dien cac ten nay vao cot "
            "amis_employee_name tuong ung."
        )
    else:
        print("\nKhong lay duoc du lieu tu nguon nao. Kiem tra lai token/cookie.")


if __name__ == "__main__":
    main()