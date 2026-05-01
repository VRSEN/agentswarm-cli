export function buildServerLauncherScript(input: { allowedLocalFileDirs?: string[] } = {}) {
  const allowedLocalFileDirs = JSON.stringify(input.allowedLocalFileDirs ?? [])
  return `from agency import create_agency
from agency_swarm.integrations.fastapi import run_fastapi
import sys

port = int(sys.argv[1])
agency_id = sys.argv[2]

run_fastapi(
    agencies={agency_id: create_agency},
    host="127.0.0.1",
    port=port,
    server_url=f"http://127.0.0.1:{port}",
    app_token_env="",
    allowed_local_file_dirs=${allowedLocalFileDirs},
)
`
}

export const SERVER_LAUNCHER_SCRIPT = buildServerLauncherScript()
