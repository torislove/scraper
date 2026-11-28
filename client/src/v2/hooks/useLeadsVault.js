import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { getAllDisplayPhones, resolveLeadCountry } from '../../utils/phoneClassify';
import { downloadLeadCsv, leadSourceKey } from '../utils/leadSource';
import { exportLeadsToVcf } from '../../utils/whatsappCatalog';
import { getSessionVault, getVendors } from '../api';
import { safeStr, safeLeadId } from '../utils/safeTypes';

const GENERIC_NAMES = new Set([
  'plumber', 'plumbers', 'plumbing', 'hospital', 'hospitals', 'clinic', 'clinics',
  'doctor', 'doctors', 'dentist', 'dentists', 'restaurant', 'hotel', 'lawyer', 'electrician', 'contractor'
]);

function leadMobile10(lead) {
  const raw = safeStr(lead?.mobilePhone || (lead?.isMobile ? lead?.phone : ''));
  const d = raw.replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : '';
}

function mergeLeadsInPlace(current, item) {
  const merged = { ...current, ...item };
  const curName = safeStr(current?.name || current?.title);
  const incName = safeStr(item?.name || item?.title);
  if (curName && !GENERIC_NAMES.has(curName.toLowerCase()) && GENERIC_NAMES.has(incName.toLowerCase())) {
    merged.name = curName;
  }
  for (const k of ['phone', 'mobilePhone', 'landlinePhone', 'whatsappLink', 'email', 'website', 'instagram', 'facebook', 'linkedin', 'youtube', 'mapsLink', 'googleMapsUrl', 'placeId', 'zone', 'address']) {
    if (!merged[k] && current?.[k]) merged[k] = current[k];
  }
  if (current?.emails?.length || item?.emails?.length) {
    merged.emails = Array.from(new Set([...(current?.emails || []), ...(item?.emails || [])]));
  }
  if (current?.sources?.length || item?.sources?.length) {
    merged.sources = Array.from(new Set([...(current?.sources || [current?.source].filter(Boolean)), ...(item?.sources || [item?.source].filter(Boolean))]));
  }
  return merged;
}

function dedupeLeadArray(list = []) {
  const out = [];
  const byKey = new Map();
  for (const item of Array.isArray(list) ? list : []) {
    if (!item || (!item.name && !item.title)) continue;
    const idKey = safeLeadId(item);
    const pid = safeStr(item.placeId || item.place_id);
    const mob10 = leadMobile10(item);
    let idx = byKey.get(idKey);
    if (idx === undefined && pid) idx = byKey.get(`p:${pid}`);
    if (idx === undefined && mob10) idx = byKey.get(`m:${mob10}`);
    if (idx !== undefined) {
      out[idx] = mergeLeadsInPlace(out[idx], item);
    } else {
      idx = out.length;
      out.push(item);
    }
    byKey.set(idKey, idx);
    if (pid) byKey.set(`p:${pid}`, idx);
    if (mob10) byKey.set(`m:${mob10}`, idx);
  }
  return out;
}

/**
 * useLeadsVault.js
 * rAF-batched (~60 Hz) live lead vault with multi-key deduplication (id, placeId, mobile10),
 * hot in-place enrichment merge, source/contact filtering, and CSV/VCF export.
 */
