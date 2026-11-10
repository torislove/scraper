import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FolderOpen, Database, Download, Search, CheckCircle2,
  MapPin, Phone, Building2, Sparkles, Filter, ShieldCheck,
  ChevronRight, ExternalLink, ArrowUpRight, Check, FileSpreadsheet,
  Layers, Users, Star, Eye, EyeOff
} from "lucide-react";

const DEMO_FOLDERS = [
  {
    id: "folder-guntur-mandapams",
    name: "Kalyana Mandapams — Guntur",
    category: "Venues & Mandapams",
    city: "Guntur",
    state: "Andhra Pradesh",
    leadCount: 142,
    phonePercent: 96,
    waPercent: 91,
    pipeline: "₹4,80,000",
    localities: ["All Areas", "Brodipet", "Arundelpet", "Pattabhipuram", "Kaza / Highway", "Mangalagiri"],
    leads: [
      { id: "g1", name: "Sri Venkateswara Royal Kalyana Mandapam", locality: "Brodipet", phone: "+91 94401 56782", type: "Mobile / WhatsApp", capacity: "1,200", ac: "Yes (Full AC)", rooms: "8 Rooms", parking: "120 Cars", rating: "4.9", stage: "Won" },
      { id: "g2", name: "Sita Rama Convention Center & AC Hall", locality: "Arundelpet", phone: "+91 98481 23901", type: "Mobile / WhatsApp", capacity: "1,800", ac: "Yes (Central AC)", rooms: "12 Rooms", parking: "200 Cars", rating: "4.8", stage: "Contacted" },
      { id: "g3", name: "Tirumala Choultry & Function Hall", locality: "Pattabhipuram", phone: "0863 2234567", type: "STD Landline (Call Only)", capacity: "600", ac: "Non-AC / Air Coolers", rooms: "4 Rooms", parking: "40 Cars", rating: "4.6", stage: "New" },
      { id: "g4", name: "Amaravathi Grand Kalyana Vedika", locality: "Mangalagiri", phone: "+91 99890 44512", type: "Mobile / WhatsApp", capacity: "2,200", ac: "Yes (Full AC)", rooms: "15 Rooms", parking: "250 Cars", rating: "4.9", stage: "Won" },
      { id: "g5", name: "Lakshmi Ganapathi Mini Function Hall", locality: "Kaza / Highway", phone: "+91 94902 33819", type: "Mobile / WhatsApp", capacity: "350", ac: "Partial AC", rooms: "2 Rooms", parking: "30 Cars", rating: "4.5", stage: "In Review" }
    ]
  },
  {
    id: "folder-vja-photographers",
    name: "Wedding Photographers — Vijayawada",
    category: "Candid & Cinematography",
    city: "Vijayawada",
    state: "Andhra Pradesh",
    leadCount: 88,
    phonePercent: 98,
    waPercent: 95,
    pipeline: "₹2,40,000",
    localities: ["All Areas", "Benz Circle", "Governorpet", "Patamata", "Moghalrajpuram"],
    leads: [
      { id: "v1", name: "Sri Krishna 4K Cinematography & Drone Studio", locality: "Benz Circle", phone: "+91 98480 23419", type: "Mobile / WhatsApp", capacity: "Team Size: 6", ac: "Drone 4K", rooms: "7-Day Delivery", parking: "Album Lab", rating: "4.9", stage: "Won" },
      { id: "v2", name: "Moments & Memories Wedding Filmers", locality: "Patamata", phone: "+91 98661 88920", type: "Mobile / WhatsApp", capacity: "Team Size: 4", ac: "Candid + Traditional", rooms: "10-Day Delivery", parking: "Studio Set", rating: "4.8", stage: "Contacted" },
      { id: "v3", name: "Nandi Digital Photography", locality: "Governorpet", phone: "0866 2471890", type: "STD Landline (Call Only)", capacity: "Team Size: 3", ac: "Traditional Only", rooms: "15-Day Delivery", parking: "Storefront", rating: "4.4", stage: "New" },
      { id: "v4", name: "Vanguard Cinematic Wedding Lab", locality: "Moghalrajpuram", phone: "+91 99491 55620", type: "Mobile / WhatsApp", capacity: "Team Size: 8", ac: "Dual Drones + Jimmy Jib", rooms: "5-Day Delivery", parking: "Post-Production", rating: "5.0", stage: "Won" }
    ]
  },
  {
    id: "folder-hyd-banquets",
    name: "Banquet & Convention Halls — Hyderabad",
    category: "Luxury Venues & Banquets",
    city: "Hyderabad",
    state: "Telangana",
    leadCount: 215,
    phonePercent: 94,
    waPercent: 88,
    pipeline: "₹12,50,000",
    localities: ["All Areas", "Madhapur", "Gachibowli", "Kukatpally", "Banjara Hills"],
    leads: [
      { id: "h1", name: "Grand Imperial Convention & Banquets", locality: "Madhapur", phone: "+91 99891 76542", type: "Mobile / WhatsApp", capacity: "2,500", ac: "Central AC", rooms: "20 Deluxe", parking: "350 Valet", rating: "4.8", stage: "Won" },
      { id: "h2", name: "Kohinoor Royal Palace & Open Lawn", locality: "Gachibowli", phone: "+91 98490 11987", type: "Mobile / WhatsApp", capacity: "3,000", ac: "Pillarless AC Hall", rooms: "16 Rooms", parking: "400 Valet", rating: "4.9", stage: "Contacted" },
      { id: "h3", name: "Sri Sai Celebrations Mini Hall", locality: "Kukatpally", phone: "040 23067891", type: "STD Landline (Call Only)", capacity: "400", ac: "Full AC", rooms: "3 Rooms", parking: "50 Cars", rating: "4.5", stage: "New" },
      { id: "h4", name: "Taj Banjara Banquet Suites", locality: "Banjara Hills", phone: "+91 98499 88123", type: "Mobile / WhatsApp", capacity: "1,000", ac: "5-Star AC", rooms: "60 Suites", parking: "200 Valet", rating: "4.9", stage: "Won" }
    ]
  },
  {
    id: "folder-warangal-caterers",
    name: "Caterers & Traditional Sweets — Warangal",
    category: "Catering & Event Feasts",
    city: "Warangal",
    state: "Telangana",
    leadCount: 64,
    phonePercent: 97,
    waPercent: 92,
    pipeline: "₹1,90,000",
    localities: ["All Areas", "Hanamkonda", "Kazipet", "Narsampet Road"],
    leads: [
      { id: "w1", name: "Sri Annapurna Traditional Wedding Caterers", locality: "Hanamkonda", phone: "+91 98492 77312", type: "Mobile / WhatsApp", capacity: "Up to 5,000 Feasts", ac: "Veg & Non-Veg", rooms: "Live Cooking Stalls", parking: "Buffet Setup", rating: "4.9", stage: "Won" },
      { id: "w2", name: "Bhadrakali Pure Ghee Sweet Stall & Feasts", locality: "Kazipet", phone: "+91 94403 66190", type: "Mobile / WhatsApp", capacity: "Up to 2,000 Feasts", ac: "Traditional South Indian", rooms: "Custom Menu", parking: "Delivery Vans", rating: "4.8", stage: "Contacted" }
    ]
  }
];

