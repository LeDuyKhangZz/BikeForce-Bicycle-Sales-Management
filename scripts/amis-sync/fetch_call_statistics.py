"""
Lấy báo cáo AMIS CRM "Thống kê cuộc gọi theo Đơn vị, Nhân viên" (ID 70).

Cách chạy:
    python fetch_call_statistics.py
    python fetch_call_statistics.py 2026-09-10

Không truyền ngày thì lấy hôm nay theo giờ Việt Nam. Report 70 luôn được lọc
đúng một ngày; không dùng kỳ tháng cho khối "Tình trạng thực hiện trong ngày".
Script đọc
token từ file .env cùng thư mục, lấy dữ liệu CRM rồi tự UPSERT snapshot vào
Supabase để báo cáo cộng với số SaleWork. Kết quả debug vẫn được lưu vào:
    call_statistics_raw.json
    call_statistics.json
"""

import base64
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests  # type: ignore
from dotenv import load_dotenv  # type: ignore


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


HERE = Path(__file__).resolve().parent
load_dotenv(HERE / ".env")
load_dotenv(HERE.parent.parent / ".env.local")

API_URL = "https://amisapp.misa.vn/crm/g1/api/report/Report/reportPaging"
REPORT_URL = "https://amisapp.misa.vn/crm/report/view/70/0"
REPORT_ID = 70
PAGE_SIZE = 100

BEARER_TOKEN = os.getenv("AMIS_BEARER_TOKEN", "").strip()
COOKIE = os.getenv("AMIS_COOKIE", "").strip()
COMPANY_CODE = os.getenv("AMIS_COMPANY_CODE", "BEDTGJL2").strip()
ORG_UNIT_ID = int(os.getenv("AMIS_ORG_UNIT_ID", "1"))
ORG_UNIT_TEXT = os.getenv("AMIS_ORG_UNIT_TEXT", "THỐNG ĐẠT GROUP").strip()
MISA_CODE = os.getenv("AMIS_MISA_CODE", "0001").strip()
SUPABASE_URL = os.getenv("BIKEFORCE_SUPABASE_URL", "").rstrip("/")
SERVICE_ROLE_KEY = os.getenv("BIKEFORCE_SERVICE_ROLE_KEY", "").strip()

VN_TZ = timezone(timedelta(hours=7))

COLUMNS = [
    "ID",
    "Code",
    "FullName",
    "QuantityOfCall",
    "QuantityOfCalled",
    "QuantityOfNotCalledYet",
    "TotalCallTime",
    "AverageOneCallTime",
    "QuantityOfCalledAway",
    "QuantityOfCallAwaySuccessful",
    "QuantityOfCallAwayNotSuccessful",
    "TotalCallAwayTime",
    "AverageOneCallAwayTime",
    "QuantityOfCalledIncoming",
    "QuantityOfCallIncomingSuccessful",
    "QuantityOfCallIncomingNotSuccessful",
    "TotalCallIncomingTime",
    "AverageOneCallIncomingTime",
    "FormLayoutID",
    "FormLayoutIDText",
    "OwnerID",
    "OwnerIDText",
]


def stop(message: str) -> None:
    print(f"\nLỖI: {message}")
    raise SystemExit(1)


def to_number(value: Any) -> int:
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def iso_ms(value: datetime) -> str:
    utc_value = value.astimezone(timezone.utc)
    return utc_value.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc_value.microsecond // 1000:03d}Z"


def day_range_vn(report_day: datetime) -> tuple[datetime, datetime]:
    """Đầu và cuối đúng một ngày nghiệp vụ theo giờ Việt Nam."""
    start = report_day.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1) - timedelta(milliseconds=1)


def encoded_columns() -> str:
    return base64.b64encode(",".join(COLUMNS).encode("utf-8")).decode("ascii")


