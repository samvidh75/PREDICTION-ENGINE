import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Sparkles, User, X } from "lucide-react";
import { animation, colors, radius, space, typography } from "../design/tokens";

type DrawerMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const STORAGE_KEY = "stockex-floating-ai";

const STARTER_PROMPTS = [
  "Summarize what I should watch in my current list",
  "Which tracked stocks need deeper review first?",
  "What changed most across my watchlist?",
];

async function callChatApi(message: string): Promise<string> {
  const isProduction = window.location.hostname === "www.stockstory-india.com" || window.location.hostname === "stockstory-india.com";
  const apiUrl = isProduction ? "https://stockstory-api.onrender.com/api/chat" : "/api/chat";

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        symbol: "",
        context: "StockEX research assistant — watchlist tracking, thesis review, and equity research.",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data?.response ?? "I can help you break this down into thesis, risk, what changed, and what to watch next. Ask about any stock, compare setup, or watchlist review angle.";
  } catch {
    return "I can help you break this down into thesis, risk, what changed, and what to watch next. Ask about any stock, compare setup, or watchlist review angle.";
  }
}

export function FloatingAiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<DrawerMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as DrawerMessage[]) : [];
    } catch {
      return [];
    }
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage failures and keep chat ephemeral in memory.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [open, messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: DrawerMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const reply = await callChatApi(trimmed);

    const assistantMessage: DrawerMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: reply,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setLoading(false);
  }, [loading]);

  const emptyState = useMemo(() => messages.length === 0, [messages.length]);

  return (
    <>
      <button
        type="button"
        aria-label="Open AI chat"
        onClick={() => setOpen(true)}
        style={fabStyle}
      >
        <MessageSquare size={18} strokeWidth={1.5} />
      </button>

      {open && (
        <div style={overlayStyle}>
          <aside ref={containerRef} style={drawerStyle}>
            <div style={drawerHeaderStyle}>
              <div style={{ display: "grid", gap: 2 }}>
                <span style={drawerTitleStyle}>StockEx AI</span>
                <span style={drawerSubtleStyle}>Ask about your watchlist, research flow, or what to review next.</span>
              </div>
              <button type="button" aria-label="Close AI chat" onClick={() => setOpen(false)} style={closeButtonStyle}>
                <X size={16} />
              </button>
            </div>

            <div ref={scrollerRef} style={messageAreaStyle}>
              {emptyState ? (
                <div style={{ display: "grid", gap: space[3] }}>
                  <div style={welcomeCardStyle}>
                    <div style={welcomeIconStyle}>
                      <Sparkles size={16} strokeWidth={1.8} />
                    </div>
                    <div style={{ display: "grid", gap: space[2] }}>
                      <strong style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary }}>
                        Ask what matters now
                      </strong>
                      <p style={{ margin: 0, color: colors.textSecondary, fontSize: 13, lineHeight: 1.55 }}>
                        Use this side chat to think through tracked names, compare ideas, or decide what deserves a closer review.
                      </p>
                    </div>
                  </div>

                  <div style={starterGridStyle}>
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        style={starterButtonStyle}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: space[3] }}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        display: "flex",
                        justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          ...messageBubbleStyle,
                          ...(message.role === "user" ? userBubbleStyle : assistantBubbleStyle),
                        }}
                      >
                        <div style={messageMetaStyle}>
                          {message.role === "user" ? <User size={12} /> : <Sparkles size={12} />}
                          <span>{message.role === "user" ? "You" : "StockEx AI"}</span>
                        </div>
                        <p style={messageTextStyle}>{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div style={{ ...messageBubbleStyle, ...assistantBubbleStyle }}>
                      <div style={messageMetaStyle}>
                        <Sparkles size={12} />
                        <span>StockEx AI</span>
                      </div>
                      <p style={messageTextStyle}>Thinking through that now…</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={composerShellStyle}>
              <div style={composerStyle}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  placeholder="Ask about your watchlist or the next stock to review…"
                  rows={1}
                  style={textareaStyle}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || loading}
                  style={{
                    ...sendButtonStyle,
                    opacity: !input.trim() || loading ? 0.45 : 1,
                  }}
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

