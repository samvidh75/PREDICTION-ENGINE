---
name: Stripe-style Components for StockStory
design:
  philosophy: "Minimal, performant, accessible. Focus on clarity over decoration."
  inspiration: "Stripe Billing, Apple Pay, Framer"
buttons:
  primary:
    bg: "var(--brand)"
    color: "#FFFFFF"
    padding: "12px 24px"
    font: "Inter 600, 14px"
    radius: "var(--radius-md)"
    height: "44px"
    states:
      hover: "var(--brand-dark)"
      active: "var(--brand-dark)"
      disabled: "var(--text-muted), 0.4 opacity"
  ghost:
    bg: "transparent"
    color: "var(--text-secondary)"
    border: "1px solid var(--border)"
    padding: "12px 24px"
    font: "Inter 600, 14px"
    states:
      hover: "bg-chip-bg"
      active: "border-brand, color-brand"
  danger:
    bg: "var(--red)"
    color: "#FFFFFF"
    padding: "12px 24px"
    font: "Inter 600, 14px"
    states:
      hover: "opacity 0.9"

modals:
  spacing: "32px"
  padding: "32px"
  radius: "16px"
  backdrop: "rgba(0,0,0,0.4)"
  shadow: "var(--shadow-xl)"
  width: "520px"
  mobile: "full-screen, bottom-sheet style"

inputs:
  padding: "12px 14px"
  font: "Inter 400, 15px"
  radius: "var(--radius-md)"
  border: "1px solid var(--border)"
  states:
    focus: "border 1.5px var(--brand), shadow 0 0 0 3px var(--brand-light)"
    error: "border-color: var(--red)"
    disabled: "bg-chip-bg, cursor not-allowed"

cards:
  padding: "20px 24px"
  radius: "var(--radius-lg)"
  bg: "var(--card-bg)"
  border: "1px solid var(--border)"
  shadow: "var(--shadow-raised)"

paywall:
  styling: "gradient-bg, rounded border, icon + headline + benefits list"
  color: "linear-gradient(135deg, var(--brand-light) 0%, #F9F0FF 100%)"
  border-color: "var(--brand-light)"
  cta-color: "var(--brand)"

alerts:
  info: "bg: var(--brand-light), border: var(--brand), text: var(--brand)"
  success: "bg: var(--green-light), border: var(--green), text: var(--green)"
  warning: "bg: var(--amber-light), border: var(--amber), text: var(--amber)"
  error: "bg: var(--red-light), border: var(--red), text: var(--red)"

transitions:
  default: "0.2s ease"
  fast: "0.12s ease"
  slow: "0.35s ease"
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)"
---
