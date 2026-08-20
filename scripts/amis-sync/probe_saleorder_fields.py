"""Dump toan bo field cua 1 SaleOrder de xem co truong nhan vien khong."""

import json
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv("AMIS_API_BASE", "https://crmconnect.misa.vn/api/v2").rstrip("/")
CLIENT_ID = os.getenv("AMIS_CLIENT_ID")
CLIENT_SECRET = os.getenv("AMIS_CLIENT_SECRET")
TIMEOUT = 30


def find_access_token(value):
    if isinstance(value, dict):
        for key, child in value.items():
            k = str(key).strip().lower().replace("_", "").replace("-", "")
            if k in {"accesstoken", "token", "bearertoken", "authorizationtoken"}:
                if isinstance(child, str) and child.strip():
                    return child.strip()
        for key in ("data", "Data", "result", "Result"):
            if key in value:
                t = find_access_token(value[key])
                if t:
                    return t
        for child in value.values():
            if isinstance(child, (dict, list)):
                t = find_access_token(child)
                if t:
                    return t
    elif isinstance(value, list):
        for item in value:
            t = find_access_token(item)
            if t:
                return t
    elif isinstance(value, str):
        s = value.strip()
        if s.startswith(("{", "[")):
            try:
                return find_access_token(json.loads(s))
            except json.JSONDecodeError:
                return None
        if len(s) >= 40 and " " not in s:
            return s
    return None


r = requests.post(
    f"{API_BASE}/Account",
    headers={"Accept": "application/json", "Content-Type": "application/json"},
    json={"client_id": CLIENT_ID, "client_secret": CLIENT_SECRET},
    timeout=TIMEOUT,
)
print(f"HTTP /Account: {r.status_code}")

token = find_access_token(r.json())
if not token:
    print(r.text[:500])
    sys.exit("Khong lay duoc token")
print("Token OK\n")

headers = {
    "Authorization": f"Bearer {token}",
    "Clientid": str(CLIENT_ID),
    "Accept": "application/json",
}

r = requests.get(
    f"{API_BASE}/SaleOrders",
    headers=headers,
    params={"page": 1, "pageSize": 1},
    timeout=TIMEOUT,
)
print(f"HTTP /SaleOrders: {r.status_code}")

payload = r.json()
data = payload.get("data") or payload.get("Data")
if isinstance(data, str):
    data = json.loads(data)
rec = data[0] if isinstance(data, list) else data

print("\n=== TAT CA FIELD ===")
print(json.dumps(rec, ensure_ascii=False, indent=2))

print("\n=== FIELD LIEN QUAN NHAN VIEN ===")
hits = [
    (k, v) for k, v in rec.items()
    if any(t in k.lower() for t in
           ("owner", "employee", "user", "staff", "assign", "sale", "nv", "seller"))
]
for k, v in hits:
    print(f"  {k} = {v}")
if not hits:
    print("  (khong co truong nao)")