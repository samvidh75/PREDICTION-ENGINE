import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { icon: 'ℹ️', label: 'Info', path: '#info' },
  { icon: '📋', label: 'Notes', path: '#notes' },
  { icon: '👥', label: 'Club', path: '#club' },
  { icon: '💰', label: 'Invest', path: '#invest' },
  { icon: '⋯', label: 'Menu', path: '#menu' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      background: '#FFFFFF',
      borderTop: '1px solid #E5E5E5',
      padding: '10px 0',
      zIndex: 100,
    }}>
      {TABS.map(tab => {
        const active = location.hash === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: active ? '#1A56DB' : '#999',
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
