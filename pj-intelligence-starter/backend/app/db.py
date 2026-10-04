import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

ITEM_COLUMNS = (
    "id",
    "source_name",
    "title",
    "url",
    "summary",
    "author",
    "published_at",
    "fetched_at",
    "score",
    "status",
)


def project_root() -> Path:
    here = Path(__file__).resolve()
    for candidate in (here.parents[2], here.parents[1], Path("/app")):
        if (candidate / "frontend" / "index.html").is_file():
            return candidate
    return here.parents[1]


load_dotenv(project_root() / ".env")


def db_path() -> Path:
    return project_root() / "data" / "intelligence.db"


def frontend_dir() -> Path:
    return project_root() / "frontend"


@contextmanager
def get_conn():
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(sources: list[dict]) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL,
                url TEXT NOT NULL,
                weight REAL NOT NULL DEFAULT 1,
                enabled INTEGER NOT NULL DEFAULT 1
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS raw_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_name TEXT NOT NULL,
                title TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                summary TEXT,
                author TEXT,
                published_at TEXT,
                fetched_at TEXT NOT NULL,
                content_hash TEXT NOT NULL UNIQUE,
                score REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'new'
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                model TEXT NOT NULL,
                analysis TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (item_id) REFERENCES raw_items(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS llm_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                count INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_raw_items_score
            ON raw_items (score DESC, id DESC)
            """
        )
        for source in sources:
            conn.execute(
                """
                INSERT INTO sources (name, type, url, weight, enabled)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT(name) DO UPDATE SET
                    type = excluded.type,
                    url = excluded.url,
                    weight = excluded.weight
                """,
                (source["name"], source["type"], source["url"], source["weight"]),
            )


def list_enabled_sources() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT name, type, url, weight
            FROM sources
            WHERE enabled = 1
            ORDER BY id ASC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def _item_from_row(row: sqlite3.Row) -> dict:
    data = {column: row[column] for column in ITEM_COLUMNS}
    data["summary"] = data["summary"] or ""
    data["author"] = data["author"] or ""
    data["score"] = float(data["score"])
    return data


def find_duplicate(conn: sqlite3.Connection, url: str, content_hash: str) -> bool:
    row = conn.execute(
        "SELECT id FROM raw_items WHERE url = ? OR content_hash = ? LIMIT 1",
        (url, content_hash),
    ).fetchone()
    return row is not None


def insert_item(
    conn: sqlite3.Connection,
    *,
    source_name: str,
    title: str,
    url: str,
    summary: str,
    author: str,
    published_at: str | None,
    content_hash: str,
    score: float,
) -> str:
    if find_duplicate(conn, url, content_hash):
        return "skipped"
    fetched_at = datetime.now(timezone.utc).isoformat()
    conn.execute("SAVEPOINT item_insert")
    try:
        conn.execute(
            """
            INSERT INTO raw_items (
                source_name, title, url, summary, author,
                published_at, fetched_at, content_hash, score, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
            """,
            (
                source_name,
                title,
                url,
                summary,
                author,
                published_at,
                fetched_at,
                content_hash,
                score,
            ),
        )
    except sqlite3.IntegrityError:
        conn.execute("ROLLBACK TO SAVEPOINT item_insert")
        conn.execute("RELEASE SAVEPOINT item_insert")
        return "skipped"
    conn.execute("RELEASE SAVEPOINT item_insert")
    return "inserted"


def list_items(limit: int) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            f"""
            SELECT {", ".join(ITEM_COLUMNS)}
            FROM raw_items
            ORDER BY score DESC, COALESCE(published_at, fetched_at) DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [_item_from_row(row) for row in rows]


def get_item(item_id: int) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            f"SELECT {', '.join(ITEM_COLUMNS)} FROM raw_items WHERE id = ?",
            (item_id,),
        ).fetchone()
    if row is None:
        return None
    return _item_from_row(row)


def save_analysis(item_id: int, model: str, analysis: str) -> dict:
    created_at = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO ai_analysis (item_id, model, analysis, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (item_id, model, analysis, created_at),
        )
        conn.execute(
            "UPDATE raw_items SET status = 'analyzed' WHERE id = ?",
            (item_id,),
        )
        analysis_id = cursor.lastrowid
    return {
        "id": analysis_id,
        "item_id": item_id,
        "model": model,
        "analysis": analysis,
        "created_at": created_at,
    }


def get_analysis(item_id: int) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """
            SELECT id, item_id, model, analysis, created_at
            FROM ai_analysis
            WHERE item_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (item_id,),
        ).fetchone()
    if row is None:
        return None
    return dict(row)


def reserve_llm_call(day: str, limit: int) -> bool:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO llm_usage (date, count) VALUES (?, 0)
            ON CONFLICT(date) DO NOTHING
            """,
            (day,),
        )
        cursor = conn.execute(
            """
            UPDATE llm_usage
            SET count = count + 1
            WHERE date = ? AND count < ?
            """,
            (day, limit),
        )
        return cursor.rowcount == 1


def release_llm_call(day: str) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            UPDATE llm_usage
            SET count = count - 1
            WHERE date = ? AND count > 0
            """,
            (day,),
        )


def daily_limit() -> int:
    raw = os.getenv("LLM_DAILY_LIMIT", "20").strip() or "20"
    try:
        return max(0, int(raw))
    except ValueError:
        return 20
