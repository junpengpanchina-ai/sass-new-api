import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

export const metadata: Metadata = {
  title: "Tokfai - AI API Gateway",
  description:
    "Tokfai provides AI API access, model routing, token usage tracking, API key management, and credit-based billing."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.GOOGLE_ANALYTICS_ID;
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID;
  const umamiScriptUrl = process.env.UMAMI_SCRIPT_URL || "https://analytics.umami.is/script.js";

  return (
    <html lang="zh-CN">
      <body>
        {gaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');
              `.trim()}
            </Script>
          </>
        ) : null}

        {umamiWebsiteId ? (
          <Script
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        ) : null}

        {children}
      </body>
    </html>
  );
}

