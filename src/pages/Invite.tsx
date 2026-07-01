import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout } from "../design/tokens";
import { generateReferralCode, buildReferralUrl } from "../stockstory/growth/referral/ReferralService";

export default function Invite() {
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get("ref");
  const [referralCode] = useState(() => generateReferralCode());
  const contentWidth = useResponsiveValue("100%", "520px");
  const [copied, setCopied] = useState(false);

  const inviteUrl = refParam
    ? buildReferralUrl(refParam)
    : buildReferralUrl(referralCode.code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://stockstory-india.com${inviteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <main className="raycast-slideUp" style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>

      <section className="raycast-stagger-1" style={{ marginBottom: "36px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "12px" }}>
          Invite Friends
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6, marginBottom: "24px" }}>
          Share StockEX India with fellow researchers. Help them discover structured research analysis for Indian equities.
        </p>
      </section>

      <div className="raycast-stagger-2" style={{ animationDelay: "0.1s" }}>
      <Card style={{ padding: "24px" }}>
        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: colors.textSecondary }}>
          Your invite link
        </label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <input
            type="text"
            readOnly
            value={`https://stockstory-india.com${inviteUrl}`}
            style={{
              flex: 1, padding: "10px 12px", border: `1px solid ${colors.border}`,
              borderRadius: "6px", fontSize: "14px", background: colors.fill, color: colors.textPrimary,
            }}
          />
          <Button onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</Button>
        </div>
        <p style={{ fontSize: "13px", color: colors.textSecondary }}>
          Share this link with anyone who might benefit from structured equity research.
        </p>
      </Card>
      </div>

      <footer className="raycast-stagger-3" style={{ animationDelay: "0.2s", marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
        <p>Research analysis only. Not investment advice.</p>
      </footer>
    </main>
  );
}
