import Modal from "../components/ui/Modal";
import { BROKER_PARTNERS } from "./trade/brokers";

export default function BrokerModal({ symbol, price, onClose }: { symbol: string; price: number | null; onClose: () => void }) {
  return (
    <Modal open={true} onClose={onClose} title="Choose your broker" width={520}>
      <p style={{ fontSize: 13, color: 'var(--text-500)', marginBottom: 20, lineHeight: 1.6 }}>
        Select your broker to invest in <strong style={{ color: 'var(--text-900)' }}>
        {symbol}</strong>. You'll be redirected to their platform to complete
        your order.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {BROKER_PARTNERS.map(b => (
          <a key={b.name} href={b.referralUrl} target="_blank" rel="noopener noreferrer"
             style={{
               display: 'flex', alignItems: 'center', gap: 12,
               padding: '16px 16px', borderRadius: 12,
               border: '1.5px solid var(--border)', textDecoration: 'none',
               transition: 'border-color 0.15s, background 0.15s',
               cursor: 'pointer',
             }}
             onMouseEnter={e => {
               e.currentTarget.style.borderColor = 'var(--green-text)'
               e.currentTarget.style.background = 'var(--green-tint)'
             }}
             onMouseLeave={e => {
               e.currentTarget.style.borderColor = 'var(--border)'
               e.currentTarget.style.background = 'transparent'
             }}>
            <div style={{ width: 36, height: 36, borderRadius: 8,
                          background: b.color + '15', border: '1px solid ' + b.color + '30',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 13,
                          fontWeight: 700, color: b.color, flexShrink: 0 }}>
              {b.logo}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-900)' }}>
                {b.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-500)', marginTop: 4 }}>
                {b.description}
              </div>
            </div>
          </a>
        ))}
      </div>

      <p style={{ fontSize: 10, color: 'var(--text-300)', marginTop: 20, lineHeight: 1.5,
                   borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        StockStory India is not a broker and does not execute trades.
        Clicking a broker opens their website in a new tab.
        This is not investment advice.
      </p>
    </Modal>
  )
}
