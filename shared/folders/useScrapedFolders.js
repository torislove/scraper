import { useState, useEffect, useCallback } from 'react';
import {
  getScrapedFolders,
  getFolderLeads,
  getFolderExportUrl,
  resumeScrapedFolder,
  deleteScrapedFolder
} from '../utils/foldersGeoApi';

export function useScrapedFolders() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSelection, setActiveSelection] = useState(null); // { folderId, folderTitle, subcategory, sublocation }

  const refreshFolders = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getScrapedFolders();
      setFolders(list);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  const loadFolderScope = useCallback(async (folderId, { subcategory = '', sublocation = '', segment = '', runSessionId = '' } = {}) => {
    const detail = await getFolderLeads(folderId, { subcategory, sublocation, segment, runSessionId });
    if (detail?.ok) {
      setActiveSelection({
        folderId,
        folderTitle: detail.folder?.title || 'Scraped Folder',
        subcategory: subcategory || '',
        sublocation: sublocation || '',
        segment: segment || '',
        runSessionId: runSessionId || '',
        leadCount: detail.leads?.length || 0
      });
    }
    return detail;
  }, []);

  const clearFolderSelection = useCallback(() => {
    setActiveSelection(null);
  }, []);

  const exportFolderCsv = useCallback((folderId, { subcategory = '', sublocation = '', segment = '', runSessionId = '' } = {}) => {
    const url = getFolderExportUrl(folderId, { subcategory, sublocation, segment, runSessionId });
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const resumeFolder = useCallback(
    async (folderId) => {
      const res = await resumeScrapedFolder(folderId);
      await refreshFolders();
      return res;
    },
    [refreshFolders]
  );

  const deleteFolder = useCallback(
    async (folderId) => {
      await deleteScrapedFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setActiveSelection((curr) => (curr?.folderId === folderId ? null : curr));
    },
    []
  );

  return {
    folders,
    loading,
    activeSelection,
    refreshFolders,
    loadFolderScope,
    clearFolderSelection,
    exportFolderCsv,
    resumeFolder,
    deleteFolder
  };
}
