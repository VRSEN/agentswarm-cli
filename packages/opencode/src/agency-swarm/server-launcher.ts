export const SERVER_LAUNCHER_SCRIPT = `import sys
import os

sys.path.insert(0, os.getcwd())

from swarm import create_agency
from agency_swarm.integrations.fastapi import run_fastapi

port = int(sys.argv[1])
agency_id = sys.argv[2]

run_fastapi(
    agencies={agency_id: create_agency},
    host="127.0.0.1",
    port=port,
    server_url=f"http://127.0.0.1:{port}",
    app_token_env="",
)
`
