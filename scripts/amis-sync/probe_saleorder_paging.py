import json, os, requests
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

def page(n, size=100):
    r = requests.get(f"{API_BASE}/SaleOrders", headers=H,
                     params={"page":n,"pageSize":size}, timeout=60)
    d = r.json().get("data") or []
    if isinstance(d, str): d = json.loads(d)
    return d if isinstance(d, list) else []

print("--- pageSize toi da ---")
for sz in (50, 100, 200):
    print(f"  pageSize={sz} -> tra ve {len(page(1, sz))} ban ghi")

print("")
print("--- Thu tu sap xep (trang 1, 5 don dau) ---")
for x in page(1, 5):
    print(f"  {x.get('sale_order_date','')[:10]}  {x.get('sale_order_no')}  {x.get('owner_name')}")

print("")
print("--- Kiem tra do sau: page 1,5,10,20,50 ---")
for n in (1, 5, 10, 20, 50):
    d = page(n, 100)
    if not d:
        print(f"  page {n}: RONG")
        continue
    ds = sorted(x.get("sale_order_date","")[:10] for x in d)
    print(f"  page {n}: {len(d)} don, tu {ds[0]} den {ds[-1]}")
