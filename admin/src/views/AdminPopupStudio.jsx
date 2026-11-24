import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Gift,
  Zap,
  ArrowRight,
  Eye,
  Plus,
  Trash2,
  X,
  Layers,
  MessageSquare,
  Maximize2,
  Palette
} from 'lucide-react';

const POPUP_FORMATS = [
  { id: 'sticky', label: 'Sticky Promo Bar', icon: Sparkles, desc: 'Top/bottom persistent notification strip' },
  { id: 'modal', label: 'Center Modal / Lightbox', icon: Gift, desc: 'High-conversion exit-intent or lead magnet' },
  { id: 'slidein', label: 'Slide-in Notification Pill', icon: Zap, desc: 'Non-disruptive social proof activity ticker' },
  { id: 'widget', label: 'Floating Action Widget', icon: MessageSquare, desc: 'Corner WhatsApp or live call bubble' },
  { id: 'welcomemat', label: 'Fullscreen Welcome Mat', icon: Maximize2, desc: '100% viewport guided onboarding or special alert' }
];

const THEMES = [
  { id: 'emerald', label: '🌿 Emerald Pro', bg: '#022c22', btn: '#10b981', text: '#f1f5f9', badge: '#064e3b' },
  { id: 'ocean', label: '🌊 Ocean Blue', bg: '#082f49', btn: '#0284c7', text: '#f0f9ff', badge: '#0c4a6e' },
  { id: 'sunset', label: '🌅 Sunset Amber', bg: '#451a03', btn: '#f59e0b', text: '#fffbeb', badge: '#78350f' },
  { id: 'indigo', label: '🔮 Royal Indigo', bg: '#1e1b4b', btn: '#6366f1', text: '#eef2ff', badge: '#312e81' },
  { id: 'midnight', label: '🖤 Midnight Dark', bg: '#0f172a', btn: '#10b981', text: '#f8fafc', badge: '#1e293b' },
  { id: 'clean', label: '⚪ Crisp Light', bg: '#ffffff', btn: '#059669', text: '#0f172a', badge: '#ecfdf5' }
];

function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0
      }}
    >
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: enabled ? '#10b981' : '#cbd5e1',
          position: 'relative',
          transition: 'background 0.2s ease',
          boxShadow: enabled ? '0 0 10px rgba(16, 185, 129, 0.4)' : 'none'
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#ffffff',
            position: 'absolute',
            top: 3,
            left: enabled ? 23 : 3,
            transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: enabled ? '#059669' : '#64748b' }}>
        {enabled ? 'ACTIVE (SHOWING)' : 'PAUSED (HIDDEN)'}
      </span>
    </button>
  );
}

