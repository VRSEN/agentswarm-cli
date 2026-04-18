#!/usr/bin/env python3
"""Release-gate auth smoke test for Agent Swarm CLI.

Clones the official agency-starter-template, bootstraps a project venv,
starts the Agency Swarm FastAPI bridge, and POSTs a single message with
each configured auth method. Asserts a non-empty assistant text delta
comes back in the stream for every method that has credentials.

Expected environment variables:
  OPENAI_OAUTH_ACCESS_TOKEN      Codex browser-auth access token (optional)
  OPENAI_OAUTH_ACCOUNT_ID        ChatGPT account id (optional pair)
  ANTHROPIC_API_KEY              Anthropic API key (optional)

If none are set the script prints a loud warning and exits 0 so it can
still run in environments without secrets (local dev without logins).
Returns exit code 1 if any configured auth method returns an empty
assistant reply or an error event.

KNOWN COVERAGE GAP: this smoke talks to the bridge directly and
therefore catches regressions in the bridge, agency-swarm framework,
openai-agents SDK, provider compatibility, and the starter template.
It does NOT exercise `SessionAgencySwarm.buildAuthClientConfig` or the
TypeScript client-config assembly in
packages/opencode/src/session/agency-swarm.ts — those are covered by
the bun unit tests in packages/opencode/test/session/agency-swarm.test.ts.
Future extension: drive the built agentswarm CLI binary (via
`agentswarm run --attach`) with a sandboxed auth.json so the CLI's real
client-config assembly is exercised end-to-end.
"""
from __future__ import annotations

import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

TEMPLATE_URL = "https://github.com/agency-ai-solutions/agency-starter-template.git"
# Pin the starter template to a known-good SHA so unrelated upstream changes cannot
# flip this release gate red on agentswarm-cli pushes. Bump deliberately when a new
# template revision is required and re-run this workflow against it.
TEMPLATE_REV = "c45541fb5ca182dbebca23ddc8bbc933acd83d32"
DEFAULT_PORT_BASE = 59970
SPAWN_READY_TIMEOUT_S = 60
SEND_TIMEOUT_S = 120


def log(prefix: str, msg: str) -> None:
    print(f"[{prefix}] {msg}", flush=True)


def run(cmd: list[str], cwd: str | None = None, check: bool = True) -> subprocess.CompletedProcess:
    log("run", " ".join(cmd) + (f"  (cwd={cwd})" if cwd else ""))
    return subprocess.run(cmd, cwd=cwd, check=check, text=True, capture_output=True)


def clone_template(workdir: Path) -> Path:
    target = workdir / "agency-starter-template"
    log("clone", f"{TEMPLATE_URL}@{TEMPLATE_REV} -> {target}")
    run(["git", "clone", TEMPLATE_URL, str(target)])
    run(["git", "checkout", TEMPLATE_REV], cwd=str(target))
    return target


def ensure_venv(project: Path) -> Path:
    python = project / ".venv" / "bin" / "python"
    if python.exists():
        return python
    log("venv", f"creating .venv in {project}")
    run(["python3", "-m", "venv", ".venv"], cwd=str(project))
    log("deps", "installing project requirements")
    run([str(python), "-m", "pip", "install", "--upgrade", "pip"], cwd=str(project))
    req = project / "requirements.txt"
    if req.exists():
        run([str(python), "-m", "pip", "install", "-r", "requirements.txt"], cwd=str(project))
    # Install the litellm extra only (no --upgrade) so Anthropic client_config
    # forwarding works without overriding the framework version the template pins.
    run(
        [str(python), "-m", "pip", "install", "agency-swarm[fastapi,litellm]"],
        cwd=str(project),
    )
    return python


