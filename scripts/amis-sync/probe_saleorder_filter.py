import json, os, sys, requests
from dotenv import load_dotenv
load_dotenv()

API_BASE = os.getenv("AMIS_API_BASE", "https://crmconnect.misa.vn/api/v2").rstrip("/")
CID = os.getenv("AMIS_CLIENT_ID")
SECRET = os.getenv("AMIS_CLIENT_SECRET")

def ft(v):
    if isinstance(v, dict):
        for k, c in v.items():
            if str(k).lower().replace("_","") in {"accesstoken","token"} and isinstance(c,str) and c.strip():
                return c.strip()
        for k in ("data","Data"):
            if k in v:
                t = ft(v[k])
                if t: return t
        for c in v.values():
            if isinstance(c,(dict,list)):
                t = ft(c)
                if t: return t
    elif isinstance(v, list):
        for i in v:
            t = ft(i)
            if t: return t
    elif isinstance(v, str):
        s = v.strip()
        if s.startswith(("{","[")):
            try: return ft(json.loads(s))
            except: return None
        if len(s) >= 40 and " " not in s: return s
    return None

r = requests.post(f"{API_BASE}/Account", json={"client_id":CID,"client_secret":SECRET},
                  headers={"Accept":"application/json","Content-Type":"application/json"}, timeout=30)
token = ft(r.json())
H = {"Authorization":f"Bearer {token}","Clientid":str(CID),"Accept":"application/json"}

print("--- Test phan trang + tong so ban ghi ---")
r = requests.get(f"{API_BASE}/SaleOrders", headers=H, params={"page":1,"pageSize":5}, timeout=30)
p = r.json()
print("Cac key cap 1:", list(p.keys()))
print("Total:", p.get("total") or p.get("Total") or p.get("totalRecord"))

print("")
print("--- Test loc theo ngay (thu vai kieu tham so) ---")
for prm in [
    {"page":1,"pageSize":1,"fromDate":"2026-07-01","toDate":"2026-07-31"},
    {"page":1,"pageSize":1,"from_date":"2026-07-01","to_date":"2026-07-31"},
    {"page":1,"pageSize":1,"startDate":"2026-07-01","endDate":"2026-07-31"},
]:
    r = requests.get(f"{API_BASE}/SaleOrders", headers=H, params=prm, timeout=30)
    d = r.json().get("data") or []
    if isinstance(d, str): d = json.loads(d)
    dates = [x.get("sale_order_date","")[:10] for x in d] if isinstance(d,list) else []
    print(f"  {list(prm.keys())[2:]} -> HTTP {r.status_code}, ngay mau: {dates}")
