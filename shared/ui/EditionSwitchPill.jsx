import React from 'react';
import { Laptop, Server } from 'lucide-react';

export default function EditionSwitchPill({ isMaster = false, onRequestSwitch }) {
  return (
    <div
      role="group"
      aria-label="Workspace edition switcher"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 3,
        borderRadius: 999,
        background: 'rgba(15, 23, 42, 0.06)',
        border: '1px solid rgba(15, 23, 42, 0.1)',
        gap: 2,
        flexShrink: 0
      }}
    >
      <button
        type="button"
        onClick={() => onRequestSwitch?.('client')}
        title="City & Ward Workspace — Learn more & switch"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.02em',
          transition: 'all 160ms ease',
          background: !isMaster ? '#ffffff' : 'transparent',
          color: !isMaster ? '#047857' : '#64748b',
          boxShadow: !isMaster ? '0 2px 6px rgba(15,23,42,0.1)' : 'none'
        }}
      >
        <Laptop size={12} />
        <span>Client</span>
      </button>
      <button
        type="button"
        onClick={() => onRequestSwitch?.('master')}
        title="District & State Fleet — Learn more & switch"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.02em',
          transition: 'all 160ms ease',
          background: isMaster ? '#0f172a' : 'transparent',
          color: isMaster ? '#fbbf24' : '#64748b',
          boxShadow: isMaster ? '0 2px 6px rgba(15,23,42,0.18)' : 'none'
        }}
      >
        <Server size={12} />
        <span>Master</span>
      </button>
    </div>
  );
}
