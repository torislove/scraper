import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Search, ChevronDown, ChevronRight, Zap, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../apiConfig';

// Fix for default Leaflet markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter map when points change
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

  const [selectedState, setSelectedState] = useState('Telangana');
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

  // Check initial status on mount
  useEffect(() => {
    fetchWarmingStatus();
  }, []);

  async function fetchWarmingStatus() {
    try {
      const res = await fetch(`${API_URL}/api/locations/warm-state/status`);
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

  // Polling for warming status
  useEffect(() => {
    let intervalId;
    if (warmingActive) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/locations/warm-state/status`);
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
      const res = await fetch(`${API_URL}/api/locations/warm-state`, {
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
      const res = await fetch(`${API_URL}/api/locations/warm-state/stop`, { method: 'POST' });
      const data = await res.json();
      toast.success(data.message || 'Warming stopped.');
      setWarmingActive(false);
    } catch (err) {
      toast.error('Failed to stop state warming');
    }
  };

  useEffect(() => {
    fetchMemory();
  }, []);

  async function fetchMemory() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/locations/memory`);
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
    setExpandedNodes(prev => ({
      ...prev,
      [nodeName]: !prev[nodeName]
    }));
  };

  const handlePlotOnMap = async (parentName, childrenArray) => {
    try {
      setGeocoding(true);
      setSelectedParent(parentName);
      const res = await fetch(`${API_URL}/api/locations/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: childrenArray })
      });
      const data = await res.json();
      
      if (data && data.length > 0) {
        setMapPoints(data);
        toast.success(`Plotted ${data.length} locations on the map`);
      } else {
        toast.error('No locations could be geocoded');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to geocode locations');
    } finally {
      setGeocoding(false);
    }
  };

  const handleFetchOSM = async (e) => {
    e.preventDefault();
    if (!osmQuery) return;
    try {
      setFetchingOSM(true);
      const res = await fetch(`${API_URL}/api/locations/osm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ district: osmQuery })
      });
      const data = await res.json();
      if (data && data.length > 0) {
        setMapPoints(data);
        toast.success(`Fetched ${data.length} precise locations from OSM`);
      } else {
        toast.error('No locations found in OSM for this region');
      }
    } catch (err) {
      toast.error('Failed to fetch from OSM');
    } finally {
      setFetchingOSM(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col md:flex-row bg-[#f7f8fa]">
      
      {/* ── LEFT PANEL (TEXT VIEW) ── */}
      <div className="w-full md:w-1/3 bg-white border-r border-gray-100 flex flex-col min-h-[50vh] md:min-h-screen">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <MapPin size={20} className="text-violet-600" />
              AI Memory
            </h1>
            <p className="text-xs text-gray-500 mt-1">Learned geography & locations</p>
          </div>
          <button 
            onClick={fetchMemory}
            className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* ── STATE GEOGRAPHY WARMER (BACKGROUND PROCESS) ── */}
        <div className="p-4 bg-slate-900 text-white border-b border-gray-800">
          <p className="text-xs font-bold text-violet-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
            <Zap size={14} className="text-violet-400 fill-violet-400/20" /> State Geography Warmer
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                disabled={warmingActive}
                className="flex-1 bg-black/40 border border-violet-900/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
              >
                <option value="Telangana">Telangana</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Kerala">Kerala</option>
              </select>
              {warmingActive ? (
                <button
                  type="button"
                  onClick={handleStopWarming}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartWarming}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-1"
                >
                  <RefreshCw size={14} /> Warm
                </button>
              )}
            </div>

            {warmingActive && (
              <div className="space-y-2 bg-black/30 p-3 rounded-lg border border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Active District:</span>
                  <span className="font-bold text-white truncate max-w-[150px]">{warmingStatus.activeDistrict || 'Initializing...'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Active Mandal:</span>
                  <span className="font-bold text-white truncate max-w-[150px]">{warmingStatus.activeMandal || 'Initializing...'}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-white/50">
                    <span>Mandals: {warmingStatus.completedMandals} / {warmingStatus.totalMandals}</span>
                    <span>{Math.round((warmingStatus.completedMandals / (warmingStatus.totalMandals || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-violet-500 h-full transition-all duration-300"
                      style={{ width: `${(warmingStatus.completedMandals / (warmingStatus.totalMandals || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-violet-50 border-b border-gray-100">
          <p className="text-xs font-bold text-violet-700 mb-2">Fetch precise OSM Nodes (Mandals/Villages)</p>
          <form onSubmit={handleFetchOSM} className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. Guntur" 
              value={osmQuery}
              onChange={(e) => setOsmQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-violet-200 rounded-lg focus:outline-none focus:border-violet-400"
            />
            <button 
              type="submit" 
              disabled={fetchingOSM}
              className="bg-violet-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1"
            >
              {fetchingOSM ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Fetch
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {Object.keys(memory).length === 0 && !loading && (
            <div className="text-center py-10 text-gray-500 text-sm">
              No locations learned yet. Run a semantic scrape to build memory!
            </div>
          )}

          {Object.keys(memory).map((parentKey) => {
            const children = memory[parentKey];
            const isExpanded = expandedNodes[parentKey];
            
            return (
              <div key={parentKey} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleNode(parentKey)}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm text-gray-800 capitalize">
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    {parentKey}
                    <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                      {children.length}
                    </span>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handlePlotOnMap(parentKey, children); }}
                    disabled={geocoding && selectedParent === parentKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 hover:border-violet-300 transition-all disabled:opacity-50"
                  >
                    {geocoding && selectedParent === parentKey ? (
                      <RefreshCw size={12} className="animate-spin text-violet-600" />
                    ) : (
                      <MapPin size={12} className="text-violet-600" />
                    )}
                    Plot Map
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="bg-white border-t border-gray-100 px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {children.map((child, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 border border-violet-100 rounded-lg text-xs font-medium capitalize">
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

      {/* ── RIGHT PANEL (MAP VIEW) ── */}
      <div className="w-full md:w-2/3 h-[50vh] md:h-screen relative bg-gray-100">
        <MapContainer 
          center={[20.5937, 78.9629]} // Default to India
          zoom={5} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <MapRecenter points={mapPoints} />

          {mapPoints.map((pt, idx) => (
            <Marker key={idx} position={[pt.lat, pt.lng]} icon={redIcon}>
              <Popup>
                <div className="font-bold text-sm text-gray-900 capitalize">{pt.name}</div>
                <div className="text-xs text-gray-500 mt-1">Learned by AI Memory</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {mapPoints.length === 0 && (
          <div className="absolute inset-0 z-[400] pointer-events-none flex items-center justify-center bg-black/5">
            <div className="bg-white/90 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-xl shadow-gray-200/50 flex flex-col items-center border border-gray-100">
              <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-3">
                <MapPin size={24} />
              </div>
              <h3 className="font-bold text-gray-900">Map is Empty</h3>
              <p className="text-sm text-gray-500 max-w-xs text-center mt-1">
                Click "Plot Map" on any location node in the left panel to geocode and visualize its sub-regions here.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
