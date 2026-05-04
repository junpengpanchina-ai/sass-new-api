export type BillingType = "token" | "per_request";

export type ModelCatalogStatus = "enabled" | "maintenance";

export type ModelCatalogEntry = {
  id: string;
  displayName: string;
  provider: string;
  category: string;
  billingType: BillingType;
  contextWindow: number;
  priceExample: string;
  refundPolicy: string;
  tags: string[];
  docsUrl?: string;
  catalogStatus: ModelCatalogStatus;
};

/** 产品化模型货架配置（后续可换 Supabase model_catalog）。 */
export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: "gemini-3.1-pro",
    displayName: "Gemini 3.1 Pro",
    provider: "grsai",
    category: "对话 / 推理 / 多模态",
    billingType: "token",
    contextWindow: 1_048_576,
    priceExample: "input ¥1–2/M tokens，output ¥6–12/M tokens",
    refundPolicy: "调用失败返还积分",
    tags: ["对话", "识图", "推理"],
    docsUrl: "https://tokfai.com/pricing",
    catalogStatus: "enabled"
  },
  {
    id: "gemini-3-pro",
    displayName: "Gemini 3 Pro",
    provider: "grsai",
    category: "对话 / 推理 / 多模态",
    billingType: "token",
    contextWindow: 1_048_576,
    priceExample: "input ¥1–2/M tokens，output ¥6–12/M tokens",
    refundPolicy: "调用失败返还积分",
    tags: ["对话", "识图", "推理"],
    docsUrl: "https://tokfai.com/pricing",
    catalogStatus: "enabled"
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    provider: "openai-compatible",
    category: "对话 / 轻量多模态",
    billingType: "token",
    contextWindow: 128_000,
    priceExample: "以账户积分与接口扣费为准",
    refundPolicy: "调用失败返还积分",
    tags: ["对话", "轻量", "多模态"],
    docsUrl: "https://tokfai.com/pricing",
    catalogStatus: "enabled"
  },
  {
    id: "nano-banana",
    displayName: "Nano Banana",
    provider: "image",
    category: "图片",
    billingType: "per_request",
    contextWindow: 0,
    priceExample: "按次计费，以控制台为准",
    refundPolicy: "失败返还（按次）",
    tags: ["文生图", "图生图", "图片编辑"],
    docsUrl: "https://tokfai.com/pricing",
    catalogStatus: "enabled"
  },
  {
    id: "nano-banana-pro",
    displayName: "Nano Banana Pro",
    provider: "image",
    category: "图片",
    billingType: "per_request",
    contextWindow: 0,
    priceExample: "按次计费，以控制台为准",
    refundPolicy: "失败返还（按次）",
    tags: ["文生图", "图生图", "图片编辑"],
    docsUrl: "https://tokfai.com/pricing",
    catalogStatus: "enabled"
  },
  {
    id: "nano-banana-2",
    displayName: "Nano Banana 2",
    provider: "image",
    category: "图片",
    billingType: "per_request",
    contextWindow: 0,
    priceExample: "按次计费，以控制台为准",
    refundPolicy: "失败返还（按次）",
    tags: ["文生图", "图生图", "图片编辑"],
    docsUrl: "https://tokfai.com/pricing",
    catalogStatus: "enabled"
  }
];

export type ShelfAvailability = "available" | "pending" | "maintenance" | "connected_unknown";

export type ModelShelfItem =
  | ({
      kind: "catalog";
      availability: ShelfAvailability;
    } & ModelCatalogEntry)
  | {
      kind: "gateway_only";
      id: string;
      displayName: string;
      provider: string;
      category: string;
      billingType: BillingType;
      contextWindow: number;
      priceExample: string;
      refundPolicy: string;
      tags: string[];
      docsUrl?: string;
      catalogStatus: ModelCatalogStatus;
      availability: "connected_unknown";
    };

export function billingLabel(b: BillingType): string {
  return b === "token" ? "按 token 计费" : "按次计费";
}

export function buildModelShelf(gatewayModelIds: Set<string>): ModelShelfItem[] {
  const items: ModelShelfItem[] = [];

  for (const row of MODEL_CATALOG) {
    const inGateway = gatewayModelIds.has(row.id);
    let availability: ShelfAvailability;
    if (row.catalogStatus === "maintenance") {
      availability = "maintenance";
    } else if (inGateway) {
      availability = "available";
    } else {
      availability = "pending";
    }
    items.push({ kind: "catalog", availability, ...row });
  }

  for (const id of gatewayModelIds) {
    if (MODEL_CATALOG.some((c) => c.id === id)) continue;
    items.push({
      kind: "gateway_only",
      id,
      displayName: id,
      provider: "—",
      category: "已接入",
      billingType: "token",
      contextWindow: 0,
      priceExample: "待补充价格示例",
      refundPolicy: "以平台规则为准",
      tags: [],
      catalogStatus: "enabled",
      availability: "connected_unknown"
    });
  }

  return items;
}

export function availabilityLabel(a: ShelfAvailability): string {
  switch (a) {
    case "available":
      return "可用";
    case "pending":
      return "未接入";
    case "maintenance":
      return "维护中";
    case "connected_unknown":
      return "已接入，待补充信息";
    default:
      return "—";
  }
}

export function availabilityPillClass(a: ShelfAvailability): string {
  if (a === "available") return "good";
  if (a === "maintenance") return "bad";
  return "warn";
}
