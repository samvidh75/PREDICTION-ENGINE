interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: number
}

export default function Modal({ open, onClose, title, children, width = 480 }: ModalProps) {
  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          width: '100%', maxWidth: width,
          maxHeight: '85vh', overflowY: 'auto',
          padding: '28px 28px 24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.24), 0 0 0 1px rgba(0,0,0,0.06)',
          position: 'relative',
          animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 28, height: 28, borderRadius: '50%',
            border: 'none', background: '#F5F5F5',
            color: '#888', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          ✕
        </button>

        {title && (
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A',
                       letterSpacing: '-0.4px', marginBottom: 6,
                       paddingRight: 32 }}>
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  )
}
