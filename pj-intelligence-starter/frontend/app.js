const RADAR_KEYWORDS = ["AI", "Developer", "Product", "Funding", "Startup", "Agent", "API", "SaaS"];
const HIGH_SCORE = 60;

const healthEl = document.getElementById("health");
const noteEl = document.getElementById("note");
const collectBtn = document.getElementById("collect");
const radarEl = document.getElementById("radar");
const signalsEl = document.getElementById("signals");
const listEl = document.getElementById("list");
const detailEl = document.getElementById("detail");

let items = [];
let selectedId = null;
let selectedItem = null;

function hasKeyword(text, keyword) {
  const pattern = new RegExp(`(?<![a-z0-9])${keyword}(?![a-z0-9])`, "i");
  return pattern.test(text || "");
}

function isToday(iso) {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatTime(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso).slice(0, 16);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch (err) {
    return "";
  }
  return "";
}

function setNote(text) {
  noteEl.textContent = text || "";
}

function renderRadar() {
  radarEl.replaceChildren();
  const counts = RADAR_KEYWORDS.map((keyword) => ({
    keyword,
    count: items.filter((item) => hasKeyword(item.title, keyword)).length,
  }));
  const max = Math.max(1, ...counts.map((row) => row.count));
  counts.forEach((row) => {
    const line = document.createElement("div");
    line.className = "radar-row";
    const label = document.createElement("span");
    label.className = "radar-label";
    label.textContent = row.keyword;
    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("i");
    fill.style.width = `${Math.round((row.count / max) * 100)}%`;
    bar.appendChild(fill);
    const value = document.createElement("strong");
    value.textContent = String(row.count);
    line.append(label, bar, value);
    radarEl.appendChild(line);
  });
}

function renderSignals() {
  signalsEl.replaceChildren();
  const rows = [
    ["今日采集", items.filter((item) => isToday(item.fetched_at)).length],
    ["高分资讯", items.filter((item) => Number(item.score) >= HIGH_SCORE).length],
    ["来源数量", new Set(items.map((item) => item.source_name)).size],
  ];
  rows.forEach(([label, value]) => {
    const line = document.createElement("div");
    line.className = "signal-row";
    const name = document.createElement("span");
    name.textContent = label;
    const number = document.createElement("strong");
    number.textContent = String(value);
    line.append(name, number);
    signalsEl.appendChild(line);
  });
}

function renderList() {
  listEl.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "暂无数据";
    listEl.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item" + (item.id === selectedId ? " selected" : "");
    const title = document.createElement("span");
    title.className = "item-title";
    title.textContent = item.title;
    const source = document.createElement("span");
    source.className = "source";
    source.textContent = item.source_name;
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = formatTime(item.published_at || item.fetched_at);
    const score = document.createElement("span");
    score.className = "score";
    score.textContent = String(Math.round(Number(item.score) || 0));
    button.append(title, source, time, score);
    button.addEventListener("click", () => openItem(item.id));
    listEl.appendChild(button);
  });
}

function renderDetail(item, analysis, errorText) {
  detailEl.replaceChildren();
  if (!item) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "选择一条资讯";
    detailEl.appendChild(empty);
    return;
  }

  const title = document.createElement("h3");
  title.className = "detail-title";
  title.textContent = item.title;

  const meta = document.createElement("div");
  meta.className = "detail-meta";
  const source = document.createElement("span");
  source.textContent = item.source_name;
  const score = document.createElement("span");
  score.className = "score";
  score.textContent = ` ${Math.round(Number(item.score) || 0)} `;
  const time = document.createElement("span");
  time.textContent = formatTime(item.published_at || item.fetched_at);
  meta.append(source, score, time);

  const link = document.createElement("a");
  link.className = "link";
  const href = safeUrl(item.url);
  link.href = href || "#";
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = item.url;

  const summary = document.createElement("p");
  summary.className = "summary";
  summary.textContent = item.summary || "无摘要";

  const action = document.createElement("button");
  action.type = "button";
  action.textContent = "AI 研判";
  action.addEventListener("click", () => runAnalysis(item.id, action));

  detailEl.append(title, meta, link, summary, action);

  if (analysis && analysis.analysis) {
    const pre = document.createElement("pre");
    pre.className = "analysis";
    pre.textContent = analysis.analysis;
    detailEl.appendChild(pre);
  }

  if (errorText) {
    const error = document.createElement("p");
    error.className = "error";
    error.textContent = errorText;
    detailEl.appendChild(error);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (err) {
    return {};
  }
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await readJson(response);
    const ok = response.ok && data.status === "ok";
    healthEl.textContent = ok ? "状态：LOCAL" : "状态：OFFLINE";
    healthEl.classList.toggle("offline", !ok);
  } catch (err) {
    healthEl.textContent = "状态：OFFLINE";
    healthEl.classList.add("offline");
  }
}

async function loadItems() {
  const response = await fetch("/api/items?limit=200");
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "列表加载失败");
  }
  items = Array.isArray(data) ? data : [];
  renderRadar();
  renderSignals();
  renderList();
}

async function openItem(id) {
  selectedId = id;
  renderList();
  const [itemResponse, analysisResponse] = await Promise.all([
    fetch(`/api/items/${id}`),
    fetch(`/api/analysis/${id}`),
  ]);
  const item = await readJson(itemResponse);
  if (!itemResponse.ok) {
    selectedItem = null;
    renderDetail(null, null, typeof item.detail === "string" ? item.detail : "详情加载失败");
    return;
  }
  selectedItem = item;
  const analysis = analysisResponse.ok ? await readJson(analysisResponse) : null;
  renderDetail(item, analysis, "");
}

async function runAnalysis(id, button) {
  button.disabled = true;
  button.textContent = "研判中";
  const response = await fetch(`/api/items/${id}/analyze`, { method: "POST" });
  const data = await readJson(response);
  if (!response.ok) {
    button.disabled = false;
    button.textContent = "AI 研判";
    const message = typeof data.detail === "string" ? data.detail : "研判失败";
    const existing = detailEl.querySelector(".error");
    if (existing) existing.remove();
    const error = document.createElement("p");
    error.className = "error";
    error.textContent = message;
    detailEl.appendChild(error);
    return;
  }
  if (selectedItem && selectedItem.id === id) {
    selectedItem.status = "analyzed";
  }
  renderDetail(selectedItem, data, "");
}

async function collect() {
  collectBtn.disabled = true;
  collectBtn.textContent = "采集中";
  setNote("采集中");
  try {
    const response = await fetch("/api/collect", { method: "POST" });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(typeof data.detail === "string" ? data.detail : "采集失败");
    }
    const errorCount = Array.isArray(data.errors) ? data.errors.length : 0;
    let text = `插入 ${data.inserted} · 跳过 ${data.skipped} · 错误 ${errorCount}`;
    if (errorCount) {
      const first = data.errors[0];
      text += ` · ${first.source}: ${first.error}`;
    }
    setNote(text);
    await loadItems();
    if (selectedId) await openItem(selectedId);
  } catch (err) {
    setNote(err.message || "采集失败");
  } finally {
    collectBtn.disabled = false;
    collectBtn.textContent = "立即采集";
  }
}

collectBtn.addEventListener("click", collect);

renderDetail(null, null, "");
renderRadar();
renderSignals();
loadHealth();
loadItems().catch((err) => setNote(err.message || "列表加载失败"));
