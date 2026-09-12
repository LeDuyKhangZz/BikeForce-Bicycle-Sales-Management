import unittest
from unittest.mock import patch
import push_amis as push


class KimHuongReport119Tests(unittest.TestCase):
    @patch.object(push.nvkd_mod, 'fetch')
    def test_adds_only_kim_huong_from_group(self, fetch):
        sales = {'ID': 99, 'Name': 'Existing sales', 'Sales': 123}
        kim = {'ID': 23, 'Name': 'Nguyễn Thị Kim Hương', 'Sales': 169174000,
               'NetSales': 168805000, 'ReturnSales': 369000,
               'QuantityAccountSoldThisPeriod': 7, 'NoOfOrders': 10}
        fetch.side_effect = [[sales], [kim, {'ID': 60, 'Name': 'Kế Toán Bán Hàng'}]]
        result = push.pull_nvkd(2026, 8, 0)
        self.assertEqual(set(result), {'Existing sales', 'Nguyễn Thị Kim Hương'})
        self.assertEqual(result['Existing sales']['sales'], 123)
        self.assertEqual(result[kim['Name']]['qty_account_sold_this_period'], 7)
        self.assertEqual(result[kim['Name']]['org_unit_name'], 'THỐNG ĐẠT GROUP')
        self.assertEqual(fetch.call_args.args[:3], (1, 'THỐNG ĐẠT GROUP', True))

    @patch.object(push.nvkd_mod, 'fetch')
    def test_does_not_override_existing_kim_scope(self, fetch):
        fetch.return_value = [{'ID': 23, 'Name': 'Nguyễn Thị Kim Hương', 'Sales': 123}]
        result = push.pull_nvkd(2026, 9, 13)
        self.assertEqual(result['Nguyễn Thị Kim Hương']['sales'], 123)
        self.assertEqual(fetch.call_count, 1)

    @patch.object(push.nvkd_mod, 'fetch')
    def test_missing_group_employee_fails_source_instead_of_inventing_zero(self, fetch):
        fetch.side_effect = [[{'Name': 'Existing sales'}], []]
        with self.assertRaises(RuntimeError):
            push.pull_nvkd(2026, 8, 0)


if __name__ == '__main__':
    unittest.main()
