/**
 * conflictMatrix.js
 * Cross-industry anti-bleed conflict matrix.
 */

/**
 * Comprehensive Cross-Industry Anti-Bleed Conflict Matrix:
 * Detects if a scraped vendor profile violates the requested industry boundary.
 *
 * @param {string} querySectorKey - Key of the sector being searched
 * @param {string} haystack - Combined lowercase text of vendor (name, subcategory, desc)
 * @param {string} subcategory - Explicit subcategory assigned by directory/maps
 * @returns {boolean} true if an irreconcilable cross-industry conflict is detected
 */
function isIndustryConflict(querySectorKey, haystack, subcategory = '') {
  if (!querySectorKey || !haystack) return false;

  const h = String(haystack).toLowerCase();
  const sub = String(subcategory || '').toLowerCase();
  const combined = `${h} ${sub}`;

  // ── 1. AGRICULTURE & SPICES COMMODITIES ──
  if (querySectorKey === 'agriculture_spices') {
    // Strictly reject Metals, Sarees/Textiles, Tiles/Granite, Electricals, Hotels, Hospitals
    const isSteel = /\b(iron\s*and\s*steel|iron\s*&\s*steel|tmt|tmt\s*bars?|steel\s*dealer|steel\s*corporation|railing|metal\s*store|metal\s*house|fabrication)\b/i.test(combined);
    const isTextile = /\b(saree|sari|sarees|handloom|handlooms|textile|textiles|cloth\s*store|readymade|garments?|silk\s*sarees?)\b/i.test(combined);
    const isBuildingMat = /\b(tiles?|sanitaryware|marbles?|granites?|cement|plywood|vox\s*ceiling|ceramic\s*showroom)\b/i.test(combined);
    const isElectrical = /\b(electrical|electricals|electric|electronics|electronic|switchgear|switch|switches|wire|wires|cable|cables|lighting|fixtures|fans|appliances|spares|power\s*tools|hardware|hardware\s*and\s*tools)\b/i.test(combined);
    const isHotel = /\b(hotel|grand|residency|lodge|banquet|mandapam|function\s*hall)\b/i.test(combined);
    const isHealth = /\b(hospital|clinic|dentist|dental|nursing\s*home|doctor)\b/i.test(combined);

    if (isSteel || isTextile || isBuildingMat || isElectrical || isHotel || isHealth) {
      return true;
    }
  }

  // ── 2. METALS, STEEL & MINING ──
  if (querySectorKey === 'metals_steel') {
    const isAgro = /\b(turmeric|haldi|spices?|masala|chilli|mirchi|grain|paddy|rice\s*mill|cotton\s*ginning)\b/i.test(combined);
    const isTextile = /\b(saree|handloom|cloth|readymade|garment)\b/i.test(combined);
    const isHotel = /\b(hotel|lodge|restaurant|bakery|sweet\s*shop)\b/i.test(combined);
    const isHealth = /\b(hospital|clinic|doctor|pharmacy|chemist)\b/i.test(combined);

    if (isAgro || isTextile || isHotel || isHealth) return true;
  }

  // ── 3. TEXTILES, SAREES & APPAREL ──
  if (querySectorKey === 'textiles_apparel') {
    const isSteel = /\b(iron\s*and\s*steel|tmt|steel\s*dealer|metal\s*store)\b/i.test(combined);
    const isAgro = /\b(turmeric|spices?|chilli|paddy|grain|cotton\s*seeds?)\b/i.test(combined);
    const isBuilding = /\b(cement|tiles|sanitaryware|granite|plywood)\b/i.test(combined);
    const isHotel = /\b(hotel|lodge|resort|banquet)\b/i.test(combined);
    const isHealth = /\b(hospital|clinic|dentist|pharmacy)\b/i.test(combined);

    if (isSteel || isAgro || isBuilding || isHotel || isHealth) return true;
  }

  // ── 4. BUILDING MATERIALS, TILES & CERAMICS ──
  if (querySectorKey === 'building_materials') {
    const isAgro = /\b(turmeric|spices?|chilli|paddy|grain)\b/i.test(combined);
    const isTextile = /\b(saree|handloom|cloth|garments?)\b/i.test(combined);
    const isHealth = /\b(hospital|clinic|doctor|pharmacy)\b/i.test(combined);
    const isHotel = /\b(hotel|residency|lodge|restaurant)\b/i.test(combined);

    if (isAgro || isTextile || isHealth || isHotel) return true;
  }

  // ── 5. TECHNOLOGY & COMPUTER STORES ──
  if (querySectorKey === 'technology_computers') {
    const isCctvOnly = /\b(cctv|surveillance|security\s*camera|biometric)\b/i.test(combined) && !/\b(computer|laptop|pc\s*builder|hardware)\b/i.test(combined);
    const isTextile = /\b(saree|handloom|cloth)\b/i.test(combined);
    const isSteel = /\b(steel|iron\s*and\s*steel|tmt)\b/i.test(combined);
    const isAgro = /\b(turmeric|spices?|chilli)\b/i.test(combined);

    if (isCctvOnly || isTextile || isSteel || isAgro) return true;
  }

  // ── 6. CCTV SURVEILLANCE ──
  if (querySectorKey === 'surveillance_cctv') {
    const isPureLaptop = /\b(laptop\s*repair|screen\s*replacement|motherboard\s*repair)\b/i.test(combined) && !/\b(cctv|camera|surveillance|security)\b/i.test(combined);
    const isTextile = /\b(saree|handloom)\b/i.test(combined);
    const isAgro = /\b(turmeric|spices?|chilli)\b/i.test(combined);

    if (isPureLaptop || isTextile || isAgro) return true;
  }

  return false;
}


module.exports = {
  isIndustryConflict
};
