const ExcelJS = require('exceljs');
const { normalizePhone } = require('./phoneUtils');
const { calculateLeadQuality } = require('./leadScoring');

/**
 * Extract clean neighborhood / area name for grouping.
 */
function extractLeadArea(lead, fallbackCity = 'Target City') {
  if (!lead) return 'General';
  const city = String(fallbackCity || lead.city || '').trim().toLowerCase();

  for (const cand of [lead.locality, lead.suburb, lead.zoneName, lead.area, lead.mandal, lead.village]) {
    if (cand && typeof cand === 'string') {
      const trimmed = cand.trim();
      if (trimmed && trimmed.toLowerCase() !== city && !/^(other|unknown|null|undefined)$/i.test(trimmed)) {
        return trimmed;
      }
    }
  }

  const address = lead.address || '';
  if (address) {
    const segs = address.split(',').map(s => s.trim()).filter(Boolean);
    const clean = segs.filter(s => !/^\d{6}$/.test(s) && !/^(Telangana|Andhra Pradesh|Karnataka|Maharashtra|Tamil Nadu|India)$/i.test(s));
    if (clean.length >= 2) {
      const cand = clean[clean.length - 2];
      if (cand && cand.length >= 3 && cand.length <= 40 && !/^(near|opp|behind|plot|door|flat|shop|floor|no\.)/i.test(cand) && cand.toLowerCase() !== city) {
        return cand;
      }
    }
    if (clean.length >= 1) {
      const cand = clean[clean.length - 1];
      if (cand && cand.length >= 3 && cand.length <= 40 && cand.toLowerCase() !== city) {
        return cand;
      }
    }
  }

  return 'City Central';
}

