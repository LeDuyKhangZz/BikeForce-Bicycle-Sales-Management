import unittest
from unittest.mock import patch

import sync_monthly_accounting_august as sync


class MonthlyAccountingAugustTests(unittest.TestCase):
    def row(self):
        return {
            'ID': 60, 'Name': 'Kế Toán Bán Hàng', 'Sales': 477633500,
            'NetSales': 458661000, 'ReturnSales': 18972500, 'NoOfOrders': 35,
            'QuantityAccountInCharge': 0, 'QuantityAccountInteractive': 31,
            'QuantityAccountSold': 0, 'QuantityAccountSoldThisPeriod': 30,
        }

    @patch.object(sync.nvkd, 'fetch')
    def test_scope_and_source_columns(self, fetch):
        fetch.return_value = [self.row()]
        result = sync.fetch_snapshot()
        args = fetch.call_args.args
        self.assertEqual(args[:3], (10, 'Phòng kế toán', True))
        self.assertEqual(args[3].strftime('%Y-%m-%d'), '2026-08-01')
        self.assertEqual(args[4].strftime('%Y-%m-%d'), '2026-08-31')
        self.assertEqual(args[5], 0)
        self.assertEqual(result['current_amount'], 477633500)
        self.assertEqual(result['qty_account_sold_this_period'], 30)
        self.assertEqual(result['no_of_orders'], 35)
        self.assertEqual(result['return_sales'], 18972500)
        self.assertEqual(result['employee_name'], sync.SNAPSHOT_KEY)
        self.assertNotIn('receive_amount', result)

    @patch.object(sync.nvkd, 'fetch')
    def test_reject_missing_or_ambiguous_employee(self, fetch):
        for rows in [[], [self.row(), self.row()], [{**self.row(), 'ID': 61}]]:
            fetch.return_value = rows
            with self.assertRaises(RuntimeError):
                sync.fetch_snapshot()

    @patch.object(sync.nvkd, 'fetch')
    def test_missing_column_is_not_silently_zero(self, fetch):
        row = self.row()
        del row['Sales']
        fetch.return_value = [row]
        with self.assertRaises(RuntimeError):
            sync.fetch_snapshot()


if __name__ == '__main__':
    unittest.main()
