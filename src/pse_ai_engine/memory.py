"""Persistent conversation memory. Fixes: no multi-turn continuity, no context
memory across messages, cannot ask/answer follow-ups."""
import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "chat_memory.sqlite3"


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _connect()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            last_active TEXT
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,               -- 'user' | 'assistant'
            content TEXT,
            metadata TEXT,           -- JSON: tickers mentioned, data used, etc.
            timestamp TEXT,
            FOREIGN KEY(session_id) REFERENCES sessions(id)
        );
        CREATE TABLE IF NOT EXISTS user_facts (
            session_id TEXT,
            fact_key TEXT,
            fact_value TEXT,
            updated_at TEXT,
            PRIMARY KEY (session_id, fact_key)
        );
        CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp);
    """)
    conn.commit()
    conn.close()


def ensure_session(session_id: str):
    conn = _connect()
    now = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO sessions (id, created_at, last_active) VALUES (?, ?, ?) "
        "ON CONFLICT(id) DO UPDATE SET last_active = ?",
        (session_id, now, now, now),
    )
    conn.commit()
    conn.close()


def add_message(session_id: str, role: str, content: str, metadata: dict | None = None):
    ensure_session(session_id)
    conn = _connect()
    conn.execute(
        "INSERT INTO messages (session_id, role, content, metadata, timestamp) VALUES (?, ?, ?, ?, ?)",
        (session_id, role, content, json.dumps(metadata or {}), datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()


def get_recent_history(session_id: str, limit: int = 10) -> list[dict]:
    """Last N turns for conversational continuity."""
    conn = _connect()
    rows = conn.execute(
        "SELECT role, content, metadata, timestamp FROM messages "
        "WHERE session_id = ? ORDER BY id DESC LIMIT ?",
        (session_id, limit),
    ).fetchall()
    conn.close()
    return [
        {"role": r["role"], "content": r["content"], "metadata": json.loads(r["metadata"]),
         "timestamp": r["timestamp"]}
        for r in reversed(rows)
    ]


def set_fact(session_id: str, key: str, value: str):
    """Remember a durable fact about the user (e.g. risk tolerance, watchlist)."""
    ensure_session(session_id)
    conn = _connect()
    conn.execute(
        "INSERT INTO user_facts (session_id, fact_key, fact_value, updated_at) VALUES (?, ?, ?, ?) "
        "ON CONFLICT(session_id, fact_key) DO UPDATE SET fact_value = ?, updated_at = ?",
        (session_id, key, value, datetime.now().isoformat(), value, datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()


def get_facts(session_id: str) -> dict:
    conn = _connect()
    rows = conn.execute(
        "SELECT fact_key, fact_value FROM user_facts WHERE session_id = ?", (session_id,)
    ).fetchall()
    conn.close()
    return {r["fact_key"]: r["fact_value"] for r in rows}


def get_mentioned_tickers(session_id: str, limit: int = 20) -> list[str]:
    """Extract tickers the user has discussed recently — enables 'what about now?' follow-ups."""
    history = get_recent_history(session_id, limit)
    tickers = []
    for turn in history:
        for t in turn.get("metadata", {}).get("tickers", []):
            if t not in tickers:
                tickers.append(t)
    return tickers


init_db()

if __name__ == "__main__":
    sid = "test-session"
    add_message(sid, "user", "What's the outlook for BDO?", {"tickers": ["BDO"]})
    add_message(sid, "assistant", "BDO is showing bullish signals...", {"tickers": ["BDO"]})
    add_message(sid, "user", "What about compared to BPI?", {"tickers": ["BPI"]})
    print(json.dumps(get_recent_history(sid), indent=2))
    print("Mentioned tickers:", get_mentioned_tickers(sid))
