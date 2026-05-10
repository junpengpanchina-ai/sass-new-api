import { ConsoleSidebar } from "../console/ConsoleSidebar";
import { LoginSuccessBanner } from "../_components/LoginSuccessBanner";
import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
      <ConsoleSidebar />
      <section style={{ minWidth: 0, display: "grid", gap: 12 }}>
        <Suspense fallback={null}>
          <LoginSuccessBanner />
        </Suspense>
        {children}
      </section>
    </div>
  );
}
