const apiOrigin =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_DMIT_API_URL ||
  "https://api.tokfai.com";

export const API_ORIGIN = apiOrigin.replace(/\/$/, "");

export const OPENAI_BASE_URL = `${API_ORIGIN}/v1`;
