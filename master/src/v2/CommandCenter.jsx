/**
 * master/src/v2/CommandCenter.jsx
 * Standalone Master Fleet Command Center (Strictly District & State Scale across 11 Countries).
 * Completely separated from client/src/v2/CommandCenter.jsx.
 * Execution Order: District HQ Urban Wards -> Towns -> Mandals / Sub-Divisions.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, MessageCircle, Phone, Mail, RefreshCw, FolderArchive } from 'lucide-react';
import EDITION_CONFIG from '../edition.config';
import { IS_DESKTOP } from '../desktop';
import { useMasterStream } from './hooks/useMasterStream';
import { useMasterZones } from './hooks/useMasterZones';
import { useLeadsVault } from './hooks/useLeadsVault';
import { useScrapedFolders } from '@shared/folders/useScrapedFolders';
import ScrapedFoldersModal from '@shared/folders/ScrapedFoldersModal';
import StatTile from '@shared/ui/StatTile';
import { safeLeadId } from './utils/safeTypes';
import CommandCenterHeader from './components/CommandCenterHeader';
import MasterOmniSearchBar from './components/MasterOmniSearchBar';
import MasterTerritoryExplorer from './components/MasterTerritoryExplorer';
import GoogleDoodleHero from './components/GoogleDoodleHero';
import ZoneActivityHud from './components/ZoneActivityHud';
import LeadsTableView from './components/views/LeadsTableView';
import CockpitDossierDrawer from './components/dossier/CockpitDossierDrawer';
import MissionCompleteDrawer from './components/popups/MissionCompleteDrawer';
import { getMasterExamplesForCountry } from './data/searchExamples';
import { deepEnrichBatch } from './apiMaster';
import { exportLeadsToVcf } from '../utils/whatsappCatalog';
import { getSessions, deleteSession, deepEnrichVendor } from './api';

export default function CommandCenter({ edition = EDITION_CONFIG }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCountry = (searchParams.get('country') || 'IN').toUpperCase();
  const initialQuery = searchParams.get('q') || searchParams.get('query') || '';
  const initialCity = searchParams.get('city') || '';

  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [country, setCountry] = useState(initialCountry);
  const [activeTab, setActiveTab] = useState('leads');
  const [enrichingVendor, setEnrichingVendor] = useState(false);
  const [hasExecutedSearch, setHasExecutedSearch] = useState(!IS_DESKTOP || Boolean(initialQuery && initialCity));
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [missionCompleteRun, setMissionCompleteRun] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isFoldersModalOpen, setIsFoldersModalOpen] = useState(false);
  const [isZonesModalOpen, setIsZonesModalOpen] = useState(false);
  const [activeSubcategories, setActiveSubcategories] = useState(undefined);

  const hasExecutedRef = useRef(hasExecutedSearch);
  const scanningRef = useRef(false);
  const activeSessionIdRef = useRef('');
  const autoStartRef = useRef(false);
  hasExecutedRef.current = hasExecutedSearch;

  const vault = useLeadsVault({ country });
  const scrapedFolders = useScrapedFolders();
  const masterZones = useMasterZones(city, country);

  const [filterState, setFilterState] = useState({
    query: '', phoneOnly: false, landlineOnly: false, websiteOnly: false, noWebsiteOnly: false, emailOnly: false, deepOnly: false, primeOnly: false, minRating: 0, sort: 'newest'
  });

  const handleFilterChange = useCallback((key, val) => {
    setFilterState((prev) => ({ ...prev, [key]: val }));
    if (key === 'query') vault.setSearchQuery(val);
    if (key === 'source') vault.setSourceFilter(val || 'all');
    if (key === 'phoneOnly') { vault.setMobileOnly(val); if (val) vault.setLandlineOnly(false); }
    if (key === 'landlineOnly') { vault.setLandlineOnly(val); if (val) vault.setMobileOnly(false); }
    if (key === 'websiteOnly') { vault.setWebsiteOnly(val); if (val) vault.setNoWebsiteOnly(false); }
    if (key === 'noWebsiteOnly') { vault.setNoWebsiteOnly(val); if (val) vault.setWebsiteOnly(false); }
    if (key === 'emailOnly') vault.setEmailOnly(Boolean(val));
    if (key === 'deepOnly') vault.setDeepOnly(Boolean(val));
    if (key === 'primeOnly') { vault.setMobileOnly(val); vault.setMinRating(val ? 4 : 0); }
    if (key === 'minRating') vault.setMinRating(val);
    if (key === 'sort') vault.setSortOrder(val || 'newest');
  }, [vault]);

  const handleResetFilters = useCallback(() => {
    setFilterState({ query: '', source: 'all', phoneOnly: false, landlineOnly: false, websiteOnly: false, noWebsiteOnly: false, emailOnly: false, deepOnly: false, primeOnly: false, minRating: 0, sort: 'newest' });
    vault.resetFilters();
  }, [vault]);

  const refreshSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const data = await getSessions();
      if (Array.isArray(data)) setSessions(data);
    } catch (_) {} finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  useEffect(() => {
    if (!selectedVendor) return;
    const tid = safeLeadId(selectedVendor);
    const found = vault.vendors.find((v) => safeLeadId(v) === tid);
    if (found && found !== selectedVendor) setSelectedVendor(found);
  }, [vault.vendors, selectedVendor]);

  const stream = useMasterStream({
    onVendorReceived: useCallback((vendor, incomingSessionId) => {
      const targetSid = incomingSessionId || vendor?.sessionId || '';
      if (activeSessionIdRef.current && targetSid && targetSid !== activeSessionIdRef.current) return;
      if (hasExecutedRef.current || scanningRef.current) vault.ingestLead(vendor);
    }, [vault]),
    onSweepFinished: useCallback((payload) => {
      scanningRef.current = false;
      refreshSessions();
      scrapedFolders.refreshFolders();
      if (payload?.status === 'complete' || payload?.status === 'completed') {
        setMissionCompleteRun(payload);
        toast.success(`Master territory sweep complete: ${vault.metrics.total.toLocaleString()} leads saved.`);
      }
    }, [refreshSessions, scrapedFolders, vault.metrics.total])
  });
  scanningRef.current = stream.scanning;

  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (city) next.set('city', city);
    if (country && country !== 'IN') next.set('country', country);
    setSearchParams(next, { replace: true });
  }, [query, city, country, setSearchParams]);

  const handleStartSweep = useCallback(async (subs, explicitZones, overrideParams = {}) => {
    const qRun = overrideParams.query ?? query;
    const locRun = overrideParams.city ?? city;
    const ccRun = overrideParams.country ?? country;
    if (!qRun?.trim() || !locRun?.trim()) {
      toast.error(`Enter category and a ${masterZones.labels.level2} or ${masterZones.labels.level1}.`);
      return;
    }
    const chosenZones = Array.isArray(explicitZones) && explicitZones.length > 0
      ? explicitZones
      : masterZones.selectedZoneNames || undefined;
    setActiveSubcategories(subs);
    try {
      hasExecutedRef.current = true;
      scanningRef.current = true;
      activeSessionIdRef.current = '';
      vault.clearVault();
      scrapedFolders.clearFolderSelection();
      setHasExecutedSearch(true);
      const started = await stream.startSweep({
        query: qRun,
        location: locRun,
        country: ccRun,
        selectedZones: chosenZones,
        subcategories: subs
      });
      if (started?.sessionId) activeSessionIdRef.current = started.sessionId;
      scrapedFolders.refreshFolders();
      toast.success(`Master sweep: ${qRun} in ${started?.cityName || locRun} (HQ Wards → Towns → ${masterZones.labels.level3})`);
    } catch (err) {
      scanningRef.current = false;
      toast.error(err?.message || 'Master Fleet accepts only District or State searches.');
    }
  }, [query, city, country, masterZones, stream, vault, scrapedFolders]);

  const handleStopSweep = useCallback(async () => {
    await stream.stopSweep();
    scanningRef.current = false;
    toast('Master sweep paused. Progress saved to Folder.', { icon: '⏹️' });
  }, [stream]);

  const handleResumeSweep = useCallback(async () => {
    try {
      const nextZoneIdx = stream.sweepProgress?.overallCompletedMandals || 0;
      const resumed = await stream.startSweep({
        query,
        location: city,
        country,
        selectedZones: masterZones.selectedZoneNames || undefined,
        subcategories: activeSubcategories,
        startZoneIndex: nextZoneIdx
      });
      if (resumed?.sessionId) activeSessionIdRef.current = resumed.sessionId;
      toast.success(`Resuming Master sweep from zone ${nextZoneIdx + 1}…`);
    } catch (err) {
      toast.error(err?.message || 'Failed to resume Master sweep.');
    }
  }, [query, city, country, masterZones, activeSubcategories, stream]);

  useEffect(() => {
    if (autoStartRef.current || searchParams.get('autoStart') !== '1') return;
    autoStartRef.current = true;
    let pending = null;
    try {
      const raw = sessionStorage.getItem('lp_pending_launch');
      if (raw) pending = JSON.parse(raw);
      sessionStorage.removeItem('lp_pending_launch');
    } catch (_) {}
    const qUrl = pending?.query || searchParams.get('q') || '';
    const cUrl = pending?.city || searchParams.get('city') || '';
    const ccUrl = (pending?.country || searchParams.get('country') || country).toUpperCase();
    if (qUrl) setQuery(qUrl);
    if (cUrl) setCity(cUrl);
    if (ccUrl) setCountry(ccUrl);
    if (qUrl && cUrl) {
      handleStartSweep(pending?.subcategories, pending?.selectedZones, { query: qUrl, city: cUrl, country: ccUrl });
    }
  }, [searchParams, country, handleStartSweep]);

  const handleLoadFolderScope = useCallback(async (folderId, scope = {}) => {
    const detail = await scrapedFolders.loadFolderScope(folderId, scope);
    if (detail?.leads) {
      if (detail.folder?.query) setQuery(detail.folder.query);
      if (detail.folder?.city) setCity(detail.folder.city);
      if (detail.folder?.country) setCountry(detail.folder.country);
      activeSessionIdRef.current = '';
      vault.replaceLeads(detail.leads);
      setHasExecutedSearch(true);
      setActiveTab('leads');
    }
  }, [scrapedFolders, vault]);

  const isHeroMode = IS_DESKTOP && !hasExecutedSearch;
  const quickExamples = getMasterExamplesForCountry(country);

  return (
    <div className="lp-canvas-bg" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CommandCenterHeader
        navigate={navigate} activeTab={activeTab} setActiveTab={setActiveTab}
        effectiveRuns={scrapedFolders.folders.length ? scrapedFolders.folders : sessions}
        isEngineReady={stream.sseStatus === 'open'} sseStatus={stream.sseStatus}
        isMaster={true} searchCountry={country} isHeroMode={isHeroMode}
        onResetToHero={() => { if (!IS_DESKTOP) navigate('/'); else { setHasExecutedSearch(false); activeSessionIdRef.current = ''; scrapedFolders.clearFolderSelection(); vault.clearVault(); } }}
        onOpenFolders={() => setIsFoldersModalOpen(true)} foldersCount={scrapedFolders.folders.length}
      />

      <main style={{ flex: 1, maxWidth: 1380, width: '100%', margin: '0 auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isHeroMode ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: 920, width: '100%', margin: '-8px auto 0' }}>
            <GoogleDoodleHero
              country={country}
              isMaster
              onPickInspiration={(item) => {
                if (item.flag) setCountry(item.flag);
                setQuery(item.category);
                setCity(item.city);
              }}
            />
            <div style={{ width: '100%' }}>
              <MasterOmniSearchBar
                query={query} setQuery={setQuery} city={city} setCity={setCity} country={country} setCountry={setCountry}
                scanning={stream.scanning} territoryCounts={masterZones.territory?.counts}
                onStart={(subs, ov) => handleStartSweep(subs, undefined, ov)} onStop={handleStopSweep}
                onExport={() => vault.exportCsv(`${query}_${city}_leads.csv`)} leadCount={vault.metrics.total}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                {quickExamples.map((ex) => {
                  const [cPart, lPart] = ex.split(/\s+(?:in|à|en)\s+/i);
                  return (
                    <button key={ex} type="button" onClick={() => { if (cPart) setQuery(cPart); if (lPart) setCity(lPart); }} style={{ padding: '4px 11px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: 'rgba(255,255,255,0.88)', color: '#78350f', border: '1px solid rgba(217,119,6,0.28)', cursor: 'pointer' }}>
                      {ex}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MasterOmniSearchBar
              query={query} setQuery={setQuery} city={city} setCity={setCity} country={country} setCountry={setCountry}
              scanning={stream.scanning} territoryCounts={masterZones.territory?.counts}
              onStart={(subs, ov) => handleStartSweep(subs, undefined, ov)} onStop={handleStopSweep}
            />

            <ZoneActivityHud
              activePoint={stream.activePoint} sweepProgress={stream.sweepProgress}
              scanning={stream.scanning}
              totalLeads={Math.max(vault.metrics.total, stream.scanning ? Number(stream.sweepProgress?.vendorsFound || 0) : 0)}
              totalPhones={Math.max(vault.metrics.withPhone, stream.scanning ? Number(stream.sweepProgress?.phonesFound || 0) : 0)}
              telemetry={stream.telemetry || stream.health}
              onResumeSweep={handleResumeSweep}
              onInspectZones={() => setIsZonesModalOpen(true)}
              onExportCsv={() => vault.exportCsv(`${query}_${city}_leads.csv`)}
              zonesCount={masterZones.effectiveZones.length}
              zoneMode={masterZones.territory?.counts ? `${masterZones.territory.counts.hqWards} HQ · ${masterZones.territory.counts.towns} Towns` : 'district'}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 12, marginBottom: 12, flexShrink: 0 }}>
              <StatTile
                label="Territory Leads"
                value={Math.max(vault.metrics.total, stream.scanning ? Number(stream.sweepProgress?.vendorsFound || 0) : 0)}
                sub={`${vault.metrics.filtered.toLocaleString()} matching filters`}
                icon={Users}
                tone="gold"
                pulse={stream.scanning}
              />
              <StatTile
                label="Phone Contacts"
                value={Math.max(vault.metrics.withPhone, stream.scanning ? Number(stream.sweepProgress?.phonesFound || 0) : 0)}
                sub={`${vault.metrics.phoneRate}% reach · ${vault.metrics.mobiles.toLocaleString()} Mob · ${vault.metrics.landlines.toLocaleString()} STD`}
                icon={Phone}
                tone="emerald"
              />
              <StatTile
                label="WhatsApp & Mobiles"
                value={Math.max(vault.metrics.mobiles, stream.scanning ? Number(stream.sweepProgress?.mobilesFound || 0) : 0)}
                sub={`${vault.metrics.whatsapps.toLocaleString()} direct chat links`}
                icon={MessageCircle}
                tone="sapphire"
              />
              <StatTile
                label="Emails & Websites"
                value={Math.max(vault.metrics.emails, stream.scanning ? Number(stream.sweepProgress?.emailsFound || 0) : 0)}
                sub={`${vault.metrics.websites.toLocaleString()} business websites indexed`}
                icon={Mail}
                tone="gold"
              />
            </div>

            {activeTab === 'leads' ? (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="lp-glass-subtle" style={{ padding: 12, flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <LeadsTableView
                    filters={filterState} updateFilter={handleFilterChange} onResetFilters={handleResetFilters}
                    filteredVendors={vault.filteredVendors} pageRows={vault.pageRows} syncNonce={vault.syncNonce}
                    currentPage={vault.currentPage} pageSize={vault.pageSize} pageCount={vault.pageCount}
                    setPage={vault.setCurrentPage} setPageSize={vault.setPageSize}
                    country={country} scanning={stream.scanning}
                    freshLeadIds={vault.freshLeadIds} phoneJustFoundIds={vault.phoneJustFoundIds}
                    setSelectedVendor={setSelectedVendor}
                    onSaveToFolder={() => setIsFoldersModalOpen(true)}
                    folders={scrapedFolders.folders} activeSelection={scrapedFolders.activeSelection}
                    onClearFolderSelection={() => { scrapedFolders.clearFolderSelection(); vault.clearVault(); }}
                    onQuickOpenFolder={(id) => handleLoadFolderScope(id, {})}
                    onOpenFoldersModal={() => setIsFoldersModalOpen(true)}
                    onDeepEnrichPage={async (rows) => {
                      const ids = (rows || []).map((r) => r.id).filter(Boolean);
                      if (ids.length === 0) return;
                      const res = await deepEnrichBatch(ids, stream.currentRun?.sessionId || null);
                      if (res?.updatedVendors?.length) {
                        for (const uv of res.updatedVendors) vault.ingestLead(uv);
                        toast.success(`Deep enriched ${res.updatedVendors.length} visible leads!`);
                      } else {
                        toast('Deep enrich finished.', { icon: 'ℹ️' });
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="lp-glass-subtle" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <FolderArchive size={16} color="#d97706" /> Master Saved Runs ({sessions.length})
                  </h2>
                  <button type="button" onClick={refreshSessions} disabled={loadingSessions} style={{ padding: 6, borderRadius: 8, border: 'none', background: '#f8fafc', cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>
                {sessions.map((s) => (
                  <div key={s.id || s.sessionId} style={{ padding: '10px 0', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name || s.query || 'Saved Run'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--lp-ink-4)' }}>{s.location || s.city || country} · {s.leadsHarvested || 0} leads</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => { vault.loadSessionLeads(s.id || s.sessionId); setActiveTab('leads'); }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(217,119,6,0.34)', background: '#fffbeb', color: '#92400e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Load</button>
                      <button type="button" onClick={async () => { await deleteSession(s.id || s.sessionId); refreshSessions(); }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(225,29,72,0.24)', background: '#fff1f2', color: '#be123c', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <MasterTerritoryExplorer
        isOpen={isZonesModalOpen} onClose={() => setIsZonesModalOpen(false)}
        territory={masterZones.territory} loading={masterZones.loading} labels={masterZones.labels}
        effectiveZones={masterZones.effectiveZones} selectedZoneNames={masterZones.selectedZoneNames}
        onToggleZone={masterZones.toggleZoneName} onSelectAllZones={masterZones.selectAllZones}
        onSweepSelected={(subset) => handleStartSweep(activeSubcategories, subset)}
        scanning={stream.scanning}
      />

      <ScrapedFoldersModal
        isOpen={isFoldersModalOpen} onClose={() => setIsFoldersModalOpen(false)}
        folders={scrapedFolders.folders} loading={scrapedFolders.loading} onRefresh={scrapedFolders.refreshFolders}
        onLoadScope={handleLoadFolderScope} onExportCsv={(id, scope) => scrapedFolders.exportFolderCsv(id, scope)}
        onExportVcf={async (folder) => {
          const detail = await scrapedFolders.loadFolderScope(folder.id, {});
          if (detail?.leads?.length) exportLeadsToVcf(detail.leads, `${folder.query}_${folder.city}_contacts`);
        }}
        onResumeFolder={async (id) => { await scrapedFolders.resumeFolder(id); toast.success('Resumed remaining zones into folder.'); }}
        onDeleteFolder={(id) => scrapedFolders.deleteFolder(id)}
      />

      <CockpitDossierDrawer
        vendor={selectedVendor} country={country} onClose={() => setSelectedVendor(null)} enriching={enrichingVendor}
        onEnrich={async (v) => {
          setEnrichingVendor(true);
          try {
            const res = await deepEnrichVendor(v.id);
            if (res?.vendor) { vault.ingestLead(res.vendor); setSelectedVendor(res.vendor); toast.success('Dossier updated!'); }
          } catch (_) { toast.error('Deep extraction unavailable.'); } finally { setEnrichingVendor(false); }
        }}
      />

      <MissionCompleteDrawer run={missionCompleteRun} onClose={() => setMissionCompleteRun(null)} onExport={() => vault.exportCsv(`${query}_${city}_leads.csv`)} />
    </div>
  );
}
