import { useState } from "react";
import { colors, typography, space, radius } from "../design/tokens";

const CHANGELOG_ENTRIES = [
  {
    date: "2026-04-10",
    version: "0.2.0",
    title: "Scanner v2 & Watchlist Improvements",
    items: [
      "Added industry filters to the stock scanner",
      "Improved watchlist sync performance",
      "Fixed NSE data refresh timing issue",
      "Added PE ratio and market cap columns to scanner results",
    ],
  },
  {
    date: "2026-03-28",
    version: "0.1.0",
    title: "Private Beta Launch",
    items: [
      "Initial private beta release",
      "NSE stock scanner with multi-factor screening",
      "Watchlist with timely price updates",
      "Stock detail pages with fundamental data",
      "Research profiles for tracking thesis",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: space[2] }}>Changelog</h1>
      <p style={{ color: colors.textSecondary, marginBottom: space[8], fontSize: typography.body.desktop.size }}>
        See what's new in StockStory India.
      </p>
      {CHANGELOG_ENTRIES.map((entry) => (
        <div key={entry.version} style={{ marginBottom: space[8] }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: space[3], marginBottom: space[3] }}>
            <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, margin: 0 }}>
              {entry.title}
            </h2>
            <span style={{ fontSize: "13px", color: colors.textSecondary }}>v{entry.version}</span>
            <span style={{ fontSize: "13px", color: colors.textSecondary, marginLeft: "auto" }}>{entry.date}</span>
          </div>
          <ul style={{ paddingLeft: space[5], margin: 0, display: "flex", flexDirection: "column", gap: space[2] }}>
            {entry.items.map((item, i) => (
              <li key={i} style={{ fontSize: typography.body.desktop.size, lineHeight: typography.body.desktop.line, color: colors.textSecondary }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
