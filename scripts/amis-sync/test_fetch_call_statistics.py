import base64
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_call_statistics as report70


class DailyReport70RequestTest(unittest.TestCase):
    def test_request_uses_exact_vietnam_day_and_custom_period(self) -> None:
        report_day = datetime(2026, 9, 10, tzinfo=timezone(timedelta(hours=7)))
        body = report70.request_body(report_day)
        data = body["CustomPagingData"]["Data"]

        self.assertEqual(data["Period"], 0)
        self.assertEqual(data["FromDate"], "2026-09-09T17:00:00.000Z")
        self.assertEqual(data["ToDate"], "2026-09-10T16:59:59.999Z")

    def test_request_keeps_report_columns(self) -> None:
        report_day = datetime(2026, 9, 10, tzinfo=report70.VN_TZ)
        columns = base64.b64decode(report70.request_body(report_day)["Columns"]).decode("utf-8")

        self.assertIn("QuantityOfCalled", columns)
        self.assertIn("TotalCallAwayTime", columns)

    def test_snapshot_key_is_daily_not_monthly(self) -> None:
        self.assertEqual(
            report70.crm_snapshot_key("2026-09-10", "VP-TLS-003"),
            "__CRM70__:2026-09-10:VP-TLS-003",
        )


if __name__ == "__main__":
    unittest.main()
