import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { Users, Key, RefreshCw, Plus, ShieldCheck, Mail, Calendar, Trash2 } from 'lucide-react';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPlan, setNewClientPlan] = useState('enterprise');

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clients');
      const json = await res.json();
      if (json.success) {
        setClients(json.clients || []);
        setPlans(json.plans || {});
      }
    } catch (e) {
      toast.error('Failed to load clients list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return toast.error('Client name is required');
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName.trim(),
          email: newClientEmail.trim() || undefined,
          plan: newClientPlan
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Client ${json.client.name} created!`);
        setNewClientName('');
        setNewClientEmail('');
        fetchClients();
      }
    } catch (e) {
      toast.error('Failed to create client');
    }
  };

  const handleIssueResetCode = async (clientId, clientName) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/reset-code`, { method: 'POST' });
      const json = await res.json();
      if (json.success && json.code) {
        navigator.clipboard.writeText(json.code);
        toast.success(`Reset code copied to clipboard: ${json.code}`, { duration: 5000 });
      } else {
        toast.error(json.error || 'Failed to generate reset code');
      }
    } catch (e) {
      toast.error('Network error issuing reset code');
    }
  };

  const handleDeleteClient = async (clientId, clientName) => {
    if (!window.confirm(`Are you sure you want to delete client "${clientName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(`Client ${clientName} deleted`);
        fetchClients();
      }
    } catch (e) {
      toast.error('Failed to delete client');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Toaster position="top-right" />

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#fffbeb', border: '1px solid rgba(217, 119, 6, 0.35)', color: '#92400e', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
            <Users size={12} />
            <span>WORKSPACE ACCESS &amp; NODE GOVERNANCE</span>
          </div>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 26, fontWeight: 850, margin: 0, color: '#0f172a' }}>
            Authorized Workspaces &amp; Nodes
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
            Provision organizational workspace nodes (Standard Edge, Dedicated Node, Fleet Enterprise) and issue cryptographic reset codes.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchClients}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Provision New Client Card */}
      <div className="admin-card" style={{ padding: '16px 20px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
          Provision New Client Account
        </h3>
        <form onSubmit={handleCreateClient} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Client or Agency Name (e.g. Apex Media)"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            style={{ flex: '1 1 200px', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
          />
          <input
            type="email"
            placeholder="Client Email (optional)"
            value={newClientEmail}
            onChange={(e) => setNewClientEmail(e.target.value)}
            style={{ flex: '1 1 200px', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
          />
          <select
            value={newClientPlan}
            onChange={(e) => setNewClientPlan(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(217, 119, 6, 0.3)', fontSize: 12.5, fontWeight: 700 }}
          >
            <option value="standard">Standard Edge Node</option>
            <option value="dedicated">Dedicated Compute Node</option>
            <option value="enterprise">Fleet Enterprise Node</option>
            <option value="unlimited">Master Unlimited</option>
          </select>
          <button
            type="submit"
            className="admin-btn-gold"
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={14} />
            <span>Provision Workspace</span>
          </button>
        </form>
      </div>

      {/* Clients Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px' }}>Client Name</th>
                <th style={{ padding: '12px 18px' }}>Account Plan</th>
                <th style={{ padding: '12px 18px' }}>Login Email</th>
                <th style={{ padding: '12px 18px' }}>Status</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 18px', textAlign: 'center', color: '#94a3b8', fontWeight: 650 }}>
                    {loading ? 'Loading registered clients...' : 'No clients on file yet.'}
                  </td>
                </tr>
              ) : (
                clients.map((c, i) => (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.5)' }}>
                    <td style={{ padding: '12px 18px', fontWeight: 800, color: '#0f172a' }}>
                      {c.name || c.id}
                      <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>ID: {c.id}</div>
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span className="admin-badge admin-badge-amber">
                        {(c.plan === 'starter' ? 'STANDARD NODE' : (c.plan || 'ENTERPRISE')).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', color: '#334155' }}>
                      {c.loginEmail || c.email || '—'}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span className="admin-badge admin-badge-emerald">
                        <ShieldCheck size={11} />
                        <span>Active</span>
                      </span>
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleIssueResetCode(c.id, c.name)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Generate single-use reset code"
                        >
                          <Key size={11} />
                          <span>Reset Code</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(c.id, c.name)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            cursor: 'pointer'
                          }}
                          title="Delete client"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