def spawn_bridge(project: Path, python: Path, port: int) -> subprocess.Popen:
    launcher = f"""
import sys
sys.path.insert(0, {str(project)!r})
from agency import create_agency
from agency_swarm.integrations.fastapi import run_fastapi
run_fastapi(
    agencies={{'local-agency': create_agency}},
    host='127.0.0.1',
    port={port},
    server_url='http://127.0.0.1:{port}',
    app_token_env='',
)
"""
    log("bridge", f"spawning on :{port}")
    proc = subprocess.Popen(
        [str(python), "-c", launcher],
        cwd=str(project),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    return proc


def wait_ready(port: int) -> None:
    deadline = time.time() + SPAWN_READY_TIMEOUT_S
    url = f"http://127.0.0.1:{port}/local-agency/get_metadata"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    log("bridge", "ready")
                    return
        except Exception:
            time.sleep(0.5)
    raise RuntimeError(f"bridge did not become ready on :{port} within {SPAWN_READY_TIMEOUT_S}s")


def send_probe(port: int, client_config: dict, label: str, recipient: str = "ExampleAgent") -> bool:
    """POST a single message, return True on non-empty assistant reply + no error events."""
    url = f"http://127.0.0.1:{port}/local-agency/get_response_stream"
    payload = {
        "message": "Reply with only the word: pong",
        "recipient_agent": recipient,
        "client_config": client_config,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Accept": "text/event-stream"},
        method="POST",
    )
    log(label, f"POST {url}")
    assistant_text = []
    saw_error = False
    try:
        with urllib.request.urlopen(req, timeout=SEND_TIMEOUT_S) as resp:
            for raw in resp:
                line = raw.decode(errors="replace").rstrip()
                if not line.startswith("data:"):
                    continue
                body = line[len("data:") :].strip()
                if body in ("", "[DONE]"):
                    continue
                try:
                    event = json.loads(body)
                except Exception:
                    continue
                if not isinstance(event, dict):
                    continue
                top_error = event.get("error")
                if top_error:
                    log(label, f"TOP-LEVEL ERROR frame: {top_error}")
                    saw_error = True
                data = event.get("data")
                if not isinstance(data, dict):
                    continue
                if data.get("type") == "error":
                    log(label, f"ERROR event: {data.get('content')}")
                    saw_error = True
                nested = data.get("data")
                if isinstance(nested, dict):
                    # raw_response_event frames can carry a nested type: 'error' after partial text.
                    if nested.get("type") == "error":
                        log(label, f"NESTED ERROR frame: {nested.get('content') or nested.get('message')}")
                        saw_error = True
                    elif nested.get("type") == "response.output_text.delta":
                        delta = nested.get("delta")
                        if isinstance(delta, str):
                            assistant_text.append(delta)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        log(label, f"HTTPError {e.code}: {body[:300]}")
        return False
    except Exception as e:
        log(label, f"connection error: {type(e).__name__}: {e}")
        return False

    if saw_error:
        log(label, "stream contained an error event")
        return False
    if not assistant_text:
        log(label, "stream produced zero assistant text — FAIL")
        return False
    combined = "".join(assistant_text)
    log(label, f"assistant responded ({len(combined)} chars): {combined[:120]}")
    return True


def test_openai_oauth(port: int) -> bool | None:
    access = os.environ.get("OPENAI_OAUTH_ACCESS_TOKEN", "").strip()
    account = os.environ.get("OPENAI_OAUTH_ACCOUNT_ID", "").strip()
    if not access:
        log("openai-oauth", "OPENAI_OAUTH_ACCESS_TOKEN not set — SKIP")
        return None
    cfg: dict = {
        "api_key": access,
        "base_url": "https://chatgpt.com/backend-api/codex",
    }
    if account:
        cfg["default_headers"] = {"ChatGPT-Account-Id": account}
    return send_probe(port, cfg, "openai-oauth")


def test_anthropic_key(port: int) -> bool | None:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        log("anthropic", "ANTHROPIC_API_KEY not set — SKIP")
        return None
    cfg = {
        "litellm_keys": {"anthropic": key},
    }
    return send_probe(port, cfg, "anthropic")


def test_openai_api_key(port: int) -> bool | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        log("openai-api-key", "OPENAI_API_KEY not set — SKIP")
        return None
    cfg = {
        "api_key": key,
    }
    return send_probe(port, cfg, "openai-api-key")


def main() -> int:
    workdir = Path(tempfile.mkdtemp(prefix="agentswarm-smoke-"))
    log("setup", f"workdir {workdir}")
    bridge: subprocess.Popen | None = None
    port = DEFAULT_PORT_BASE

    results: dict[str, bool | None] = {}
    try:
        project = clone_template(workdir)
        python = ensure_venv(project)
        bridge = spawn_bridge(project, python, port)

        # Pump bridge output in background for diagnostics on failure.
        def pump():
            if bridge is None or bridge.stdout is None:
                return
            for line in bridge.stdout:
                log("bridge", line.rstrip())

        threading.Thread(target=pump, daemon=True).start()
        wait_ready(port)

        results["openai-oauth"] = test_openai_oauth(port)
        results["openai-api-key"] = test_openai_api_key(port)
        results["anthropic"] = test_anthropic_key(port)
    finally:
        if bridge is not None:
            bridge.send_signal(signal.SIGINT)
            try:
                bridge.wait(timeout=5)
            except subprocess.TimeoutExpired:
                bridge.kill()
        shutil.rmtree(workdir, ignore_errors=True)

    executed = {k: v for k, v in results.items() if v is not None}
    skipped = [k for k, v in results.items() if v is None]

    print()
    log("summary", f"executed {len(executed)} auth method(s), skipped {len(skipped)}")
    for name, ok in executed.items():
        log("summary", f"  {name}: {'PASS' if ok else 'FAIL'}")
    for name in skipped:
        log("summary", f"  {name}: SKIPPED (no credentials in env)")

    if os.environ.get("AUTH_SMOKE_ALLOW_NO_CREDS") == "1":
        if not executed:
            log("summary", "no auth method had credentials — AUTH_SMOKE_ALLOW_NO_CREDS=1 set, exiting 0 for local dev.")
            return 0
    elif not executed:
        log(
            "summary",
            "no auth method had credentials — release gate requires at least one. "
            "Set AUTH_SMOKE_ALLOW_NO_CREDS=1 only for local dev without secrets.",
        )
        return 1
    if all(executed.values()):
        log("summary", "all executed auth methods PASS")
        return 0
    log("summary", "one or more auth methods FAILED — blocking release")
    return 1


if __name__ == "__main__":
    sys.exit(main())
