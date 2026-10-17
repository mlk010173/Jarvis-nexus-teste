"""Superagent Clone — runtime do agente.

Loop: montar contexto -> LLM com tools -> executar -> verificar -> responder.
API OpenAI-compatível (Ollama local, Groq, OpenRouter, ou qualquer outro).
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Callable

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

try:  # pacote (docker: uvicorn app.main:app)
    from . import memory, tools
    from .sandbox_client import sandbox_run
except ImportError:  # script direto (dev)
    import memory, tools
    from sandbox_client import sandbox_run

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://ollama:11434/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:14b")
MAX_TURNS = int(os.getenv("MAX_TURNS", "12"))

app = FastAPI(title="Superagent Clone", version="0.1.0")


class ChatIn(BaseModel):
    message: str
    user_id: str = "owner"
    channel: str = "web"
    max_turns: int = MAX_TURNS


class WakeIn(BaseModel):
    """Payload de wake vindo de um workflow (n8n, cron, webhook de canal)."""
    message: str
    source: str = "workflow"
    context: dict[str, Any] | None = None


SYSTEM_PROMPT = """Você é SUPERAGENT, um agente pessoal autônomo de nível sênior.
Você não é um chatbot: você é o braço operacional do seu dono. Entregue RESULTADOS, não planos.

FORMA DE PENSAMENTO (sempre nesta ordem):
1. INTENÇÃO: interprete o pedido pelo resultado desejado, não pelas palavras.
2. INICIATIVA: antes de perguntar, procure na memória e no workspace; escolha defaults
   reversíveis e avance.
3. EXECUÇÃO: use as tools até o resultado.
4. VERIFICAÇÃO: confira a saída real antes de dizer "pronto".
5. FECHAMENTO: reporte o verificado, o que falta e o que depende do dono. Seja breve.

REGRAS:
- Falhou uma rota? Troque de estratégia; não repita o mesmo comando em loop.
- Nunca invente fatos, memórias, fontes ou resultados.
- Nunca exponha chaves de API, tokens ou senhas.
- Fale a língua do dono. Respostas curtas por padrão.
- Erro seu: assuma em uma frase e conserte.

FERRAMENTAS DISPONÍVEIS: veja o catálogo em tools.json (injetado abaixo)."""


def build_system_prompt(user_id: str) -> str:
    facts = memory.recall(user_id)
    facts_txt = "\n".join(f"- [{f['id']}] ({f['kind']}) {f['content']}" for f in facts) or "(nenhuma)"
    catalog = json.dumps(tools.CATALOG, ensure_ascii=False)
    return (
        f"{SYSTEM_PROMPT}\n\nCATÁLOGO DE TOOLS (JSON):\n{catalog}\n\n"
        f"MEMÓRIA DURÁVEL DO DONO:\n{facts_txt}"
    )


def call_llm(messages: list[dict], tool_schemas: list[dict]) -> dict:
    """Uma chamada ao LLM OpenAI-compat. Retorna message (com tool_calls ou content)."""
    payload = {"model": LLM_MODEL, "messages": messages, "tools": tool_schemas,
               "temperature": 0.4, "stream": False}
    # Ollama aceita tool calling nativo em modelos recentes; senão cai no parser textual.
    with httpx.Client(timeout=300) as c:
        r = c.post(f"{LLM_BASE_URL}/chat/completions", json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]


TOOL_RE = re.compile(r'\[TOOL\]\s*(\{.*?\})\s*\[/TOOL\]', re.S)


def parse_tool_call(text: str) -> dict | None:
    """Fallback: modelos sem tool-calling nativo respondem com [TOOL]{json}[/TOOL]."""
    m = TOOL_RE.search(text)
    return json.loads(m.group(1)) if m else None


def run_agent(user_id: str, user_message: str, max_turns: int = MAX_TURNS) -> str:
    system = build_system_prompt(user_id)
    messages = [{"role": "system", "content": system},
                {"role": "user", "content": user_message}]
    for _ in range(max_turns):
        try:
            msg = call_llm(messages, tools.TOOL_SCHEMAS)
        except Exception as e:  # noqa: BLE001 — LLM fora do ar degrada com mensagem
            return f"LLM indisponível ({LLM_BASE_URL}): {e}. Verifique o serviço do modelo."
        calls = msg.get("tool_calls") or []
        if not calls and msg.get("content"):
            fallback = parse_tool_call(msg["content"])
            if fallback:
                calls = [{"function": {"name": fallback["name"],
                                       "arguments": json.dumps(fallback["arguments"])}}]
            else:
                return msg["content"]
        if not calls:
            return "(modelo não respondeu)"
        messages.append(msg)
        for call in calls:
            name = call["function"]["name"]
            try:
                args = json.loads(call["function"]["arguments"] or "{}")
            except json.JSONDecodeError:
                args = {}
            result = tools.dispatch(name, args, user_id=user_id, sandbox=sandbox_run)
            messages.append({"role": "tool", "tool_call_id": call.get("id", ""),
                             "name": name, "content": json.dumps(result, ensure_ascii=False)[:4000]})
    return "Limite de turnos atingido; veja o log do runtime."


@app.post("/chat")
def chat(inp: ChatIn) -> dict:
    reply = run_agent(inp.user_id, inp.message, inp.max_turns)
    memory.append_history(inp.user_id, inp.message, reply, inp.channel)
    return {"reply": reply}


@app.post("/wake")
def wake(inp: WakeIn) -> dict:
    """Workflow/canal acorda o agente com uma mensagem operacional."""
    msg = inp.message
    if inp.context:
        msg += "\n\nCONTEXTO DO GATILHO:\n" + json.dumps(inp.context, ensure_ascii=False)
    reply = run_agent("owner", msg)
    return {"reply": reply}


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": LLM_MODEL, "ts": time.time()}


@app.get("/memory/{user_id}")
def get_memory(user_id: str) -> dict:
    return {"memories": memory.recall(user_id)}
