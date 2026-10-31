const fs = require('fs');

const NEW_MODAL_CODE = `function WhatsAppCampaignModal({ leads, onClose, onUpdateStage }) {
  const validLeads = useMemo(() => (Array.isArray(leads) ? leads : []).filter(l => isMobilePhone(getDisplayPhone(l))), [leads]);
  
  // Product Catalog State
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [selectedProdId, setSelectedProdId] = useState(DEFAULT_PRODUCTS[0]?.id || 'custom');
  const [customProduct, setCustomProduct] = useState({
    id: 'custom',
    title: 'Custom Product / Service Offer',
    price: '₹2,500',
    description: 'Exclusive business package with doorstep delivery & full guarantee.',
    link: 'https://scraper.co.in',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    category: 'Custom Offer'
  });

  const activeProduct = useMemo(() => {
    if (selectedProdId === 'custom') return customProduct;
    return products.find(p => p.id === selectedProdId) || products[0] || customProduct;
  }, [products, selectedProdId, customProduct]);

  // Outreach Template & Message State
  const [templateKey, setTemplateKey] = useState('product');
  const [customTemplateText, setCustomTemplateText] = useState(
    'Hi {name}, we supply premium *{productTitle}* in {city}. Special pricing: *{productPrice}*. {productHighlights} Check our catalog: {productLink}'
  );
  const [websiteLink, setWebsiteLink] = useState(activeProduct?.link || '');
  const [appendUtm, setAppendUtm] = useState(true);

  // Queue Progression State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [contactedSet, setContactedSet] = useState(new Set());
  const [copyingImage, setCopyingImage] = useState(false);

  // Sync websiteLink whenever activeProduct changes
  useEffect(() => {
    if (activeProduct?.link) {
      setWebsiteLink(activeProduct.link);
    }
  }, [activeProduct]);

  const currentLead = validLeads[currentIndex];
  const phone = currentLead ? getDisplayPhone(currentLead) : '';
  const clean10 = phone ? String(phone).replace(/\\D/g, '').slice(-10) : '';

  const leadTrackingLink = useMemo(() => {
    if (!websiteLink) return '';
    if (!appendUtm || !currentLead) return websiteLink;
    const cleanLeadId = (currentLead.id || clean10 || 'lead').replace(/[^a-zA-Z0-9_-]/g, '');
    const separator = websiteLink.includes('?') ? '&' : '?';
    return websiteLink + separator + 'ref=wa_' + cleanLeadId;
  }, [websiteLink, appendUtm, currentLead, clean10]);

  const activeTemplate = templateKey === 'custom'
    ? customTemplateText
    : (CATALOG_TEMPLATES[templateKey] || CATALOG_TEMPLATES.product);

  const filledMessage = useMemo(() => {
    if (!currentLead) return '';
    return formatProductMessage(activeTemplate, currentLead, activeProduct, leadTrackingLink);
  }, [currentLead, activeTemplate, activeProduct, leadTrackingLink]);

  const openCurrentWhatsApp = async () => {
    if (!clean10) return;

    if (activeProduct?.image) {
      setCopyingImage(true);
      try {
        const copied = await copyImageToClipboard(activeProduct.image);
        if (copied) {
          toast.success('📋 Product flyer copied to clipboard! Press Ctrl+V in WhatsApp Web to attach photo.', { duration: 5500 });
        } else {
          toast('Tip: Link and pitch text attached. Use Ctrl+V if flyer was copied.', { icon: 'ℹ️' });
        }
      } catch (err) {
        console.warn('Clipboard copy warning:', err);
      } finally {
        setCopyingImage(false);
      }
    }

    const url = 'https://wa.me/91' + clean10 + '?text=' + encodeURIComponent(filledMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const markContactedAndNext = () => {
    if (currentLead) {
      setContactedSet(prev => new Set(prev).add(currentLead.id || clean10));
      onUpdateStage?.(currentLead, 'contacted');
      toast.success('Marked ' + (currentLead.name || 'Lead') + ' as Contacted!');
    }
    if (currentIndex < validLeads.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success('🎉 Campaign complete! All selected prospects processed.');
    }
  };

  const prevLead = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const skipNext = () => {
    if (currentIndex < validLeads.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const insertVariable = (varTag) => {
    if (templateKey !== 'custom') {
      setTemplateKey('custom');
      setCustomTemplateText(activeTemplate + ' ' + varTag);
    } else {
      setCustomTemplateText(prev => prev + ' ' + varTag);
    }
  };

  const handleExportVcf = () => {
    if (!validLeads.length) return;
    const ok = exportLeadsToVcf(validLeads, 'campaign_leads_' + validLeads.length + '.vcf');
    if (ok) {
      toast.success('Exported ' + validLeads.length + ' contacts to .vcf! Ready for 1-tap mobile phonebook import.');
    } else {
      toast.error('Could not generate vCard file.');
    }
  };

  const isPrime = currentLead && (Number(currentLead.rating) >= 4.0 || Number(currentLead.reviewsCount) >= 10);

  return (
    <div className="v2-modal-backdrop" onClick={onClose}>
      <div className="v2-modal v2-wa-campaign-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="v2-modal-head" style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div className="v2-modal-title">
            <span className="v2-badge v2-badge-green"><MessageSquare size={13} /> WHATSAPP PRODUCT OUTREACH &amp; LEAD CAPTURE</span>
            <h3>1-Click Multimedia Product Outreach Studio</h3>
            <p>Pitch products, attach flyers, embed tracked links, and advance CRM with official zero-ban WhatsApp Web protocol.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="v2-btn v2-btn-sm v2-btn-ghost"
              onClick={handleExportVcf}
              title="Download vCard (.vcf) to import all queue leads directly into your phone contacts"
            >
              <Download size={13} /> 📲 Export VCF ({validLeads.length})
            </button>
            <button type="button" className="v2-modal-close" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        {validLeads.length === 0 ? (
          <div className="v2-modal-body" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <Smartphone size={32} style={{ color: '#64748b', marginBottom: '12px' }} />
            <h4 style={{ color: '#f1f5f9', marginBottom: '6px' }}>No Verified Mobile Numbers Found</h4>
            <p className="v2-muted">The selected leads do not contain valid +91 Indian mobile phone numbers (landlines and missing numbers are safely excluded to prevent WhatsApp errors).</p>
          </div>
        ) : (
          <div className="v2-wa-modal-grid">
            {/* LEFT COLUMN: Outreach Controls & Catalog Editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Prospect Navigation Card */}
              <div className="v2-wa-prospect-card" style={{ padding: '12px 14px', borderRadius: '10px' }}>
                <div className="v2-wa-prospect-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="v2-wa-progress-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Prospect <b>{currentIndex + 1}</b> of <b>{validLeads.length}</b></span>
                    <span style={{ color: '#64748b' }}>({Math.round(((currentIndex + 1) / validLeads.length) * 100)}%)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isPrime && <span className="v2-badge v2-badge-amber">🔥 Prime Lead</span>}
                    {contactedSet.has(currentLead?.id || clean10) ? (
                      <span className="v2-badge v2-badge-green"><CheckCircle2 size={11} /> Contacted</span>
                    ) : (
                      <span className="v2-badge v2-badge-cyan">Ready</span>
                    )}
                  </div>
                </div>

                <div className="v2-wa-prospect-info">
                  <h4 style={{ fontSize: '15px', color: '#f8fafc', marginBottom: '4px' }}>{currentLead?.name || 'Business Contact'}</h4>
                  <div className="v2-wa-meta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11.5px', color: '#94a3b8' }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>📱 +91 {clean10.slice(0, 5)} {clean10.slice(5)}</span>
                    <span>📍 {[currentLead?.area, currentLead?.city].filter(Boolean).join(', ') || 'Local Area'}</span>
                    {currentLead?.rating != null && (
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>★ {Number(currentLead.rating).toFixed(1)}</span>
                    )}
                    {currentLead?.category && (
                      <span style={{ color: '#38bdf8' }}>🏷️ {currentLead.category}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 1. Product Catalog Selector */}
              <div>
                <div className="v2-wa-section-title">
                  <span>1. Select Product / Service Catalog Item</span>
                  <span style={{ fontSize: '10px', color: '#10b981' }}>Active: {activeProduct?.price || ''}</span>
                </div>
                <div className="v2-wa-product-pills">
                  {products.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={cx('v2-wa-product-pill', selectedProdId === p.id && 'is-active')}
                      onClick={() => setSelectedProdId(p.id)}
                    >
                      <span>🏷️ {p.title.length > 24 ? p.title.slice(0, 24) + '...' : p.title}</span>
                      <b style={{ color: '#10b981' }}>{p.price}</b>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={cx('v2-wa-product-pill', selectedProdId === 'custom' && 'is-active')}
                    onClick={() => setSelectedProdId('custom')}
                  >
                    ✍️ Custom Product / Service
                  </button>
                </div>

                {/* Product Detail Fields */}
                <div className="v2-wa-product-editor">
                  <div className="v2-wa-input-row">
                    <div>
                      <label style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Item / Service Title</label>
                      <input
                        type="text"
                        className="v2-wa-input"
                        value={selectedProdId === 'custom' ? customProduct.title : activeProduct.title}
                        onChange={e => {
                          const val = e.target.value;
                          if (selectedProdId === 'custom') {
                            setCustomProduct(prev => ({ ...prev, title: val }));
                          } else {
                            setProducts(prev => prev.map(p => p.id === selectedProdId ? { ...p, title: val } : p));
                          }
                        }}
                        placeholder="Product title"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Price / Offer Tag</label>
                      <input
                        type="text"
                        className="v2-wa-input"
                        value={selectedProdId === 'custom' ? customProduct.price : activeProduct.price}
                        onChange={e => {
                          const val = e.target.value;
                          if (selectedProdId === 'custom') {
                            setCustomProduct(prev => ({ ...prev, price: val }));
                          } else {
                            setProducts(prev => prev.map(p => p.id === selectedProdId ? { ...p, price: val } : p));
                          }
                        }}
                        placeholder="e.g. ₹3,500 or Tier-1 Wholesale"
                      />
                    </div>
                  </div>

                  <div className="v2-wa-input-row">
                    <div>
                      <label style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Product / Brochure URL</label>
                      <input
                        type="text"
                        className="v2-wa-input"
                        value={websiteLink}
                        onChange={e => setWebsiteLink(e.target.value)}
                        placeholder="https://yourwebsite.com/catalog"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Flyer / Photo Image URL</label>
                      <input
                        type="text"
                        className="v2-wa-input"
                        value={selectedProdId === 'custom' ? customProduct.image : (activeProduct.image || '')}
                        onChange={e => {
                          const val = e.target.value;
                          if (selectedProdId === 'custom') {
                            setCustomProduct(prev => ({ ...prev, image: val }));
                          } else {
                            setProducts(prev => prev.map(p => p.id === selectedProdId ? { ...p, image: val } : p));
                          }
                        }}
                        placeholder="https://...image.jpg (auto-copied to clipboard)"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={appendUtm}
                        onChange={e => setAppendUtm(e.target.checked)}
                      />
                      <span>Append 1-Click Lead Tracking parameter (<code>?ref=wa_lead</code>)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. Outreach Playbook Selector */}
              <div>
                <div className="v2-wa-section-title">
                  <span>2. Sales Playbook &amp; Message Template</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Dynamic Variables Enabled</span>
                </div>
                <div className="v2-wa-template-pills" style={{ marginBottom: '8px' }}>
                  <button type="button" className={cx(templateKey === 'product' && 'is-active')} onClick={() => setTemplateKey('product')}>📦 Product Pitch</button>
                  <button type="button" className={cx(templateKey === 'b2b' && 'is-active')} onClick={() => setTemplateKey('b2b')}>🏢 B2B Wholesale</button>
                  <button type="button" className={cx(templateKey === 'highticket' && 'is-active')} onClick={() => setTemplateKey('highticket')}>⭐ High-Ticket</button>
                  <button type="button" className={cx(templateKey === 'audit' && 'is-active')} onClick={() => setTemplateKey('audit')}>🔍 Growth Audit</button>
                  <button type="button" className={cx(templateKey === 'collab' && 'is-active')} onClick={() => setTemplateKey('collab')}>💼 Collaboration</button>
                  <button type="button" className={cx(templateKey === 'custom' && 'is-active')} onClick={() => setTemplateKey('custom')}>✍️ Custom</button>
                </div>

                {templateKey === 'custom' ? (
                  <div className="v2-wa-custom-input">
                    <textarea
                      rows={3}
                      className="v2-wa-input"
                      style={{ width: '100%', resize: 'vertical' }}
                      value={customTemplateText}
                      onChange={e => setCustomTemplateText(e.target.value)}
                      placeholder="Type your message with {name}, {productTitle}, {productPrice}, {productLink}, {city}..."
                    />
                  </div>
                ) : null}

                {/* Variable Quick-Insert Chips */}
                <div className="v2-wa-var-pills">
                  <span style={{ fontSize: '10px', color: '#64748b', alignSelf: 'center' }}>Insert Tag:</span>
                  {['{name}', '{productTitle}', '{productPrice}', '{productLink}', '{city}', '{area}', '{category}', '{rating}'].map(tag => (
                    <button key={tag} type="button" className="v2-wa-var-pill" onClick={() => insertVariable(tag)}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clipboard Bridge Badge */}
              <div className="v2-wa-clipboard-badge">
                <Sparkles size={13} />
                <span>Product flyer &amp; brochure photo are auto-copied to OS clipboard on launch — hit <b>Ctrl+V</b> in WhatsApp Web!</span>
              </div>

              {/* Bottom Actions Row */}
              <div className="v2-wa-actions-row" style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-green v2-btn-wa-launch"
                  onClick={openCurrentWhatsApp}
                  disabled={copyingImage}
                  title="Copies flyer image to clipboard and opens official WhatsApp Web with pre-filled pitch"
                >
                  <MessageSquare size={14} /> Open WhatsApp Web
                </button>
                <button
                  type="button"
                  className="v2-btn v2-btn-cyan"
                  onClick={markContactedAndNext}
                  title="Logs contact in CRM and advances to the next prospect"
                >
                  <Check size={14} /> Mark Contacted &amp; Next ➔
                </button>
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="v2-btn v2-btn-ghost"
                    onClick={prevLead}
                    disabled={currentIndex <= 0}
                    title="Previous prospect"
                  >
                    ◀ Prev
                  </button>
                  <button
                    type="button"
                    className="v2-btn v2-btn-ghost"
                    onClick={skipNext}
                    disabled={currentIndex >= validLeads.length - 1}
                    title="Skip without updating CRM"
                  >
                    Skip ➔
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: WhatsApp Phone Simulation */}
            <div className="v2-wa-phone-sim">
              {/* WhatsApp Chat Top Bar */}
              <div className="v2-wa-phone-top">
                <div className="v2-wa-phone-avatar">
                  {(currentLead?.name || 'B').charAt(0).toUpperCase()}
                </div>
                <div className="v2-wa-phone-meta" style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentLead?.name || 'Business Contact'}
                  </b>
                  <span>+91 {clean10.slice(0, 5)} {clean10.slice(5)} • online</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', color: '#8696a0' }}>
                  <Phone size={15} />
                  <ExternalLink size={15} />
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="v2-wa-phone-chat">
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', background: 'rgba(31, 44, 52, 0.8)', color: '#8696a0', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    Today
                  </span>
                </div>

                {/* Message Bubble Card */}
                <div className="v2-wa-bubble-card">
                  {/* Product Header inside chat bubble */}
                  <div className="v2-wa-bubble-prod-header">
                    <span>📦 {activeProduct?.title || 'Catalog Item'}</span>
                    <span className="v2-wa-bubble-price-tag">{activeProduct?.price || 'Best Price'}</span>
                  </div>

                  {/* Attached Flyer Image */}
                  {activeProduct?.image && (
                    <img
                      src={activeProduct.image}
                      alt="Product Flyer"
                      className="v2-wa-bubble-img"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}

                  {/* Pitch Message Body */}
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e9edef' }}>
                    {filledMessage}
                  </div>

                  {/* Rich Link Preview Card */}
                  {leadTrackingLink && (
                    <div className="v2-wa-bubble-link-card">
                      <Globe2 size={16} style={{ color: '#53bdeb', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <a href={leadTrackingLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                          {leadTrackingLink}
                        </a>
                        <div style={{ fontSize: '9px', color: '#8696a0' }}>Tap to open catalog in browser</div>
                      </div>
                    </div>
                  )}

                  {/* Message Time & Checkmarks */}
                  <div className="v2-wa-bubble-time">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ color: '#53bdeb', fontSize: '11px', fontWeight: 'bold' }}>✓✓</span>
                  </div>
                </div>
              </div>

              {/* Phone Footer Security Banner */}
              <div style={{ background: '#1f2c34', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '10px', color: '#8696a0', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <CheckCircle2 size={11} style={{ color: '#10b981' }} />
                <span>Zero-Ban Safe • Official WhatsApp Web Protocol</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`;

