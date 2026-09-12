import sys
import os
import json
import base64
from pathlib import Path
from collections import defaultdict
from dotenv import load_dotenv

repo = Path(__file__).resolve().parent.parent
load_dotenv(repo / 'scripts/amis-sync/.env', override=True)
sys.path.insert(0, str(repo / 'scripts/amis-sync'))
import test_act_receivable as act

original = act.build_parameters
def parameters(start, end):
    decoded = json.loads(base64.b64decode(original(start, end)))
    decoded['p_branch_id'] = os.getenv('ACT_BRANCH_FILTER', act.BRANCH_ID + ',')
    decoded['p_include_dependent_branch'] = os.getenv('ACT_INCLUDE_DEPENDENT_BRANCH', 'false').lower() == 'true'
    return act.b64(decoded)
act.build_parameters = parameters
start, end = act.month_bounds_act(2026, 8)
totals = defaultdict(float)
counts = []
for page in range(1, 51):
    payload = act.fetch_page(start, end, page)
    rows = act.find_rows(payload) or []
    counts.append([page, payload.get('Code'), len(rows)])
    for row in rows:
        totals[str(row.get('employee_name'))] += act.to_number(row.get('receive_amount'))
    if len(rows) < act.PAGE_SIZE:
        break
print(json.dumps({'pages': counts, 'totals': dict(totals)}, ensure_ascii=True))
