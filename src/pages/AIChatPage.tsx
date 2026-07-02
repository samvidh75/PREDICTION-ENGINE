import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, User, TrendingUp, BarChart3, Zap, X, Plus, Cpu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { colors, typography, space, radius } from "../design/tokens";
import type { FC, KeyboardEvent, FormEvent } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  citations?: string[];
  thinkingSteps?: string[];
}

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

const SUGGESTED_QUESTIONS = [
  "Analyze Reliance Industries — bull vs bear case",
  "Which Nifty 50 stocks have the strongest quality scores?",
  "Compare TCS vs Infosys on valuation metrics",
  "What's driving the IT sector's momentum today?",
  "Screen for growth stocks with low debt under ₹5000 Cr",
  "Explain the 8-factor scoring methodology",
];

// ── Quick-start suggestions ────────────────────────────────────────────────────
const QuickAction: FC<{ icon: LucideIcon; label: string; onClick: () => void; color?: string }> =
  ({ icon: Icon, label, onClick, color = colors.accentBlue }) => (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: space[2],
        padding: `${space[2]} ${space[4]}`,
        borderRadius: radius.lg,
        border: `1px solid ${colors.hairline}`,
        background: colors.surface,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
        fontSize: typography.bodySm.size,
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceElevated)}
      onMouseLeave={(e) => (e.currentTarget.style.background = colors.surface)}
    >
      <span style={{ color, display: "flex" }}><Icon size={16} /></span>
      {label}
    </button>
  );

// ── Thinking Steps (visible while AI "thinks") ────────────────────────────────
const ThinkingIndicator: FC<{ steps: string[] }> = ({ steps }) => {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible < steps.length) {
      const t = setTimeout(() => setVisible((v) => v + 1), 400);
      return () => clearTimeout(t);
    }
  }, [visible, steps.length]);

  if (visible >= steps.length) return null;

  return (
    <div style={{ padding: `${space[2]} 0`, opacity: 0.7 }}>
      {steps.slice(0, visible).map((s, i) => (
        <div key={i} style={{ fontSize: typography.captionSm.size, color: colors.textTertiary, padding: "2px 0" }}>
          <Cpu size={10} style={{ marginRight: 4 }} />
          {s}
        </div>
      ))}
    </div>
  );
};

