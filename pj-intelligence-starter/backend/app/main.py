import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response

from app.crawler import SOURCES, collect_all
from app.db import (
    daily_limit,
    frontend_dir,
    get_analysis,
    get_item,
    init_db,
    list_items,
    release_llm_call,
    reserve_llm_call,
    save_analysis,
)
from app.llm import LLMCallError, LLMConfigError, analyze_item, load_llm_config
from app.schemas import AnalysisOut, CollectResponse, ItemOut

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("pj")

app = FastAPI(title="PJ Intelligence")


@app.on_event("startup")
def startup() -> None:
    init_db(list(SOURCES))
    logger.info("database ready")


def _file(path: Path, media_type: str) -> FileResponse:
    if not path.is_file():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "no-cache"})


@app.get("/api/health")
def health() -> Response:
    return Response(content='{"status":"ok"}', media_type="application/json")


@app.post("/api/collect", response_model=CollectResponse)
async def collect() -> dict:
    return await collect_all()


@app.get("/api/items", response_model=list[ItemOut])
def items(limit: int = Query(default=50, ge=1, le=200)) -> list[dict]:
    return list_items(limit)


@app.get("/api/items/{item_id}", response_model=ItemOut)
def item_detail(item_id: int) -> dict:
    item = get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="资讯不存在")
    return item


@app.post("/api/items/{item_id}/analyze", response_model=AnalysisOut)
async def analyze(item_id: int) -> dict:
    item = get_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="资讯不存在")

    try:
        load_llm_config()
    except LLMConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    day = datetime.now(timezone.utc).date().isoformat()
    limit = daily_limit()
    if not reserve_llm_call(day, limit):
        raise HTTPException(status_code=429, detail=f"已达到今日模型调用上限（{limit}）")

    try:
        analysis, model = await analyze_item(
            title=item["title"],
            source=item["source_name"],
            url=item["url"],
            summary=item["summary"],
        )
    except (LLMConfigError, LLMCallError) as exc:
        release_llm_call(day)
        status = 400 if isinstance(exc, LLMConfigError) else 502
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    except Exception:
        release_llm_call(day)
        logger.exception("analyze failed item_id=%s", item_id)
        raise HTTPException(status_code=502, detail="模型调用失败")

    return save_analysis(item_id, model, analysis)


@app.get("/api/analysis/{item_id}", response_model=AnalysisOut)
def analysis(item_id: int) -> dict:
    if get_item(item_id) is None:
        raise HTTPException(status_code=404, detail="资讯不存在")
    row = get_analysis(item_id)
    if row is None:
        raise HTTPException(status_code=404, detail="暂无分析")
    return row


@app.get("/")
def index() -> FileResponse:
    return _file(frontend_dir() / "index.html", "text/html; charset=utf-8")


@app.get("/styles.css")
def styles() -> FileResponse:
    return _file(frontend_dir() / "styles.css", "text/css; charset=utf-8")


@app.get("/app.js")
def script() -> FileResponse:
    return _file(frontend_dir() / "app.js", "application/javascript; charset=utf-8")
