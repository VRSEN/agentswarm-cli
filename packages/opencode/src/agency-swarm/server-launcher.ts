export const SERVER_LAUNCHER_SCRIPT = `import importlib
import inspect
import os
import sys

port = int(sys.argv[1])
agency_id = sys.argv[2]
module_name = sys.argv[3]
sys.path.insert(0, os.getcwd())
project_create_agency = importlib.import_module(module_name).create_agency

def accepts_load_threads_callback(factory):
    try:
        parameters = inspect.signature(factory).parameters.values()
    except (TypeError, ValueError):
        return True

    return any(
        parameter.kind == inspect.Parameter.VAR_KEYWORD
        or (
            parameter.name == "load_threads_callback"
            and parameter.kind != inspect.Parameter.POSITIONAL_ONLY
        )
        for parameter in parameters
    )

project_accepts_load_threads_callback = accepts_load_threads_callback(project_create_agency)

def create_agency(load_threads_callback=None):
    if project_accepts_load_threads_callback:
        return project_create_agency(load_threads_callback=load_threads_callback)
    return project_create_agency()

from agency_swarm.integrations.fastapi import run_fastapi

run_fastapi(
    agencies={agency_id: create_agency},
    host="127.0.0.1",
    port=port,
    server_url=f"http://127.0.0.1:{port}",
    app_token_env="",
)
`
