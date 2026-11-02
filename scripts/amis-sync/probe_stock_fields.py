"""Read one Stocks and product_ledger page to inspect MISA field names."""

import json
import os
import sys
import requests
from dotenv import load_dotenv
from probe_amis_public_api import get_access_token, public_headers

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()
BASE = os.getenv("AMIS_API_BASE", "https://crmconnect.misa.vn/api/v2").rstrip("/")
CLIENT_ID = os.getenv("AMIS_CLIENT_ID", "")
SECRET = os.getenv("AMIS_CLIENT_SECRET", "")
STOCK_CODE = os.getenv("AMIS_STOCK_CODE", "")
COMPANY_CODE = os.getenv("AMIS_COMPANY_CODE", "").strip()


headers = public_headers(get_access_token())

for path, params in (
    ("/Stocks", {"page": 1, "pageSize": 1}),
    ("/Stocks/product_ledger", {"page": 1, "pageSize": 1, "stock_code": STOCK_CODE}),
):
    response = requests.get(f"{BASE}{path}", headers=headers, params=params, timeout=60)
    print(f"\n=== {path} HTTP {response.status_code} ===")
    if not response.ok:
        print(response.text[:1000])
        continue
    payload = response.json()
    rows = payload.get("data") or payload.get("Data") or []
    if isinstance(rows, str):
        rows = json.loads(rows)
    print(json.dumps(rows[0] if isinstance(rows, list) and rows else rows, ensure_ascii=False, indent=2)[:10000])