def request_body(report_day: datetime) -> dict[str, Any]:
    from_date, to_date = day_range_vn(report_day)

    return {
        "Columns": encoded_columns(),
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
                # Period=13 là "tháng này" và khiến AMIS trả lũy kế đầu tháng.
                # Báo cáo ngày phải dùng kỳ tùy chọn cùng FromDate/ToDate một ngày.
                "Period": 0,
                "FromDate": iso_ms(from_date),
                "ToDate": iso_ms(to_date),
                "AnalysisType": 2,
                "AnalysisTypeText": "Cơ cấu tổ chức",
                "OrganizationUnitID": ORG_UNIT_ID,
                "OrganizationUnitIDText": ORG_UNIT_TEXT,
                "MISACode": MISA_CODE,
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
                "IsViewEmployee": True,
                "IsDisplay": True,
                "ProductStatisticsID": "1",
                "ProductStatisticsIDText": "Hàng hóa",
            },
        },
        "IsUsedELTS": True,
        "ListGmailPage": [],
        "ListFacebookPage": {},
        "IsGetCache": False,
        "IsCheckInactive": False,
        "IsConverted": False,
        "SessionID": str(uuid.uuid4()),
        "LayoutCodeCheckPermission": "Report",
        "AISearchKeyword": "",
        "SkipNormalSearch": False,
    }


def fetch(report_day: datetime) -> dict[str, Any]:
    if not BEARER_TOKEN:
        stop("Thiếu AMIS_BEARER_TOKEN trong scripts/amis-sync/.env")

    headers = {
        "Accept": "application/json, text/plain, */*",
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Content-Type": "application/json",
        "companycode": COMPANY_CODE,
        "layoutcode": "report",
        "X-MISA-Language": "vi-VN",
        "Origin": "https://amisapp.misa.vn",
        "Referer": REPORT_URL,
    }
    if COOKIE:
        headers["Cookie"] = COOKIE

    response = requests.post(
        API_URL,
        headers=headers,
        json=request_body(report_day),
        timeout=90,
    )

    if response.status_code in (401, 403):
        stop("Phiên AMIS đã hết hạn. Chạy lại amis-harvest.ts --login để lấy token mới.")
    if not response.ok:
        stop(f"AMIS trả HTTP {response.status_code}: {response.text[:500]}")

    try:
        payload = response.json()
    except ValueError:
        stop(f"AMIS không trả JSON: {response.text[:500]}")

    if not isinstance(payload, dict) or payload.get("Success") is not True:
        stop(f"AMIS báo thất bại: {json.dumps(payload, ensure_ascii=False)[:500]}")

    return payload


