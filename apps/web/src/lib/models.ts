import { MODEL_CATALOG } from "@/lib/modelCatalog";

export type UiModel = {
  id: string;
  provider: string;
  label: string;
  contextWindow: number;
  input: "text" | "multimodal";
  enabled: boolean;
};

/** 操练场 / 定价页等：从模型货架配置生成 UI 列表（与网关列表分离）。 */
export function catalogModelsAsUi(): UiModel[] {
  return MODEL_CATALOG.filter((c) => c.catalogStatus === "enabled").map((c) => ({
    id: c.id,
    provider: c.provider,
    label: c.displayName,
    contextWindow: c.contextWindow > 0 ? c.contextWindow : 128_000,
    input: (c.tags.some((t) => /图|多模态|识图/.test(t)) ? "multimodal" : "text") as "text" | "multimodal",
    enabled: true
  }));
}