function sanitizeSheetName(name) {
  return String(name || 'Area')
    .replace(/[\\/*?:[\]]/g, '')
    .trim()
    .slice(0, 31) || 'Sheet';
}

function getSectorEmoji(category = '') {
  const cat = String(category).toLowerCase();
  if (cat.includes('photo') || cat.includes('studio') || cat.includes('video') || cat.includes('shoot')) return '📷';
  if (cat.includes('electr') || cat.includes('wiring') || cat.includes('power')) return '⚡';
  if (cat.includes('hosp') || cat.includes('clinic') || cat.includes('dr') || cat.includes('medic') || cat.includes('health')) return '🏥';
  if (cat.includes('car') || cat.includes('auto') || cat.includes('garage') || cat.includes('mechanic')) return '🚗';
  if (cat.includes('wedding') || cat.includes('mandap') || cat.includes('cater') || cat.includes('banquet')) return '💍';
  if (cat.includes('hotel') || cat.includes('resort') || cat.includes('restaurant')) return '🏨';
  if (cat.includes('real estate') || cat.includes('property') || cat.includes('builder')) return '🏢';
  return '🏢';
}

/**
 * God-Level Multi-Sheet Excel Generator for Scraper.co.in
 * Generates an executive-grade styled .xlsx workbook with Sheet 1 for All Leads
 * and dedicated worksheet tabs for each Area / Locality.
 */
async function buildGodLevelExcelBuffer(leads = [], options = {}) {
  const city = options.city || 'Target City';
  const category = options.category || 'Business';
  const cleanLeads = deduplicateLeads(leads);
  const sectorEmoji = getSectorEmoji(category);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Scraper.co.in';
  workbook.lastModifiedBy = 'Scraper.co.in Executive Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Color constants
  const COLOR_BRAND = '0F172A';      // Slate 900
  const COLOR_HEADER = '1E293B';     // Slate 800
  const COLOR_ROW_ALT = 'F8FAFC';    // Slate 50
  const COLOR_ROW_NORM = 'FFFFFF';   // White
  const COLOR_METRICS_BG = 'FEFCE8'; // Yellow 50
  const COLOR_BORDER = 'E2E8F0';     // Slate 200
  const COLOR_DARK_GREEN = '166534'; // Forest Green
  const COLOR_SLATE_TEXT = '334155'; // Slate 700
  const COLOR_SUBTITLE = '94A3B8';   // Slate 400

  // Tier colors
  const TIER_COLORS = {
    Platinum: { bg: 'F0FDF4', text: '166534' }, // Emerald / Green
    Gold: { bg: 'FEFCE8', text: '854D0E' },     // Amber
    Silver: { bg: 'F1F5F9', text: '475569' },   // Slate
    Bronze: { bg: 'FFF1F2', text: '9F1239' }    // Rose
  };

  const borderThin = {
    top: { style: 'thin', color: { argb: 'FF' + COLOR_BORDER } },
    left: { style: 'thin', color: { argb: 'FF' + COLOR_BORDER } },
    bottom: { style: 'thin', color: { argb: 'FF' + COLOR_BORDER } },
    right: { style: 'thin', color: { argb: 'FF' + COLOR_BORDER } }
  };

  const headers = [
    'Business Name', 'Category', 'Area / Locality', 'Primary Phone', 'Phone Type',
    'Alternate Numbers', 'Total Lines', 'WhatsApp Direct URL', 'Direct Call Link',
    'Email Address', 'Website', 'Complete Address', 'Pincode', 'Rating',
    'Reviews Count', 'Profile Quality (%)', 'Quality Tier', 'Google Maps URL'
  ];

  const widths = [38, 22, 22, 20, 16, 28, 14, 30, 20, 28, 30, 48, 12, 12, 16, 20, 16, 35];

  // Helper to format a single sheet
  function populateSheet(sheet, sheetTitle, subtitleText, sheetLeads) {
    sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 5 }];

    // Row 1 & 2: Title Block
    sheet.mergeCells('A1:R2');
    const cellA1 = sheet.getCell('A1');
    cellA1.value = sheetTitle;
    cellA1.font = { name: 'Segoe UI', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    cellA1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    for (let r = 1; r <= 2; r++) {
      sheet.getRow(r).height = 24;
      for (let c = 1; c <= 18; c++) {
        sheet.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_BRAND } };
      }
    }

    // Row 3: Subtitle Block
    sheet.mergeCells('A3:R3');
    const cellA3 = sheet.getCell('A3');
    cellA3.value = `  ${subtitleText}`;
    cellA3.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF' + COLOR_SUBTITLE } };
    cellA3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    sheet.getRow(3).height = 20;
    for (let c = 1; c <= 18; c++) {
      sheet.getCell(3, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_BRAND } };
    }

    // Row 4: Spacer
    sheet.mergeCells('A4:R4');
    sheet.getRow(4).height = 8;
    for (let c = 1; c <= 18; c++) {
      sheet.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    }

    // Row 5: Column Headers
    sheet.getRow(5).height = 28;
    headers.forEach((h, idx) => {
      const col = idx + 1;
      const cell = sheet.getCell(5, col);
      cell.value = h;
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_HEADER } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });

    // Data Rows (Sorted: Mobiles first, Landlines second, others third)
    const sorted = [...sheetLeads].sort((a, b) => {
      const pA = normalizePhone(a.phone || a.primaryPhone);
      const pB = normalizePhone(b.phone || b.primaryPhone);
      const scoreA = pA?.isMobile ? 3 : (pA?.isLandline ? 2 : (a.phone ? 1 : 0));
      const scoreB = pB?.isMobile ? 3 : (pB?.isLandline ? 2 : (b.phone ? 1 : 0));
      return scoreB - scoreA;
    });

    sorted.forEach((lead, rowIdx) => {
      const rowNum = 6 + rowIdx;
      const row = sheet.getRow(rowNum);
      row.height = 32;

      const ratingVal = parseFloat(lead.rating) || 0;
      const reviewVal = parseInt(lead.reviewsCount || lead.reviewCount || 0, 10);
      const isTopTier = ratingVal >= 4.5 && reviewVal >= 50;

      // Phone Classification & Secondary Numbers
      const rawPhone = lead.phone || lead.primaryPhone || '';
      const parsedPhone = rawPhone ? normalizePhone(rawPhone) : null;
      let displayPhone = '';
      let phoneType = 'Unlisted';
      let whatsappUrl = '';
      let callUrl = '';

      if (parsedPhone) {
        if (parsedPhone.isMobile) {
          displayPhone = parsedPhone.displayPhone || `+91 ${parsedPhone.national.slice(0, 5)} ${parsedPhone.national.slice(5)}`;
          phoneType = 'Mobile';
          whatsappUrl = `https://wa.me/91${parsedPhone.national}`;
          callUrl = parsedPhone.callUrl || `tel:+91${parsedPhone.national}`;
        } else if (parsedPhone.isLandline) {
          displayPhone = parsedPhone.displayPhone || ('0' + parsedPhone.national);
          phoneType = 'STD Landline';
          whatsappUrl = '';
          callUrl = parsedPhone.callUrl || `tel:0${parsedPhone.national}`;
        } else {
          displayPhone = rawPhone;
          phoneType = 'Other';
          callUrl = `tel:${rawPhone.replace(/\D/g, '')}`;
        }
      } else if (rawPhone) {
        displayPhone = rawPhone;
        phoneType = rawPhone.trim().startsWith('0') ? 'STD Landline' : 'Contact';
        callUrl = `tel:${rawPhone.replace(/\D/g, '')}`;
      }

      // Alternate phone numbers deduplicated by national digits
      const allPhones = Array.isArray(lead.phones) ? lead.phones : [];
      const primaryDigits = parsedPhone ? parsedPhone.national : String(rawPhone).replace(/\D/g, '').slice(-10);
      const seenAltDigits = new Set([primaryDigits]);
      const alternatePhones = [];
      for (const p of allPhones) {
        const parsedAlt = normalizePhone(p);
        const altDigits = parsedAlt ? parsedAlt.national : String(p).replace(/\D/g, '').slice(-10);
        if (altDigits && altDigits.length >= 7 && !seenAltDigits.has(altDigits)) {
          seenAltDigits.add(altDigits);
          alternatePhones.push(parsedAlt ? parsedAlt.displayPhone : p);
        }
      }
      const alternateStr = alternatePhones.join(', ');
      const totalLinesCount = Math.max(1, (displayPhone ? 1 : 0) + alternatePhones.length);

      const area = extractLeadArea(lead, city);
      const mapsLink = lead.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((lead.name || '') + ' ' + (lead.address || city))}`;

      // Calculate or read Lead Quality
      const qualityObj = lead.profileQuality?.score != null
        ? { score: Number(lead.profileQuality.score), tier: lead.tier || 'Gold' }
        : calculateLeadQuality(lead);
      const qualityScore = qualityObj.score;
      const qualityTier = qualityObj.tier;

      const rowData = [
        lead.name || 'Unnamed Business',
        lead.category || category,
        area,
        displayPhone,
        phoneType,
        alternateStr || '—',
        totalLinesCount,
        whatsappUrl ? { text: 'Open WhatsApp', hyperlink: whatsappUrl } : '—',
        callUrl ? { text: displayPhone ? `Call ${displayPhone}` : 'Call', hyperlink: callUrl } : '—',
        lead.email || (Array.isArray(lead.emails) ? lead.emails[0] : '') || '—',
        lead.website ? { text: lead.website, hyperlink: lead.website } : '—',
        lead.address || '',
        lead.pincode ? String(lead.pincode).replace(/\D/g, '') : '',
        ratingVal ? ratingVal.toFixed(1) : '',
        reviewVal ? reviewVal : '',
        `${qualityScore}%`,
        qualityTier,
        mapsLink ? { text: 'View on Maps', hyperlink: mapsLink } : '—'
      ];

      rowData.forEach((val, colIdx) => {
        const colNum = colIdx + 1;
        const cell = row.getCell(colNum);
        cell.value = val;
        cell.border = borderThin;

        // Force string / text format on phone column and pincode so Excel NEVER drops leading 0!
        if (colNum === 4 || colNum === 6 || colNum === 13) {
          cell.numFmt = '@';
        }

        // Font
        if (isTopTier && (colNum === 14 || colNum === 15)) {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF' + COLOR_DARK_GREEN } };
        } else if (colNum === 5 && phoneType === 'Mobile') {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF059669' } };
        } else if (colNum === 5 && phoneType === 'STD Landline') {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0284C7' } };
        } else if (colNum === 16) {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        } else if (colNum === 17) {
          const tColor = TIER_COLORS[qualityTier]?.text || '334155';
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF' + tColor } };
        } else if ([8, 9, 11, 18].includes(colNum) && typeof val === 'object' && val?.hyperlink) {
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF2563EB' }, underline: true };
        } else {
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF' + COLOR_SLATE_TEXT } };
        }

        // Fill
        const isAlt = rowNum % 2 === 0;
        if (colNum === 14 || colNum === 15) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLOR_METRICS_BG } };
        } else if (colNum === 17) {
          const tBg = TIER_COLORS[qualityTier]?.bg || (isAlt ? COLOR_ROW_ALT : COLOR_ROW_NORM);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + tBg } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isAlt ? COLOR_ROW_ALT : COLOR_ROW_NORM) } };
        }

        // Alignment
        if ([4, 5, 7, 8, 9, 13, 14, 15, 16, 17, 18].includes(colNum)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
        }
      });
    });

    // Column Widths
    widths.forEach((w, idx) => {
      sheet.getColumn(idx + 1).width = w;
    });

    // Auto-filter
    const maxRow = Math.max(5, 5 + sheetLeads.length);
    sheet.autoFilter = `A5:R${maxRow}`;
  }

  // 1. Sheet 1: Master Sheet with ALL Leads
  const masterSheet = workbook.addWorksheet('All Leads', { views: [{ showGridLines: false }] });
  populateSheet(
    masterSheet,
    `${sectorEmoji} ${city} ${category} Directory — All Verified Leads (${cleanLeads.length})`,
    `Generated by Scraper.co.in | Total Verified Leads: ${cleanLeads.length} | Mobiles prioritized first, STD Landlines preserved.`,
    cleanLeads
  );

  // 2. Sheets 2..N: Individual Worksheets per Area
  const areaGroups = new Map();
  cleanLeads.forEach(lead => {
    const area = extractLeadArea(lead, city);
    if (!areaGroups.has(area)) areaGroups.set(area, []);
    areaGroups.get(area).push(lead);
  });

  // Sort areas by lead count descending
  const sortedAreas = Array.from(areaGroups.entries()).sort((a, b) => b[1].length - a[1].length);

  const usedSheetNames = new Set(['all leads']);
  for (const [areaName, areaLeads] of sortedAreas) {
    if (!areaLeads || areaLeads.length === 0) continue;
    let sheetName = sanitizeSheetName(areaName);
    let counter = 1;
    while (usedSheetNames.has(sheetName.toLowerCase())) {
      sheetName = sanitizeSheetName(`${areaName.slice(0, 27)}_${counter++}`);
    }
    usedSheetNames.add(sheetName.toLowerCase());

    const areaSheet = workbook.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    populateSheet(
      areaSheet,
      `📍 ${areaName} — ${category} in ${city} (${areaLeads.length} Leads)`,
      `Area Sub-Directory: ${areaName} | Total Leads: ${areaLeads.length} | Verified B2B Data by Scraper.co.in`,
      areaLeads
    );
  }

  return await workbook.xlsx.writeBuffer();
}

/**
 * Deduplicate leads by ['Business Name', 'Primary Phone']
 */
function deduplicateLeads(leads = []) {
  const seen = new Set();
  const deduped = [];

  for (const lead of leads) {
    if (!lead || !lead.name) continue;
    const cleanPhone = String(lead.phone || lead.primaryPhone || '').replace(/\D/g, '').slice(-10);
    const key = `${lead.name.toLowerCase().trim()}:::${cleanPhone}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(lead);
    }
  }

  return deduped;
}

module.exports = {
  buildGodLevelExcelBuffer,
  deduplicateLeads,
  extractLeadArea
};
