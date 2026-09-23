"""Xuất báo cáo CRM 119 ra CSV; chỉ đọc, không ghi cơ sở dữ liệu.

Ví dụ: python scripts/amis-sync/export_report119.py 2026 9
       python scripts/amis-sync/export_report119.py 2026 9 --unit-id 1 --unit-name "THỐNG ĐẠT GROUP"

Phiên CRM được đọc từ scripts/amis-sync/.env (AMIS_BEARER_TOKEN,
AMIS_COMPANY_CODE). API công khai AppID/client_secret chưa được MISA xác nhận
hỗ trợ endpoint báo cáo nội bộ này.
"""

import argparse
import csv
import sys
from datetime import datetime
from pathlib import Path

import fetch_report119 as report


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Xuất báo cáo khách hàng theo NVKD (119)")
    parser.add_argument("year", type=int)
    parser.add_argument("month", type=int)
    parser.add_argument("--unit-id", type=int, default=1)
    parser.add_argument("--unit-name", default="THỐNG ĐẠT GROUP")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    try:
        start, end = report.month_range(args.year, args.month)
    except ValueError as error:
        parser.error(str(error))

    if not report.TOKEN:
        parser.error("Thiếu AMIS_BEARER_TOKEN trong scripts/amis-sync/.env")
    if not report.COMPANY:
        parser.error("Thiếu AMIS_COMPANY_CODE trong scripts/amis-sync/.env")

    report.UNIT_ID = args.unit_id
    report.UNIT_TEXT = args.unit_name
    now = datetime.now(report.VN)
    previous = now.replace(day=1) - report.timedelta(days=1)
    period = (13 if (args.year, args.month) == (now.year, now.month)
              else 14 if (args.year, args.month) == (previous.year, previous.month)
              else 0)
    rows = report.fetch(start, end, period)
    if not rows:
        print("Không có dòng dữ liệu; kiểm tra quyền, đơn vị và kỳ báo cáo.", file=sys.stderr)
        return 1
    if len(rows) >= 200:
        print("Báo cáo chạm giới hạn 200 dòng; dừng để tránh xuất thiếu dữ liệu.", file=sys.stderr)
        return 1

    columns = ["Name", *report.METRICS]
    output = args.output or Path(f"report119-{args.year:04d}-{args.month:02d}.csv")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Đã xuất {len(rows)} dòng: {output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
