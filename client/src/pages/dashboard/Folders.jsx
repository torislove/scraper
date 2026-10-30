import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, FolderOpen, Search, Filter, ArrowUpDown, Download, 
  Trash2, Plus, RefreshCw, Grid, List, Sparkles, Building2, 
  MapPin, Phone, Users, Star, ExternalLink, Calendar, Database,
  ArrowRight, CheckCircle2, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  fetchAllUserSessions, deleteUserSession, exportSessionToCSV, exportSessionToJSON 
} from '../../utils/sessionManager';

export default function Folders() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState('');
  const [newFolderLocation, setNewFolderLocation] = useState('');

  const loadFolders = async () => {
    setLoading(true);
    try {
      const list = await fetchAllUserSessions();
      setFolders(list || []);
    } catch (err) {
      console.error('Failed to load folders:', err);
      toast.error('Could not load lead vaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete vault "${name}"?`)) return;
    try {
      await deleteUserSession(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      toast.success('Vault deleted successfully');
    } catch (err) {
      toast.error('Failed to delete vault');
    }
  };

  const handleExport = (folder, e) => {
    e.stopPropagation();
    exportSessionToCSV(folder);
    toast.success(`Exporting ${folder.name || 'leads'} to CSV`, { icon: '📥' });
  };

  const handleCreateVault = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      return toast.error('Vault name is required');
    }
    const newVault = {
      id: 'vault_' + Date.now().toString(36),
      name: newFolderName.trim(),
      category: newFolderCategory.trim() || 'General Business',
      location: newFolderLocation.trim() || 'Pan-India',
      leadCount: 0,
      leads: [],
      timestamp: Date.now(),
      status: 'active'
    };

    const updated = [newVault, ...folders];
    setFolders(updated);
    try {
      localStorage.setItem('gomandap_search_sessions_v1', JSON.stringify(updated));
    } catch (err) {}
    toast.success(`Vault "${newVault.name}" created!`, { icon: '✨' });
    setIsCreateModalOpen(false);
    setNewFolderName('');
    setNewFolderCategory('');
    setNewFolderLocation('');
  };

  // Derive unique categories for filter
  const categories = useMemo(() => {
    const set = new Set();
    folders.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [folders]);

  // Total metrics
  const totalStats = useMemo(() => {
    let totalLeads = 0;
    const citiesSet = new Set();
    folders.forEach(f => {
      totalLeads += (f.leadCount || f.leads?.length || 0);
      if (f.location) citiesSet.add(f.location.toLowerCase());
    });
    return {
      vaultsCount: folders.length,
      totalLeads,
      citiesCount: citiesSet.size || 1
    };
  }, [folders]);

  // Filtered & sorted list
  const filteredFolders = useMemo(() => {
    return folders
      .filter(f => {
        const matchesSearch = 
          (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (f.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (f.location || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || f.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const countA = a.leadCount || a.leads?.length || 0;
        const countB = b.leadCount || b.leads?.length || 0;
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;

        if (sortBy === 'leads_desc') return countB - countA;
        if (sortBy === 'leads_asc') return countA - countB;
        if (sortBy === 'date_desc') return timeB - timeA;
        if (sortBy === 'date_asc') return timeA - timeB;
        if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
        return 0;
      });
  }, [folders, searchQuery, categoryFilter, sortBy]);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <FolderOpen size={20} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Lead Vaults
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {folders.length} Saved
                </span>
              </h1>
              <p className="text-xs md:text-sm text-white/50">
                Permanent organized workspaces holding harvested leads and client pipelines
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadFolders()}
            disabled={loading}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            title="Refresh Vaults"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-lg shadow-violet-600/20"
          >
            <Plus size={15} />
            <span>New Vault</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Folder size={18} />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold font-mono text-white">{totalStats.vaultsCount}</div>
            <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Active Vaults</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users size={18} />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold font-mono text-emerald-400">
              {totalStats.totalLeads.toLocaleString()}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Total Harvested</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3.5 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <MapPin size={18} />
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold font-mono text-cyan-400">
              {totalStats.citiesCount}
            </div>
            <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Regions Covered</div>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="card p-3 md:p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search vaults by name, category, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs md:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-violet-500/50"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-[#121226] text-white">
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-violet-500/50"
            >
              <option value="date_desc" className="bg-[#121226] text-white">Newest First</option>
              <option value="date_asc" className="bg-[#121226] text-white">Oldest First</option>
              <option value="leads_desc" className="bg-[#121226] text-white">Most Leads</option>
              <option value="leads_asc" className="bg-[#121226] text-white">Fewest Leads</option>
              <option value="name_asc" className="bg-[#121226] text-white">Alphabetical (A-Z)</option>
            </select>

            {/* View mode toggle */}
            <div className="flex items-center border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-violet-500/20 text-violet-300' : 'text-white/40 hover:text-white'}`}
                title="Grid View"
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-violet-500/20 text-violet-300' : 'text-white/40 hover:text-white'}`}
                title="List View"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl skeleton" />
                <div className="w-16 h-5 rounded-full skeleton" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 rounded skeleton" />
                <div className="h-4 w-1/2 rounded skeleton" />
              </div>
              <div className="h-9 w-full rounded-xl skeleton" />
            </div>
          ))}
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <FolderOpen size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base md:text-lg font-semibold text-white">No lead vaults found</h3>
            <p className="text-xs md:text-sm text-white/40 max-w-md">
              {searchQuery || categoryFilter !== 'ALL'
                ? 'Try adjusting your search filters or clearing the filter query.'
                : 'Scraped sessions automatically create permanent lead vaults, or you can create one manually.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(searchQuery || categoryFilter !== 'ALL') ? (
              <button
                onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); }}
                className="btn btn-secondary btn-sm"
              >
                Reset Filters
              </button>
            ) : (
              <button
                onClick={() => navigate('/app/overview')}
                className="btn btn-primary btn-sm flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>Open Scraper Cockpit</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFolders.map((folder) => {
            const leadCount = folder.leadCount || folder.leads?.length || 0;
            const formattedDate = folder.timestamp 
              ? new Date(folder.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Recent';

            return (
              <motion.div
                key={folder.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card card-clickable p-5 flex flex-col justify-between group hover:border-violet-500/40"
                onClick={() => navigate(`/app/folders/${folder.id}`)}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                      <Building2 size={20} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="badge badge-violet text-[11px] font-mono">
                        {leadCount} {leadCount === 1 ? 'Lead' : 'Leads'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-1">
                      {folder.name || 'Unnamed Vault'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                      <span className="text-violet-400 font-medium">{folder.category || 'General'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 line-clamp-1">
                        <MapPin size={11} className="text-white/40 shrink-0" />
                        {folder.location || 'India'}
                      </span>
                    </div>
                  </div>

                  {/* Summary pills */}
                  <div className="flex items-center gap-2 text-[11px] text-white/40 pt-1 border-t border-white/[0.06]">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formattedDate}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400/80 flex items-center gap-1 font-mono">
                      <CheckCircle2 size={11} />
                      Indexed
                    </span>
                  </div>
                </div>

                {/* Footer action bar */}
                <div className="pt-4 mt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleExport(folder, e)}
                      className="p-1.5 rounded-lg bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                      title="Export CSV"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(folder.id, folder.name, e)}
                      className="p-1.5 rounded-lg bg-white/[0.04] text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Vault"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 group-hover:translate-x-0.5 transition-transform">
                    Explore Leads
                    <ChevronRight size={14} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-white/[0.03] border-b border-white/[0.07] text-white/40 uppercase text-[10px] tracking-wider font-semibold font-mono">
                <tr>
                  <th className="py-3 px-4">Vault Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4 text-center">Leads</th>
                  <th className="py-3 px-4">Harvest Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredFolders.map(folder => {
                  const leadCount = folder.leadCount || folder.leads?.length || 0;
                  const formattedDate = folder.timestamp 
                    ? new Date(folder.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Recent';

                  return (
                    <tr
                      key={folder.id}
                      onClick={() => navigate(`/app/folders/${folder.id}`)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-white group-hover:text-violet-300">
                        <div className="flex items-center gap-2.5">
                          <Folder size={16} className="text-violet-400" />
                          <span>{folder.name || 'Unnamed Vault'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-white/70">{folder.category || 'General'}</td>
                      <td className="py-3.5 px-4 text-white/60">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} className="text-white/40" />
                          {folder.location || 'India'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="badge badge-violet font-mono text-xs">
                          {leadCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white/40 text-xs font-mono">{formattedDate}</td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={(e) => handleExport(folder, e)}
                            className="p-1.5 rounded-lg bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]"
                            title="Export CSV"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(folder.id, folder.name, e)}
                            className="p-1.5 rounded-lg bg-white/[0.04] text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            onClick={() => navigate(`/app/folders/${folder.id}`)}
                            className="btn btn-secondary btn-sm py-1 px-2.5 ml-1 text-xs"
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Vault Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card w-full max-w-md p-6 space-y-5 border-violet-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <Plus size={16} />
                  </div>
                  <h3 className="text-base font-bold text-white">Create New Lead Vault</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-white/40 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateVault} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Vault Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Bangalore Rental Cars Pipeline"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Industry / Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Rental Cars, Banquet Halls, Photographers"
                    value={newFolderCategory}
                    onChange={(e) => setNewFolderCategory(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/50">
                    Target Geographic Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Bangalore, Karnataka"
                    value={newFolderLocation}
                    onChange={(e) => setNewFolderLocation(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                  >
                    Create Vault
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