const fabStyle: CSSProperties = {
  position: "fixed",
  right: "24px",
  bottom: "96px",
  zIndex: 99,
  width: 48,
  height: 48,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 18,
  border: `1px solid ${colors.hairlineSoft}`,
  background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
  color: colors.textPrimary,
  boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 18px 40px rgba(0,0,0,0.28)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  cursor: "pointer",
  transition: `transform ${animation.standard}, border-color ${animation.standard}, background ${animation.standard}`,
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  background: "rgba(0,0,0,0.24)",
};

const drawerStyle: CSSProperties = {
  position: "absolute",
  top: "max(18px, env(safe-area-inset-top, 0px))",
  right: "max(18px, env(safe-area-inset-right, 0px))",
  bottom: "max(18px, env(safe-area-inset-bottom, 0px))",
  width: "min(420px, calc(100vw - 24px))",
  borderRadius: 24,
  border: `1px solid ${colors.hairlineSoft}`,
  background: "linear-gradient(180deg, rgba(18,18,18,0.92) 0%, rgba(8,8,8,0.96) 100%)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 36px 100px rgba(0,0,0,0.45)",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  overflow: "hidden",
};

const drawerHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: space[3],
  padding: `${space[4]} ${space[4]} ${space[3]}`,
  borderBottom: `1px solid ${colors.hairlineSoft}`,
};

const drawerTitleStyle: CSSProperties = {
  color: colors.textPrimary,
  fontSize: 16,
  fontWeight: 650,
  lineHeight: 1.2,
};

const drawerSubtleStyle: CSSProperties = {
  color: colors.textSecondary,
  fontSize: 12,
  lineHeight: 1.45,
};

const closeButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  border: `1px solid ${colors.hairlineSoft}`,
  background: "rgba(255,255,255,0.04)",
  color: colors.textSecondary,
  cursor: "pointer",
  flexShrink: 0,
};

const messageAreaStyle: CSSProperties = {
  overflowY: "auto",
  padding: `${space[4]} ${space[4]} ${space[3]}`,
};

const welcomeCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: space[3],
  padding: space[4],
  borderRadius: 20,
  border: `1px solid ${colors.hairlineSoft}`,
  background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
};

const welcomeIconStyle: CSSProperties = {
  width: 34,
  height: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  border: `1px solid ${colors.hairlineSoft}`,
  background: "rgba(255,255,255,0.05)",
  color: colors.textPrimary,
};

const starterGridStyle: CSSProperties = {
  display: "grid",
  gap: space[2],
};

const starterButtonStyle: CSSProperties = {
  padding: `${space[3]} ${space[4]}`,
  borderRadius: 16,
  border: `1px solid ${colors.hairlineSoft}`,
  background: "rgba(255,255,255,0.03)",
  color: colors.textPrimary,
  fontSize: 13,
  lineHeight: 1.45,
  textAlign: "left",
  cursor: "pointer",
};

const messageBubbleStyle: CSSProperties = {
  maxWidth: "88%",
  display: "grid",
  gap: space[2],
  padding: `${space[3]} ${space[4]}`,
  borderRadius: 18,
};

const assistantBubbleStyle: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${colors.hairlineSoft}`,
};

const userBubbleStyle: CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,107,107,0.15) 0%, rgba(255,107,107,0.08) 100%)",
  border: `1px solid ${colors.accentRedSoft}`,
};

const messageMetaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: colors.textTertiary,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const messageTextStyle: CSSProperties = {
  margin: 0,
  color: colors.textPrimary,
  fontSize: 14,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
};

const composerShellStyle: CSSProperties = {
  padding: `${space[3]} ${space[4]} ${space[4]}`,
  borderTop: `1px solid ${colors.hairlineSoft}`,
};

const composerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: space[2],
  padding: `${space[2]} ${space[2]} ${space[2]} ${space[3]}`,
  borderRadius: 18,
  border: `1px solid ${colors.hairlineSoft}`,
  background: "rgba(255,255,255,0.03)",
};

const textareaStyle: CSSProperties = {
  flex: 1,
  minHeight: 22,
  maxHeight: 120,
  resize: "none",
  border: "none",
  outline: "none",
  background: "transparent",
  color: colors.textPrimary,
  fontFamily: typography.fontFamily,
  fontSize: 14,
  lineHeight: 1.5,
  padding: `${space[1]} 0`,
};

const sendButtonStyle: CSSProperties = {
  width: 38,
  height: 38,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 14,
  border: `1px solid ${colors.hairlineSoft}`,
  background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
  color: colors.textPrimary,
  cursor: "pointer",
  flexShrink: 0,
};
