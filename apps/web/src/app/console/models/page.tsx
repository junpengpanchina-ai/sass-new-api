import { ModelShelfClient } from "./ModelShelfClient";

export default function ConsoleModelsPage() {
  return (
    <main className="card" style={{ padding: 18 }}>
      <div style={{ maxWidth: 1100 }}>
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em" }}>模型大全</h1>
        <p className="muted" style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6 }}>
          价格示例仅供参考，实际扣费以账户积分与接口返回为准。模型能力与网关对齐：已在网关中上线的模型显示为「可用」，其余为「未接入」或维护状态。
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <ModelShelfClient />
      </div>
    </main>
  );
}
