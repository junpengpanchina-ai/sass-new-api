from pydantic import BaseModel


class CollectError(BaseModel):
    source: str
    error: str


class CollectResponse(BaseModel):
    inserted: int
    skipped: int
    errors: list[CollectError]


class ItemOut(BaseModel):
    id: int
    source_name: str
    title: str
    url: str
    summary: str = ""
    author: str = ""
    published_at: str | None = None
    fetched_at: str
    score: float
    status: str


class AnalysisOut(BaseModel):
    id: int
    item_id: int
    model: str
    analysis: str
    created_at: str
