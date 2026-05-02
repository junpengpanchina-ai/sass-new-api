const { env } = require("./env");

function upstreamChatUrl() {
  const base = (env.UPSTREAM_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

async function forwardChatCompletion(payload) {
  const response = await fetch(upstreamChatUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.UPSTREAM_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

module.exports = {
  forwardChatCompletion,
};