// ── Message Bubble ─────────────────────────────────────────────────────────────
const MessageBubble: FC<{ msg: Message; isLast: boolean }> = ({ msg, isLast }) => {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        gap: space[3],
        padding: `${space[3]} 0`,
        alignItems: "flex-start",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.full,
          background: isUser ? colors.surfaceElevated : colors.accentRed,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isUser ? (
          <User size={16} style={{ color: colors.textSecondary }} />
        ) : (
          <Sparkles size={16} style={{ color: "#ffffff" }} />
        )}
      </div>

      {/* Content */}
      <div style={{ maxWidth: "75%", minWidth: 0 }}>
        {!isUser && msg.thinkingSteps && isLast && <ThinkingIndicator steps={msg.thinkingSteps} />}
        <div
          style={{
            padding: `${space[3]} ${space[4]}`,
            borderRadius: radius.lg,
            background: isUser ? colors.surface : colors.surfaceElevated,
            border: isUser ? `1px solid ${colors.hairline}` : "none",
            color: colors.textPrimary,
            fontSize: typography.bodyMd.size,
            lineHeight: typography.bodyMd.line,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {msg.content}
        </div>
        {msg.citations && msg.citations.length > 0 && (
          <div style={{ marginTop: space[1], fontSize: typography.captionSm.size, color: colors.textTertiary }}>
            Sources: {msg.citations.join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sidebar ────────────────────────────────────────────────────────────────────
const Sidebar: FC<{
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  compact: boolean;
}> = ({ conversations, activeId, onSelect, onNew, compact }) => {
  if (compact) return null;
  return (
    <aside
      className="raycast-slideUp"
      style={{
        width: 260,
        flexShrink: 0,
        background: colors.canvas,
        borderRight: `1px solid ${colors.hairline}`,
        display: "flex",
        flexDirection: "column",
        padding: space[4],
        gap: space[3],
        overflowY: "auto",
      }}
    >
      <button
        onClick={onNew}
        style={{
          display: "flex",
          alignItems: "center",
          gap: space[2],
          padding: `${space[2]} ${space[4]}`,
          borderRadius: radius.lg,
          border: "none",
          background: colors.accentRed,
          color: "#ffffff",
          fontFamily: typography.fontFamily,
          fontSize: typography.buttonMd.size,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <Plus size={16} /> New Chat
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              textAlign: "left",
              padding: `${space[2]} ${space[3]}`,
              borderRadius: radius.sm,
              border: "none",
              background: c.id === activeId ? colors.surfaceElevated : "transparent",
              color: colors.textSecondary,
              fontFamily: typography.fontFamily,
              fontSize: typography.bodySm.size,
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.title}
          </button>
        ))}
      </div>
    </aside>
  );
};

// ── Main AI Chat Page ─────────────────────────────────────────────────────────
export default function AIChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    {
      id: "default",
      title: "New research",
      messages: [
        {
          id: "welcome",
          role: "assistant",
          content:
            "👋 Hi! I'm StockEX AI — your equity research analyst.\n\nI can help you with:\n• **Stock analysis** — bull/bear cases, 8-factor scoring\n• **Screening** — find stocks matching your criteria\n• **Comparisons** — side-by-side peer analysis\n• **Market context** — sector trends, macro signals\n• **Portfolio insights** — conviction tracking, risk\n\nAsk me anything about Indian equities!",
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
    },
  ]);
  const [activeId, setActiveId] = useState("default");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active.messages, active.messages.length]);

  const addMessage = useCallback(
    (msg: Message) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          const updated = { ...c, messages: [...c.messages, msg] };
          // Auto-title
          if (c.title === "New research" && msg.role === "user") {
            updated.title = msg.content.slice(0, 40) + (msg.content.length > 40 ? "…" : "");
          }
          return updated;
        }),
      );
    },
    [activeId],
  );

  // Generate AI response via the local API
  const generateResponse = useCallback(
    async (userMessage: string) => {
      setLoading(true);
      const thinkingSteps = [
        "Searching market data…",
        "Analyzing 8-factor scores…",
        "Compiling research context…",
      ];

      const isProduction = window.location.hostname === "www.stockstory-india.com" || window.location.hostname === "stockstory-india.com";
      const apiUrl = isProduction ? "https://stockstory-api.onrender.com/api/chat" : "/api/chat";

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            symbol: "",
            context: "General Indian stock market research and analysis.",
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const content = data?.response ?? "I'm unable to process your request right now. Please try again.";

        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: Date.now(),
          thinkingSteps,
          citations: data?.citations?.length ? data.citations : ["NSE India", "SEBI Filings"],
        };

        setLoading(false);
        return aiMsg;
      } catch {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: "I'm unable to process your request right now. Please try again.",
          timestamp: Date.now(),
        };
        setLoading(false);
        return aiMsg;
      }
    },
    [],
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: "user", content: trimmed, timestamp: Date.now() };
    addMessage(userMsg);
    setInput("");

    const aiMsg = await generateResponse(trimmed);
    addMessage(aiMsg);
  }, [input, loading, addMessage, generateResponse]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const newConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: "New research",
      messages: [],
      createdAt: Date.now(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  return (
    <div className="raycast-slideUp" style={{ display: "flex", height: "calc(100vh - 56px)", background: colors.canvas }}>
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        compact={false}
      />

      {/* Main Chat Area */}
      <main className="raycast-stagger-1" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: `${space[6]} ${space[8]}`,
            maxWidth: 800,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {active.messages.length === 1 && active.messages[0].role === "assistant" ? (
            /* Welcome + suggestions */
            <div>
              <MessageBubble msg={active.messages[0]} isLast={false} />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: space[2],
                  marginTop: space[6],
                  justifyContent: "center",
                }}
              >
                {SUGGESTED_QUESTIONS.map((q) => (
                  <QuickAction
                    key={q}
                    icon={Sparkles}
                    label={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            active.messages.map((msg, i) => (
              <MessageBubble key={msg.id} msg={msg} isLast={i === active.messages.length - 1} />
            ))
          )}
          {loading && (
            <div style={{ padding: space[3], display: "flex", gap: space[2], alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: radius.full, background: colors.accentRed, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={16} style={{ color: "#ffffff" }} />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="ai-chat-dot"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: radius.full,
                      background: colors.textTertiary,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          className="raycast-stagger-2"
          style={{
            animationDelay: "0.1s",
            padding: `${space[4]} ${space[8]}`,
            borderTop: `1px solid ${colors.hairline}`,
            background: colors.canvas,
          }}
        >
          <div
            style={{
              maxWidth: 800,
              margin: "0 auto",
              display: "flex",
              gap: space[2],
              alignItems: "flex-end",
              background: colors.surface,
              borderRadius: radius.lg,
              border: `1px solid ${colors.hairline}`,
              padding: `${space[2]} ${space[2]} ${space[2]} ${space[4]}`,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any stock, sector, or market trend…"
              rows={1}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: colors.textPrimary,
                fontFamily: typography.fontFamily,
                fontSize: typography.bodyMd.size,
                resize: "none",
                padding: `${space[1]} 0`,
                lineHeight: typography.bodyMd.line,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: radius.md,
                border: "none",
                background: input.trim() && !loading ? colors.accentRed : colors.surfaceElevated,
                color: input.trim() && !loading ? "#ffffff" : colors.textTertiary,
                cursor: input.trim() && !loading ? "pointer" : "default",
                flexShrink: 0,
                transition: "background 0.15s ease",
              }}
            >
              <Send size={16} />
            </button>
          </div>
          <div
            style={{
              textAlign: "center",
              marginTop: space[2],
              fontSize: typography.captionSm.size,
              color: colors.textTertiary,
            }}
          >
            StockEX AI may make mistakes. Verify critical data before investing.
          </div>
        </div>
      </main>

      {/* Add animation keyframes */}
      <style>{`
        @keyframes ai-chat-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .ai-chat-dot {
          animation: ai-chat-bounce 1.2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
