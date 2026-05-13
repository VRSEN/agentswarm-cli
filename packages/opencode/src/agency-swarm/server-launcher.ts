export const SERVER_LAUNCHER_SCRIPT = `import importlib
import os
import sys

port = int(sys.argv[1])
agency_id = sys.argv[2]
module_name = sys.argv[3]
sys.path.insert(0, os.getcwd())
create_agency = importlib.import_module(module_name).create_agency

from agency_swarm.integrations.fastapi import run_fastapi

run_fastapi(
    agencies={agency_id: create_agency},
    host="127.0.0.1",
    port=port,
    server_url=f"http://127.0.0.1:{port}",
    app_token_env="",
)
`