export default function FolderExplorer({ onClaimClick }) {
  const [activeFolderId, setActiveFolderId] = useState(DEMO_FOLDERS[0].id);
  const [selectedLocality, setSelectedLocality] = useState("All Areas");
  const [searchQuery, setSearchQuery] = useState("");
  const [maskPhones, setMaskPhones] = useState(false);

  const currentFolder = useMemo(() => {
    return DEMO_FOLDERS.find((f) => f.id === activeFolderId) || DEMO_FOLDERS[0];
  }, [activeFolderId]);

  // Filter leads inside the folder
  const filteredLeads = useMemo(() => {
    return currentFolder.leads.filter((l) => {
      const matchLoc = selectedLocality === "All Areas" || l.locality === selectedLocality;
      const matchSearch =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.capacity.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLoc && matchSearch;
    });
  }, [currentFolder, selectedLocality, searchQuery]);

  // Real CSV Download functionality!
  const handleExportCSV = () => {
    const headers = ["Business Name", "Locality", "City", "State", "Phone", "Phone Type", "Capacity / Team", "AC Status", "Rooms / Features", "Parking", "Rating", "CRM Stage"];
    const rows = currentFolder.leads.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.locality}"`,
      `"${currentFolder.city}"`,
      `"${currentFolder.state}"`,
      `"${l.phone}"`,
      `"${l.type}"`,
      `"${l.capacity}"`,
      `"${l.ac}"`,
      `"${l.rooms}"`,
      `"${l.parking}"`,
      `"${l.rating}"`,
      `"${l.stage}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `scraper-co-in-${currentFolder.city.toLowerCase()}-${currentFolder.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="folder-explorer-card">
      {/* Top Banner */}
      <div className="folder-explorer-top">
        <div className="fe-brand">
          <span className="fe-icon-box">
            <FolderOpen size={17} />
          </span>
          <div>
            <b>TERRITORY FOLDERS & VAULT</b>
            <small>Organized by City, Category & Locality · CRM Ready</small>
          </div>
        </div>

        <div className="fe-top-actions">
          <button
            className="fe-mask-toggle"
            onClick={() => setMaskPhones(!maskPhones)}
            title="Toggle phone number masking preview"
          >
            {maskPhones ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{maskPhones ? "Masked" : "Unmasked"}</span>
          </button>

          <button className="fe-export-btn" onClick={handleExportCSV}>
            <FileSpreadsheet size={14} />
            <span>Export Folder (CSV)</span>
          </button>
        </div>
      </div>

      <div className="folder-explorer-body">
        {/* Left: Folders Sidebar */}
        <aside className="fe-sidebar">
          <div className="fe-sidebar-title">
            <span>SAVED SWEEPS ({DEMO_FOLDERS.length})</span>
            <span className="fe-free-badge">FREE EXPORT</span>
          </div>

          <div className="fe-folder-list">
            {DEMO_FOLDERS.map((f) => {
              const isSelected = f.id === activeFolderId;
              return (
                <button
                  key={f.id}
                  className={`fe-folder-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    setActiveFolderId(f.id);
                    setSelectedLocality("All Areas");
                  }}
                >
                  <div className="fe-folder-icon">
                    {isSelected ? <FolderOpen size={16} /> : <Folder size={16} />}
                  </div>
                  <div className="fe-folder-text">
                    <span className="fe-folder-name">{f.name}</span>
                    <small className="fe-folder-meta">
                      {f.leadCount} leads · {f.city}
                    </small>
                  </div>
                  <span className="fe-folder-count">{f.leadCount}</span>
                </button>
              );
            })}
          </div>

          <div className="fe-sidebar-box">
            <Sparkles size={14} className="text-mint" />
            <b>Zero Expiry Folders</b>
            <small>Credits only deduct once per new lead. Once in a folder, re-export and edit forever.</small>
          </div>
        </aside>

        {/* Right: Folder Lead Workspace & Table */}
        <main className="fe-main">
          {/* Active Folder Header */}
          <div className="fe-folder-header">
            <div>
              <div className="fe-breadcrumbs">
                <span>TERRITORY VAULT</span> / <span>{currentFolder.state}</span> / <b>{currentFolder.city}</b>
              </div>
              <h3>{currentFolder.name}</h3>
            </div>

            <div className="fe-stats-strip">
              <div className="fe-stat">
                <span>TOTAL LEADS</span>
                <b>{currentFolder.leadCount}</b>
              </div>
              <div className="fe-stat">
                <span>MOBILE / WA</span>
                <b className="text-mint">{currentFolder.waPercent}%</b>
              </div>
              <div className="fe-stat">
                <span>PIPELINE VALUE</span>
                <b>{currentFolder.pipeline}</b>
              </div>
            </div>
          </div>

          {/* Subfolder Locality Filter Chips */}
          <div className="fe-locality-filter">
            <span className="filter-label">LOCALITIES:</span>
            <div className="locality-chips">
              {currentFolder.localities.map((loc) => (
                <button
                  key={loc}
                  className={`locality-chip ${selectedLocality === loc ? "active" : ""}`}
                  onClick={() => setSelectedLocality(loc)}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar inside Folder */}
          <div className="fe-search-bar">
            <Search size={15} className="text-muted" />
            <input
              type="text"
              placeholder={`Search in ${currentFolder.name} (e.g. Brodipet, AC, 1200 capacity)...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-btn" onClick={() => setSearchQuery("")}>
                Clear
              </button>
            )}
          </div>

          {/* Leads Table */}
          <div className="fe-table-wrap">
            <table className="fe-table">
              <thead>
                <tr>
                  <th>BUSINESS & LOCALITY</th>
                  <th>DEEP SPECIFICATIONS</th>
                  <th>PHONE CLASSIFICATION</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const isMobile = lead.type.includes("WhatsApp");
                  const displayPhone = maskPhones
                    ? lead.phone.replace(/(\d{4})$/, "••••")
                    : lead.phone;

                  return (
                    <tr key={lead.id} className="fe-row">
                      <td className="fe-cell-name">
                        <div className="b-name-wrap">
                          <span className="b-avatar">
                            <Building2 size={14} />
                          </span>
                          <div>
                            <b>{lead.name}</b>
                            <span className="b-loc">
                              <MapPin size={11} /> {lead.locality}, {currentFolder.city}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="fe-cell-specs">
                        <div className="specs-stack">
                          <span className="spec-item cap">
                            <b>Cap:</b> {lead.capacity}
                          </span>
                          <span className="spec-item ac">{lead.ac}</span>
                          <span className="spec-item rooms">{lead.rooms}</span>
                        </div>
                      </td>

                      <td className="fe-cell-phone">
                        <div className="phone-stack">
                          <span className="phone-digits">{displayPhone}</span>
                          <span className={`phone-type-pill ${isMobile ? "mobile" : "landline"}`}>
                            {isMobile ? <CheckCircle2 size={10} /> : <Phone size={10} />}
                            {lead.type}
                          </span>
                        </div>
                      </td>

                      <td className="fe-cell-action">
                        {isMobile ? (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wa-pill-btn"
                          >
                            <span>WhatsApp</span>
                            <ArrowUpRight size={12} />
                          </a>
                        ) : (
                          <a href={`tel:${lead.phone}`} className="call-pill-btn">
                            <span>Call STD</span>
                            <Phone size={12} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Folder Footer Note */}
          <div className="fe-footer-note">
            <ShieldCheck size={13} className="text-mint" />
            <span>Strict Indian telecom formatting: Landlines preserve leading 0; Mobiles link directly to WhatsApp Web / Desktop dialer.</span>
            <button className="fe-footer-claim-btn" onClick={onClaimClick}>
              Claim 1,000 Free Leads <ChevronRight size={14} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