function ColorThemePicker({ currentTheme, bgColor, buttonColor, textColor, onChange }) {
  return (
    <div style={{ padding: '14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
        <Palette size={13} color="#059669" />
        <span>Color Theme &amp; Custom Styling</span>
      </div>

      {/* Preset pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {THEMES.map(t => {
          const isSelected = currentTheme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ themePreset: t.id, bgColor: t.bg, buttonColor: t.btn, textColor: t.text, badgeColor: t.badge })}
              style={{
                padding: '5px 12px',
                borderRadius: 7,
                border: isSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                background: t.bg,
                color: t.text,
                fontSize: 11,
                fontWeight: 750,
                cursor: 'pointer',
                boxShadow: isSelected ? '0 0 0 2px #38bdf8' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Custom color hex inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Background</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <input
              type="color"
              value={bgColor?.startsWith('#') && bgColor.length === 7 ? bgColor : '#022c22'}
              onChange={(e) => onChange({ bgColor: e.target.value, themePreset: 'custom' })}
              style={{ width: 26, height: 26, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
            />
            <input
              type="text"
              value={bgColor || ''}
              onChange={(e) => onChange({ bgColor: e.target.value, themePreset: 'custom' })}
              style={{ width: '100%', fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Button Color</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <input
              type="color"
              value={buttonColor?.startsWith('#') && buttonColor.length === 7 ? buttonColor : '#10b981'}
              onChange={(e) => onChange({ buttonColor: e.target.value, themePreset: 'custom' })}
              style={{ width: 26, height: 26, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
            />
            <input
              type="text"
              value={buttonColor || ''}
              onChange={(e) => onChange({ buttonColor: e.target.value, themePreset: 'custom' })}
              style={{ width: '100%', fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Text Color</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <input
              type="color"
              value={textColor?.startsWith('#') && textColor.length === 7 ? textColor : '#f1f5f9'}
              onChange={(e) => onChange({ textColor: e.target.value, themePreset: 'custom' })}
              style={{ width: 26, height: 26, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
            />
            <input
              type="text"
              value={textColor || ''}
              onChange={(e) => onChange({ textColor: e.target.value, themePreset: 'custom' })}
              style={{ width: '100%', fontSize: 11, padding: '3px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPopupStudio() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedFormat, setSelectedFormat] = useState('sticky'); // 'sticky' | 'exit' | 'social' | customId
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newPopup, setNewPopup] = useState({
    name: '',
    format: 'widget',
    title: '',
    message: '',
    badgeText: 'ONLINE NOW',
    ctaLabel: 'Contact Now',
    ctaUrl: '/login',
    triggerType: 'entry',
    delaySeconds: 3,
    enabled: true,
    themePreset: 'emerald',
    bgColor: '#ffffff',
    textColor: '#0f172a',
    buttonColor: '#059669',
    badgeColor: '#ecfdf5'
  });

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/popups');
      const json = await res.json();
      if (json.success && json.popups) {
        setConfig(json.popups);
      }
    } catch (e) {
      toast.error('Failed to load popup configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/popups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('All Popups, Colors & Banners published live!', {
          duration: 3500,
          icon: '🚀'
        });
      } else {
        toast.error(json.error || 'Failed to update popups');
      }
    } catch (e) {
      toast.error('Network error updating popups');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewPopup = async (e) => {
    e.preventDefault();
    if (!newPopup.name.trim() || !newPopup.title.trim()) {
      return toast.error('Popup Name and Title are required');
    }

    try {
      const res = await fetch('/api/admin/popups/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPopup)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Designed new popup "${newPopup.name}"!`);
        setConfig(json.popups);
        setShowCreateModal(false);
        const lastCreated = json.popups.customPopups[json.popups.customPopups.length - 1];
        if (lastCreated) setSelectedFormat(lastCreated.id);
        setNewPopup({
          name: '',
          format: 'widget',
          title: '',
          message: '',
          badgeText: 'ONLINE NOW',
          ctaLabel: 'Contact Now',
          ctaUrl: '/login',
          triggerType: 'entry',
          delaySeconds: 3,
          enabled: true,
          themePreset: 'emerald',
          bgColor: '#ffffff',
          textColor: '#0f172a',
          buttonColor: '#059669',
          badgeColor: '#ecfdf5'
        });
      }
    } catch (e) {
      toast.error('Failed to create popup');
    }
  };

  const handleDeleteCustom = async (id, name) => {
    if (!window.confirm(`Delete popup "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/popups/custom/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(`Deleted "${name}"`);
        setConfig(json.popups);
        setSelectedFormat('sticky');
      }
    } catch (e) {
      toast.error('Failed to delete popup');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all popup banners and copy to original factory defaults?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/popups/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setConfig(json.popups);
        toast.success('Reset to factory defaults');
      }
    } catch (e) {
      toast.error('Failed to reset popups');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b', fontWeight: 650 }}>
        Loading Multi-Format Popup Studio...
      </div>
    );
  }

  const sticky = config.stickyPromoBar || {};
  const exitModal = config.exitIntentModal || {};
  const social = config.socialProofSlideIn || {};
  const customPopups = config.customPopups || [];

  const currentCustom = customPopups.find(p => p.id === selectedFormat);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
            <Sliders size={12} />
            <span>POPUP &amp; ANNOUNCEMENT STUDIO · WITH COLOR CUSTOMIZER</span>
          </div>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 26, fontWeight: 850, margin: 0, color: '#0f172a' }}>
            Popup &amp; Banner Studio
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
            Turn popups on or off with big toggles, customize theme colors, edit copy, and preview live in real-time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={14} />
            <span>Design New Popup</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
            }}
          >
            <Save size={14} />
            <span>{saving ? 'Publishing...' : 'Publish Live Updates'}</span>
          </button>
        </div>
      </div>

      {/* Tabs / Format Switcher */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px', background: '#f1f5f9', borderRadius: 10 }}>
        <button
          type="button"
          onClick={() => setSelectedFormat('sticky')}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: selectedFormat === 'sticky' ? '1.5px solid #059669' : '1px solid #e2e8f0',
            background: selectedFormat === 'sticky' ? '#ecfdf5' : '#ffffff',
            color: selectedFormat === 'sticky' ? '#047857' : '#64748b',
            fontSize: 12,
            fontWeight: selectedFormat === 'sticky' ? 800 : 650,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Sparkles size={13} />
          <span>Sticky Value Bar ({sticky.enabled ? 'ON' : 'OFF'})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFormat('exit')}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: selectedFormat === 'exit' ? '1.5px solid #059669' : '1px solid #e2e8f0',
            background: selectedFormat === 'exit' ? '#ecfdf5' : '#ffffff',
            color: selectedFormat === 'exit' ? '#047857' : '#64748b',
            fontSize: 12,
            fontWeight: selectedFormat === 'exit' ? 800 : 650,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Gift size={13} />
          <span>Exit Magnet Modal ({exitModal.enabled ? 'ON' : 'OFF'})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedFormat('social')}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: selectedFormat === 'social' ? '1.5px solid #059669' : '1px solid #e2e8f0',
            background: selectedFormat === 'social' ? '#ecfdf5' : '#ffffff',
            color: selectedFormat === 'social' ? '#047857' : '#64748b',
            fontSize: 12,
            fontWeight: selectedFormat === 'social' ? 800 : 650,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Zap size={13} />
          <span>Social Proof Slide-in ({social.enabled ? 'ON' : 'OFF'})</span>
        </button>

        {/* Custom Popups Tabs */}
        {customPopups.map((cp) => (
          <button
            key={cp.id}
            type="button"
            onClick={() => setSelectedFormat(cp.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: selectedFormat === cp.id ? '1.5px solid #0891b2' : '1px solid #e2e8f0',
              background: selectedFormat === cp.id ? '#ecfeff' : '#ffffff',
              color: selectedFormat === cp.id ? '#0891b2' : '#64748b',
              fontSize: 12,
              fontWeight: selectedFormat === cp.id ? 800 : 650,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <MessageSquare size={12} />
            <span>{cp.name} ({cp.enabled ? 'ON' : 'OFF'})</span>
          </button>
        ))}
      </div>

      {/* Editor & Live Preview 2-Column */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* Left: Editor Form */}
        <div className="admin-card" style={{ padding: 22 }}>
          {selectedFormat === 'sticky' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    Sticky Value Announcement Bar
                  </h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Top header announcement banner</span>
                </div>
                <ToggleSwitch
                  enabled={sticky.enabled}
                  onChange={(val) => setConfig({
                    ...config,
                    stickyPromoBar: { ...sticky, enabled: val }
                  })}
                />
              </div>

              {/* Color Controls */}
              <ColorThemePicker
                currentTheme={sticky.themePreset || 'emerald'}
                bgColor={sticky.bgColor || '#022c22'}
                buttonColor={sticky.buttonColor || '#10b981'}
                textColor={sticky.textColor || '#f1f5f9'}
                onChange={(updates) => setConfig({
                  ...config,
                  stickyPromoBar: { ...sticky, ...updates }
                })}
              />

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Live Badge Text
                </label>
                <input
                  type="text"
                  value={sticky.badgeText || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    stickyPromoBar: { ...sticky, badgeText: e.target.value }
                  })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Message Copy
                </label>
                <input
                  type="text"
                  value={sticky.text || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    stickyPromoBar: { ...sticky, text: e.target.value }
                  })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={sticky.actionText || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      stickyPromoBar: { ...sticky, actionText: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Cooldown Days
                  </label>
                  <input
                    type="number"
                    value={sticky.cooldownDays || 7}
                    onChange={(e) => setConfig({
                      ...config,
                      stickyPromoBar: { ...sticky, cooldownDays: Number(e.target.value) || 7 }
                    })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
              </div>
            </div>
          )}

          {selectedFormat === 'exit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    Exit-Intent Lead Magnet Modal
                  </h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Triggers when user moves cursor to exit</span>
                </div>
                <ToggleSwitch
                  enabled={exitModal.enabled}
                  onChange={(val) => setConfig({
                    ...config,
                    exitIntentModal: { ...exitModal, enabled: val }
                  })}
                />
              </div>

              {/* Color Controls */}
              <ColorThemePicker
                currentTheme={exitModal.themePreset || 'emerald'}
                bgColor={exitModal.bgColor || '#ffffff'}
                buttonColor={exitModal.buttonColor || '#059669'}
                textColor={exitModal.textColor || '#0f172a'}
                onChange={(updates) => setConfig({
                  ...config,
                  exitIntentModal: { ...exitModal, ...updates }
                })}
              />

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Headline Title
                </label>
                <input
                  type="text"
                  value={exitModal.title || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    exitIntentModal: { ...exitModal, title: e.target.value }
                  })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Subtitle
                </label>
                <textarea
                  rows={2}
                  value={exitModal.subtitle || ''}
                  onChange={(e) => setConfig({
                    ...config,
                    exitIntentModal: { ...exitModal, subtitle: e.target.value }
                  })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Download Button Text
                  </label>
                  <input
                    type="text"
                    value={exitModal.downloadButtonText || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      exitIntentModal: { ...exitModal, downloadButtonText: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Secondary Action Button
                  </label>
                  <input
                    type="text"
                    value={exitModal.scanCityButtonText || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      exitIntentModal: { ...exitModal, scanCityButtonText: e.target.value }
                    })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
              </div>
            </div>
          )}

          {selectedFormat === 'social' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    Live Extraction Social Proof Slide-in
                  </h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Non-disruptive corner notifications</span>
                </div>
                <ToggleSwitch
                  enabled={social.enabled}
                  onChange={(val) => setConfig({
                    ...config,
                    socialProofSlideIn: { ...social, enabled: val }
                  })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Initial Delay (ms)
                  </label>
                  <input
                    type="number"
                    value={social.initialDelayMs || 6000}
                    onChange={(e) => setConfig({
                      ...config,
                      socialProofSlideIn: { ...social, initialDelayMs: Number(e.target.value) || 6000 }
                    })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Display Time (ms)
                  </label>
                  <input
                    type="number"
                    value={social.displayDurationMs || 7000}
                    onChange={(e) => setConfig({
                      ...config,
                      socialProofSlideIn: { ...social, displayDurationMs: Number(e.target.value) || 7000 }
                    })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Interval (ms)
                  </label>
                  <input
                    type="number"
                    value={social.cycleIntervalMs || 35000}
                    onChange={(e) => setConfig({
                      ...config,
                      socialProofSlideIn: { ...social, cycleIntervalMs: Number(e.target.value) || 35000 }
                    })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
              </div>
            </div>
          )}

          {currentCustom && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 850, color: '#0f172a' }}>
                    {currentCustom.name}
                  </h3>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Format: {currentCustom.format.toUpperCase()} · Trigger: {currentCustom.triggerType}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ToggleSwitch
                    enabled={currentCustom.enabled}
                    onChange={(val) => {
                      const updated = customPopups.map(p => p.id === currentCustom.id ? { ...p, enabled: val } : p);
                      setConfig({ ...config, customPopups: updated });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteCustom(currentCustom.id, currentCustom.name)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 750 }}
                  >
                    <Trash2 size={12} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Color Controls */}
              <ColorThemePicker
                currentTheme={currentCustom.themePreset || 'emerald'}
                bgColor={currentCustom.bgColor || '#ffffff'}
                buttonColor={currentCustom.buttonColor || '#059669'}
                textColor={currentCustom.textColor || '#0f172a'}
                onChange={(updates) => {
                  const updated = customPopups.map(p => p.id === currentCustom.id ? { ...p, ...updates } : p);
                  setConfig({ ...config, customPopups: updated });
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Popup Title / Headline
                  </label>
                  <input
                    type="text"
                    value={currentCustom.title || ''}
                    onChange={(e) => {
                      const updated = customPopups.map(p => p.id === currentCustom.id ? { ...p, title: e.target.value } : p);
                      setConfig({ ...config, customPopups: updated });
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={currentCustom.badgeText || ''}
                    onChange={(e) => {
                      const updated = customPopups.map(p => p.id === currentCustom.id ? { ...p, badgeText: e.target.value } : p);
                      setConfig({ ...config, customPopups: updated });
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Body Message
                </label>
                <textarea
                  rows={2}
                  value={currentCustom.message || ''}
                  onChange={(e) => {
                    const updated = customPopups.map(p => p.id === currentCustom.id ? { ...p, message: e.target.value } : p);
                    setConfig({ ...config, customPopups: updated });
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    CTA Label
                  </label>
                  <input
                    type="text"
                    value={currentCustom.ctaLabel || ''}
                    onChange={(e) => {
                      const updated = customPopups.map(p => p.id === currentCustom.id ? { ...p, ctaLabel: e.target.value } : p);
                      setConfig({ ...config, customPopups: updated });
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    CTA Target Link
                  </label>
                  <input
                    type="text"
                    value={currentCustom.ctaUrl || ''}
                    onChange={(e) => {
                      const updated = customPopups.map(p => p.id === currentCustom.id ? { ...p, ctaUrl: e.target.value } : p);
                      setConfig({ ...config, customPopups: updated });
                    }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Interactive Mockup Preview with REAL COLORS */}
        <div className="admin-card" style={{ padding: 20, background: '#0f172a', color: '#ffffff', minHeight: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Eye size={13} />
              <span>Interactive Live Mockup</span>
            </div>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 800 }}>
              REAL-TIME STYLING
            </span>
          </div>

          {selectedFormat === 'sticky' && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>STICKY PROMO BAR PREVIEW:</div>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: sticky.bgColor || 'linear-gradient(90deg, #022c22, #0f172a, #022c22)',
                  color: sticky.textColor || '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: 12,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 4, background: sticky.badgeColor || '#064e3b', color: sticky.textColor || '#34d399', fontSize: 10, fontWeight: 800 }}>
                    {sticky.badgeText || 'LIVE UPDATE'}
                  </span>
                  <span style={{ color: sticky.textColor || '#e2e8f0' }}>{sticky.text}</span>
                </div>
                <button
                  type="button"
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    background: sticky.buttonColor || '#10b981',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 11,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{sticky.actionText}</span>
                  <ArrowRight size={10} />
                </button>
              </div>
            </div>
          )}

          {selectedFormat === 'exit' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>EXIT MODAL PREVIEW:</div>
              <div
                style={{
                  padding: 22,
                  borderRadius: 16,
                  background: exitModal.bgColor || '#1e293b',
                  color: exitModal.textColor || '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: exitModal.buttonColor || '#34d399', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                  <Gift size={13} />
                  <span>{exitModal.tag}</span>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: exitModal.textColor || '#ffffff' }}>
                  {exitModal.title}
                </h4>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: exitModal.textColor || '#94a3b8', opacity: 0.85, lineHeight: 1.4 }}>
                  {exitModal.subtitle}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: exitModal.buttonColor || '#10b981',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: 12,
                      border: 'none'
                    }}
                  >
                    {exitModal.downloadButtonText}
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: exitModal.textColor || '#ffffff',
                      fontWeight: 700,
                      fontSize: 12,
                      border: '1px solid rgba(255, 255, 255, 0.25)'
                    }}
                  >
                    {exitModal.scanCityButtonText}
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedFormat === 'social' && (
            <div style={{ marginTop: 30 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>SOCIAL PROOF SLIDE-IN PREVIEW:</div>
              <div style={{ maxWidth: 320, padding: 12, borderRadius: 12, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#022c22', border: '1px solid #059669', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>Live Extraction · 12m ago</div>
                  <div style={{ fontSize: 12, color: '#f8fafc', marginTop: 2 }}>
                    Verified <strong style={{ color: '#ffffff' }}>384 leads</strong> for <span style={{ color: '#6ee7b7' }}>Turmeric Wholesalers</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>Tenali Mandals (AP)</div>
                </div>
              </div>
            </div>
          )}

          {currentCustom && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                {currentCustom.format.toUpperCase()} MOCKUP:
              </div>
              <div
                style={{
                  padding: 20,
                  borderRadius: 14,
                  background: currentCustom.bgColor || '#ffffff',
                  color: currentCustom.textColor || '#0f172a',
                  border: '1.5px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.4)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, background: currentCustom.buttonColor || '#059669', color: '#ffffff' }}>
                    {currentCustom.badgeText || 'ONLINE'}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>Trigger: {currentCustom.triggerType}</span>
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 850, color: currentCustom.textColor || '#0f172a' }}>
                  {currentCustom.title}
                </h4>
                {currentCustom.message && (
                  <p style={{ margin: '0 0 14px', fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                    {currentCustom.message}
                  </p>
                )}
                <a
                  href={currentCustom.ctaUrl || '#'}
                  onClick={(e) => e.preventDefault()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: 8,
                    background: currentCustom.buttonColor || '#059669',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 12,
                    textDecoration: 'none'
                  }}
                >
                  <span>{currentCustom.ctaLabel || 'Action'}</span>
                  <ArrowRight size={12} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Design New Popup */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 540, width: '100%', background: '#ffffff', borderRadius: 20, padding: 26, boxShadow: '0 25px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 850, margin: 0, color: '#0f172a' }}>
                  Design New Visual Popup
                </h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>Choose a format, customize text &amp; pick colors</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewPopup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 6 }}>
                  SELECT VISUAL FORMAT
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                  {POPUP_FORMATS.map(f => {
                    const isSelected = newPopup.format === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => setNewPopup({ ...newPopup, format: f.id })}
                        style={{
                          padding: '10px',
                          borderRadius: 10,
                          border: isSelected ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: isSelected ? '#ecfdf5' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 12, color: isSelected ? '#047857' : '#0f172a', marginBottom: 2 }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.25 }}>
                          {f.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Internal Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WhatsApp Float Widget"
                    value={newPopup.name}
                    onChange={(e) => setNewPopup({ ...newPopup, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={newPopup.badgeText}
                    onChange={(e) => setNewPopup({ ...newPopup, badgeText: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Headline Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chat with territorial data expert"
                  value={newPopup.title}
                  onChange={(e) => setNewPopup({ ...newPopup, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                  Body Message
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Need direct phone extractions across 11 nations?"
                  value={newPopup.message}
                  onChange={(e) => setNewPopup({ ...newPopup, message: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={newPopup.ctaLabel}
                    onChange={(e) => setNewPopup({ ...newPopup, ctaLabel: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 4 }}>
                    CTA Link / URL
                  </label>
                  <input
                    type="text"
                    value={newPopup.ctaUrl}
                    onChange={(e) => setNewPopup({ ...newPopup, ctaUrl: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: 8, background: '#059669', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
                >
                  Create &amp; Publish Popup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
