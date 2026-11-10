import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Camera, Utensils, Sparkles, Check,
  Phone, Smartphone, ShieldCheck, Layers, Eye,
  Truck, Gem, Shirt, ArrowRight, MapPin
} from "lucide-react";

const PAN_INDIA_CATEGORIES = [
  {
    id: "venues",
    name: "Wedding Venues & Mandapams",
    badge: "Hospitality & Conventions",
    icon: "/assets/3d_venue.png",
    region: "Andhra Pradesh, Telangana & Pan-India",
    cities: "Guntur, Vijayawada, Hyderabad, Tirupati, Bengaluru, Jaipur",
    fields: [
      { name: "Max Guest Capacity", value: "350 to 5,000+ Guests", highlight: true },
      { name: "Air Conditioning (AC)", value: "Central AC / Partial / Air Coolers" },
      { name: "Lodging Rooms", value: "Bridal Suite + 8 to 25 Deluxe Rooms" },
      { name: "Car Parking Scale", value: "Dedicated Parking / Valet (150 to 400 Cars)" },
      { name: "Direct Decision-Maker", value: "Venue Managing Trustee / Proprietor Mobile (+91)" }
    ],
    sampleSnippet: "Sri Venkateswara Royal Convention · Brodipet Guntur · 1,800 Cap · Full Central AC · 15 Rooms · 200 Cars"
  },
  {
    id: "textiles",
    name: "Textile Wholesalers & Mills",
    badge: "B2B Manufacturing & Apparel",
    icon: "/assets/3d_clothes.png",
    region: "Gujarat, AP, TN & Pan-India Hubs",
    cities: "Surat, Ahmedabad, Tirupur, Guntur Handlooms, Ludhiana, Mumbai",
    fields: [
      { name: "Trade Specialization", value: "Pure Silk Sarees, Cotton Fabrics, Bulk Garments", highlight: true },
      { name: "Supply & Dispatch Scale", value: "5,000 to 50,000 Meters / Daily Bulk Dispatch" },
      { name: "Registration Details", value: "Shown only when found in a public source — otherwise Unknown" },
      { name: "Proprietor Pocket Mobile", value: "Direct Mill Owner WhatsApp Number (Zero Switchboard)" },
      { name: "Brochure Sharing", value: "1-Click WhatsApp PDF Wholesale Rate Card" }
    ],
    sampleSnippet: "Radha Krishna Silk & Textile Mills · Ring Road Surat · 20,000 Mtr/Day · Active GST · Mill Owner Direct Mobile"
  },
  {
    id: "hardware",
    name: "Hardware & Industrial Stockists",
    badge: "Engineering & Heavy Trade",
    icon: "/assets/3d_car.png",
    region: "South & West India Trade Hubs",
    cities: "Arundelpet Guntur, Ranigunj Hyderabad, Coimbatore, Pune, Rajkot",
    fields: [
      { name: "Commercial Category", value: "Switchgears, Heavy Power Cables, Transformers", highlight: true },
      { name: "Authorized Distributorship", value: "Master Stockist / Regional C&F Agent" },
      { name: "Warehouse Footprint", value: "10,000+ Sq. Ft. Commercial Storage" },
      { name: "Gatekeeper Status", value: "0 Switchboards · 100% Direct Owner Mobile (+91)" },
      { name: "Order Turnaround", value: "Same-Day Dispatch for Regional Dealers" }
    ],
    sampleSnippet: "Mahalakshmi Electricals & Heavy Hardware · Arundelpet Guntur · Master Stockist · Proprietor Direct Mobile"
  },
  {
    id: "photo",
    name: "Wedding Photographers & 4K Labs",
    badge: "Media & High-End Visuals",
    icon: "/assets/3d_camera.png",
    region: "Andhra, Telangana, Karnataka & Kerala",
    cities: "NTR Vijayawada, Hyderabad, Visakhapatnam, Bengaluru, Kochi",
    fields: [
      { name: "Production Crew Size", value: "4 to 12 Specialists (Candid + Traditional)", highlight: true },
      { name: "Drone & Cinema Fleet", value: "4K HDR Aerial Drones, Sony Cinema FX3, Jimmy Jib" },
      { name: "Fast Delivery Guarantee", value: "5 to 7-Day Fast Delivery (Album + Teaser Reels)" },
      { name: "Decision-Maker Mobile", value: "Lead Cinematographer / Studio Founder Direct" },
      { name: "Live Portfolio Review", value: "1-Click WhatsApp Direct Work Sample Catalog" }
    ],
    sampleSnippet: "Sri Krishna 4K Cine Labs · Benz Circle Vijayawada · Team: 6 · Drone 4K HDR · 7-Day Turnaround · Founder Direct"
  },
  {
    id: "catering",
    name: "Caterers & Traditional Sweets",
    badge: "Hospitality & Feasts",
    icon: "/assets/3d_food.png",
    region: "Telangana, AP, Tamil Nadu & North India",
    cities: "Warangal, Guntur, Hyderabad, Madurai, Varanasi, Indore",
    fields: [
      { name: "Feast Scale Handling", value: "500 to 10,000+ Guests per Event", highlight: true },
      { name: "Cuisine Specialization", value: "Pure Ghee Traditional Sweets, Royal Telugu & Mughlai Feasts" },
      { name: "Live Stalls & Counters", value: "Chaat, Live Pootharekulu, Jalebi, Mocktail Bars" },
      { name: "Proprietor Contact", value: "Master Chef & Catering Owner Mobile (+91 WhatsApp)" },
      { name: "Service Fleet", value: "Uniformed Stewards & Dedicated Buffet Logistics" }
    ],
    sampleSnippet: "Sri Annapurna Traditional Feasts · Hanamkonda Warangal · 5,000 Scale · Live Ghee Counters · Owner Direct"
  },
  {
    id: "jewelry",
    name: "Luxury Jewelry & Bullion Dealers",
    badge: "High-Ticket Retail & Gems",
    icon: "/assets/3d_jewelry.png",
    region: "All-India Commercial Centers",
    cities: "Vijayawada, Coimbatore, Zaveri Bazaar Mumbai, Thrissur, Jaipur",
    fields: [
      { name: "Retail Showroom Format", value: "Multi-Store Retail Chain / Certified Bullion Wholesaler", highlight: true },
      { name: "Certification Standard", value: "100% BIS 916 Hallmarked Gold & Certified Diamonds" },
      { name: "Decision-Maker Direct Line", value: "Showroom Director / Managing Partner Personal Mobile" },
      { name: "Security & Escrow", value: "Fully Insured Vault & Audited GST Billing" },
      { name: "VIP Outreach", value: "Private 1-on-1 WhatsApp Video Showcases" }
    ],
    sampleSnippet: "Kalyan Ratan Jewelers & Bullion · Governorpet Vijayawada · Showroom Director Direct Mobile · BIS 916"
  }
];

