import os

import httpx

SYSTEM_PROMPT = """你是一个商业情报分析员。不要写空话。请基于给定资讯判断：
1. 这件事是什么
2. 为什么现在发生
3. 是否只是噪音
4. 可能影响哪些行业或公司
5. 是否存在可验证的商业机会
6. 下一步应该调查什么
请用中文输出，结构清晰，避免夸张判断。"""


class LLMConfigError(Exception):
    pass


class LLMCallError(Exception):
    pass


def load_llm_config() -> dict:
    base_url = os.getenv("LLM_BASE_URL", "").strip().rstrip("/")
    api_key = os.getenv("LLM_API_KEY", "").strip()
    model = os.getenv("LLM_MODEL_FAST", "").strip()
    if not api_key:
        raise LLMConfigError("未配置 LLM_API_KEY")
    if not base_url:
        raise LLMConfigError("未配置 LLM_BASE_URL")
    if not model:
        raise LLMConfigError("未配置 LLM_MODEL_FAST")
    return {"base_url": base_url, "api_key": api_key, "model": model}


def build_user_prompt(title: str, source: str, url: str, summary: str) -> str:
    return (
        f"title: {title}\n"
        f"source: {source}\n"
        f"url: {url}\n"
        f"summary: {summary or '无'}"
    )


def _error_message(response: httpx.Response) -> str:
    detail = ""
    try:
        body = response.json()
    except Exception:
        body = None
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict):
            detail = str(error.get("message") or "")
        elif isinstance(error, str):
            detail = error
    detail = " ".join(detail.split())[:200]
    if detail:
        return f"模型调用失败（HTTP {response.status_code}）：{detail}"
    return f"模型调用失败（HTTP {response.status_code}）"


async def analyze_item(title: str, source: str, url: str, summary: str) -> tuple[str, str]:
    config = load_llm_config()
    endpoint = f"{config['base_url']}/v1/chat/completions"
    payload = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_user_prompt(title, source, url, summary),
            },
        ],
        "temperature": 0.2,
    }
    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
    }
    timeout = httpx.Timeout(90.0, connect=10.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        raise LLMCallError("模型调用失败：无法连接模型服务") from exc

    if response.status_code >= 400:
        raise LLMCallError(_error_message(response))

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except Exception as exc:
        raise LLMCallError("模型返回格式无法解析") from exc

    if not isinstance(content, str) or not content.strip():
        raise LLMCallError("模型返回为空")
    return content.strip(), config["model"]
