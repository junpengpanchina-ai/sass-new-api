const API_ORIGIN_RAW =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_DMIT_API_URL?.trim() ||
  "https://api.tokfai.com";

/** DMIT / OpenAI 网关主机（无末尾斜杠）。 */
export const API_ORIGIN = API_ORIGIN_RAW.replace(/\/+$/, "");

/** OpenAI 兼容 API base_url（含 `/v1`）。 */
export const OPENAI_BASE_URL = `${API_ORIGIN}/v1`;
