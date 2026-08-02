import React from 'react';
import { typography } from "../design/tokens";

export default function DataSourceBadge({ isStale }: { isStale?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      backgroundColor: '#0D0D0D', border: '1px solid #1A1A1A',
      padding: '6px 12px', borderRadius: '6px',
      fontFamily: typography.fontFamily, fontSize: '10px'
    }}>
      <span style={{
        height: '6px', width: '6px', borderRadius: '50%',
        backgroundColor: isStale ? '#f59e0b' : '#3b82f6'
      }} />
      <span style={{
        color: '#8892b0', textTransform: 'uppercase',
        fontWeight: 'bold', letterSpacing: '0.05em'
      }}>
        {isStale ? "Web Cache Resync Pending" : "Public Web-Mesh Data Link"}
      </span>
    </div>
  );
}
