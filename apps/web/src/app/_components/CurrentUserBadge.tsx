export function CurrentUserBadge({ label }: { label: string }) {
  if (!label.trim()) return null;

  return (
    <div
      className="card"
      style={{
        padding: 12,
        marginTop: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <div className="muted" style={{ fontSize: 12 }}>
        当前账号
      </div>
      <div style={{ marginTop: 4, fontWeight: 600, fontSize: 14, wordBreak: "break-all" }}>{label}</div>
    </div>
  );
}
