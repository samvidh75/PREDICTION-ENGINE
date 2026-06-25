import { useState } from "react"

interface ProUpgradeModalProps {
  open: boolean
  onClose: () => void
  location?: string
}

export default function ProUpgradeModal({ open, onClose, location = 'stock' }: ProUpgradeModalProps) {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    try {
      await fetch('/api/leads/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: location }),
      })
    } catch {
      // silently fail — lead capture is non-critical
    }
    setSubmitted(true)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
        padding: '2rem', maxWidth: 420, width: '100%',
        boxShadow: 'var(--shadow-modal)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          StockStory Pro
        </div>
        <div style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, marginBottom: 16 }}>
          Coming Soon
        </div>

        {submitted ? (
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Thanks! You're on the early-access list. We'll reach out when Pro launches.
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Get early access: enter your email for founding member pricing.
            </p>

            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16, margin: '0 0 20px' }}>
              <li>Unlimited scanner results</li>
              <li>Fair value (DCF) estimates</li>
              <li>Thesis alerts when a tracked stock changes conviction</li>
              <li>Portfolio monitor</li>
            </ul>

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  flex: 1, height: 44, padding: '0 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', fontSize: 14, outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <button type="submit" style={{
                height: 44, padding: '0 20px', borderRadius: 'var(--radius-md)',
                border: 'none', background: 'var(--brand)', color: '#FFF',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                Get early access
              </button>
            </form>
          </>
        )}

        <button onClick={onClose} style={{
          display: 'block', marginTop: 16, background: 'none', border: 'none',
          color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center',
        }}>
          No thanks, continue with free version
        </button>
      </div>
    </div>
  )
}
