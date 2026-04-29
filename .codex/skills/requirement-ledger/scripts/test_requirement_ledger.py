#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).with_name("requirement_ledger.py")
SPEC = importlib.util.spec_from_file_location("requirement_ledger", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class RequirementLedgerCliTest(unittest.TestCase):
    def test_list_indents_multiline_original_file_content(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger_dir = Path(tmpdir) / "ledger"
            original_path = Path(tmpdir) / "original.txt"
            original_text = "  First line\n\nSecond line\n"
            original_path.write_text(original_text, encoding="utf-8")

            add_stdout = io.StringIO()
            add_stderr = io.StringIO()
            with contextlib.redirect_stdout(add_stdout), contextlib.redirect_stderr(add_stderr):
                exit_code = MODULE.main(
                    [
                        "--ledger-dir",
                        str(ledger_dir),
                        "add",
                        "--category",
                        "tooling",
                        "--title",
                        "test",
                        "--original-file",
                        str(original_path),
                        "--intent",
                        "Keep reviewed wording readable",
                        "--next-action",
                        "Review the queue",
                        "--source-pointer",
                        "chat:1",
                    ]
                )

            self.assertEqual(exit_code, 0)
            self.assertEqual(add_stderr.getvalue(), "")
            active_data = json.loads((ledger_dir / "active.json").read_text(encoding="utf-8"))
            self.assertEqual(active_data["items"][0]["original"], original_text)
            self.assertEqual(active_data["items"][0]["artifacts"], [])

            list_stdout = io.StringIO()
            list_stderr = io.StringIO()
            with contextlib.redirect_stdout(list_stdout), contextlib.redirect_stderr(list_stderr):
                exit_code = MODULE.main(["--ledger-dir", str(ledger_dir), "list"])

            self.assertEqual(exit_code, 0)
            self.assertEqual(list_stderr.getvalue(), "")
            self.assertIn("  original:   First line\n", list_stdout.getvalue())
            self.assertIn("            \n", list_stdout.getvalue())
            self.assertIn("            Second line\n", list_stdout.getvalue())

    def test_original_file_decode_errors_return_ledger_error(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger_dir = Path(tmpdir) / "ledger"
            bad_path = Path(tmpdir) / "original.bin"
            bad_path.write_bytes(b"\xff\xfe")

            stdout = io.StringIO()
            stderr = io.StringIO()
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                exit_code = MODULE.main(
                    [
                        "--ledger-dir",
                        str(ledger_dir),
                        "add",
                        "--category",
                        "tooling",
                        "--title",
                        "bad encoding",
                        "--original-file",
                        str(bad_path),
                        "--intent",
                        "Keep reviewed wording readable",
                        "--next-action",
                        "Review the queue",
                        "--source-pointer",
                        "chat:1",
                    ]
                )

            self.assertEqual(exit_code, 2)
            self.assertEqual(stdout.getvalue(), "")
            self.assertIn("error: cannot decode original file as UTF-8:", stderr.getvalue())

    def test_active_items_require_artifacts_list(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            ledger_dir = Path(tmpdir) / "ledger"
            ledger_dir.mkdir()
            (ledger_dir / "active.json").write_text(
                json.dumps(
                    {
                        "schema": MODULE.SCHEMA_VERSION,
                        "items": [
                            {
                                "id": "REQ-20260429-001",
                                "created_at": "2026-04-29T00:00:00Z",
                                "updated_at": "2026-04-29T00:00:00Z",
                                "status": "open",
                                "category": "tooling",
                                "title": "test",
                                "original": "Track the active requirement.",
                                "intent": "Keep state durable.",
                                "next_action": "Review the queue.",
                                "source_pointers": ["chat:1"],
                            }
                        ],
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )
            (ledger_dir / "archive.jsonl").write_text("", encoding="utf-8")

            stdout = io.StringIO()
            stderr = io.StringIO()
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                exit_code = MODULE.main(["--ledger-dir", str(ledger_dir), "list"])

            self.assertEqual(exit_code, 2)
            self.assertEqual(stdout.getvalue(), "")
            self.assertIn("error: active ledger is missing artifacts", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
