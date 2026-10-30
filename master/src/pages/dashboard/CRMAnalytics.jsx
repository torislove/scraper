import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Users, Award, ShieldCheck, CheckCircle2, 
  MapPin, Phone, Building2, Calendar, Download, RefreshCw, ArrowUpRight,
  Filter, PieChart, Activity, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { fetchAllUserSessions } from '../../utils/sessionManager';

export default function CRMAnalytics() {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const list = await fetchAllUserSessions();
      setVaults(list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Aggregated analytics calculation
  const stats = useMemo(() => {
    let totalLeads = 0;
    const stageCounts = {
      new: 0,
      pitch_sent: 0,
      in_discussion: 0,
      qualified: 0,
      won: 0,
      archived: 0
    };
    const categoryCounts = {};
    const cityCounts = {};
    const wonDealsList = [];

    vaults.forEach(v => {
      // Load CRM overrides for this vault
      let vCrm = {};
      try {
        const raw = localStorage.getItem(`vault_crm_state_${v.id}`);
        if (raw) vCrm = JSON.parse(raw);
      } catch (e) {}

      (v.leads || []).forEach((lead, idx) => {
        totalLeads++;
        const id = lead.id || lead._id || `${v.id}_lead_${idx}`;
        const stage = vCrm[id]?.stage || 'new';

        if (stageCounts[stage] !== undefined) {
          stageCounts[stage]++;
        } else {
          stageCounts.new++;
        }

        // Category breakdown
        const cat = lead.category || v.category || 'General';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        // City breakdown
        const city = lead.city || lead.mandal || v.location || 'India';
        cityCounts[city] = (cityCounts[city] || 0) + 1;

        if (stage === 'won') {
          wonDealsList.push({
            ...lead,
            _vaultName: v.name,
            _date: v.timestamp ? new Date(v.timestamp).toLocaleDateString('en-IN') : 'Recent'
          });
        }
      });
    });

    const contacted = stageCounts.pitch_sent + stageCounts.in_discussion + stageCounts.qualified + stageCounts.won;
    const conversionRate = contacted > 0 ? ((stageCounts.won / contacted) * 100).toFixed(1) : '0.0';

    // Sorted top categories
    const topCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Sorted top cities
    const topCities = Object.entries(cityCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalLeads,
      stageCounts,
      conversionRate,
      contacted,
      topCategories,
      topCities,
      wonDealsList
    };
  }, [vaults]);

  const stagesList = [
    { id: 'new', label: 'New Leads', count: stats.stageCounts.new, color: '#6366f1' },
    { id: 'pitch_sent', label: 'Pitch Sent', count: stats.stageCounts.pitch_sent, color: '#f59e0b' },
    { id: 'in_discussion', label: 'In Discussion', count: stats.stageCounts.in_discussion, color: '#06b6d4' },
    { id: 'qualified', label: 'Qualified', count: stats.stageCounts.qualified, color: '#8b5cf6' },
    { id: 'won', label: 'Closed Won', count: stats.stageCounts.won, color: '#10b981' },
  ];

  const maxStageCount = Math.max(...stagesList.map(s => s.count), 1);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                CRM Analytics & Funnel Velocity
              </h1>
              <p className="text-xs md:text-sm text-white/50">
                Conversion ratios, pipeline distribution, and regional density
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none"
          >
            <option value="all" className="bg-[#121226] text-white">All Time</option>
            <option value="30d" className="bg-[#121226] text-white">Last 30 Days</option>
            <option value="7d" className="bg-[#121226] text-white">Last 7 Days</option>
          </select>

          <button
            onClick={() => loadAnalytics()}
            className="btn btn-secondary btn-sm p-2 text-white/70 hover:text-white"
            title="Refresh Analytics"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="card p-4 space-y-1">
          <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
            Total Leads Harvested
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats.totalLeads.toLocaleString()}
          </div>
          <div className="text-[10px] text-white/40 flex items-center gap-1">
            <span>Across</span>
            <span className="font-mono text-violet-400 font-semibold">{vaults.length}</span>
            <span>Vaults</span>
          </div>
        </div>

        <div className="card p-4 space-y-1">
          <div className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-wider">
            Conversion Rate
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center gap-1">
            <span>{stats.conversionRate}%</span>
            <ArrowUpRight size={18} className="text-emerald-400" />
          </div>
          <div className="text-[10px] text-white/40">
            Won Deals / Contacted Leads
          </div>
        </div>

        <div className="card p-4 space-y-1">
          <div className="text-[11px] font-semibold text-amber-300/70 uppercase tracking-wider">
            Active Engagements
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {stats.contacted}
          </div>
          <div className="text-[10px] text-white/40">
            Pitched or in discussion
          </div>
        </div>

        <div className="card p-4 space-y-1">
          <div className="text-[11px] font-semibold text-violet-300/70 uppercase tracking-wider">
            Closed Won Deals
          </div>
          <div className="text-2xl font-bold font-mono text-violet-400">
            {stats.stageCounts.won}
          </div>
          <div className="text-[10px] text-white/40">
            Verified conversions
          </div>
        </div>
      </div>

      {/* Funnel + Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pipeline Funnel */}
        <div className="lg:col-span-7 card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-violet-400" />
              <span>Conversion Funnel Velocity</span>
            </h3>
            <span className="text-xs text-white/40 font-mono">Stage Progression</span>
          </div>

          <div className="space-y-3 pt-1">
            {stagesList.map((stage) => {
              const pctOfTotal = stats.totalLeads > 0 ? ((stage.count / stats.totalLeads) * 100).toFixed(1) : 0;
              const barWidth = Math.max((stage.count / maxStageCount) * 100, 4);

              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/80 font-medium flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.label}
                    </span>
                    <span className="font-mono text-white/60">
                      {stage.count} ({pctOfTotal}%)
                    </span>
                  </div>

                  <div className="h-3 w-full bg-white/[0.04] rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Top Categories & Regional Footprint */}
        <div className="lg:col-span-5 card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 size={16} className="text-cyan-400" />
              <span>Top Industries</span>
            </h3>
            <span className="text-xs text-white/40 font-mono">Volume</span>
          </div>

          <div className="space-y-3 pt-1">
            {stats.topCategories.length === 0 ? (
              <div className="p-6 text-center text-xs text-white/40">No category data available</div>
            ) : (
              stats.topCategories.map(cat => (
                <div key={cat.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-white font-medium truncate max-w-[200px]">{cat.name}</span>
                  <span className="badge badge-cyan font-mono text-[11px]">{cat.count} Leads</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.06]">
            <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
              Top Geographic Regions
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {stats.topCities.map(city => (
                <span key={city.name} className="badge badge-slate text-xs font-mono">
                  📍 {city.name} ({city.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Won Deals Log */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Award size={16} className="text-emerald-400" />
            <span>Recent Closed Won Conversions</span>
          </h3>
          <span className="text-xs text-emerald-400 font-mono font-semibold">
            {stats.wonDealsList.length} Total Won
          </span>
        </div>

        {stats.wonDealsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/40">
            No closed won deals recorded yet. Move leads through the pipeline to track conversions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-white/40 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Business</th>
                  <th className="py-2.5 px-3">Industry</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Vault</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {stats.wonDealsList.slice(0, 8).map((deal, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-semibold text-white">{deal.name}</td>
                    <td className="py-2.5 px-3 text-white/70">{deal.category}</td>
                    <td className="py-2.5 px-3 text-white/60">{deal.city || deal.mandal || 'India'}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400">{deal.phone || '—'}</td>
                    <td className="py-2.5 px-3 text-white/50">{deal._vaultName}</td>
                    <td className="py-2.5 px-3">
                      <span className="badge badge-emerald text-[10px] font-semibold">
                        Won 🏆
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
