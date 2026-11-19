import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  KeyRound, LogIn, LogOut, ShieldCheck, Sparkles, X
} from 'lucide-react';
import {
  changePassword, fetchMe, logout, logoutAll, useAuthSession
} from '../auth';

export default function AccountMenu({ variant = 'master' }) {
  const isMaster = variant === 'master';
  const navigate = useNavigate();
  const session = useAuthSession();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (session?.token) {
      fetchMe().catch(() => {});
    }
  }, [session?.token]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setModalOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  if (!session?.user) {
    return (
      <button
        type="button"
        className={`lx-account-signin ${isMaster ? 'is-master' : ''}`}
        onClick={() => navigate('/login')}
        title="Master sign-in"
      >
        <LogIn size={13} /> Sign in
      </button>
    );
  }

  const user = session.user;
  const initials = String(user.name || user.email || 'M')
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'M';

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPw || !newPw) {
      toast.error('Enter your current and new password.');
      return;
    }
    setSaving(true);
    try {
      const res = await changePassword(currentPw, newPw);
      toast.success(res.message || 'Password updated!');
      setCurrentPw('');
      setNewPw('');
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Could not update password.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    setOpen(false);
    logout();
    toast.success('Signed out.');
    navigate('/login');
  };

  const handleSignOutAll = async () => {
    setOpen(false);
    await logoutAll();
    toast.success('All active sessions revoked.');
    navigate('/login');
  };

  return (
    <div className="lx-account-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`lx-account-pill ${isMaster ? 'is-master' : ''} ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={user.email || user.name}
      >
        <span className="lx-account-avatar">{initials}</span>
        <span className="lx-account-meta">
          <b>{user.name || 'Admin'}</b>
          <small>SOVEREIGN</small>
        </span>
      </button>

      {open && (
        <div className="lx-account-menu is-master" role="menu">
          <div className="lx-account-head">
            <span className="lx-account-avatar is-lg">{initials}</span>
            <div style={{ minWidth: 0 }}>
              <b>{user.name || 'Administrator'}</b>
              <small>{user.email || 'master@scraper.co.in'}</small>
            </div>
          </div>

          <div className="lx-account-badges">
            <span className="lx-acct-tag is-atomic">
              <ShieldCheck size={11} /> Master Admin
            </span>
            <span className="lx-acct-tag is-kiwi">
              <Sparkles size={11} /> SOVEREIGN
            </span>
          </div>

          <button
            type="button"
            role="menuitem"
            className="lx-account-item"
            onClick={() => { setOpen(false); setModalOpen(true); }}
          >
            <KeyRound size={14} />
            <span>Change Admin Password</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="lx-account-item is-danger"
            onClick={handleSignOut}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="lx-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="lx-glass-modal is-master" onClick={e => e.stopPropagation()}>
            <header className="lx-modal-head">
              <div>
                <span className="lx-modal-kicker">MASTER SECURITY</span>
                <h3>Update Admin Password</h3>
              </div>
              <button type="button" className="lx-modal-close" onClick={() => setModalOpen(false)}>
                <X size={15} />
              </button>
            </header>

            <form className="lx-modal-form" onSubmit={handlePasswordChange}>
              <label>
                <span>Current password</span>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
              </label>
              <label>
                <span>New password</span>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="At least 8 characters (letters + numbers)"
                  autoComplete="new-password"
                />
              </label>

              <div className="lx-modal-actions">
                <button type="button" className="lx-btn-3d-berry" onClick={handleSignOutAll}>
                  Revoke All Sessions
                </button>
                <button type="submit" className="lx-btn-3d-atomic" disabled={saving}>
                  {saving ? 'Updating…' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
