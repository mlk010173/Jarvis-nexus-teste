"""Sandbox de execução — container isolado para bash/arquivos/skills.

Serviço mínimo: POST /exec {"argv": [...]} -> {stdout, stderr, exit_code}
Produção: trocar por E2B self-hosted (isolamento por conversa, limits de
recurso, bloqueio de tipos perigosos como .bat/.cmd/.hta/.vbs).
"""
import subprocess

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="sandbox")


class ExecIn(BaseModel):
    argv: list[str]
    timeout: int = 120


BLOCKED_EXT = {".bat", ".cmd", ".hta", ".vbs", ".ps1"}


@app.post("/exec")
def exec_cmd(inp: ExecIn) -> dict:
    if not inp.argv:
        return {"stdout": "", "stderr": "argv vazio", "exit_code": 1}
    joined = " ".join(inp.argv)
    for ext in BLOCKED_EXT:
        if ext in joined and "write" in joined.lower():
            return {"stdout": "", "stderr": f"tipo bloqueado: {ext}", "exit_code": 126}
    try:
        p = subprocess.run(inp.argv, capture_output=True, text=True, timeout=inp.timeout, cwd="/workspace")
        return {"stdout": p.stdout, "stderr": p.stderr, "exit_code": p.returncode}
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "timeout", "exit_code": 124}


@app.get("/health")
def health() -> dict:
    return {"ok": True}
