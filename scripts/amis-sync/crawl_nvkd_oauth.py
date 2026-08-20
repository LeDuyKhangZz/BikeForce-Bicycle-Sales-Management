"""
Thay the crawl_nvkd.py — dung OAuth API cong khai, KHONG can cookie/bearer thu cong.

Chay:  python crawl_nvkd_oauth.py            (thang truoc)
       python crawl_nvkd_oauth.py 2026 7     (chi dinh ky)
       python crawl_nvkd_oauth.py 2026 7 --dry   (khong ghi Supabase)
"""

import json
import os
import sys
from collections import defaultdict
from datetime import date

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv("AMIS_API_BASE", "https://crmconnect.misa.vn/api/v2").rstrip("/")
CLIENT_ID = os.getenv("AMIS_CLIENT_ID")
CLIENT_SECRET = os.getenv("AMIS_CLIENT_SECRET")
SB_URL = os.getenv("BIKEFORCE_SUPABASE_URL", "").rstrip("/")
SB_KEY = os.getenv("BIKEFORCE_SERVICE_ROLE_KEY")

PAGE_SIZE = 100
MAX_PAGES = 500
TIMEOUT = 60


def find_token(v):
    if isinstance(v, dict):
        for k, c in v.items():
            nk = str(k).strip().lower().replace("_", "").replace("-", "")
            if nk in {"accesstoken", "token", "bearertoken", "authorizationtoken"}:
                if isinstance(c, str) and c.strip():
                    return c.strip()
        for k in ("data", "Data", "result", "Result"):
            if k in v:
                t = find_token(v[k])
                if t:
                    return t
        for c in v.values():
            if isinstance(c, (dict, list)):
                t = find_token(c)
                if t:
                    return t
    elif isinstance(v, list):
        for i in v:
            t = find_token(i)
            if t:
                return t
    elif isinstance(v, str):
        s = v.strip()
        if s.startswith(("{", "[")):
            try:
                return find_token(json.loads(s))
            except json.JSONDecodeError:
                return None
        if len(s) >= 40 and " " not in s:
            return s
    return None


def get_token():
    r = requests.post(
        f"{API_BASE}/Account",
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        json={"client_id": CLIENT_ID, "client_secret": CLIENT_SECRET},
        timeout=TIMEOUT,
    )
    t = find_token(r.json())
    if not t:
        sys.exit(f"Khong lay duoc token: {r.text[:300]}")
    return t


def fetch_all(token):
    H = {"Authorization": f"Bearer {token}",
         "Clientid": str(CLIENT_ID),
         "Accept": "application/json"}
    rows, page = [], 1
    while page <= MAX_PAGES:
        r = requests.get(f"{API_BASE}/SaleOrders", headers=H,
                         params={"page": page, "pageSize": PAGE_SIZE}, timeout=TIMEOUT)
        if not r.ok:
            print(f"  page {page}: HTTP {r.status_code}, dung.")
            break
        d = r.json().get("data") or []
        if isinstance(d, str):
            d = json.loads(d)
        if not isinstance(d, list) or not d:
            break
        rows.extend(d)
        if page % 10 == 0:
            print(f"  ...page {page}, tong {len(rows)} don")
        if len(d) < PAGE_SIZE:
            break
        page += 1
    return rows


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv

    if len(args) >= 2:
        year, month = int(args[0]), int(args[1])
    else:
        today = date.today()
        year, month = (today.year - 1, 12) if today.month == 1 else (today.year, today.month - 1)

    prefix = f"{year:04d}-{month:02d}"

    print("=" * 66)
    print("DOANH SO THEO NHAN VIEN KINH DOANH (OAuth, khong can cookie)")
    print(f"Ky: thang {month:02d}/{year}")
    print("=" * 66)

    if not CLIENT_ID or not CLIENT_SECRET:
        sys.exit("Thieu AMIS_CLIENT_ID / AMIS_CLIENT_SECRET trong .env")

    print("\nDang lay token...")
    token = get_token()
    print("Token OK")

    print("\nDang keo don hang (khong loc duoc server-side, phai keo het)...")
    rows = fetch_all(token)
    print(f"Tong cong {len(rows)} don")

    kept = [x for x in rows if str(x.get("sale_order_date") or "")[:7] == prefix]
    print(f"Trong ky {prefix}: {len(kept)} don")

    if not kept:
        sys.exit("Khong co don nao trong ky. Kiem tra lai thang/nam.")

    agg = defaultdict(lambda: {"name": "", "amount": 0.0, "orders": 0, "unit": ""})
    for x in kept:
        code = x.get("employee_code") or "(khong ro)"
        a = agg[code]
        a["name"] = x.get("owner_name") or a["name"]
        a["unit"] = x.get("recorded_sale_organization_unit_name") or a["unit"]
        a["amount"] += float(x.get("sale_order_amount") or 0)
        a["orders"] += 1

    print("")
    print(f"{'MA NV':<16}{'TEN':<34}{'SO DON':>8}{'DOANH SO':>18}")
    print("-" * 76)
    for code, a in sorted(agg.items(), key=lambda kv: -kv[1]["amount"]):
        nm = a["name"].split(" (")[0][:32]
        print(f"{code:<16}{nm:<34}{a['orders']:>8}{a['amount']:>18,.0f}")
    print("-" * 76)
    total = sum(a["amount"] for a in agg.values())
    print(f"{'TONG':<58}{sum(a['orders'] for a in agg.values()):>8}{total:>18,.0f}")

    if dry:
        print("\n[--dry] Khong ghi Supabase.")
        return

    if not SB_URL or not SB_KEY:
        print("\nThieu BIKEFORCE_SUPABASE_URL / BIKEFORCE_SERVICE_ROLE_KEY -> bo qua ghi.")
        return

    payload = [{
        "period": f"{prefix}-01",
        "amis_employee_code": code,
        "amis_employee_name": a["name"],
        "org_unit_name": a["unit"],
        "net_sales": round(a["amount"], 2),
        "no_of_orders": a["orders"],
        "source": "public_api",
    } for code, a in agg.items()]

    print(f"\nGhi {len(payload)} dong vao Supabase...")
    r = requests.post(
        f"{SB_URL}/rest/v1/amis_employee_metrics",
        headers={
            "apikey": SB_KEY,
            "Authorization": f"Bearer {SB_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        json=payload, timeout=TIMEOUT,
    )
    if r.ok:
        print(f"OK -> {SB_URL}")
    else:
        print(f"LOI HTTP {r.status_code}: {r.text[:500]}")


if __name__ == "__main__":
    main()
