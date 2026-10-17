"""Telegram Bot API bridge — 100% free.

1. @BotFather -> /newbot -> pega o token
2. export TELEGRAM_TOKEN=...
3. webhook: https://<host>:8003/webhook/<token>
"""
import os

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse

app = FastAPI(title="telegram-bridge")
TOKEN = os.getenv("TELEGRAM_TOKEN", "")
AGENT_URL = os.getenv("AGENT_URL", "http://agent-api:8000")


@app.post("/webhook/{secret}")
async def webhook(secret: str, req: Request) -> dict:
    if secret != TOKEN:
        return {"ok": False}
    upd = await req.json()
    msg = upd.get("message") or upd.get("edited_message") or {}
    chat = msg.get("chat", {})
    text = msg.get("text", "")
    if chat and text:
        async with httpx.AsyncClient(timeout=300) as c:
            r = await c.post(f"{AGENT_URL}/wake", json={
                "message": f"[Telegram de {chat.get('username', chat.get('id'))}] {text}",
                "source": "telegram", "context": {"chat_id": chat.get("id")}})
            reply = r.json().get("reply", "")
        await send(chat.get("id"), reply)
    return {"ok": True}


async def send(chat_id, text: str) -> None:
    async with httpx.AsyncClient(timeout=30) as c:
        await c.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage",
                     json={"chat_id": chat_id, "text": text})


@app.get("/health")
def health() -> dict:
    return {"ok": bool(TOKEN)}
