import Modal from "../components/ui/Modal";
import { BROKER_PARTNERS } from "./trade/brokers";

export default function BrokerModal({ symbol, price, onClose }: { symbol: string; price: number | null; onClose: () => void }) {
  return (
    <Modal open={true} onClose={onClose} title="Choose your broker" width={520}>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.6 }}>
        Select your broker to invest in <strong style={{ color: '#0A0A0A' }}>
        {symbol}</strong>. You'll be redirected to their platform to complete
        your order.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {BROKER_PARTNERS.map(b => (
          <a key={b.name} href={b.referralUrl} target="_blank" rel="noopener noreferrer"
             style={{
               display: 'flex', alignItems: 'center', gap: 12,
               padding: '14px 16px', borderRadius: 12,
               border: '1.5px solid #E8E8E8', textDecoration: 'none',
               transition: 'border-color 0.15s, background 0.15s',
               cursor: 'pointer',
             }}
             onMouseEnter={e => {
               e.currentTarget.style.borderColor = '#1a7f4b'
               e.currentTarget.style.background = '#FAFFF8'
             }}
             onMouseLeave={e => {
               e.currentTarget.style.borderColor = '#E8E8E8'
               e.currentTarget.style.background = '#fff'
             }}>
            <div style={{ width: 36, height: 36, borderRadius: 8,
                          background: b.color + '15', border: '1px solid ' + b.color + '30',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 13,
                          fontWeight: 700, color: b.color, flexShrink: 0 }}>
              {b.logo}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>
                {b.name}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                {b.description}
              </div>
            </div>
          </a>
        ))}
      </div>

      <p style={{ fontSize: 10, color: '#BBB', marginTop: 20, lineHeight: 1.5,
                   borderTop: '1px solid #F5F5F5', paddingTop: 14 }}>
        StockStory India is not a broker and does not execute trades.
        Clicking a broker opens their website in a new tab.
        This is not investment advice.
      </p>
    </Modal>
  )
}
