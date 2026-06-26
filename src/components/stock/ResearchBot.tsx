import { useState } from "react";

interface Message {
  role: "user" | "bot";
  content: string;
  isPro?: boolean;
}

interface ResearchBotProps {
  symbol: string;
  isPro: boolean;
}

export default function ResearchBot({ symbol, isPro }: ResearchBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: `Hi! I'm ResearchBot. Ask me anything about ${symbol}.${isPro ? " Pro members get deeper analysis!" : " (Free tier: basic questions only)"}`
    }
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleAsk = async (question: string) => {
    if (!question.trim()) return;
    setMessages(p => [...p, { role: "user", content: question }]);
    setInput("");

    try {
      const res = await fetch("/api/research/ask-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, question, isPro }),
      });
      const data = await res.json();
      setMessages(p => [...p, { role: "bot", content: data.answer, isPro }]);
    } catch {
      setMessages(p => [...p, {
        role: "bot",
        content: "Sorry, I'm having trouble connecting. Please try again.",
        isPro,
      }]);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed", bottom: 100, right: 24, zIndex: 100,
          width: 60, height: 60, borderRadius: "50%",
          background: "var(--brand)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, boxShadow: "var(--sh-float)",
          transition: "transform 200ms",
          transform: isOpen ? "scale(0.95)" : "scale(1)",
        }}
        aria-label="Open ResearchBot"
      >
        {"\uD83E\uDD16"}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: 172, right: 24, zIndex: 100,
          width: 340, height: 450, background: "var(--page)",
          border: "1px solid var(--border)", borderRadius: 16,
          display: "flex", flexDirection: "column",
          boxShadow: "var(--sh-modal)",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 20 }}>{"\uD83E\uDD16"}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-900)" }}>ResearchBot</div>
              <div style={{ fontSize: 10, color: isPro ? "var(--green-text)" : "var(--text-300)" }}>
                {isPro ? "Pro tier" : "Free tier"}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflow: "auto", padding: 16,
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "var(--brand)" : "var(--chip)",
                  color: m.role === "user" ? "var(--text-inverse)" : "var(--text-900)",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.5,
                  maxWidth: "80%",
                }}
              >
                {m.content}
                {m.role === "bot" && !m.isPro && (
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, color: "var(--text-500)" }}>
                    {"\uD83D\uDCA1"} Pro users see deeper insights
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: 12, borderTop: "1px solid var(--border)",
            display: "flex", gap: 8,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAsk(input); }}
              placeholder={isPro ? "Ask anything..." : "Free: basic questions"}
              style={{
                flex: 1, background: "var(--chip)", color: "var(--text-700)",
                border: "1px solid var(--border)", borderRadius: 8,
                padding: "8px 12px", fontSize: 13, fontFamily: "var(--font)",
                outline: "none",
              }}
            />
            <button
              onClick={() => handleAsk(input)}
              style={{
                width: 36, height: 36, background: "var(--brand)", border: "none",
                borderRadius: 8, cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-inverse)",
              }}
            >
              {"\u2197"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
