import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, Sparkles, ArrowRight,
  Building2, Phone, MapPin, Mail, ShieldCheck, Key, Zap
} from "lucide-react";

export default function ClaimModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    city: "Guntur",
    niche: "Venues & Kalyana Mandapams"
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleLaunchDashboard = () => {
    onClose();
    navigate('/command');
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose}>
        <motion.div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.25 }}
        >
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>

          {!submitted ? (
            <div>
              <div className="modal-head">
                <span className="eyebrow">
                  <Sparkles size={13} className="text-mint" /> 1,000 FREE VERIFIED LEADS
                </span>
                <h3>Claim Your Free Scraper.co.in Access</h3>
                <p>Zero lock. Zero credit card needed. Get 1,000 free verified proprietor leads with direct WhatsApp contact.</p>
              </div>

              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-group">
                  <label>Full Name or Business Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manoj Kumar / Apex Media"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>WhatsApp Mobile Number (For Instant Activation)</label>
                  <div className="input-with-prefix">
                    <span>+91</span>
                    <input
                      type="tel"
                      required
                      placeholder="98480 XXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Target City / District</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    >
                      <option value="Guntur">Guntur (AP)</option>
                      <option value="Vijayawada">Vijayawada (AP)</option>
                      <option value="Hyderabad">Hyderabad (TS)</option>
                      <option value="Warangal">Warangal (TS)</option>
                      <option value="Visakhapatnam">Visakhapatnam (AP)</option>
                      <option value="Tirupati">Tirupati (AP)</option>
                      <option value="Bengaluru">Bengaluru (KA)</option>
                      <option value="Other">Other City / District</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Target Business Category</label>
                    <select
                      value={formData.niche}
                      onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                    >
                      <option value="Venues & Kalyana Mandapams">Venues & Kalyana Mandapams</option>
                      <option value="Wedding Photographers">Wedding Photographers</option>
                      <option value="Event Decorators">Event Decorators</option>
                      <option value="Caterers & Feasts">Caterers & Sweets</option>
                      <option value="B2B Wholesale / Local Shops">B2B Wholesale / Local Retailers</option>
                      <option value="Clinics & Healthcare">Clinics & Healthcare</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="modal-submit-btn">
                  <span>Activate 1,000 Free Leads</span>
                  <ArrowRight size={16} />
                </button>

                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={handleLaunchDashboard}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#66e6bd",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                  >
                    ⚡ Skip registration & open dashboard directly →
                  </button>
                </div>

                <div className="modal-disclaimer">
                  <ShieldCheck size={14} className="text-mint" />
                  <span>No credit card required. Clean Indian mobile numbers with zero dead landlines.</span>
                </div>
              </form>
            </div>
          ) : (
            <div className="modal-success">
              <div className="success-icon-box">
                <CheckCircle2 size={36} className="text-mint" />
              </div>
              <h3>1,000 Free Leads Unlocked!</h3>
              <p>Welcome <b>{formData.name}</b>. Your workspace is ready for verified discovery in <b>{formData.city}</b>.</p>

              <div className="license-key-box">
                <div className="key-label">
                  <Key size={13} />
                  <span>WORKSPACE PASS</span>
                </div>
                <code>SC-FREE-PASS-1000</code>
                <small>1,000 free verified leads · Active right now</small>
              </div>

              <div className="success-actions">
                <button
                  type="button"
                  className="modal-submit-btn"
                  onClick={handleLaunchDashboard}
                >
                  <Zap size={16} />
                  <span>Open Command Dashboard Now →</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
