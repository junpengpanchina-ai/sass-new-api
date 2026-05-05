import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Tokfai",
};

export default function TermsPage() {
  return (
    <main className="container" style={{ maxWidth: 860 }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="pill">Legal</div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 28, letterSpacing: "-0.02em" }}>Terms of Service</h1>
            <div className="muted" style={{ fontSize: 13 }}>
              Last updated: May 5, 2026
            </div>
          </div>
          <Link className="btn" href="/">
            Back to home
          </Link>
        </div>

        <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

        <div style={{ display: "grid", gap: 14, color: "rgba(255,255,255,0.88)" }}>
          <p>These Terms of Service govern your use of Tokfai and related services.</p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Service Description</h2>
          <p>
            Tokfai provides AI API access, model routing, token or credit-based usage, account management, and related
            software services.
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Account</h2>
          <p>
            You are responsible for maintaining the security of your account. You agree to provide accurate information
            and to use the service only for lawful purposes.
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Acceptable Use</h2>
          <p>You must not use Tokfai to:</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, color: "rgba(255,255,255,0.88)" }}>
            <li>violate laws or regulations;</li>
            <li>abuse, attack, disrupt, or overload the service;</li>
            <li>send spam, malware, phishing content, or harmful requests;</li>
            <li>infringe the rights of others;</li>
            <li>attempt to bypass usage limits, billing systems, or security controls;</li>
            <li>resell or redistribute the service in a way that violates applicable rules or agreements.</li>
          </ul>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Credits and Billing</h2>
          <p>
            Credits are used only for Tokfai services. Usage may be deducted based on model type, token consumption,
            image generation, API calls, or other service metrics. Prices, models, credits, and plans may change over
            time.
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Service Availability</h2>
          <p>
            Tokfai may depend on third-party infrastructure, upstream AI providers, payment providers, hosting providers,
            and network services. We do not guarantee uninterrupted or error-free service. The service may be unavailable
            due to maintenance, upgrades, upstream failures, abuse prevention, or other operational reasons.
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Suspension and Termination</h2>
          <p>
            We may suspend or terminate access if we detect abuse, fraud, attacks, illegal activity, payment issues, or
            violation of these Terms.
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the service after changes means you accept the
            updated Terms.
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Disclaimer</h2>
          <p>
            The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent
            permitted by law, Tokfai disclaims warranties of merchantability, fitness for a particular purpose, and
            non-infringement.
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Tokfai will not be liable for indirect, incidental, special,
            consequential, or punitive damages, or for loss of data, revenue, profits, or business opportunities.
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 16 }}>Contact</h2>
          <p>
            If you have questions about these Terms, contact us at:
            <br />
            <a href="mailto:junpengpanchina@gmail.com">junpengpanchina@gmail.com</a>
          </p>
        </div>
      </div>
    </main>
  );
}

