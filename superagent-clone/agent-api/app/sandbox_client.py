"""Cliente do sandbox: executa comandos isolados no container de execução."""
from __future__ import annotations

import os

import httpx

SANDBOX_URL = os.getenv("SANDBOX_URL", "http://sandbox:8001")
TIMEOUT = float(os.getenv("SANDBOX_TIMEOUT", "120"))


def sandbox_run(argv: list[str]) -> dict:
    try:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.post(f"{SANDBOX_URL}/exec", json={"argv": argv})
            data = r.json()
            return {"stdout": data.get("stdout", "")[-6000:], "stderr": data.get("stderr", "")[-2000:],
                    "exit_code": data.get("exit_code")}
    except Exception as e:  # noqa: BLE001
        return {"error": f"sandbox indisponível: {e}"}
