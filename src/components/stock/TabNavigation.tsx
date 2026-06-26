import { useState } from 'react';

const TABS = ['Prices', 'Chart', 'Deliveries', 'Updates'];

interface TabNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function TabNavigation({ activeTab: externalTab, onTabChange }: TabNavigationProps) {
  const [internalTab, setInternalTab] = useState(TABS[0]);
  const active = externalTab ?? internalTab;

  const handleChange = (tab: string) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid #E5E5E5',
      background: '#FFFFFF',
      padding: '0 20px',
    }}>
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => handleChange(tab)}
          style={{
            padding: '12px 16px',
            border: 'none',
            borderBottom: active === tab ? '2px solid #1A56DB' : '2px solid transparent',
            background: 'none',
            color: active === tab ? '#1A56DB' : '#666',
            fontSize: 13,
            fontWeight: active === tab ? 700 : 600,
            cursor: 'pointer',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
