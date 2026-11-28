import { useState, useEffect, useCallback } from 'react';
import { safeLeadId, safeStr } from '../../client/src/v2/utils/safeTypes';

const STORAGE_KEY = 'lx_lead_folders_v2';

export const FOLDER_SWATCHES = [
  { id: 'gold', hex: '#d97706' },
  { id: 'sapphire', hex: '#0284c7' },
  { id: 'emerald', hex: '#059669' },
  { id: 'amber', hex: '#f59e0b' },
  { id: 'rose', hex: '#e11d48' },
  { id: 'slate', hex: '#475569' }
];

export function resolveSwatchHex(colorId) {
  const map = { blue: '#0284c7', purple: '#d97706', orange: '#f59e0b' };
  if (map[colorId]) return map[colorId];
  return FOLDER_SWATCHES.find((c) => c.id === colorId)?.hex || '#d97706';
}

export function useLeadFolders() {
  const [folders, setFolders] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  });

  const [activeFolderId, setActiveFolderId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
    } catch (_) {}
  }, [folders]);

  const createFolder = useCallback((name, color = 'gold') => {
    const clean = safeStr(name);
    if (!clean) return null;
    const item = {
      id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: clean,
      color,
      leadIds: [],
      createdAt: Date.now()
    };
    setFolders((prev) => [item, ...prev]);
    return item;
  }, []);

  const deleteFolder = useCallback((folderId) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setActiveFolderId((curr) => (curr === folderId ? null : curr));
  }, []);

  const addLeadsToFolder = useCallback((folderId, leadIds = []) => {
    let added = 0;
    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== folderId) return f;
        const existing = new Set(f.leadIds || []);
        const fresh = leadIds.filter((id) => id && !existing.has(id));
        added = fresh.length;
        return { ...f, leadIds: [...(f.leadIds || []), ...fresh] };
      })
    );
    return added;
  }, []);

  const removeLeadFromFolder = useCallback((folderId, leadId) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, leadIds: (f.leadIds || []).filter((x) => x !== leadId) } : f))
    );
  }, []);

  const exportFolderCsv = useCallback(
    (folderId, allVendors = []) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;
      const idSet = new Set(folder.leadIds || []);
      const matching = allVendors.filter((v) => idSet.has(safeLeadId(v)) || idSet.has(v.id || `${v.name}-${v.phone}`));
      if (!matching.length) return;

      const headers = ['Business Name', 'Category', 'Mobile Phone', 'Landline Phone', 'Email', 'Address', 'Website'];
      const esc = (s) => `"${safeStr(s).replace(/"/g, '""')}"`;
      const rows = matching.map((v) => [
        esc(v.name || v.title),
        esc(v.category),
        esc(v.mobilePhone || v.phone),
        esc(v.landlinePhone),
        esc(v.email || (Array.isArray(v.emails) ? v.emails[0] : '')),
        esc(v.address || v.formatted_address),
        esc(v.website)
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${folder.name.toLowerCase().replace(/\s+/g, '_')}_leads.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    },
    [folders]
  );

  return {
    folders,
    activeFolderId,
    setActiveFolderId,
    createFolder,
    deleteFolder,
    addLeadsToFolder,
    removeLeadFromFolder,
    exportFolderCsv
  };
}
