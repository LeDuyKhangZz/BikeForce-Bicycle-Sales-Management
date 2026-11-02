"""Sync all MISA stock ledgers into BikeForce products and inventory."""

import json
import os
import sys
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from probe_amis_public_api import get_access_token, public_headers

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
load_dotenv(SCRIPT_DIR / ".env", encoding="utf-8-sig", override=True)
load_dotenv(SCRIPT_DIR.parent.parent / ".env.local", encoding="utf-8-sig", override=False)

API_BASE = os.getenv("AMIS_API_BASE", "https://crmconnect.misa.vn/api/v2").rstrip("/")
SUPABASE_URL = os.getenv("BIKEFORCE_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("BIKEFORCE_SERVICE_ROLE_KEY", "").strip()
PAGE_SIZE = 100
RPC_BATCH_SIZE = 500


def extract_rows(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    rows = payload.get("data") if payload.get("data") is not None else payload.get("Data")
    if isinstance(rows, str):
        try:
            rows = json.loads(rows)
        except json.JSONDecodeError:
            return []
    return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


def fetch_all(path: str, headers: dict[str, str], extra: dict[str, str] | None = None) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    page = 1
    while True:
        params: dict[str, Any] = {"page": page, "pageSize": PAGE_SIZE}
        if extra:
            params.update(extra)
        response = requests.get(f"{API_BASE}{path}", headers=headers, params=params, timeout=90)
        if not response.ok:
            raise SystemExit(f"{path} loi HTTP {response.status_code}: {response.text[:400]}")
        rows = extract_rows(response.json())
        new_count = 0
        for row in rows:
            identity = str(row.get("async_id") or row.get("product_code") or row.get("stock_code") or "")
            if not identity or identity in seen:
                continue
            seen.add(identity)
            result.append(row)
            new_count += 1
        if len(rows) < PAGE_SIZE or new_count == 0:
            break
        page += 1
        if page > 1000:
            raise SystemExit(f"{path} vuot 1000 trang")
    return result


def push_stock(stock_code: str, items: list[dict[str, Any]]) -> int:
    total = 0
    normalized = [{
        "product_code": str(item.get("product_code") or "").strip(),
        "quantity_on_hand": max(float(item.get("main_stock_quantity") or 0), 0),
    } for item in items if str(item.get("product_code") or "").strip()]
    for start in range(0, len(normalized), RPC_BATCH_SIZE):
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/upsert_misa_inventory",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"},
            json={"p_stock_code": stock_code, "p_items": normalized[start:start + RPC_BATCH_SIZE]},
            timeout=120,
        )
        if not response.ok:
            raise SystemExit(f"Ghi kho {stock_code} loi HTTP {response.status_code}: {response.text[:500]}")
        total += int(response.json())
    return total


def main() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SystemExit("Thieu BIKEFORCE_SUPABASE_URL hoac BIKEFORCE_SERVICE_ROLE_KEY")
    headers = public_headers(get_access_token())
    stocks = fetch_all("/Stocks", headers)
    print(f"Tim thay {len(stocks)} kho MISA")
    grand_total = 0
    for stock in stocks:
        stock_code = str(stock.get("stock_code") or "").strip()
        if not stock_code or stock.get("inactive") is True:
            continue
        items = fetch_all("/Stocks/product_ledger", headers, {"stock_code": stock_code})
        count = push_stock(stock_code, items)
        grand_total += count
        print(f"{stock_code}: {count} mat hang")
    print(f"Hoan tat ton kho: {grand_total} dong kho-san pham")


if __name__ == "__main__":
    main()
