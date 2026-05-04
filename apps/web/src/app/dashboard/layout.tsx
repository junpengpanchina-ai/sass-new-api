import { ConsoleSidebar } from "../console/ConsoleSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
      <ConsoleSidebar />
      <section style={{ minWidth: 0 }}>{children}</section>
    </div>
  );
}
