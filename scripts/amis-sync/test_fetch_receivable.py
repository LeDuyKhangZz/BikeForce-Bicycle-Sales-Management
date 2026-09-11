import base64
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import fetch_receivable as receivable


def decoded_parameters(encoded: str) -> dict[str, object]:
    return json.loads(base64.b64decode(encoded).decode("utf-8"))


class ReceivableRefreshTest(unittest.TestCase):
    def test_parameters_keep_selected_scope_and_refresh_flag(self) -> None:
        encoded = receivable.build_parameters(
            "2026-07-31T17:00:00.000Z",
            "2026-08-30T17:00:00.000Z",
        )
        parameters = decoded_parameters(encoded)

        self.assertFalse(parameters["p_is_refresh"])
        self.assertEqual(parameters["p_branch_id"], receivable.BRANCH_FILTER)
        self.assertEqual(
            parameters["p_include_dependent_branch"],
            receivable.INCLUDE_DEPENDENT_BRANCH,
        )

    def test_fetch_all_pages_by_flattened_detail_count(self) -> None:
        first_page = {
            "Data": [{
                "children": [
                    {"account_object_name": "Khach 1", "employee_name": "Sales A"},
                    {"account_object_name": "Khach 2", "employee_name": "Sales A"},
                ],
            }],
        }
        last_page = {
            "Data": [{
                "children": [
                    {"account_object_name": "Khach 3", "employee_name": "Sales B"},
                ],
            }],
        }

        with (
            patch.object(receivable, "PAGE_SIZE", 2),
            patch.object(
                receivable,
                "fetch_page_awaited",
                side_effect=[first_page, last_page],
            ) as fetch_page,
        ):
            rows = receivable.fetch_all("from", "to")

        self.assertEqual(len(rows), 3)
        self.assertEqual([call.args[2] for call in fetch_page.call_args_list], [1, 2])

if __name__ == "__main__":
    unittest.main()
