import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "连接自检 · Token SaaS",
  robots: { index: false, follow: false }
};

export default function ConnectivityDebugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
