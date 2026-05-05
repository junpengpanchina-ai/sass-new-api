import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Tokfai",
};

export default function PrivacyPage() {
  return (
    <main className="container containerNarrow">
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="pill">Legal</div>
            <h1 className="h1" style={{ fontSize: 28 }}>Privacy Policy</h1>
            <div className="muted" style={{ fontSize: 13 }}>
              Last updated: May 5, 2026
            </div>
          </div>
          <Link className="btn" href="/">
            Back to home
          </Link>
        </div>

        <div className="divider" style={{ margin: "16px 0" }} />

        <div className="prose">
          <p>
            Tokfai values your privacy. This Privacy Policy explains how we collect, use, and protect information when you
            use our website and services.
          </p>

          <h2 className="h2">Information We Collect</h2>
          <p>
            When you sign in with Google, we may collect basic account information such as your email address, user ID,
            display name, and profile image if provided by Google. Google sign-in is used only for authentication and
            account access.
          </p>
          <p>
            We may also collect service usage information, including API request time, selected model, token usage,
            credit consumption, order status, and basic technical logs. This information is used for billing, fraud
            prevention, service reliability, debugging, and customer support.
          </p>

          <h2 className="h2">How We Use Information</h2>
          <ul>
            <li>authenticate users;</li>
            <li>manage accounts and credits;</li>
            <li>process orders and payments;</li>
            <li>provide API and AI model access;</li>
            <li>monitor abuse and improve system stability;</li>
            <li>respond to user support requests.</li>
          </ul>

          <h2 className="h2">Google Data</h2>
          <p>
            Tokfai uses Google sign-in only for authentication. We do not request access to your Google Drive, Gmail,
            Calendar, Contacts, or other Google services unless explicitly stated and authorized by you in the future.
          </p>

          <h2 className="h2">Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share limited information with service providers required to
            operate the service, such as authentication, hosting, database, payment, and infrastructure providers.
          </p>

          <h2 className="h2">Data Retention</h2>
          <p>
            We retain account and usage data as needed to provide the service, comply with legal obligations, resolve
            disputes, prevent abuse, and maintain billing records.
          </p>

          <h2 className="h2">Data Deletion</h2>
          <p>
            You may request account or data deletion by contacting us at <a href="mailto:junpengpanchina@gmail.com">junpengpanchina@gmail.com</a>.
          </p>

          <h2 className="h2">Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect user information. However, no internet
            service can guarantee absolute security.
          </p>

          <h2 className="h2">Contact</h2>
          <p>
            If you have questions about this Privacy Policy, contact us at:
            <br />
            <a href="mailto:junpengpanchina@gmail.com">junpengpanchina@gmail.com</a>
          </p>
        </div>
      </div>
    </main>
  );
}

