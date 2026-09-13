import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import push_amis
import requests


class PushAmisRetryTest(unittest.TestCase):
    def setUp(self):
        self.rows = [{"period_month": "2026-09-01", "employee_name": "Fixture", "current_amount": 100}]
        self.columns = push_amis.KEY_COLUMNS + push_amis.REVENUE_COLUMNS

    def response(self, status):
        return Mock(ok=200 <= status < 300, status_code=status, text="fixture response")

    def test_connection_reset_recovers_with_identical_payload(self):
        with patch.object(push_amis.requests, "post", side_effect=[requests.ConnectionError("WinError 10054"), self.response(201)]) as post, patch("time.sleep") as sleep:
            push_amis.upsert(self.rows, self.columns)
        self.assertEqual(post.call_count, 2)
        self.assertEqual(post.call_args_list[0], post.call_args_list[1])
        self.assertNotIn("receive_amount", post.call_args.kwargs["json"][0])
        self.assertEqual(sleep.call_count, 1)

    def test_timeout_exhaustion_raises_after_three_attempts(self):
        with patch.object(push_amis.requests, "post", side_effect=requests.ReadTimeout("fixture timeout")) as post, patch("time.sleep") as sleep:
            with self.assertRaises(RuntimeError):
                push_amis.upsert(self.rows, self.columns)
        self.assertEqual(post.call_count, 3)
        self.assertEqual(sleep.call_count, 2)

    def test_transient_http_recovers(self):
        for status in [429, 500, 502, 503, 504]:
            with self.subTest(status=status), patch.object(push_amis.requests, "post", side_effect=[self.response(status), self.response(201)]) as post, patch("time.sleep"):
                push_amis.upsert(self.rows, self.columns)
                self.assertEqual(post.call_count, 2)

    def test_transient_http_exhaustion_raises(self):
        with patch.object(push_amis.requests, "post", return_value=self.response(503)) as post, patch("time.sleep"):
            with self.assertRaises(RuntimeError):
                push_amis.upsert(self.rows, self.columns)
        self.assertEqual(post.call_count, 3)

    def test_permanent_http_fails_without_retry(self):
        for status in [400, 401, 403, 409]:
            with self.subTest(status=status), patch.object(push_amis.requests, "post", return_value=self.response(status)) as post, patch("time.sleep") as sleep:
                with self.assertRaises(RuntimeError):
                    push_amis.upsert(self.rows, self.columns)
                self.assertEqual(post.call_count, 1)
                sleep.assert_not_called()

    def test_certificate_failure_is_not_retried(self):
        with patch.object(push_amis.requests, "post", side_effect=requests.exceptions.SSLError("fixture certificate")) as post, patch("time.sleep") as sleep:
            with self.assertRaises(requests.exceptions.SSLError):
                push_amis.upsert(self.rows, self.columns)
        self.assertEqual(post.call_count, 1)
        sleep.assert_not_called()

    def test_success_has_no_retry(self):
        with patch.object(push_amis.requests, "post", return_value=self.response(201)) as post, patch("time.sleep") as sleep:
            push_amis.upsert(self.rows, self.columns)
        self.assertEqual(post.call_count, 1)
        sleep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
