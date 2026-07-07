from __future__ import annotations

import json
import os
import subprocess
import time
from dataclasses import dataclass
from typing import Any

import requests


@dataclass
class DrillResult:
    name: str
    steps: list[dict[str, Any]]


def _default_base_url() -> str:
    return os.getenv("DRILL_BASE_URL", "http://127.0.0.1:8000")


def base_url() -> str:
    return _default_base_url()


def token() -> str | None:
    # For local drills you can pass DRILL_TOKEN.
    return os.getenv("DRILL_TOKEN")


def auth_headers() -> dict[str, str]:
    t = token()
    return {"Authorization": f"Bearer {t}"} if t else {}


def post(path: str, *, json_body: dict[str, Any] | None = None, files=None) -> requests.Response:
    url = base_url() + path
    return requests.post(url, headers=auth_headers(), json=json_body, files=files)


def get(path: str, *, params: dict[str, Any] | None = None) -> requests.Response:
    url = base_url() + path
    return requests.get(url, headers=auth_headers(), params=params)


def wait_until(predicate, *, timeout_s: int = 60, interval_s: float = 1.0, name: str = "condition") -> None:
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        try:
            last = predicate()
            if last:
                return
        except Exception:
            pass
        time.sleep(interval_s)
    raise RuntimeError(f"Timeout waiting for {name}; last={last}")


def docker_compose(*, compose_file: str = "docker-compose.yml", action: str, service: str) -> None:
    # action: up/down
    # For outage drills we typically "docker-compose stop <service>" and "start".
    # We keep it simple and rely on your compose file.
    cmd = ["docker-compose", "-f", compose_file, action, service]
    subprocess.check_call(cmd)


def docker_compose_kill(service: str) -> None:
    # SIGKILL for worst-case simulation.
    subprocess.check_call(["docker", "kill", service])


def docker_compose_start(service: str) -> None:
    subprocess.check_call(["docker-compose", "start", service])


def sleep(seconds: float) -> None:
    time.sleep(seconds)