export function useLeadsVault({ country = 'IN' } = {}) {
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOnly, setMobileOnly] = useState(false);
  const [landlineOnly, setLandlineOnly] = useState(false);
  const [whatsappOnly, setWhatsappOnly] = useState(false);
  const [websiteOnly, setWebsiteOnly] = useState(false);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [emailOnly, setEmailOnly] = useState(false);
  const [deepOnly, setDeepOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(250);
  const [freshLeadIds, setFreshLeadIds] = useState(new Set());
  const [phoneJustFoundIds, setPhoneJustFoundIds] = useState(new Set());
  const [latestLead, setLatestLead] = useState(null);
  const [syncNonce, setSyncNonce] = useState(0);

  const pendingBufferRef = useRef([]);
  const rafIdRef = useRef(0);
  const mountedRef = useRef(true);

  const flushBuffer = useCallback(() => {
    rafIdRef.current = 0;
    if (!mountedRef.current || pendingBufferRef.current.length === 0) return;

    const incoming = pendingBufferRef.current;
    pendingBufferRef.current = [];

    setVendors((prev) => {
      const existingMap = new Map();
      prev.forEach((v, idx) => {
        existingMap.set(safeLeadId(v), idx);
        const pid = safeStr(v.placeId || v.place_id);
        const mob10 = leadMobile10(v);
        if (pid) existingMap.set(`p:${pid}`, idx);
        if (mob10) existingMap.set(`m:${mob10}`, idx);
      });

      const updatedPrev = [...prev];
      const brandNew = [];
      const brandNewMap = new Map();
      const newlyFoundPhones = [];
      let hasChanges = false;

      const hasAnyPhone = (l) => Boolean(l?.mobilePhone || l?.phone || l?.landlinePhone || (Array.isArray(l?.phones) && l.phones.length > 0));

      for (const item of incoming) {
        const key = safeLeadId(item);
        const pid = safeStr(item.placeId || item.place_id);
        const mob10 = leadMobile10(item);
        let idx = existingMap.get(key);
        if (idx === undefined && pid) idx = existingMap.get(`p:${pid}`);
        if (idx === undefined && mob10) idx = existingMap.get(`m:${mob10}`);

        if (idx !== undefined && idx >= 0) {
          const current = updatedPrev[idx];
          const hadNoPhone = !hasAnyPhone(current);
          updatedPrev[idx] = mergeLeadsInPlace(current, item);
          hasChanges = true;
          if (hadNoPhone && hasAnyPhone(updatedPrev[idx])) newlyFoundPhones.push(safeLeadId(updatedPrev[idx]));
        } else if (brandNewMap.has(key) || (pid && brandNewMap.has(`p:${pid}`)) || (mob10 && brandNewMap.has(`m:${mob10}`))) {
          const bIdx = brandNewMap.get(key) ?? brandNewMap.get(`p:${pid}`) ?? brandNewMap.get(`m:${mob10}`);
          const current = brandNew[bIdx];
          const hadNoPhone = !hasAnyPhone(current);
          brandNew[bIdx] = mergeLeadsInPlace(current, item);
          hasChanges = true;
          if (hadNoPhone && hasAnyPhone(brandNew[bIdx])) newlyFoundPhones.push(safeLeadId(brandNew[bIdx]));
        } else {
          const bIdx = brandNew.length;
          brandNewMap.set(key, bIdx);
          if (pid) brandNewMap.set(`p:${pid}`, bIdx);
          if (mob10) brandNewMap.set(`m:${mob10}`, bIdx);
          brandNew.push(item);
          hasChanges = true;
          if (hasAnyPhone(item)) newlyFoundPhones.push(key);
        }
      }

      if (!hasChanges) return prev;

      if (newlyFoundPhones.length > 0) {
        const highlightSlice = newlyFoundPhones.slice(0, 16);
        setPhoneJustFoundIds((prevP) => new Set([...prevP, ...highlightSlice]));
        setTimeout(() => {
          if (!mountedRef.current) return;
          setPhoneJustFoundIds((prevP) => {
            const next = new Set(prevP);
            for (const id of highlightSlice) next.delete(id);
            return next;
          });
        }, 2200);
      }

      if (brandNew.length > 0) {
        const animatedIds = brandNew.slice(0, 12).map((v) => safeLeadId(v));
        setFreshLeadIds((prevFresh) => new Set([...prevFresh, ...animatedIds]));
        setLatestLead(brandNew[0]);
        setTimeout(() => {
          if (!mountedRef.current) return;
          setFreshLeadIds((prevFresh) => {
            const next = new Set(prevFresh);
            for (const id of animatedIds) next.delete(id);
            return next;
          });
        }, 900);
        return [...brandNew, ...updatedPrev];
      }

      return updatedPrev;
    });
  }, []);

  const ingestLead = useCallback(
    (lead) => {
      if (!lead) return;
      const actual = lead.vendor || lead.place || lead;
      if (!actual || (!actual.id && !actual.title && !actual.name)) return;
      pendingBufferRef.current.push(actual);
      if (!rafIdRef.current && typeof requestAnimationFrame === 'function') {
        rafIdRef.current = requestAnimationFrame(flushBuffer);
      }
    },
    [flushBuffer]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setMobileOnly(false);
    setLandlineOnly(false);
    setWhatsappOnly(false);
    setWebsiteOnly(false);
    setNoWebsiteOnly(false);
    setEmailOnly(false);
    setDeepOnly(false);
    setSourceFilter('all');
    setMinRating(0);
    setSortOrder('newest');
    setCurrentPage(1);
  }, []);

  const loadSessionLeads = useCallback(async (sessionId) => {
    try {
      const data = await getSessionVault(sessionId);
      if (Array.isArray(data?.vendors)) setVendors(dedupeLeadArray(data.vendors));
      else {
        const fallback = await getVendors({ session: sessionId });
        if (Array.isArray(fallback)) setVendors(dedupeLeadArray(fallback));
      }
      setCurrentPage(1);
      setSyncNonce((n) => n + 1);
    } catch (_) {}
  }, []);

  const filteredVendors = useMemo(() => {
    let list = vendors;
    const q = safeStr(searchQuery).toLowerCase();
    if (q) {
      list = list.filter((v) => {
        const name = safeStr(v.title || v.name).toLowerCase();
        const address = safeStr(v.address || v.formatted_address).toLowerCase();
        const category = safeStr(v.category || v.primary_type || v.matchedSubcategory).toLowerCase();
        const phone = safeStr(v.phone || v.mobilePhone || v.international_phone_number).toLowerCase();
        const zone = safeStr(v.zone || v.locality).toLowerCase();
        return name.includes(q) || address.includes(q) || category.includes(q) || phone.includes(q) || zone.includes(q);
      });
    }
    if (sourceFilter && sourceFilter !== 'all') {
      list = list.filter((v) => leadSourceKey(v) === sourceFilter);
    }
    if (mobileOnly) {
      list = list.filter((v) => Boolean(getAllDisplayPhones(v, resolveLeadCountry(v, country)).mobile));
    } else if (landlineOnly) {
      list = list.filter((v) => {
        const d = getAllDisplayPhones(v, resolveLeadCountry(v, country));
        return Boolean(d.landline) && !d.mobile;
      });
    }
    if (whatsappOnly) {
      list = list.filter((v) => Boolean(getAllDisplayPhones(v, resolveLeadCountry(v, country)).mobile?.whatsappUrl));
    }
    if (websiteOnly) {
      list = list.filter((v) => Boolean(v.website || v.url));
    } else if (noWebsiteOnly) {
      list = list.filter((v) => !v.website && !v.url);
    }
    if (emailOnly) {
      list = list.filter((v) => Boolean(v.email || (Array.isArray(v.emails) && v.emails.length > 0)));
    }
    if (deepOnly) {
      list = list.filter((v) => {
        const hasPh = Boolean(v.mobilePhone || v.phone);
        const hasExtra = Boolean(v.website || v.email || (Array.isArray(v.emails) && v.emails.length > 0) || v.instagram || v.facebook || v.linkedin);
        return hasPh && hasExtra;
      });
    }
    if (minRating > 0) {
      list = list.filter((v) => Number(v.rating || v.totalScore || 0) >= minRating);
    }
    if (sortOrder && sortOrder !== 'newest') {
      const scoreLead = (v) => {
        let s = 0;
        if (v.mobilePhone || v.isMobile) s += 30;
        else if (v.phone) s += 18;
        if (v.whatsappLink || v.whatsappAvailable) s += 15;
        if (v.email || v.emails?.length) s += 20;
        if (v.website || v.url) s += 15;
        if (v.instagram || v.facebook || v.linkedin) s += 10;
        if (Number(v.rating || 0) > 0) s += 5;
        return s;
      };
      list = [...list].sort((a, b) => {
        if (sortOrder === 'rating') {
          return (Number(b.rating || b.totalScore || 0) - Number(a.rating || a.totalScore || 0)) ||
            (Number(b.reviewsCount || b.reviews || 0) - Number(a.reviewsCount || a.reviews || 0));
        }
        if (sortOrder === 'reviews') {
          return (Number(b.reviewsCount || b.reviews || b.user_ratings_total || 0) - Number(a.reviewsCount || a.reviews || a.user_ratings_total || 0));
        }
        if (sortOrder === 'quality') {
          return (scoreLead(b) - scoreLead(a)) || (Number(b.rating || 0) - Number(a.rating || 0));
        }
        if (sortOrder === 'area') {
          const az = safeStr(a.zone || a.locality || a.address).toLowerCase();
          const bz = safeStr(b.zone || b.locality || b.address).toLowerCase();
          return az.localeCompare(bz);
        }
        if (sortOrder === 'name') {
          return safeStr(a.title || a.name).localeCompare(safeStr(b.title || b.name));
        }
        return 0;
      });
    }
    return list;
  }, [vendors, searchQuery, sourceFilter, mobileOnly, landlineOnly, whatsappOnly, websiteOnly, noWebsiteOnly, emailOnly, deepOnly, minRating, sortOrder, country]);

  const pageCount = Math.max(1, Math.ceil(filteredVendors.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredVendors.slice(start, start + pageSize);
  }, [filteredVendors, safePage, pageSize]);

  const metrics = useMemo(() => {
    let mobiles = 0, landlines = 0, whatsapps = 0, websites = 0, emails = 0, scoreSum = 0;
    for (const v of vendors) {
      const dual = getAllDisplayPhones(v, resolveLeadCountry(v, country));
      const isMob = Boolean(dual.mobile);
      if (isMob) mobiles++;
      else if (dual.landline) landlines++;
      if (isMob && dual.mobile?.whatsappUrl) whatsapps++;
      if (v.website || v.url) websites++;
      if (v.email || (Array.isArray(v.emails) && v.emails.length > 0)) emails++;
      scoreSum += Number(v.rating || 0);
    }
    const withPhone = mobiles + landlines;
    const phoneRate = vendors.length > 0 ? Math.round((withPhone / vendors.length) * 100) : 0;
    return {
      total: vendors.length,
      filtered: filteredVendors.length,
      withPhone,
      phoneRate,
      mobiles,
      landlines,
      whatsapps,
      websites,
      emails,
      avgRating: vendors.length > 0 ? (scoreSum / vendors.length).toFixed(1) : '0.0'
    };
  }, [vendors, filteredVendors.length, country]);

  const exportCsv = useCallback((filename = 'leads_export.csv') => {
    downloadLeadCsv(filteredVendors, filename);
  }, [filteredVendors]);

  const exportVcf = useCallback((filename = 'leads_contacts.vcf') => {
    exportLeadsToVcf(filteredVendors, filename);
  }, [filteredVendors]);

  const clearVault = useCallback(() => {
    pendingBufferRef.current = [];
    setVendors([]);
    setCurrentPage(1);
    setSyncNonce((n) => n + 1);
  }, []);

  const replaceLeads = useCallback((list) => {
    pendingBufferRef.current = [];
    setVendors(dedupeLeadArray(list));
    setCurrentPage(1);
    setSyncNonce((n) => n + 1);
  }, []);

  return {
    vendors, filteredVendors, pageRows, currentPage: safePage, pageSize, pageCount,
    metrics, freshLeadIds, phoneJustFoundIds, latestLead, syncNonce,
    filters: { searchQuery, sourceFilter, mobileOnly, landlineOnly, whatsappOnly, websiteOnly, noWebsiteOnly, emailOnly, deepOnly, minRating, sortOrder },
    setSearchQuery, setSourceFilter, setMobileOnly, setLandlineOnly, setWhatsappOnly, setWebsiteOnly, setNoWebsiteOnly, setEmailOnly, setDeepOnly, setMinRating, setSortOrder,
    setCurrentPage, setPageSize, resetFilters, ingestLead, loadSessionLeads,
    exportCsv, exportVcf, clearVault, replaceLeads
  };
}
