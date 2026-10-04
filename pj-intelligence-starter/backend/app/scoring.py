import re
from datetime import datetime, timedelta, timezone

# Each matched keyword adds 5 points. The final score is clamped to 0-100.
KEYWORDS = (
    "ai",
    "agent",
    "openai",
    "google",
    "anthropic",
    "model",
    "coding",
    "developer",
    "product",
    "startup",
    "funding",
    "saas",
    "api",
    "automation",
    "robotics",
    "medical",
    "healthcare",
)

KEYWORD_POINTS = 5


def _keyword_pattern(keyword: str) -> re.Pattern[str]:
    # ASCII boundaries so a keyword still matches beside Chinese text.
    return re.compile(
        rf"(?<![a-z0-9]){re.escape(keyword)}(?![a-z0-9])",
        re.IGNORECASE,
    )


_PATTERNS = tuple(_keyword_pattern(keyword) for keyword in KEYWORDS)


def title_keyword_score(title: str) -> float:
    text = title or ""
    return float(sum(KEYWORD_POINTS for pattern in _PATTERNS if pattern.search(text)))


def recency_score(published_at: datetime | None, now: datetime | None = None) -> float:
    if published_at is None:
        return 0
    current = now or datetime.now(timezone.utc)
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)
    else:
        published_at = published_at.astimezone(timezone.utc)
    current = current.astimezone(timezone.utc)
    age = current - published_at
    if age <= timedelta(hours=24):
        return 20
    if age <= timedelta(days=3):
        return 10
    if age <= timedelta(days=7):
        return 5
    return 0


def hn_component(hn_score: float | None) -> float:
    if not hn_score or hn_score <= 0:
        return 0
    return min(hn_score / 10, 30)


def compute_score(
    source_weight: float,
    title: str,
    published_at: datetime | None,
    hn_score: float | None = None,
    now: datetime | None = None,
) -> float:
    raw = (
        float(source_weight) * 10
        + title_keyword_score(title)
        + recency_score(published_at, now)
        + hn_component(hn_score)
    )
    return float(max(0, min(100, round(raw))))
