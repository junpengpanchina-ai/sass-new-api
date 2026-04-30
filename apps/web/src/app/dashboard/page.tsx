export default function DashboardHome() {
  return (
    <main className="card" style={{ padding: 18 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>后台</h2>
      <p className="muted" style={{ margin: "8px 0 0" }}>
        先从模型列表开始。去 <a href="/dashboard/models">/dashboard/models</a>。
      </p>
    </main>
  );
}

