import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Square, Search, MapPin, Phone, Database, CheckCircle2, 
  Sparkles, AlertCircle, RefreshCw, X, Zap, Cpu, Clock, Compass
} from 'lucide-react';

// Clear English phases with cyber telemetry
const SIMPLE_STEPS = [
  { step: 1, title: 'Understanding Search & Pan-India AI', desc: 'Normalizing target category against 780+ district master gazettes' },
  { step: 2, title: 'Resolving Mandals & Locality Polygons', desc: 'Geofencing local boundaries to ensure zero cross-boundary bleed' },
  { step: 3, title: 'Direct RPC & Google Maps Satellite Scan', desc: 'Querying high-speed RPC endpoints and scanning local store density' },
  { step: 4, title: 'Verifying Phone Numbers & WhatsApp Readiness', desc: 'Validating reachable mobile lines and generating 1-click WhatsApp links' },
  { step: 5, title: 'Saving Verified Stores to Folder Vault', desc: 'Appending isolated store records into dedicated session folder' }
];

export default function SearchProgressHUD({
  isActive = false,
  query = '',
  category = '',
  location = '',
  district = '',
  mandal = '',
  activeWorkers = 18,
  totalLeads = 0,
  verifiedPhones = 0,
  latestStoreName = '',
  searchProgress = null,
  onStop,
  onDismiss
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCurrentStepIndex(0);
      setElapsedSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    const stepTimer = setInterval(() => {
      setCurrentStepIndex(prev => (prev < SIMPLE_STEPS.length - 1 ? prev + 1 : prev));
    }, 3200);

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
    };
  }, [isActive]);

  // Live Velocity Speedometer (stores per second)
  const speedPerSecond = useMemo(() => {
    if (searchProgress?.velocity && parseFloat(searchProgress.velocity) > 0) {
      return searchProgress.velocity;
    }
    if (elapsedSeconds <= 0 || totalLeads <= 0) return '0.0';
    return (totalLeads / elapsedSeconds).toFixed(1);
  }, [totalLeads, elapsedSeconds, searchProgress?.velocity]);

  // Dynamic ETA Calculation
  const etaText = useMemo(() => {
    if (searchProgress?.eta) return searchProgress.eta;
    if (currentStepIndex >= 4 && totalLeads > 20) return 'Finalizing...';
    if (elapsedSeconds < 3) return 'Calculating ETA...';
    
    // Target estimated stores for typical locality scan (approx 40-60 stores)
    const targetQuota = Math.max(50, Math.ceil(totalLeads * 1.4));
    const remainingLeads = Math.max(0, targetQuota - totalLeads);
    const speed = parseFloat(speedPerSecond);
    
    if (speed <= 0) return '~45s remaining';
    const remainingSecs = Math.max(5, Math.ceil(remainingLeads / speed));
    
    if (remainingSecs < 60) {
      return `~${remainingSecs}s remaining`;
    }
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    return `~${mins}m ${secs}s remaining`;
  }, [currentStepIndex, totalLeads, elapsedSeconds, speedPerSecond, searchProgress?.eta]);

  // Real progress percent from backend searchProgress if available
  const progressPercent = useMemo(() => {
    if (searchProgress?.totalMandals && searchProgress.totalMandals > 0) {
      const pct = Math.round(((searchProgress.completedMandals || 0) / searchProgress.totalMandals) * 100);
      return Math.min(100, Math.max(8, pct));
    }
    return Math.min(100, Math.max(12, Math.round(((currentStepIndex + 1) / SIMPLE_STEPS.length) * 100)));
  }, [searchProgress, currentStepIndex]);

  if (!isActive) return null;

  const currentStep = SIMPLE_STEPS[currentStepIndex];
  const activeZoneName = searchProgress?.activeMandal || mandal || location || 'Target Zone';
  const completedZones = searchProgress?.completedMandals || 0;
  const totalZones = searchProgress?.totalMandals || 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.99 }}
        transition={{ duration: 0.25 }}
        className="w-full mt-3 bg-[#0a0a16]/95 backdrop-blur-2xl border border-violet-500/35 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.6)] relative overflow-hidden"
      >
        {/* Animated Cyber Hologram Top Ray */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400 animate-pulse" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
          
          {/* Left: Active Radar Status & Target Context */}
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Pulsing Concentric Radar Center */}
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 tracking-wider">
                  ZONE {completedZones}/{totalZones}
                </span>
                
                <h4 className="text-xs font-black text-white truncate flex items-center gap-1.5">
                  <span className="text-cyan-400">⚡ {activeZoneName}</span>
                  <span className="text-slate-500">•</span>
                  <span>{currentStep.title}</span>
                </h4>

                <span className="text-slate-600 text-xs hidden sm:inline">•</span>

                <span className="text-violet-300 text-xs font-bold truncate">
                  "{category || 'Stores'}" in <span className="text-cyan-300 underline decoration-cyan-500/40">{location || district || 'Target Territory'}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-slate-400 truncate font-normal">
                  {currentStep.desc}
                </p>
                {latestStoreName && (
                  <span className="hidden md:inline-flex text-[10px] font-mono text-emerald-400/90 truncate bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Captured: {latestStoreName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Live Telemetry Gauges & MASTER ABORT */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Speedometer Gauge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/25 text-[11px] text-cyan-300 font-mono font-bold shadow-sm" title="Real-time Extraction Velocity">
              <Zap size={12} className="text-cyan-400 animate-pulse" />
              <span>{speedPerSecond} stores/s</span>
            </div>

            {/* Found Stores Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-emerald-500/25 text-[11px] text-emerald-300 font-bold shadow-sm">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>{totalLeads} Found</span>
            </div>

            {/* WhatsApp Verified Badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-emerald-500/25 text-[11px] text-emerald-400 font-bold shadow-sm">
              <Phone size={11} className="text-emerald-400" />
              <span>{verifiedPhones} WhatsApp</span>
            </div>

            {/* Active Workers Thread Monitor */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900/90 border border-white/10 text-[10px] font-mono text-slate-300">
              <Cpu size={11} className="text-violet-400" />
              <span>{activeWorkers} Threads</span>
            </div>

            {/* ETA Clock */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-950/40 border border-violet-500/30 text-[11px] text-violet-300 font-mono font-bold shadow-sm">
              <Clock size={11} className="text-violet-400" />
              <span>{etaText}</span>
            </div>

            {/* MASTER ABORT KILLSWITCH BUTTON */}
            {onStop && (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black transition-all shadow-[0_0_22px_rgba(244,63,94,0.55)] cursor-pointer ml-1 active:scale-95 shrink-0 border border-rose-400/60 animate-pulse"
                title="Master Abort: Instantly kill all scraper worker threads & safely save gathered stores"
              >
                <Square size={11} className="fill-white" />
                <span>🛑 MASTER ABORT</span>
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
                title="Hide status HUD"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Holographic Progress Bar with Shimmer Highlight Ray */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Compass size={11} className="text-cyan-400 animate-spin" />
              <span>Autonomous Regional Mesh Progress</span>
            </span>
            <span className="font-bold text-cyan-300">{progressPercent}%</span>
          </div>

          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/10 p-[1px] relative">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-600 via-cyan-400 to-emerald-400 rounded-full shadow-[0_0_14px_rgba(6,182,212,0.8)] relative overflow-hidden"
              initial={{ width: '12%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* Neon Shimmer Highlight Ray */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
        </div>

        {/* Live Terminal Marquee Ticker */}
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400 overflow-hidden gap-2">
          <div className="flex items-center gap-1.5 shrink-0 text-cyan-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>STREAM:</span>
          </div>
          <div className="truncate flex-1 text-left text-slate-300">
            {latestStoreName ? (
              <span className="text-emerald-300 font-semibold">
                Captured: <strong className="text-white">{latestStoreName}</strong> in {location || district || 'Target'} • Verified WhatsApp Ready
              </span>
            ) : (
              <span className="text-slate-400">
                Scanning regional network nodes with dynamic auto-scaling workers ({activeWorkers} active threads)...
              </span>
            )}
          </div>
          <div className="shrink-0 text-violet-300 font-bold hidden sm:inline">
            ⚡ {speedPerSecond} stores/s • ETA: {etaText}
          </div>
        </div>
        {/* Customer Guidance: How Long Scrape Takes & How to Get/Convert Leads */}
        <div className="mt-2.5 pt-2 border-t border-white/5 bg-white/[0.02] rounded-xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/30 shrink-0">
              ⚡ CUSTOMER GUIDE
            </span>
            <span className="font-medium text-slate-300">
              Full territory sweep typically takes <strong className="text-white font-bold">30–90 seconds</strong> for 200+ verified B2B leads.
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span>🟢</span> 1-Click WhatsApp Pitch
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <span>📥</span> 1-Click Excel / CSV Export
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-violet-300 font-bold">
              <span>📁</span> Isolated Vault Folders
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
