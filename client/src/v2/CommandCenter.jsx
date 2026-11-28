import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, MessageCircle, Phone, Mail, RefreshCw, FolderArchive } from 'lucide-react';
import EDITION_CONFIG from '../edition.config';
import { IS_DESKTOP } from '../desktop';
import { useSweepStream } from './hooks/useSweepStream';
import { useLeadsVault } from './hooks/useLeadsVault';
import { useScrapedFolders } from '@shared/folders/useScrapedFolders';
import ScrapedFoldersModal from '@shared/folders/ScrapedFoldersModal';
import { useCityZones } from '@shared/cockpit/useCityZones';
import CityZonesExplorer from '@shared/cockpit/CityZonesExplorer';
import StatTile from '@shared/ui/StatTile';
import { safeLeadId } from './utils/safeTypes';
import CommandCenterHeader from './components/CommandCenterHeader';
import OmniSearchBar from './components/OmniSearchBar';
import GoogleDoodleHero from './components/GoogleDoodleHero';
import SovereignFlagStrip from './components/SovereignFlagStrip';
import ZoneActivityHud from './components/ZoneActivityHud';
import LeadsTableView from './components/views/LeadsTableView';
import CockpitDossierDrawer from './components/dossier/CockpitDossierDrawer';
import MissionCompleteDrawer from './components/popups/MissionCompleteDrawer';
import { exportLeadsToVcf } from '../utils/whatsappCatalog';
import { getSessions, deleteSession, deepEnrichVendor, deepEnrichBatch } from './api';

const PENDING_LAUNCH_KEY = 'lp_pending_launch';