function patchCommandCenter(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Add whatsappCatalog import if missing
  if (!content.includes('../utils/whatsappCatalog')) {
    const badgeImport = "import DesktopBadge from './DesktopBadge';";
    if (content.includes(badgeImport)) {
      content = content.replace(
        badgeImport,
        badgeImport + "\nimport {\n  DEFAULT_PRODUCTS,\n  CATALOG_TEMPLATES,\n  formatProductMessage,\n  copyImageToClipboard,\n  exportLeadsToVcf\n} from '../utils/whatsappCatalog';"
      );
      console.log('[Import] Added to ' + filePath);
    }
  }

  // 2. Replace function WhatsAppCampaignModal
  const startMarker = 'function WhatsAppCampaignModal({';
  const endMarker = 'function EmptyState({';
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker, startIdx);

  if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + NEW_MODAL_CODE + '\n\n' + content.substring(endIdx);
    console.log('[Modal] Replaced WhatsAppCampaignModal in ' + filePath);
  } else {
    console.warn('[Modal] Could not find markers in ' + filePath);
  }

  // 3. Add VCF button to Cockpit floating action bar if present in file
  if (content.includes('cockpitSelectedIds.size > 0 &&') && !content.includes('Export VCF ({cockpitSelectedIds.size})')) {
    const launchBtn = 'Launch WhatsApp Campaign ({cockpitSelectedIds.size})\n              </button>';
    const vcfBtn = 'Launch WhatsApp Campaign ({cockpitSelectedIds.size})\n              </button>\n              <button\n                type="button"\n                className="v2-btn v2-btn-sm v2-btn-ghost"\n                onClick={() => {\n                  const selectedLeads = pageRows.filter(v => cockpitSelectedIds.has(v.id || (v.name + \'-\' + v.phone)));\n                  const ok = exportLeadsToVcf(selectedLeads, \'leads_contacts_\' + Date.now() + \'.vcf\');\n                  if (ok) {\n                    toast.success(\'Exported \' + selectedLeads.length + \' contacts to vCard (.vcf)!\');\n                  } else {\n                    toast.error(\'No leads with mobile numbers to export.\');\n                  }\n                }}\n                title="Download .vcf vCard to import all selected contacts into your phone with 1 tap"\n              >\n                <Download size={13} /> 📲 Export VCF ({cockpitSelectedIds.size})\n              </button>';
    content = content.replace(launchBtn, vcfBtn);
    console.log('[FAB] Added Export VCF button to ' + filePath);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

patchCommandCenter('client/src/v2/CommandCenter.jsx');
patchCommandCenter('master/src/v2/CommandCenter.jsx');
console.log('Finished updating CommandCenter.jsx files.');
