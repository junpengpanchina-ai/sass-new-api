import asyncio
import hashlib
import html
import logging
import re
from datetime import datetime, timezone

import feedparser
import httpx

from app.db import get_conn, insert_item, list_enabled_sources
from app.scoring import compute_score

logger = logging.getLogger("pj.collect")

SOURCES = (
    {
        "name": "Hacker News",
        "type": "hn",
        "url": "https://hacker-news.firebaseio.com/v0/topstories.json",
        "weight": 3.0,
    },
    {
        "name": "TechCrunch",
        "type": "rss",
        "url": "https://techcrunch.com/feed/",
        "weight": 2.0,
    },
    {
        "name": "The Verge",
        "type": "rss",
        "url": "https://www.theverge.com/rss/index.xml",
        "weight": 2.0,
    },
    {
        "name": "Ars Technica",
        "type": "rss",
        "url": "https://feeds.arstechnica.com/arstechnica/index",
        "weight": 2.0,
    },
    {
        "name": "OpenAI Blog",
        "type": "rss",
        "url": "https://openai.com/news/rss.xml",
        "weight": 2.5,
    },
    {
        "name": "Google AI Blog",
        "type": "rss",
        "url": "https://blog.google/innovation-and-ai/technology/ai/rss/",
        "weight": 2.5,
    },
    {
        "name": "Product Hunt",
        "type": "rss",
        "url": "https://www.producthunt.com/feed",
        "weight": 1.5,
    },
)

HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item/{id}.json"
HN_LIMIT = 30
RSS_LIMIT = 20
USER_AGENT = "PJIntelligence/0.1 (local dashboard)"

_TAG_RE = re.compile(r"<[^>]+>")
_SPACE_RE = re.compile(r"\s+")


def clean_text(value: str | None, limit: int = 1200) -> str:
    if not value:
        return ""
    text = _TAG_RE.sub(" ", str(value))
    text = html.unescape(text)
    text = _SPACE_RE.sub(" ", text).strip()
    return text[:limit]


def content_hash(title: str) -> str:
    normalized = _SPACE_RE.sub(" ", title).strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def short_error(exc: BaseException) -> str:
    text = " ".join(str(exc).split())
    return text[:300] if text else exc.__class__.__name__


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def parse_struct_time(value) -> datetime | None:
    if not value:
        return None
    try:
        return datetime(*value[:6], tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def parse_loose_time(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return _as_utc(value)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        return _as_utc(datetime.fromisoformat(text.replace("Z", "+00:00")))
    except ValueError:
        pass
    try:
        from email.utils import parsedate_to_datetime

        return _as_utc(parsedate_to_datetime(text))
    except (TypeError, ValueError, IndexError):
        return None


def entry_published(entry) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        parsed = parse_struct_time(entry.get(key))
        if parsed:
            return parsed
    for key in ("published", "updated"):
        parsed = parse_loose_time(entry.get(key))
        if parsed:
            return parsed
    return None


def entry_summary(entry) -> str:
    summary = entry.get("summary") or entry.get("description") or ""
    if summary:
        return clean_text(summary)
    content = entry.get("content") or []
    if content and isinstance(content, list):
        first = content[0]
        if isinstance(first, dict):
            return clean_text(first.get("value"))
    return ""


def entry_author(entry) -> str:
    author = entry.get("author") or ""
    if not author:
        authors = entry.get("authors") or []
        if authors and isinstance(authors, list) and isinstance(authors[0], dict):
            author = authors[0].get("name") or ""
    return clean_text(author, 200)


def http_client() -> httpx.AsyncClient:
    timeout = httpx.Timeout(20.0, connect=10.0)
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*",
    }
    return httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=headers)


