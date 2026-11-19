import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  KeyRound, LogIn, LogOut, ShieldCheck, Sparkles, UserCheck, X
} from 'lucide-react';
import {
  changePassword, fetchMe, logout, logoutAll, useAuthSession
} from '../auth';

export default function AccountMenu({ variant = 'client' }) {
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
        title="Sign in to sync your account"
      >
        <LogIn size={13} /> Sign in
      </button>
    );
  }

  const user = session.user;
  const initials = String(user.name || user.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'U';

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
    toast.success('Signed out from all devices.');
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
          <b>{user.name || 'Account'}</b>
          <small>{isMaster ? 'Master' : String(user.plan || 'Starter').toUpperCase()}</small>
        </span>
      </button>

      {open && (
        <div className={`lx-account-menu ${isMaster ? 'is-master' : ''}`} role="menu">
          <div className="lx-account-head">
            <span className="lx-account-avatar is-lg">{initials}</span>
            <div style={{ minWidth: 0 }}>
              <b>{user.name || 'Workspace User'}</b>
              <small>{user.email || user.clientId}</small>
            </div>
          </div>

          <div className="lx-account-badges">
            <span className="lx-acct-tag is-atomic">
              <ShieldCheck size={11} /> {user.role === 'master' ? 'Sovereign Master' : 'Verified Account'}
            </span>
            {user.plan && (
              <span className="lx-acct-tag is-kiwi">
                <Sparkles size={11} /> {String(user.plan).toUpperCase()}
              </span>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            className="lx-account-item"
            onClick={() => { setOpen(false); setModalOpen(true); }}
          >
            <KeyRound size={14} />
            <span>Change Password &amp; Security</span>
          </button>

          {!isMaster && (
            <button
              type="button"
              role="menuitem"
              className="lx-account-item"
              onClick={() => { setOpen(false); navigate('/pricing'); }}
            >
              <UserCheck size={14} />
              <span>Plans &amp; Upgrade</span>
            </button>
          )}

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
          <div className={`lx-glass-modal ${isMaster ? 'is-master' : ''}`} onClick={e => e.stopPropagation()}>
            <header className="lx-modal-head">
              <div>
                <span className="lx-modal-kicker">ACCOUNT SECURITY</span>
                <h3>Update Password</h3>
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
                  Sign Out All Devices
                </button>
                <button type="submit" className="lx-btn-3d-kiwi" disabled={saving}>
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
