import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

/**
 * Shared chrome for Master feature pages that are not the Command Center.
 * Keeping one shell means every page has the same way back, the same master
 * badge, and the same scroll behaviour.
 */
export default function FeatureShell({ title, subtitle, children }) {
  const navigate = useNavigate();
  return (
    <div className="v2-root v2-feature-root">
      <header className="v2-feature-top">
        <button type="button" className="v2-feature-back" onClick={() => navigate('/command')}>
          <ArrowLeft size={14} /> Command Center
        </button>
        <div className="v2-feature-title">
          <b>{title}</b>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <span className="v2-feature-badge"><ShieldCheck size={12} /> MASTER</span>
      </header>
      <main className="v2-feature-body">{children}</main>
    </div>
  );
}
