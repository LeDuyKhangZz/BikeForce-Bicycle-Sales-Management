import unittest

import fetch_report44 as report44


class Report44Test(unittest.TestCase):
    def test_range_contains_thirteen_months_and_ends_at_selected_month(self):
        self.assertEqual(
            report44.report_range(2026, 9),
            (
                "2025-09-01T00:00:00.000+07:00",
                "2026-09-30T23:59:59.999+07:00",
                "09/2025 - 09/2026",
            ),
        )

    def test_build_body_uses_last_column_for_selected_month(self):
        body = report44.build_body(2026, 9, 3)
        self.assertEqual(body["Start"], 400)
        self.assertEqual(body["Page"], 3)
        self.assertEqual(body["CustomPagingData"]["Data"]["ID"], 44)
        self.assertIn("ColSales12", report44.REPORT_COLUMNS)

    def test_parse_page_normalizes_code_and_rounds_vnd(self):
        rows, total = report44.parse_page({
            "Success": True,
            "Total": 1,
            "Data": [{"OUEIDCode": " agi0002 ", "OUEIDText": "Bich Van", "ColSales12": 1250.6}],
        })
        self.assertEqual(total, 1)
        self.assertEqual(rows, [("AGI0002", "Bich Van", 1251)])

    def test_parse_page_rejects_invalid_amount(self):
        with self.assertRaises(ValueError):
            report44.parse_page({
                "Success": True,
                "Total": 1,
                "Data": [{"OUEIDCode": "AGI0002", "OUEIDText": "Bich Van", "ColSales12": "0"}],
            })

    def test_duplicate_customer_codes_are_summed_across_pages(self):
        result = {}
        report44.merge_customer_rows(result, [("KH01", "Khach", 100)])
        report44.merge_customer_rows(result, [("KH01", "Khach moi", 50)])
        self.assertEqual(result["KH01"]["order_sales"], 150)

    def test_range_rows_sum_each_month_for_duplicate_code(self):
        result = {}
        report44.merge_customer_range_rows(result, [("KH01", "Khach", [100] * 13)])
        report44.merge_customer_range_rows(result, [("KH01", "Khach moi", [50] * 13)])
        self.assertEqual(result["KH01"]["order_sales"], [150] * 13)

    def test_snapshot_rows_contains_all_thirteen_months(self):
        rows = report44.snapshot_rows(2026, 8, {
            "KH01": {"name": "Khach", "order_sales": list(range(13))},
        })
        self.assertEqual(len(rows), 13)
        self.assertEqual(rows[0]["period_month"], "2025-08-01")
        self.assertEqual(rows[-1]["period_month"], "2026-08-01")
        self.assertEqual(rows[-1]["order_sales"], 12)


if __name__ == "__main__":
    unittest.main()
