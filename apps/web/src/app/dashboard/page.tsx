export default function DashboardHome() {
  return (
    <main className="card" style={{ padding: 18 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>仪表板</h2>
      <p className="muted" style={{ margin: "8px 0 0" }}>
        请从 <a href="/console/models">模型大全</a> 或左侧导航进入各模块。
      </p>
    </main>
  );
}
