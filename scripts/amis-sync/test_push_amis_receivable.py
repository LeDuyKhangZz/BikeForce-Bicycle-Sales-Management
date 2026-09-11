import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import push_amis


class PushAmisReceivableTest(unittest.TestCase):
    def test_reads_exact_month_playwright_summary(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            summary_path = Path(directory) / "summary.json"
            summary_path.write_text(
                json.dumps({
                    "month": "2026-08",
                    "rows": [{
                        "tenNhanVien": "Dương Văn Thịnh",
                        "maSo": "21",
                        "soTienThanhToan": 360_356_200,
                    }],
                }, ensure_ascii=False),
                encoding="utf-8",
            )

            with patch.object(push_amis, "RECEIVABLE_SUMMARY_PATH", summary_path):
                totals = push_amis.pull_receivable(2026, 8)

        self.assertEqual(totals, {"Dương Văn Thịnh": 360_356_200})

    def test_rejects_summary_from_another_month(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            summary_path = Path(directory) / "summary.json"
            summary_path.write_text(
                json.dumps({"month": "2026-09", "rows": [{}]}),
                encoding="utf-8",
            )

            with patch.object(push_amis, "RECEIVABLE_SUMMARY_PATH", summary_path):
                with self.assertRaisesRegex(RuntimeError, "khong phai 2026-08"):
                    push_amis.pull_receivable(2026, 8)


if __name__ == "__main__":
    unittest.main()
