"""Catálogo de tools do clone — espelha o formato Base44 (Parte 3.10 do blueprint).

dispatch() é a única porta de entrada. Cada tool retorna um dicionário
serializável que volta pro LLM como tool result.
"""
from __future__ import annotations

import json
import subprocess
from typing import Any, Callable

try:
    from . import memory
except ImportError:
    import memory

CATALOG: dict[str, dict[str, Any]] = {
    "run_bash":   {"description": "Executa um comando shell no sandbox. args: {command}", "risk": "medium"},
    "read_file":  {"description": "Lê um arquivo do workspace. args: {path}", "risk": "low"},
    "write_file": {"description": "Escreve um arquivo no workspace. args: {path, content}", "risk": "medium"},
    "grep":       {"description": "Busca regex em arquivos do workspace. args: {pattern, path}", "risk": "low"},
    "save_memory": {"description": "Salva fato/preferência/instrução durável do dono. args: {content, kind, category}", "risk": "low"},
    "forget_memory": {"description": "Remove uma memória por id. args: {id}", "risk": "medium"},
    "search_memory": {"description": "Busca na memória durável. args: {query}", "risk": "low"},
    "search_web": {"description": "Busca web (SearXNG). args: {query}", "risk": "low"},
    "send_whatsapp": {"description": "Envia mensagem de texto a um destinatário autorizado. args: {to, text}", "risk": "high"},
}

TOOL_SCHEMAS = [
    {"type": "function",
     "function": {"name": name,
                  "description": meta["description"],
                  "parameters": {"type": "object",
                                 "properties": {"command": {"type": "string"},
                                                "path": {"type": "string"},
                                                "pattern": {"type": "string"},
                                                "content": {"type": "string"},
                                                "id": {"type": "string"},
                                                "query": {"type": "string"},
                                                "to": {"type": "string"},
                                                "text": {"type": "string"},
                                                "kind": {"type": "string"},
                                                "category": {"type": "string"}}}}}
    for name, meta in CATALOG.items()
]


def dispatch(name: str, args: dict, *, user_id: str, sandbox: Callable) -> dict:
    fn = _REGISTRY.get(name)
    if not fn:
        return {"error": f"tool desconhecida: {name}"}
    return fn(args, user_id=user_id, sandbox=sandbox)


def _run_bash(args, *, user_id, sandbox):
    cmd = args.get("command", "")
    if not cmd:
        return {"error": "comando vazio"}
    return sandbox(["bash", "-lc", cmd])


def _read_file(args, *, user_id, sandbox):
    return sandbox(["cat", args.get("path", "")])


def _write_file(args, *, user_id, sandbox):
    path = args.get("path", "")
    content = args.get("content", "")
    if not path or ".." in path:
        return {"error": "caminho inválido"}
    return sandbox(["sh", "-c", f"mkdir -p \"$(dirname {path})\"; cat > {path} <<'AGENT_EOF'\n{content}\nAGENT_EOF"])


def _grep(args, *, user_id, sandbox):
    return sandbox(["grep", "-rn", args.get("pattern", ""), args.get("path", "/workspace")])


def _save_memory(args, *, user_id, sandbox):
    mid = memory.save(user_id=user_id,
                      content=args.get("content", ""),
                      kind=args.get("kind", "fact"),
                      category=args.get("category", "Geral"))
    return {"saved": mid}


def _forget_memory(args, *, user_id, sandbox):
    return {"removed": memory.forget(user_id=user_id, mid=args.get("id", ""))}


def _search_memory(args, *, user_id, sandbox):
    return {"results": memory.search_text(user_id=user_id, needle=args.get("query", ""))}


def _search_web(args, *, user_id, sandbox):
    import os
    import httpx
    searx = os.getenv("SEARXNG_URL", "http://searxng:8080")
    try:
        r = httpx.get(f"{searx}/search", params={"q": args.get("query", ""), "format": "json"}, timeout=20)
        return {"results": [{"title": h.get("title"), "url": h.get("url"), "snippet": h.get("content", "")[:200]}
                            for h in r.json().get("results", [])[:8]]}
    except Exception as e:  # noqa: BLE001
        return {"error": f"busca web falhou: {e}"}


def _send_whatsapp(args, *, user_id, sandbox):
    """HIGH RISK: em produção, exigir allowlist de destinatários e aprovação do dono."""
    import os
    import httpx
    token = os.getenv("WHATSAPP_TOKEN", "")
    phone_id = os.getenv("WHATSAPP_PHONE_ID", "")
    if not token or not phone_id:
        return {"error": "WhatsApp não configurado (WHATSAPP_TOKEN/WHATSAPP_PHONE_ID)"}
    url = f"https://graph.facebook.com/v20.0/{phone_id}/messages"
    payload = {"messaging_product": "whatsapp", "to": args.get("to", ""), "type": "text",
               "text": {"body": args.get("text", "")}}
    with httpx.Client(timeout=30) as c:
        r = c.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
    return {"status": r.status_code, "body": r.text[:500]}


_REGISTRY: dict[str, Callable] = {
    "run_bash": _run_bash, "read_file": _read_file, "write_file": _write_file,
    "grep": _grep, "save_memory": _save_memory, "forget_memory": _forget_memory,
    "search_memory": _search_memory, "search_web": _search_web, "send_whatsapp": _send_whatsapp,
}
