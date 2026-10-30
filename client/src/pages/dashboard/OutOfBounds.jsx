import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Phone, MapPin, Database, Navigation } from 'lucide-react';
import { API_URL } from '../../apiConfig';

export default function OutOfBoundsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/vendors/out-of-bounds`);
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const exportCSV = () => {
    if (!vendors.length) return;
    const headers = ['Name', 'Category', 'City', 'Phone', 'Address', 'Distance (km)', 'Source'];
    const rows = vendors.map(v => [
      `"${(v.name || '').replace(/"/g, '""')}"`,
      `"${v.category || ''}"`,
      `"${v.city || ''}"`,
      `"${v.phone || ''}"`,
      `"${(v.address || '').replace(/"/g, '""')}"`,
      v.outOfBoundsDistance || '',
      `"${v.source || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "out_of_bounds_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-[#f7f8fa]">
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Out of Bounds Leads</h1>
            <p className="text-sm text-gray-500 mt-0.5">Contacts discovered outside your requested search radius</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchVendors} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-violet-600 transition-all shadow-sm">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all">
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="space-y-3">
          {vendors.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-gray-400">
              <Database size={40} className="mb-4 opacity-20" />
              <p className="font-bold">No out-of-bounds leads captured yet.</p>
            </div>
          ) : (
            vendors.map((vendor, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-black flex-shrink-0">
                  <Navigation size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{vendor.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{vendor.category}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin size={9} />{vendor.address || vendor.city}</span>
                    <span className="text-xs text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded ml-2">
                      {vendor.outOfBoundsDistance}km away
                    </span>
                  </div>
                </div>
                {vendor.phone && (
                  <div className="flex-shrink-0">
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg border border-green-100">
                      <Phone size={12} /> {vendor.phone}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