async def fetch_hn(client: httpx.AsyncClient, source: dict) -> tuple[list[dict], list[dict]]:
    response = await client.get(source["url"])
    response.raise_for_status()
    ids = response.json()
    if not isinstance(ids, list):
        raise RuntimeError("Hacker News topstories 返回格式异常")

    semaphore = asyncio.Semaphore(8)
    errors: list[dict] = []

    async def fetch_one(item_id: int):
        async with semaphore:
            item_response = await client.get(HN_ITEM_URL.format(id=item_id))
            item_response.raise_for_status()
            return item_response.json()

    selected = ids[:HN_LIMIT]
    results = await asyncio.gather(
        *(fetch_one(item_id) for item_id in selected),
        return_exceptions=True,
    )

    items: list[dict] = []
    for item_id, result in zip(selected, results):
        if isinstance(result, Exception):
            errors.append({"source": source["name"], "error": f"item {item_id}: {short_error(result)}"})
            continue
        if not isinstance(result, dict) or result.get("deleted") or result.get("dead"):
            continue
        title = clean_text(result.get("title"), 300)
        if not title:
            continue
        url = (result.get("url") or f"https://news.ycombinator.com/item?id={item_id}").strip()
        if not url.startswith(("http://", "https://")):
            continue
        score = result.get("score")
        hn_score = float(score) if isinstance(score, (int, float)) else None
        items.append(
            {
                "title": title,
                "url": url,
                "summary": clean_text(result.get("text")),
                "author": clean_text(result.get("by"), 200),
                "published_at": parse_loose_time(result.get("time")),
                "hn_score": hn_score,
            }
        )
    return items, errors


async def fetch_rss(client: httpx.AsyncClient, source: dict) -> tuple[list[dict], list[dict]]:
    response = await client.get(source["url"])
    response.raise_for_status()
    parsed = feedparser.parse(response.content)
    if getattr(parsed, "bozo", False) and not parsed.entries:
        bozo = getattr(parsed, "bozo_exception", None)
        raise RuntimeError(short_error(bozo) if bozo else "RSS 解析失败")

    items: list[dict] = []
    for entry in parsed.entries[:RSS_LIMIT]:
        title = clean_text(entry.get("title"), 300)
        url = (entry.get("link") or "").strip()
        if not title or not url.startswith(("http://", "https://")):
            continue
        items.append(
            {
                "title": title,
                "url": url,
                "summary": entry_summary(entry),
                "author": entry_author(entry),
                "published_at": entry_published(entry),
                "hn_score": None,
            }
        )
    return items, []


async def fetch_source(client: httpx.AsyncClient, source: dict) -> tuple[list[dict], list[dict]]:
    if source["type"] == "hn":
        return await fetch_hn(client, source)
    return await fetch_rss(client, source)


def store_items(source: dict, items: list[dict]) -> tuple[int, int]:
    inserted = 0
    skipped = 0
    weight = float(source["weight"])
    with get_conn() as conn:
        for item in items:
            digest = content_hash(item["title"])
            published_at = item["published_at"]
            score = compute_score(
                source_weight=weight,
                title=item["title"],
                published_at=published_at,
                hn_score=item["hn_score"],
            )
            outcome = insert_item(
                conn,
                source_name=source["name"],
                title=item["title"],
                url=item["url"],
                summary=item["summary"],
                author=item["author"],
                published_at=published_at.isoformat() if published_at else None,
                content_hash=digest,
                score=score,
            )
            if outcome == "inserted":
                inserted += 1
            else:
                skipped += 1
    return inserted, skipped


async def collect_all() -> dict:
    sources = list_enabled_sources()
    inserted = 0
    skipped = 0
    errors: list[dict] = []

    async with http_client() as client:
        fetched = await asyncio.gather(
            *(fetch_source(client, source) for source in sources),
            return_exceptions=True,
        )

    for source, result in zip(sources, fetched):
        if isinstance(result, Exception):
            message = short_error(result)
            logger.warning("source failed name=%s error=%s", source["name"], message)
            errors.append({"source": source["name"], "error": message})
            continue
        items, source_errors = result
        errors.extend(source_errors)
        try:
            added, ignored = store_items(source, items)
        except Exception as exc:
            message = short_error(exc)
            logger.warning("store failed name=%s error=%s", source["name"], message)
            errors.append({"source": source["name"], "error": message})
            continue
        inserted += added
        skipped += ignored

    logger.info("collect inserted=%s skipped=%s errors=%s", inserted, skipped, len(errors))
    return {"inserted": inserted, "skipped": skipped, "errors": errors}