export default function CommandCenter({ edition = EDITION_CONFIG }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCountry = (searchParams.get('country') || 'IN').toUpperCase();
  const initialQuery = searchParams.get('q') || searchParams.get('query') || '';
  const initialCity = searchParams.get('city') || '';
  const initialZoneMode = searchParams.get('zoneMode') === 'all' ? 'all' : 'smart';
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [country, setCountry] = useState(initialCountry);
  const [strategy, setStrategy] = useState(edition.isMaster ? 'district' : 'smart');
  const [activeTab, setActiveTab] = useState('leads');
  const [enrichingVendor, setEnrichingVendor] = useState(false);
  const [hasExecutedSearch, setHasExecutedSearch] = useState(!IS_DESKTOP || Boolean(initialQuery && initialCity));
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [missionCompleteRun, setMissionCompleteRun] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [isFoldersModalOpen, setIsFoldersModalOpen] = useState(false);
  const [isZonesModalOpen, setIsZonesModalOpen] = useState(false);
  const autoStartRef = useRef(false);
  const hasExecutedRef = useRef(hasExecutedSearch);
  const scanningRef = useRef(false);
  hasExecutedRef.current = hasExecutedSearch;

  const vault = useLeadsVault({ country });
  const scrapedFolders = useScrapedFolders();
  const cityZones = useCityZones({ city, country, initialMode: initialZoneMode });
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
    } catch (_) {} finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => { refreshSessions(); }, [refreshSessions]);

  useEffect(() => {
    if (!selectedVendor) return;
    const targetId = safeLeadId(selectedVendor);
    const found = vault.vendors.find((v) => safeLeadId(v) === targetId);
    if (found && found !== selectedVendor) setSelectedVendor(found);
  }, [vault.vendors, selectedVendor]);

  const activeSessionIdRef = useRef('');

  const stream = useSweepStream({
    onVendorReceived: useCallback((vendor, incomingSessionId) => {
      const targetSid = incomingSessionId || vendor?.sessionId || '';
      if (activeSessionIdRef.current && targetSid && targetSid !== activeSessionIdRef.current) return;
      if (hasExecutedRef.current || scanningRef.current) vault.ingestLead(vendor);
    }, [vault]),
    onActivePoint: useCallback(() => {}, []),
    onSweepFinished: useCallback(async (payload) => {
      const sid = payload?.sessionId || activeSessionIdRef.current;
      let syncedCount = vault.metrics.total;
      if (sid) {
        try {
          const detail = await scrapedFolders.loadFolderScope(sid, {});
          if (Array.isArray(detail?.leads) && detail.leads.length >= syncedCount) {
            vault.replaceLeads(detail.leads);
            syncedCount = detail.leads.length;
          }
        } catch (_) {}
      }
      toast.success(`Sweep finished: ${syncedCount} unique leads saved to Folders.`);
      setMissionCompleteRun({ query, city, leadsCount: syncedCount, mobilesCount: vault.metrics.mobiles });
      refreshSessions();
      scrapedFolders.refreshFolders();
    }, [query, city, vault, refreshSessions, scrapedFolders])
  });
  scanningRef.current = stream.scanning;

  useEffect(() => {
    if (!stream.scanning) return undefined;
    const id = setInterval(() => scrapedFolders.refreshFolders(), 3500);
    return () => clearInterval(id);
  }, [stream.scanning, scrapedFolders]);

  const [activeSubcategories, setActiveSubcategories] = useState(undefined);

  const handleStartSweep = useCallback(async (customSubcategories, explicitZones, overrides = {}) => {
    const qRun = String(overrides.query ?? query).trim();
    const cRun = String(overrides.city ?? city).trim();
    const ccRun = String(overrides.country ?? country).toUpperCase();
    const zMode = overrides.zoneMode || cityZones.zoneMode;
    if (!qRun || !cRun) {
      toast.error('Enter a business category and city on the Search page first.');
      return;
    }
    const subs = Array.isArray(customSubcategories) ? customSubcategories : undefined;
    const chosenZones =
      Array.isArray(explicitZones)
        ? explicitZones
        : (cityZones.selectedZoneNames && ccRun === country)
          ? cityZones.effectiveZones
          : undefined;
    setActiveSubcategories(subs);
    try {
      hasExecutedRef.current = true;
      scanningRef.current = true;
      activeSessionIdRef.current = '';
      vault.clearVault();
      scrapedFolders.clearFolderSelection();
      setHasExecutedSearch(true);
      const started = await stream.startSweep({
        query: qRun, city: cRun, country: ccRun, strategy,
        zoneMode: zMode, selectedZones: chosenZones, subcategories: subs
      });
      if (started?.sessionId) activeSessionIdRef.current = started.sessionId;
      scrapedFolders.refreshFolders();
      toast.success(`Sweeping ${qRun} in ${cRun}…`);
    } catch (err) {
      toast.error(err?.message || 'Failed to start sweep.');
    }
  }, [query, city, country, strategy, cityZones, stream, vault, scrapedFolders]);

  // Auto-launch sweep cleanly when navigated directly from Landing Search Bar (?autoStart=1)
  useEffect(() => {
    if (autoStartRef.current) return;
    if (searchParams.get('autoStart') !== '1') return;

    autoStartRef.current = true;
    let pending = null;
    try {
      const raw = sessionStorage.getItem(PENDING_LAUNCH_KEY);
      if (raw) pending = JSON.parse(raw);
      sessionStorage.removeItem(PENDING_LAUNCH_KEY);
    } catch (_) {}

    const qUrl = pending?.query || searchParams.get('q') || '';
    const cUrl = pending?.city || searchParams.get('city') || '';
    const ccUrl = (pending?.country || searchParams.get('country') || 'IN').toUpperCase();
    const modeUrl = pending?.zoneMode || (searchParams.get('zoneMode') === 'all' ? 'all' : 'smart');

    if (qUrl) setQuery(qUrl);
    if (cUrl) setCity(cUrl);
    if (ccUrl) setCountry(ccUrl);
    if (modeUrl) cityZones.setZoneMode(modeUrl);
    const cleanParams = new URLSearchParams(searchParams);
    cleanParams.delete('autoStart');
    setSearchParams(cleanParams, { replace: true });
    if (qUrl && cUrl) {
      handleStartSweep(pending?.subcategories, pending?.selectedZones, { query: qUrl, city: cUrl, country: ccUrl, zoneMode: modeUrl });
    }
  }, [searchParams, setSearchParams, cityZones, handleStartSweep]);

  const handleStopSweep = useCallback(async () => {
    try { await stream.stopSweep(); scrapedFolders.refreshFolders(); toast('Sweep paused and saved to Folders.'); }
    catch (_) { toast.error('Failed to halt sweep.'); }
  }, [stream, scrapedFolders]);

  const handleResumeSweep = useCallback(async () => {
    try {
      const nextZoneIdx = stream.sweepProgress?.overallCompletedMandals || 0;
      const resumed = await stream.startSweep({
        query, city, country, strategy, zoneMode: cityZones.zoneMode,
        selectedZones: cityZones.selectedZoneNames ? cityZones.effectiveZones : undefined,
        subcategories: activeSubcategories, startZoneIndex: nextZoneIdx
      });
      if (resumed?.sessionId) activeSessionIdRef.current = resumed.sessionId;
      toast.success(`Resuming from zone ${nextZoneIdx + 1}…`);
    } catch (_) { toast.error('Failed to resume sweep.'); }
  }, [query, city, country, strategy, cityZones, activeSubcategories, stream]);

  const handleNewSearch = useCallback(() => {
    if (!IS_DESKTOP) {
      navigate('/');
      return;
    }
    setHasExecutedSearch(false);
    activeSessionIdRef.current = '';
    scrapedFolders.clearFolderSelection();
    vault.clearVault();
  }, [navigate, vault, scrapedFolders]);

  const handleLoadFolderScope = useCallback(async (folderId, scope = {}) => {
    const detail = await scrapedFolders.loadFolderScope(folderId, scope);
    if (detail?.leads) {
      if (detail.folder?.query) setQuery(detail.folder.query);
      if (detail.folder?.city) setCity(detail.folder.city);
      if (detail.folder?.country) setCountry(detail.folder.country);
      activeSessionIdRef.current = detail.folder?.sessionIds?.[0] || '';
      setFilterState({ query: '', source: 'all', phoneOnly: false, websiteOnly: false, noWebsiteOnly: false, deepOnly: false, primeOnly: false, minRating: 0, sort: 'newest' });
      vault.resetFilters();
      vault.replaceLeads(detail.leads);
      setHasExecutedSearch(true);
      setActiveTab('leads');
      toast.success(`Loaded ${detail.leads.length} leads from "${detail.folder?.title || 'Folder'}"`);
    }
  }, [scrapedFolders, vault]);

  const isHeroMode = IS_DESKTOP && !hasExecutedSearch;
  const displayedVendors = vault.filteredVendors;
  const pageRows = vault.pageRows;
  const pageCount = vault.pageCount;

  return (
    <div className="lp-canvas-bg" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <CommandCenterHeader
        navigate={navigate}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        effectiveRuns={scrapedFolders.folders.length ? scrapedFolders.folders : sessions}
        isEngineReady={stream.sseStatus === 'open'}
        sseStatus={stream.sseStatus}
        isMaster={edition.isMaster}
        searchCountry={country}
        isHeroMode={isHeroMode}
        onResetToHero={handleNewSearch}
        onOpenFolders={() => setIsFoldersModalOpen(true)}
        foldersCount={scrapedFolders.folders.length}
      />

      <main style={{ flex: 1, maxWidth: 1360, width: '100%', margin: '0 auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isHeroMode ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: 880, width: '100%', margin: '-8px auto 0' }}>
            <GoogleDoodleHero
              country={country}
              onPickInspiration={(item) => {
                if (item.flag) setCountry(item.flag);
                setQuery(item.category);
                setCity(item.city);
              }}
            />
            <div style={{ width: '100%' }}>
              <OmniSearchBar
                query={query} setQuery={setQuery} city={city} setCity={setCity} country={country} setCountry={setCountry}
                scanning={stream.scanning} onStart={(subs, ov) => handleStartSweep(subs, undefined, ov)} onStop={handleStopSweep}
                onExport={() => vault.exportCsv(`${query}_${city}_leads.csv`)} leadCount={vault.metrics.total}
                zoneCount={cityZones.effectiveZones?.length || 0}
              />
              <CityZonesExplorer
                city={city} country={country} zoneData={cityZones.zoneData} loading={cityZones.loading}
                zoneMode={cityZones.zoneMode} onChangeMode={cityZones.setZoneMode}
                effectiveZones={cityZones.effectiveZones} selectedZoneNames={cityZones.selectedZoneNames}
                onToggleZone={cityZones.toggleZoneName} onSelectAllZones={cityZones.selectAllZones}
                onSetZoneSubset={cityZones.setZoneSubset} onSweepSelected={(zonesSubset) => handleStartSweep(undefined, zonesSubset)}
                scanning={stream.scanning}
              />
              <SovereignFlagStrip
                selectedCountry={country} onSelectCountry={setCountry}
                selectedCity={city} onSelectCity={setCity} disabled={stream.scanning}
                countriesOverview={cityZones.countriesOverview}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ marginBottom: 8, flexShrink: 0 }}>
              <OmniSearchBar query={query} setQuery={setQuery} city={city} setCity={setCity} country={country} setCountry={setCountry} scanning={stream.scanning} onStart={(subs, ov) => handleStartSweep(subs, undefined, ov)} onStop={handleStopSweep} zoneCount={cityZones.effectiveZones?.length || 0} />
            </div>

            <CityZonesExplorer showInlineBar={false} city={city} country={country} zoneData={cityZones.zoneData} loading={cityZones.loading} zoneMode={cityZones.zoneMode} onChangeMode={cityZones.setZoneMode} effectiveZones={cityZones.effectiveZones} selectedZoneNames={cityZones.selectedZoneNames} onToggleZone={cityZones.toggleZoneName} onSelectAllZones={cityZones.selectAllZones} onSetZoneSubset={cityZones.setZoneSubset} onSweepSelected={(zonesSubset) => handleStartSweep(undefined, zonesSubset)} scanning={stream.scanning} externalModalOpen={isZonesModalOpen} onCloseExternalModal={() => setIsZonesModalOpen(false)} />
            <ZoneActivityHud
              activePoint={stream.activePoint}
              sweepProgress={stream.sweepProgress}
              scanning={stream.scanning}
              totalLeads={Math.max(vault.metrics.total, stream.scanning ? Number(stream.sweepProgress?.vendorsFound || 0) : 0)}
              totalPhones={Math.max(vault.metrics.withPhone, stream.scanning ? Number(stream.sweepProgress?.phonesFound || 0) : 0)}
              telemetry={stream.telemetry || stream.health}
              onResumeSweep={handleResumeSweep}
              onInspectZones={() => setIsZonesModalOpen(true)}
              onExportCsv={() => vault.exportCsv(`${query || 'leads'}_${city || country}.csv`)}
              zonesCount={cityZones.effectiveZones.length}
              zoneMode={cityZones.zoneMode}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: 12, marginBottom: 12, flexShrink: 0 }}>
              <StatTile
                label="Extracted Leads"
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
                    filteredVendors={displayedVendors} pageRows={pageRows} syncNonce={vault.syncNonce}
                    currentPage={vault.currentPage} pageSize={vault.pageSize} pageCount={pageCount}
                    setPage={vault.setCurrentPage} setPageSize={vault.setPageSize}
                    country={country} scanning={stream.scanning}
                    freshLeadIds={vault.freshLeadIds} phoneJustFoundIds={vault.phoneJustFoundIds}
                    setSelectedVendor={setSelectedVendor}
                    onSaveToFolder={() => setIsFoldersModalOpen(true)}
                    folders={scrapedFolders.folders}
                    activeSelection={scrapedFolders.activeSelection}
                    onClearFolderSelection={() => { scrapedFolders.clearFolderSelection(); vault.clearVault(); }}
                    onQuickOpenFolder={(id) => handleLoadFolderScope(id, {})}
                    onOpenFoldersModal={() => setIsFoldersModalOpen(true)}
                    onDeepEnrichPage={async (rows) => {
                      const ids = (rows || []).map((r) => r.id).filter(Boolean);
                      if (ids.length === 0) return;
                      const res = await deepEnrichBatch(ids, stream.currentRun?.sessionId || null);
                      toast.success(`Deep enriching ${res?.queued || ids.length} visible leads live...`);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="lp-glass-subtle" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <FolderArchive size={16} color="#d97706" /> Saved Runs ({sessions.length})
                  </h2>
                  <button type="button" onClick={refreshSessions} disabled={loadingSessions} style={{ padding: 6, borderRadius: 8, border: 'none', background: '#f8fafc', cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>
                {sessions.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', fontSize: 12.5, color: 'var(--lp-ink-4)' }}>No saved runs yet.</div>
                ) : (
                  sessions.map((s) => (
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
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

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

      {selectedVendor && (
        <CockpitDossierDrawer
          vendor={selectedVendor}
          country={country}
          onClose={() => setSelectedVendor(null)}
          onSaveToFolder={() => setIsFoldersModalOpen(true)}
          enriching={enrichingVendor}
          onDeepEnrich={async (vendor) => {
            if (!vendor?.id || enrichingVendor) return;
            try {
              setEnrichingVendor(true);
              const res = await deepEnrichVendor(vendor.id);
              if (res?.vendor) {
                vault.ingestLead(res.vendor);
                setSelectedVendor(res.vendor);
                toast.success('Deep contact & social hunt finished.');
              }
            } catch (err) {
              toast.error(err?.response?.data?.error || 'Deep enrich failed.');
            } finally {
              setEnrichingVendor(false);
            }
          }}
        />
      )}

      {missionCompleteRun && (
        <MissionCompleteDrawer
          isOpen={Boolean(missionCompleteRun)} leadsCount={missionCompleteRun.leadsCount}
          mobilesCount={missionCompleteRun.mobilesCount} whatsappCount={vault.metrics.whatsapps}
          onExportCsv={() => vault.exportCsv(`${query}_${city}_leads.csv`)}
          onOpenFolder={() => { setMissionCompleteRun(null); setIsFoldersModalOpen(true); }}
          onClose={() => setMissionCompleteRun(null)}
        />
      )}
    </div>
  );
}
