const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../server/src/utils/universalGeoCluster.js');
let code = fs.readFileSync(targetPath, 'utf8');

const target = '  // 2. Village Multi-Node Expansion Protocol';

const newSection2 = [
  '  // 2. District Headquarters / Major City Sweep (e.g. Solapur, Ujjain, Kurnool, Warangal, Bareilly, etc.)',
  '  if (!isExplicitDistrict && (districtIndex.has(lowerLoc) || districtIndex.has(primaryName))) {',
  '    const entry = districtIndex.get(lowerLoc) || districtIndex.get(primaryName);',
  '    const cityName = entry.district;',
  '    const cityLower = cityName.toLowerCase();',
  '    const cityCenter = ZONE_COORDINATES[cityLower] || ZONE_COORDINATES[lowerLoc] || null;',
  "    const prefix = category ? (category + ' in ') : '';",
  '',
  '    const citySectors = [',
  "      { name: cityName + ' Central Commercial Hub', query: prefix + cityName + ' Central' },",
  "      { name: cityName + ' Main Market & Bazaar Area', query: prefix + 'near Main Market / Bazaar, ' + cityName },",
  "      { name: cityName + ' Railway Station & Bus Stand', query: prefix + 'near Railway Station, ' + cityName },",
  "      { name: cityName + ' Main Arterial / Ring Road', query: prefix + 'near Main Road, ' + cityName },",
  "      { name: cityName + ' Industrial & Trade Zone', query: prefix + 'Industrial Estate, ' + cityName },",
  "      { name: cityName + ' Top Rated Specialists', query: 'Best ' + (category || 'Services') + ' in ' + cityName },",
  "      { name: cityName + ' North Sector', query: prefix + cityName + ' North' },",
  "      { name: cityName + ' South Sector', query: prefix + cityName + ' South' }",
  '    ];',
  '',
  '    return citySectors.map((sector, idx) => {',
  '      let sCoords = null;',
  '      if (cityCenter && cityCenter.lat && cityCenter.lng) {',
  '        const angle = (idx * 2 * Math.PI) / citySectors.length;',
  '        sCoords = {',
  '          lat: Number((cityCenter.lat + 0.016 * Math.cos(angle)).toFixed(5)),',
  '          lng: Number((cityCenter.lng + 0.016 * Math.sin(angle)).toFixed(5))',
  '        };',
  '      }',
  '      return {',
  '        zoneName: sector.name,',
  '        queryText: sector.query,',
  '        district: entry.district,',
  '        state: entry.state,',
  '        lat: sCoords ? sCoords.lat : null,',
  '        lng: sCoords ? sCoords.lng : null,',
  '        isVectorQuery: true,',
  '        isSingle: false',
  '      };',
  '    });',
  '  }',
  '',
  '  // 3. Village Multi-Node Expansion Protocol'
].join('\n');

code = code.replace(target, newSection2);
fs.writeFileSync(targetPath, code, 'utf8');
console.log('Successfully added district headquarters city sweep to universalGeoCluster.js');

