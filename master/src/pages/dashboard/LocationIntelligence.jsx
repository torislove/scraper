import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Search, ChevronDown, ChevronRight, Zap, RefreshCw, Globe, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../apiConfig';

// Fix for default Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCyberPin = (color = '#8b5cf6') => {
  return L.divIcon({
    className: 'custom-geo-pin',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:26px;height:26px;">
        <span style="position:absolute;width:24px;height:24px;border-radius:50%;background:${color};opacity:0.4;" class="animate-pulse"></span>
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:14px;height:14px;background:${color};border:2px solid #ffffff;border-radius:50%;box-shadow:0 0 10px ${color};">
          <span style="font-size:8px;color:#fff;font-weight:900;">•</span>
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
};

function MapRecenter({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [points, map]);
  return null;
}

export default function LocationIntelligence() {
  const [memory, setMemory] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [mapPoints, setMapPoints] = useState([]);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [osmQuery, setOsmQuery] = useState('');
  const [fetchingOSM, setFetchingOSM] = useState(false);

  const [selectedState, setSelectedState] = useState('Andhra Pradesh');
  const [warmingActive, setWarmingActive] = useState(false);
  const [warmingStatus, setWarmingStatus] = useState({
    active: false,
    stateName: '',
    totalDistricts: 0,
    completedDistricts: 0,
    activeDistrict: '',
    totalMandals: 0,
    completedMandals: 0,
    activeMandal: '',
    resolvedPoints: []
  });

  useEffect(() => {
    fetchWarmingStatus();
    fetchMemory();
  }, []);

  async function fetchWarmingStatus() {
    try {
      const res = await fetch(`${API_URL}/locations/warm-state/status`);
      const data = await res.json();
      setWarmingStatus(data);
      if (data.active) {
        setWarmingActive(true);
        if (data.resolvedPoints && data.resolvedPoints.length > 0) {
          setMapPoints(data.resolvedPoints);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    let intervalId;
    if (warmingActive) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/locations/warm-state/status`);
          const data = await res.json();
          setWarmingStatus(data);
          if (data.resolvedPoints && data.resolvedPoints.length > 0) {
            setMapPoints(data.resolvedPoints);
          }
          if (!data.active) {
            setWarmingActive(false);
            toast.success('State geography warming completed!');
            fetchMemory();
          }
        } catch (err) {
          console.error('Failed to fetch warming status:', err);
        }
      }, 1500);
    }
    return () => clearInterval(intervalId);
  }, [warmingActive]);

  const handleStartWarming = async () => {
    try {
      setWarmingActive(true);
      setMapPoints([]);
      const res = await fetch(`${API_URL}/locations/warm-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateName: selectedState })
      });
      const data = await res.json();
      toast.success(data.message || 'Warming initiated in background.');
    } catch (err) {
      setWarmingActive(false);
      toast.error('Failed to initiate state warming');
    }
  };

  const handleStopWarming = async () => {
    try {
      const res = await fetch(`${API_URL}/locations/warm-state/stop`, { method: 'POST' });
      const data = await res.json();
      toast.success(data.message || 'Warming stopped.');
      setWarmingActive(false);
    } catch (err) {
      toast.error('Failed to stop state warming');
    }
  };

  async function fetchMemory() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/locations/memory`);
      const data = await res.json();
      setMemory(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load location memory');
    } finally {
      setLoading(false);
    }
  }

  const toggleNode = (nodeName) => {
    setExpandedNodes(prev => ({ ...prev, [nodeName]: !prev[nodeName] }));
  };

  const handlePlotOnMap = async (parentName, children) => {
    try {
      setGeocoding(true);
      setSelectedParent(parentName);
      const res = await fetch(`${API_URL}/locations/geocode-sublocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent: parentName, locations: children })
      });
      const data = await res.json();
      if (data && data.points) {
        setMapPoints(data.points);
        toast.success(`Plotted ${data.points.length} nodes on radar map`);
      }
    } catch (err) {
      toast.error('Failed to geocode sublocations');
    } finally {
      setGeocoding(false);
    }
  };

  const handleFetchOSM = async (e) => {
    e.preventDefault();
    if (!osmQuery) return;
    try {
      setFetchingOSM(true);
      const res = await fetch(`${API_URL}/locations/fetch-osm?query=${encodeURIComponent(osmQuery)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMapPoints(data);
        toast.success(`Fetched ${data.length} precise nodes from OSM`);
      } else {
        toast.error('No locations found in OSM for this query');
      }
    } catch (err) {
      toast.error('Failed to fetch from OSM');
    } finally {
      setFetchingOSM(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col lg:flex-row bg-[#07070d] text-slate-100 font-sans">
      
      {/* ── LEFT INTELLIGENCE PANEL ── */}
      <div className="w-full lg:w-[420px] xl:w-[460px] bg-[#0c0c16] border-r border-white/[0.08] flex flex-col min-h-[50vh] lg:min-h-screen">
        
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10">
              <Globe className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-2">
                GeoAI Memory
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Learned administrative topology & mandals</p>
            </div>
          </div>
          <button
            onClick={fetchMemory}
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 rounded-xl border border-white/[0.08] transition-all"
            title="Refresh memory"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* State Geography Warmer */}
        <div className="p-4 bg-gradient-to-br from-violet-950/20 to-transparent border-b border-white/[0.08]">
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap size={12} className="text-violet-400" /> State Administrative Pre-Warmer
          </p>

          <div className="space-y-2.5">
            <div className="flex gap-2">
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                disabled={warmingActive}
                className="flex-1 bg-[#121222] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
              >
                <option value="Andhra Pradesh">Andhra Pradesh (All 26 Districts)</option>
                <option value="Telangana">Telangana (All 33 Districts)</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
              </select>

              {warmingActive ? (
                <button
                  type="button"
                  onClick={handleStopWarming}
                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartWarming}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/30 flex items-center gap-1"
                >
                  <Zap size={12} /> Warm
                </button>
              )}
            </div>

            {warmingActive && (
              <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-violet-500/20 text-xs">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Target District:</span>
                  <span className="font-bold text-violet-300 truncate">{warmingStatus.activeDistrict || 'Initializing...'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Target Mandal:</span>
                  <span className="font-bold text-cyan-300 truncate">{warmingStatus.activeMandal || 'Resolving coordinates...'}</span>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Mandals: {warmingStatus.completedMandals} / {warmingStatus.totalMandals}</span>
                    <span className="font-mono text-emerald-400">
                      {Math.round((warmingStatus.completedMandals / (warmingStatus.totalMandals || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-cyan-500 h-full transition-all duration-300"
                      style={{ width: `${(warmingStatus.completedMandals / (warmingStatus.totalMandals || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fetch Precise OSM Nodes */}
        <div className="p-4 border-b border-white/[0.08] bg-white/[0.01]">
          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Search size={11} /> Real-Time OSM Gazette Resolution
          </p>
          <form onSubmit={handleFetchOSM} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Guntur, Brodipet, Tenali"
              value={osmQuery}
              onChange={e => setOsmQuery(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={fetchingOSM}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm"
            >
              {fetchingOSM ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
              <span>Resolve</span>
            </button>
          </form>
        </div>

        {/* Learned Tree Hierarchy */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {Object.keys(memory).length === 0 && !loading && (
            <div className="text-center py-12 text-slate-500 text-xs">
              No learned locations yet. Run a semantic scrape or state warmer to populate.
            </div>
          )}

          {Object.keys(memory).map(parentKey => {
            const children = memory[parentKey] || [];
            const isExpanded = expandedNodes[parentKey];

            return (
              <div
                key={parentKey}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/[0.04] transition-all"
                  onClick={() => toggleNode(parentKey)}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-200 capitalize">
                    {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    <span>{parentKey}</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {children.length}
                    </span>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handlePlotOnMap(parentKey, children);
                    }}
                    disabled={geocoding && selectedParent === parentKey}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition-all"
                  >
                    {geocoding && selectedParent === parentKey ? (
                      <RefreshCw size={10} className="animate-spin text-violet-400" />
                    ) : (
                      <MapPin size={10} className="text-violet-400" />
                    )}
                    <span>Plot</span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-3 bg-black/20">
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {children.map((child, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 capitalize"
                        >
                          {child}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT RADAR GEOMESH MAP ── */}
      <div className="flex-1 h-[50vh] lg:h-screen relative bg-[#07070d]">
        <MapContainer
          center={[16.3067, 80.4365]} // Default Guntur / AP
          zoom={8}
          style={{ height: '100%', width: '100%', background: '#090912' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
            maxZoom={16}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri'
            maxZoom={16}
          />

          <MapRecenter points={mapPoints} />

          {mapPoints.map((pt, idx) => (
            <Marker key={idx} position={[pt.lat, pt.lng]} icon={createCyberPin('#00f3ff')}>
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-black text-slate-900 capitalize">{pt.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {parseFloat(pt.lat).toFixed(4)}, {parseFloat(pt.lng).toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {mapPoints.length === 0 && (
          <div className="absolute inset-0 z-[400] pointer-events-none flex items-center justify-center bg-black/40">
            <div className="bg-[#0f0f1c]/90 backdrop-blur-md px-6 py-5 rounded-2xl border border-white/[0.1] shadow-2xl flex flex-col items-center max-w-sm text-center">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center mb-3">
                <MapPin size={22} />
              </div>
              <h3 className="font-bold text-white text-sm">Geomesh Radar Standby</h3>
              <p className="text-xs text-slate-400 mt-1">
                Click "Plot" on any district or mandal in the left panel to project all administrative sub-nodes onto the live map.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