export default function DeepVenueFeatures() {
  const [activeTab, setActiveTab] = useState(PAN_INDIA_CATEGORIES[0]);

  return (
    <div className="deep-features-section">
      <div className="deep-features-header">
        <span className="eyebrow">
          <Layers size={13} className="text-mint" /> PAN-INDIA BUSINESS INTELLIGENCE
        </span>
        <h2>Not just names and phone numbers.<br /><span className="gradient-text">Complete business &amp; vendor profile intelligence.</span></h2>
        <p>Scraper.co.in collects structured attributes across wedding venues, wholesalers, healthcare, and retail so your sales team knows capacity, scale, and owner details before messaging.</p>
      </div>

      <div className="deep-features-container">
        {/* Category Tabs */}
        <div className="df-category-tabs" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {PAN_INDIA_CATEGORIES.map((cat) => {
            const isSelected = cat.id === activeTab.id;
            return (
              <button
                key={cat.id}
                className={`df-cat-tab ${isSelected ? "selected" : ""}`}
                onClick={() => setActiveTab(cat)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "14px",
                  background: isSelected ? "rgba(102, 230, 189, 0.12)" : "rgba(255, 255, 255, 0.02)",
                  border: isSelected ? "1px solid rgba(102, 230, 189, 0.45)" : "1px solid rgba(165, 184, 204, 0.12)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "0.2s"
                }}
              >
                <img
                  src={cat.icon}
                  alt={cat.name}
                  className="df-cat-icon"
                  style={{ width: "26px", height: "26px", objectFit: "contain" }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <b style={{ display: "block", fontSize: "12.5px", color: isSelected ? "#66e6bd" : "#f4f7fb" }}>
                    {cat.name}
                  </b>
                  <small style={{ fontSize: "10px", color: "#8fa0b3" }}>
                    {cat.badge}
                  </small>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Category Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            className="df-display-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{
              background: "rgba(14, 22, 32, 0.88)",
              border: "1px solid rgba(102, 230, 189, 0.25)",
              borderRadius: "18px",
              padding: "28px",
              marginTop: "20px"
            }}
          >
            <div className="df-card-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
              <div className="df-title-area">
                <span className="df-tag" style={{ background: "rgba(102, 230, 189, 0.1)", color: "#66e6bd", fontSize: "10px", fontWeight: 800, padding: "4px 10px", borderRadius: "999px" }}>
                  STRUCTURED EXCEL &amp; CRM FORMAT
                </span>
                <h3 style={{ fontSize: "22px", fontWeight: 700, color: "#FFFFFF", margin: "8px 0 4px" }}>
                  {activeTab.name}
                </h3>
                <span style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={12} className="text-mint" /> <b>Key Coverage:</b> {activeTab.cities}
                </span>
              </div>
              <div className="df-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "6px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: 800, display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={14} /> 100% EXPORTABLE
              </div>
            </div>

            <div className="df-fields-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
              {activeTab.fields.map((field, idx) => (
                <div
                  key={idx}
                  className={`df-field-box ${field.highlight ? "highlight" : ""}`}
                  style={{
                    background: field.highlight ? "rgba(102, 230, 189, 0.08)" : "rgba(8, 14, 22, 0.65)",
                    border: field.highlight ? "1px solid rgba(102, 230, 189, 0.35)" : "1px solid rgba(165, 184, 204, 0.1)",
                    borderRadius: "12px",
                    padding: "14px 16px"
                  }}
                >
                  <div className="field-name" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>
                    <Check size={13} className="text-mint" />
                    <span>{field.name}</span>
                  </div>
                  <div className="field-val" style={{ fontSize: "13.5px", fontWeight: 750, color: field.highlight ? "#66e6bd" : "#f4f7fb" }}>
                    {field.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Sample Snippet Callout */}
            <div className="df-sample-callout" style={{ marginTop: "22px", background: "rgba(6, 11, 18, 0.9)", border: "1px solid rgba(102, 230, 189, 0.2)", borderRadius: "12px", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <span className="sample-label" style={{ fontSize: "10px", fontWeight: 800, color: "#66e6bd", letterSpacing: "0.12em" }}>
                ⭐ VERIFIED RECORD PREVIEW IN EXCEL / CSV:
              </span>
              <code style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "monospace", wordBreak: "break-all" }}>
                {activeTab.sampleSnippet}
              </code>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
