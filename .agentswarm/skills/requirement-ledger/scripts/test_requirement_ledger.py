#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import importlib.util
import io
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
            original_path.write_text("First line\n\nSecond line\n", encoding="utf-8")

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
                        "Keep the wording intact",
                        "--next-action",
                        "Review the queue",
                        "--source-pointer",
                        "chat:1",
                    ]
                )

            self.assertEqual(exit_code, 0)
            self.assertEqual(add_stderr.getvalue(), "")

            list_stdout = io.StringIO()
            list_stderr = io.StringIO()
            with contextlib.redirect_stdout(list_stdout), contextlib.redirect_stderr(list_stderr):
                exit_code = MODULE.main(["--ledger-dir", str(ledger_dir), "list"])

            self.assertEqual(exit_code, 0)
            self.assertEqual(list_stderr.getvalue(), "")
            self.assertIn("  original: First line\n", list_stdout.getvalue())
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
                        "Keep the wording intact",
                        "--next-action",
                        "Review the queue",
                        "--source-pointer",
                        "chat:1",
                    ]
                )

            self.assertEqual(exit_code, 2)
            self.assertEqual(stdout.getvalue(), "")
            self.assertIn("error: cannot decode original file as UTF-8:", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