def normalize_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("Data")
    if not isinstance(data, list):
        return []

    rows: list[dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue

        rows.append(
            {
                "employee_code": str(item.get("Code") or "").strip(),
                "employee_name": str(item.get("FullName") or "").strip(),
                "total_quantity": to_number(item.get("QuantityOfCall")),
                "called_quantity": to_number(item.get("QuantityOfCalled")),
                "not_called_quantity": to_number(item.get("QuantityOfNotCalledYet")),
                "outgoing_successful": to_number(item.get("QuantityOfCallAwaySuccessful")),
                "outgoing_unsuccessful": to_number(item.get("QuantityOfCallAwayNotSuccessful")),
                "outgoing_total": to_number(item.get("QuantityOfCallAway")),
                "outgoing_duration_seconds": to_number(item.get("TotalCallAwayTime")),
                "incoming_successful": to_number(item.get("QuantityOfCallIncomingSuccessful")),
                "incoming_unsuccessful": to_number(item.get("QuantityOfCallIncomingNotSuccessful")),
                "incoming_duration_seconds": to_number(item.get("TotalCallIncomingTime")),
                "total_calls": to_number(item.get("QuantityOfCall")),
                "total_duration_seconds": to_number(item.get("TotalCallTime")),
            }
        )

    return rows


def duration_text(total_seconds: int) -> str:
    hours, remainder = divmod(max(total_seconds, 0), 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:02d}:{seconds:02d}"


def crm_snapshot_key(report_date: str, employee_code: str) -> str:
    return f"__CRM70__:{report_date}:{employee_code}"


def upsert_to_supabase(rows: list[dict[str, Any]], report_day: datetime) -> int:
    """Ghi snapshot CRM theo ngày; chạy lại cùng ngày không cộng lặp."""
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        stop(
            "Thiếu BIKEFORCE_SUPABASE_URL hoặc BIKEFORCE_SERVICE_ROLE_KEY "
            "trong scripts/amis-sync/.env hoặc .env.local"
        )
    if not rows:
        return 0

    synced_at = datetime.now(timezone.utc).isoformat()
    report_date = report_day.strftime("%Y-%m-%d")
    payload = [
        {
            "account_name": crm_snapshot_key(report_date, row["employee_code"]),
            "conversations": row["total_quantity"],
            "sent_messages": 0,
            "received_messages": 0,
            "incoming_calls": row["incoming_successful"],
            "outgoing_calls": row["called_quantity"],
            "missed_calls": row["not_called_quantity"],
            "call_duration": f"{row['outgoing_duration_seconds']} giây",
            "updated_at": synced_at,
        }
        for row in rows
        if row["employee_code"] and row["employee_name"]
    ]
    if not payload:
        return 0

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/salework_reports",
        params={"on_conflict": "account_name"},
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        json=payload,
        timeout=30,
    )
    if not response.ok:
        stop(f"Ghi Supabase thất bại HTTP {response.status_code}: {response.text[:500]}")
    return len(payload)


def print_rows(rows: list[dict[str, Any]]) -> None:
    print(
        f"\n{'MÃ NV':<14}{'TÊN NHÂN VIÊN':<28}"
        f"{'TỔNG SL':>9}{'ĐÃ GỌI':>9}{'CHƯA GỌI':>11}{'GỌI ĐẾN TC':>13}"
    )
    print("-" * 84)

    for row in rows:
        print(
            f"{str(row['employee_code'])[:13]:<14}"
            f"{str(row['employee_name'])[:27]:<28}"
            f"{row['total_quantity']:>9}"
            f"{row['called_quantity']:>9}"
            f"{row['not_called_quantity']:>11}"
            f"{row['incoming_successful']:>13}"
        )


def selected_date() -> datetime:
    args = sys.argv[1:]
    now_vn = datetime.now(VN_TZ)

    if not args:
        return now_vn
    if len(args) != 1:
        stop("Cách chạy: python fetch_call_statistics.py [YYYY-MM-DD]")

    try:
        parsed = datetime.strptime(args[0], "%Y-%m-%d")
    except (TypeError, ValueError):
        stop("Ngày không hợp lệ. Ví dụ: python fetch_call_statistics.py 2026-09-10")

    return parsed.replace(tzinfo=VN_TZ)


def main() -> None:
    report_day = selected_date()
    report_date = report_day.strftime("%Y-%m-%d")

    print("=" * 80)
    print("THỐNG KÊ CUỘC GỌI THEO ĐƠN VỊ, NHÂN VIÊN")
    print(f"Ngày    : {report_date} (Period=0, lọc đúng một ngày)")
    print(f"Đơn vị  : {ORG_UNIT_TEXT} (ID={ORG_UNIT_ID})")
    print("=" * 80)

    payload = fetch(report_day)
    rows = normalize_rows(payload)

    (HERE / "call_statistics_raw.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (HERE / "call_statistics.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"HTTP 200 — lấy được {len(rows)} nhân viên.")
    print_rows(rows)
    updated_count = upsert_to_supabase(rows, report_day)
    print(f"\nĐã cập nhật {updated_count} dòng CRM vào Supabase.")
    print("Đã lưu call_statistics_raw.json và call_statistics.json để đối soát.")


if __name__ == "__main__":
    main()
