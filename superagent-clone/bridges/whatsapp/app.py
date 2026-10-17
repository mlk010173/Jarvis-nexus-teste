"""WhatsApp Business Cloud API bridge.

IN : POST /webhook  (Meta envia mensagens recebidas)
OUT: POST /send    (agent-api despacha via tools.send_whatsapp ou aqui)

Setup free tier: Meta for Developers -> app WhatsApp -> token temporário
grátis + webhook (ngrok em dev, domínio próprio em prod).
VERIFY_TOKEN: qualquer string configurada na Meta.
"""
import os

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse

app = FastAPI(title="whatsapp-bridge")

TOKEN = os.getenv("WHATSAPP_TOKEN", "")
PHONE_ID = os.getenv("WHATSAPP_PHONE_ID", "")
VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "superagent")
AGENT_URL = os.getenv("AGENT_URL", "http://agent-api:8000")
ALLOWED_FROM = {x for x in os.getenv("ALLOWED_SENDERS", "").split(",") if x}  # allowlist


@app.get("/webhook")
def verify(hub_mode: str = "", hub_token: str = "", hub_challenge: str = "") -> str:
    if hub_mode == "subscribe" and hub_token == VERIFY_TOKEN:
        return hub_challenge
    return "erro", 403


@app.post("/webhook")
async def webhook(req: Request) -> dict:
    body = await req.json()
    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            for msg in change.get("value", {}).get("messages", []):
                frm = msg.get("from", "")
                if ALLOWED_FROM and frm not in ALLOWED_FROM:
                    continue
                text = msg.get("text", {}).get("body", "")
                if text:
                    async with httpx.AsyncClient(timeout=300) as c:
                        r = await c.post(f"{AGENT_URL}/wake", json={
                            "message": f"[WhatsApp de {frm}] {text}",
                            "source": "whatsapp",
                            "context": {"from": frm, "msg_id": msg.get("id")}})
                        reply = r.json().get("reply", "")
                    await send(frm, reply)
    return {"ok": True}


async def send(to: str, text: str) -> dict:
    url = f"https://graph.facebook.com/v20.0/{PHONE_ID}/messages"
    payload = {"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}}
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(url, json=payload, headers={"Authorization": f"Bearer {TOKEN}"})
    return {"status": r.status_code}


@app.post("/send")
async def send_api(to: str = "", text: str = "") -> dict:
    return await send(to, text)


@app.get("/health")
def health() -> dict:
    return {"ok": bool(TOKEN), "phone_id": PHONE_ID}
