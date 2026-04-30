export type UiModel = {
  id: string;
  provider: string;
  label: string;
  contextWindow: number;
  input: "text" | "multimodal";
  enabled: boolean;
};

export const MODELS: UiModel[] = [
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    label: "GPT-4.1 mini",
    contextWindow: 128_000,
    input: "multimodal",
    enabled: true
  },
  {
    id: "gpt-4.1",
    provider: "openai",
    label: "GPT-4.1",
    contextWindow: 128_000,
    input: "multimodal",
    enabled: true
  },
  {
    id: "o4-mini",
    provider: "openai",
    label: "o4-mini",
    contextWindow: 128_000,
    input: "multimodal",
    enabled: true
  },
  {
    id: "claude-3.7-sonnet",
    provider: "anthropic",
    label: "Claude 3.7 Sonnet",
    contextWindow: 200_000,
    input: "text",
    enabled: false
  }
];

