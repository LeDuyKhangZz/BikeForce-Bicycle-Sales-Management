"""Sync MISA public SaleOrders into BikeForce operational tables.

Default: current calendar month. Optional: --from-date YYYY-MM-DD.
"""

import argparse
import json
import os
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
load_dotenv(SCRIPT_DIR / ".env", encoding="utf-8-sig", override=True)
load_dotenv(SCRIPT_DIR.parent.parent / ".env.local", encoding="utf-8-sig", override=False)

API_BASE = os.getenv("AMIS_API_BASE", "https://crmconnect.misa.vn/api/v2").rstrip("/")
CLIENT_ID = os.getenv("AMIS_CLIENT_ID", "").strip()
CLIENT_SECRET = os.getenv("AMIS_CLIENT_SECRET", "").strip()
SUPABASE_URL = os.getenv("BIKEFORCE_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("BIKEFORCE_SERVICE_ROLE_KEY", "").strip()
PAGE_SIZE = 100
RPC_BATCH_SIZE = 50


def stop(message: str) -> None:
    raise SystemExit(message)


def find_token(value: Any) -> str | None:
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = str(key).lower().replace("_", "").replace("-", "")
            if normalized in {"accesstoken", "token", "bearertoken", "authorizationtoken"}:
                if isinstance(child, str) and child.strip():
                    return child.strip()
        for child in value.values():
            token = find_token(child)
            if token:
                return token
    elif isinstance(value, list):
        for child in value:
            token = find_token(child)
            if token:
                return token
    elif isinstance(value, str):
        text = value.strip()
        if text.startswith(("{", "[")):
            try:
                return find_token(json.loads(text))
            except json.JSONDecodeError:
                return None
        if len(text) >= 40 and " " not in text:
            return text
    return None


def get_token() -> str:
    response = requests.post(
        f"{API_BASE}/Account",
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        json={"client_id": CLIENT_ID, "client_secret": CLIENT_SECRET},
        timeout=30,
    )
    if not response.ok:
        stop(f"Lay token MISA loi HTTP {response.status_code}: {response.text[:300]}")
    token = find_token(response.json())
    if not token:
        stop("MISA khong tra access token.")
    return token


def extract_rows(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    rows = payload.get("data") if payload.get("data") is not None else payload.get("Data")
    if isinstance(rows, str):
        try:
            rows = json.loads(rows)
        except json.JSONDecodeError:
            return []
    if not isinstance(rows, list):
        return []
    return [row for row in rows if isinstance(row, dict)]


def iso_date(value: Any) -> str | None:
    if not isinstance(value, str) or len(value) < 10:
        return None
    candidate = value[:10]
    try:
        datetime.strptime(candidate, "%Y-%m-%d")
        return candidate
    except ValueError:
        return None


def number(value: Any) -> float:
    try:
        result = float(value or 0)
        return result if result >= 0 else 0
    except (TypeError, ValueError):
        return 0


def employee_name(value: Any) -> str:
    text = str(value or "").strip()
    if " (" in text and text.endswith(")"):
        return text.rsplit(" (", 1)[0].strip()
    return text


def normalize_order(row: dict[str, Any]) -> dict[str, Any] | None:
    source_id = row.get("id")
    order_code = str(row.get("sale_order_no") or "").strip()
    order_date = iso_date(row.get("sale_order_date") or row.get("book_date"))
    if source_id is None or not order_code or not order_date:
        return None

    raw_lines = row.get("sale_order_product_mappings")
    lines: list[dict[str, Any]] = []
    if isinstance(raw_lines, list):
        for raw_line in raw_lines:
            if not isinstance(raw_line, dict) or raw_line.get("id") is None:
                continue
            product_code = str(raw_line.get("product_code") or "").strip()
            if not product_code or raw_line.get("is_note_row") is True:
                continue
            lines.append({
                "source_line_id": str(raw_line["id"]),
                "product_code": product_code,
                "product_name": str(raw_line.get("description_product") or raw_line.get("description") or product_code).strip(),
                "unit": str(raw_line.get("usage_unit") or raw_line.get("unit") or "Cái").strip(),
                "quantity": number(raw_line.get("usage_unit_amount") or raw_line.get("amount")),
                "unit_price": number(raw_line.get("usage_unit_price") or raw_line.get("price")),
                "discount_amount": number(raw_line.get("discount")),
                "line_total": number(raw_line.get("to_currency_after_discount") or raw_line.get("total")),
            })

    return {
        "source_id": str(source_id),
        "order_code": order_code,
        "order_date": order_date,
        "customer_code": str(row.get("account_code") or "").strip(),
        "employee_code": str(row.get("employee_code") or "").strip(),
        "employee_name": employee_name(row.get("owner_name") or row.get("recorded_sale_users_name")),
        "status": str(row.get("revenue_status") or row.get("status") or "UNKNOWN").strip(),
        "currency_code": str(row.get("currency_type") or "VND").strip(),
        "subtotal": number(row.get("to_currency_summary") or row.get("sale_order_amount")),
        "discount_amount": number(row.get("discount_summary")),
        "total_amount": number(row.get("sale_order_amount") or row.get("to_currency_summary")),
        "outstanding_amount": number(row.get("balance_receipt_amount")),
        "due_date": iso_date(row.get("due_date")),
        "source_updated_at": row.get("modified_date"),
        "lines": lines,
    }


def fetch_orders(token: str, from_date: str, max_pages: int = 0) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}", "Clientid": CLIENT_ID, "Accept": "application/json"}
    result: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    page = 1
    while True:
        response = requests.get(
            f"{API_BASE}/SaleOrders", headers=headers,
            params={"page": page, "pageSize": PAGE_SIZE}, timeout=90,
        )
        if not response.ok:
            stop(f"Doc SaleOrders loi HTTP {response.status_code}: {response.text[:300]}")
        rows = extract_rows(response.json())
        if not rows:
            break
        page_new_ids = 0
        page_dates: list[str] = []
        page_matches = 0
        for row in rows:
            source_id = str(row.get("id") or "")
            if not source_id or source_id in seen_ids:
                continue
            seen_ids.add(source_id)
            page_new_ids += 1
            row_date = iso_date(row.get("sale_order_date") or row.get("book_date"))
            if row_date:
                page_dates.append(row_date)
                if row_date >= from_date:
                    normalized = normalize_order(row)
                    if normalized:
                        result.append(normalized)
                        page_matches += 1
        date_span = f", ngay {min(page_dates)}..{max(page_dates)}" if page_dates else ""
        print(f"Trang {page}: {len(rows)} don, {page_new_ids} ID moi, {page_matches} khop{date_span}")
        if len(rows) < PAGE_SIZE or page_new_ids == 0:
            break
        if max_pages > 0 and page >= max_pages:
            break
        page += 1
        if page > 1000:
            stop("SaleOrders vuot 1000 trang; dung an toan de kiem tra lai phan trang.")
    return result


def push_orders(orders: list[dict[str, Any]]) -> None:
    totals = {"orders": 0, "lines": 0, "products": 0, "debts": 0}
    for start in range(0, len(orders), RPC_BATCH_SIZE):
        batch = orders[start:start + RPC_BATCH_SIZE]
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/upsert_misa_sale_orders",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"},
            json={"p_orders": batch}, timeout=120,
        )
        if not response.ok:
            stop(f"Ghi Supabase loi HTTP {response.status_code}: {response.text[:500]}")
        rows = response.json()
        summary = rows[0] if isinstance(rows, list) and rows else {}
        totals["orders"] += int(summary.get("order_count", 0))
        totals["lines"] += int(summary.get("line_count", 0))
        totals["products"] += int(summary.get("product_count", 0))
        totals["debts"] += int(summary.get("debt_count", 0))
        print(f"Da ghi {min(start + len(batch), len(orders))}/{len(orders)} don")
    print("Hoan tat:", totals)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-date", default=date.today().replace(day=1).isoformat())
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--max-pages", type=int, default=0, help="Chi dung de chan so trang khi chan doan.")
    args = parser.parse_args()
    if not all((CLIENT_ID, CLIENT_SECRET, SUPABASE_URL, SUPABASE_KEY)):
        stop("Thieu AMIS_CLIENT_ID/SECRET hoac BIKEFORCE_SUPABASE_URL/SERVICE_ROLE_KEY.")
    datetime.strptime(args.from_date, "%Y-%m-%d")
    orders = fetch_orders(get_token(), args.from_date, args.max_pages)
    print(f"Tong don tu {args.from_date}: {len(orders)}")
    if args.dry_run:
        return
    push_orders(orders)


if __name__ == "__main__":
    main()
