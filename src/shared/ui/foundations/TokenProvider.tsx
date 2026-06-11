import React from "react";

type TokenCssVars = Record<string, string>;

function mergeVars(...list: Array<TokenCssVars | undefined>): TokenCssVars {
  const out: TokenCssVars = {};
  for (const obj of list) {
    if (!obj) continue;
    for (const [k, v] of Object.entries(obj)) out[k] = v;
  }
  return out;
}

type Props = {
  children: React.ReactNode;
  tokenVars?: TokenCssVars;
  theme?: "light" | "dark";
  density?: "simple" | "pro";
};

/**
 * TokenProvider
 * - Injects OS design-token CSS variables into the component tree via inline style vars.
 * - Keeps “Token authority” in TS tokens.
 *
 * NOTE: We intentionally do NOT remove existing :root variables yet.
 * Migration can be incremental while maintaining visuals.
 */
export default function TokenProvider({ children, tokenVars, theme = "light", density = "simple" }: Props): JSX.Element {
  const vars = tokenVars ?? {};

  return (
    <div
      style={
        {
          minHeight: "100vh",
          ...vars,
        } as React.CSSProperties
      }
      data-ss-theme={theme}
      data-ss-density={density}
      className="ss-app-theme"
    >
      {children}
    </div>
  );
}
