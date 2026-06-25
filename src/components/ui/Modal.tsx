interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: number
}

export default function Modal({ open, onClose, title, children, width = 520 }: ModalProps) {
  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r-xl)',
          width: '100%', maxWidth: width,
          maxHeight: '85vh', overflowY: 'auto',
          padding: 'var(--sp-8)',
          boxShadow: 'var(--sh-modal)',
          position: 'relative',
          animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 28, height: 28, borderRadius: '50%',
            border: 'none', background: 'var(--chip)',
            color: 'var(--text-300)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          ✕
        </button>

        {title && (
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-900)',
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
