"""Memória durável — Postgres em produção, SQLite no primeiro boot.

Formato espelha save_memory do Base44: id, kind, category, evidence_level.
"""
from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid

DB_PATH = os.getenv("MEMORY_DB", "/workspace/agent_memory.db")
_KINDS = {"fact", "preference", "instruction", "decision"}


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH)
    c.execute("""CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY, user_id TEXT, kind TEXT, category TEXT,
        content TEXT, evidence_level TEXT DEFAULT 'user_stated',
        created_at REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT,
        user_message TEXT, agent_reply TEXT, channel TEXT, ts REAL)""")
    c.execute("CREATE INDEX IF NOT EXISTS ix_mem_user ON memories(user_id)")
    return c


def save(*, user_id: str, content: str, kind: str = "fact", category: str = "Geral") -> str:
    if kind not in _KINDS:
        kind = "fact"
    mid = uuid.uuid4().hex[:12]
    with _conn() as c:
        c.execute("INSERT INTO memories VALUES (?,?,?,?,?,?,?)",
                  (mid, user_id, kind, category, content[:1000], "user_stated", time.time()))
    return mid


def forget(*, user_id: str, mid: str) -> bool:
    with _conn() as c:
        cur = c.execute("DELETE FROM memories WHERE id=? AND user_id=?", (mid, user_id))
    return cur.rowcount > 0


def recall(user_id: str) -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT id, kind, category, content FROM memories "
                         "WHERE user_id=? ORDER BY created_at DESC LIMIT 200", (user_id,)).fetchall()
    return [{"id": r[0], "kind": r[1], "category": r[2], "content": r[3]} for r in rows]


def search_text(*, user_id: str, needle: str) -> list[dict]:
    needle = needle.lower()
    return [m for m in recall(user_id) if needle in m["content"].lower()]


def append_history(user_id: str, user_message: str, agent_reply: str, channel: str) -> None:
    with _conn() as c:
        c.execute("INSERT INTO history(user_id,user_message,agent_reply,channel,ts) VALUES (?,?,?,?,?)",
                  (user_id, user_message[:4000], agent_reply[:4000], channel, time.time()))


if __name__ == "__main__":  # teste rápido
    print(save(user_id="t", content="gosta de trens"))
    print(json.dumps(recall("t"), ensure_ascii=False))
