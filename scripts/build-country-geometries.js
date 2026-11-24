import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Ramer-Douglas-Peucker simplification
function rdp(points, epsilon) {
  if (points.length <= 2) return points;
  let dmax = 0;
  let index = 0;
  const [x1, y1] = points[0];
  const [x2, y2] = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const num = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
    const den = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
    const d = den === 0 ? Math.hypot(x0 - x1, y0 - y1) : num / den;
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = rdp(points.slice(0, index + 1), epsilon);
    const recResults2 = rdp(points.slice(index), epsilon);
    return recResults1.slice(0, -1).concat(recResults2);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

// Micro-Zone Hubs with authentic real-world Latitude & Longitude
const HUBS = {
  IN: [
    { name: 'Guntur / Tenali Mandals (AP)', lat: 16.24, lon: 80.55, leads: '384 leads', type: 'Agro/Turmeric Hub' },
    { name: 'Morbi Cluster (GJ)', lat: 22.81, lon: 70.83, leads: '1,420 leads', type: 'Ceramics Hub' },
    { name: 'Tirupur Cluster (TN)', lat: 11.10, lon: 77.34, leads: '1,860 leads', type: 'Knitwear Export' },
    { name: 'Peenya Estate (KA)', lat: 13.03, lon: 77.52, leads: '2,140 leads', type: 'Tooling & Die' },
    { name: 'Surat Bourse (GJ)', lat: 21.17, lon: 72.83, leads: '3,280 leads', type: 'Diamond/Textiles' },
    { name: 'Srinagar / Jammu Craft', lat: 34.08, lon: 74.80, leads: '680 leads', type: 'Pashmina & Handicrafts' },
    { name: 'Guwahati / Assam Tea Hub', lat: 26.14, lon: 91.73, leads: '920 leads', type: 'Tea & Agro Corridor' }
  ],
  US: [
    { name: 'Collin County (Plano TX)', lat: 33.01, lon: -96.69, leads: '942 leads', type: 'Telecom Corridor' },
    { name: 'Orange County (Irvine CA)', lat: 33.68, lon: -117.82, leads: '1,640 leads', type: 'MedTech Hub' },
    { name: 'Maricopa County (Mesa AZ)', lat: 33.41, lon: -111.83, leads: '1,280 leads', type: 'Aerospace/Defense' },
    { name: 'DuPage County (Naperville IL)', lat: 41.75, lon: -88.15, leads: '1,150 leads', type: 'R&D Center' },
    { name: 'Gwinnett County (Duluth GA)', lat: 34.00, lon: -84.14, leads: '810 leads', type: 'Logistics Cluster' }
  ],
  GB: [
    { name: 'Slough Trading Estate', lat: 51.51, lon: -0.60, leads: '1,120 leads', type: 'Data & Logistics' },
    { name: 'Trafford Park (Manchester)', lat: 53.46, lon: -2.31, leads: '1,450 leads', type: 'Manufacturing Park' },
    { name: 'Digbeth Industrial (Bham)', lat: 52.47, lon: -1.88, leads: '980 leads', type: 'B2B Creative/Fab' },
    { name: 'Team Valley (Gateshead)', lat: 54.92, lon: -1.61, leads: '680 leads', type: 'Commercial Engineering' }
  ],
  CA: [
    { name: 'Peel Region (Mississauga ON)', lat: 43.58, lon: -79.64, leads: '1,680 leads', type: 'Logistics Gateway' },
    { name: 'York Region (Markham ON)', lat: 43.85, lon: -79.33, leads: '1,140 leads', type: 'Semiconductor Hub' },
    { name: 'Nisku Industrial (Edmonton AB)', lat: 53.33, lon: -113.53, leads: '790 leads', type: 'Energy Fabrication' },
    { name: 'Richmond Logistics (Vancouver BC)', lat: 49.16, lon: -123.13, leads: '960 leads', type: 'Pacific Port Trade' }
  ],
  AU: [
    { name: 'Dandenong South (Melbourne)', lat: -38.01, lon: 145.21, leads: '1,380 leads', type: 'Heavy Industrial' },
    { name: 'Blacktown LGA (W-Sydney)', lat: -33.77, lon: 150.90, leads: '1,540 leads', type: 'Commercial Logistics' },
    { name: 'Acacia Ridge (Brisbane QLD)', lat: -27.58, lon: 153.02, leads: '820 leads', type: 'Freight & Rail Hub' },
    { name: 'Henderson Marine (Perth WA)', lat: -32.15, lon: 115.77, leads: '640 leads', type: 'Shipbuilding Precinct' }
  ],
  AE: [
    { name: 'JAFZA Free Zone (Dubai)', lat: 24.98, lon: 55.08, leads: '2,420 leads', type: 'Global Maritime Trade' },
    { name: 'Musaffah Industrial (Abu Dhabi)', lat: 24.34, lon: 54.49, leads: '1,680 leads', type: 'Heavy Engineering' },
    { name: 'Sharjah Ind. Area 10', lat: 25.32, lon: 55.41, leads: '890 leads', type: 'Manufacturing/Metals' },
    { name: 'Al Quoz Creative & Fab', lat: 25.13, lon: 55.23, leads: '750 leads', type: 'B2B Warehousing' }
  ],
  SG: [
    { name: 'Jurong Industrial / Tuas', lat: 1.32, lon: 103.65, leads: '1,120 leads', type: 'Petrochem & Port' },
    { name: 'Changi South Logistics', lat: 1.34, lon: 103.96, leads: '740 leads', type: 'Aviation Freight' },
    { name: 'Woodlands Industrial Park', lat: 1.44, lon: 103.80, leads: '620 leads', type: 'Precision Machining' },
    { name: 'Marina Bay / CBD Tech', lat: 1.28, lon: 103.85, leads: '980 leads', type: 'FinTech Enterprise' }
  ],
  NZ: [
    { name: 'Penrose & East Tamaki (AKL)', lat: -36.91, lon: 174.82, leads: '840 leads', type: 'Manufacturing Spine' },
    { name: 'Hornby Industrial (CHC)', lat: -43.54, lon: 172.53, leads: '560 leads', type: 'South Island Hub' },
    { name: 'Gracefield Innovation (Hutt)', lat: -41.24, lon: 174.91, leads: '410 leads', type: 'Materials Science' }
  ],
  IE: [
    { name: 'Parkmore East (Galway)', lat: 53.30, lon: -8.99, leads: '680 leads', type: 'Global MedTech Cluster' },
    { name: 'Little Island (Cork)', lat: 51.90, lon: -8.35, leads: '590 leads', type: 'B2B Pharma & Chemical' },
    { name: 'Citywest Campus (Dublin)', lat: 53.28, lon: -6.42, leads: '1,240 leads', type: 'Tech & Telecom Park' }
  ],
  ZA: [
    { name: 'Alrode & Wadeville (Gauteng)', lat: -26.31, lon: 28.14, leads: '1,680 leads', type: 'Heavy Steel & Mining' },
    { name: 'Prospecton Industrial (Durban)', lat: -29.98, lon: 30.93, leads: '840 leads', type: 'Automotive & Freight' },
    { name: 'Montague Gardens (Cape Town)', lat: -33.86, lon: 18.51, leads: '920 leads', type: 'B2B Warehousing' }
  ],
  DE: [
    { name: 'Garching & Haar (München)', lat: 48.24, lon: 11.65, leads: '940 leads', type: 'High-Tech & Quantum' },
    { name: 'Sindelfingen (Stuttgart)', lat: 48.70, lon: 9.00, leads: '1,280 leads', type: 'Automotive Systems' },
    { name: 'Erlangen MedTech Cluster', lat: 49.59, lon: 11.00, leads: '820 leads', type: 'Siemens Precision Fab' },
    { name: 'Hamburg Port Micro-Zone', lat: 53.53, lon: 9.97, leads: '1,150 leads', type: 'Maritime Logistics' }
  ]
};

async function main() {
  console.log('1. Fetching official Survey of India boundary...');
  const indiaJson = await fetchJson('https://raw.githubusercontent.com/datameet/maps/master/Country/india-composite.geojson');

  console.log('2. Fetching international sovereign borders...');
  const worldJson = await fetchJson('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');

  const result = {};

  // Extract all rings/polygons from a GeoJSON geometry
  function extractPolygons(geom) {
    const polygons = [];
    if (geom.type === 'Polygon') {
      polygons.push(geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        polygons.push(poly[0]);
      }
    }
    return polygons;
  }

  // 1. Process India (Official Survey of India)
  {
    console.log('Processing India (Survey of India compliant)...');
    const polygons = extractPolygons(indiaJson.features[0].geometry);
    // Sort by number of points descending
    polygons.sort((a, b) => b.length - a.length);
    // Main boundary is the largest polygon (mainland India including J&K, Ladakh, Arunachal, Gujarat, Peninsula)
    const mainPoly = polygons[0];

    // Compute bounding box
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    for (const [lon, lat] of mainPoly) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    console.log(`India Bounds: Lon [${minLon.toFixed(3)}, ${maxLon.toFixed(3)}], Lat [${minLat.toFixed(3)}, ${maxLat.toFixed(3)}]`);

    // Simplify polygon slightly (epsilon ~0.045 deg) to achieve clean, fluid ~400-500 points
    const simplified = rdp(mainPoly, 0.045);
    console.log(`India points: raw=${mainPoly.length}, simplified=${simplified.length}`);

    // Map to [0, 100] coordinate space with aspect ratio preserved and 8% padding
    const width = maxLon - minLon;
    const height = maxLat - minLat;
    const padding = 8;
    const drawWidth = 100 - padding * 2;
    const drawHeight = 100 - padding * 2;

    const scale = Math.min(drawWidth / width, drawHeight / height);
    const offsetX = padding + (drawWidth - width * scale) / 2;
    const offsetY = padding + (drawHeight - height * scale) / 2;

    function project(lon, lat) {
      const x = offsetX + (lon - minLon) * scale;
      const y = offsetY + (maxLat - lat) * scale; // inverted Y for SVG
      return [Number(x.toFixed(2)), Number(y.toFixed(2))];
    }

    // Convert to SVG path
    const svgCoords = simplified.map(([lon, lat]) => project(lon, lat));
    let svgPath = `M ${svgCoords[0][0]} ${svgCoords[0][1]}`;
    for (let i = 1; i < svgCoords.length; i++) {
      svgPath += ` L ${svgCoords[i][0]} ${svgCoords[i][1]}`;
    }
    svgPath += ' Z';

    // Normalized 3D points in [-50, 50] space for Three.js
    const threeCoords = simplified.map(([lon, lat]) => {
      const [sx, sy] = project(lon, lat);
      // Map sx from [0, 100] to [-42, 42], sy to [42, -42] (y-up in Three.js)
      const tx = ((sx - 50) / 50) * 42;
      const ty = -((sy - 50) / 50) * 42;
      return [Number(tx.toFixed(2)), Number(ty.toFixed(2))];
    });

    // Project hubs
    const projectedHubs = (HUBS.IN || []).map(h => {
      const [sx, sy] = project(h.lon, h.lat);
      const tx = ((sx - 50) / 50) * 42;
      const ty = -((sy - 50) / 50) * 42;
      return {
        ...h,
        svgX: sx,
        svgY: sy,
        threeX: Number(tx.toFixed(2)),
        threeY: Number(ty.toFixed(2))
      };
    });

    result.IN = {
      code: 'IN',
      name: 'India',
      units: '619,287 Villages & 6k+ Mandals',
      microZoneType: 'Mandals & Industrial Clusters',
      viewBox: '0 0 100 100',
      svgPath,
      threeCoords,
      hubs: projectedHubs,
      bounds: { minLon, maxLon, minLat, maxLat }
    };
  }

  // 2. Process International Countries
  const countryList = [
    { code: 'US', name: 'United States', units: '3,143 Counties & Parishes', microZoneType: 'County Seats & Industrial Precincts', iso: 'US' },
    { code: 'GB', name: 'United Kingdom', units: '100+ Counties & Boroughs', microZoneType: 'Ceremonial Counties & Trading Estates', iso: 'GB' },
    { code: 'CA', name: 'Canada', units: '293 Census Divisions', microZoneType: 'Census Divisions & Regional Municipalities', iso: 'CA' },
    { code: 'AU', name: 'Australia', units: '537 Local Government Areas', microZoneType: 'LGAs & Specialized Industrial Precincts', iso: 'AU' },
    { code: 'AE', name: 'United Arab Emirates', units: '7 Emirates & Free Zones', microZoneType: 'Designated Free Zones & Industrial Areas', iso: 'AE' },
    { code: 'SG', name: 'Singapore', units: '55 Planning Sectors', microZoneType: 'Industrial Estates & Postal Sectors', iso: 'SG' },
    { code: 'NZ', name: 'New Zealand', units: '67 Territorial Authorities', microZoneType: 'Territorial Authorities & Industrial Parks', iso: 'NZ' },
    { code: 'IE', name: 'Ireland', units: '82 Municipal Councils', microZoneType: 'Municipal Districts & Innovation Parks', iso: 'IE' },
    { code: 'ZA', name: 'South Africa', units: '257 District Councils', microZoneType: 'Metro Municipalities & Mining Belts', iso: 'ZA' },
    { code: 'DE', name: 'Germany', units: '401 Landkreise & Cities', microZoneType: 'Landkreise & Mittelstand Clusters', iso: 'DE' }
  ];

  for (const c of countryList) {
    const feat = worldJson.features.find(f => f.properties['ISO3166-1-Alpha-2'] === c.iso);
    if (!feat) {
      console.warn(`Feature not found for ${c.code}`);
      continue;
    }

    const polygons = extractPolygons(feat.geometry);
    polygons.sort((a, b) => b.length - a.length);

    // Filter out tiny islands to keep primary sovereign landmass crisp (keep islands > 8% of max poly)
    const maxLen = polygons[0].length;
    const primaryPolys = polygons.filter(p => p.length >= Math.max(12, maxLen * 0.08));

    // Compute unified bounding box across primary polygons
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    for (const poly of primaryPolys) {
      for (const [lon, lat] of poly) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }

    const width = maxLon - minLon;
    const height = maxLat - minLat;
    const padding = 8;
    const drawWidth = 100 - padding * 2;
    const drawHeight = 100 - padding * 2;
    const scale = Math.min(drawWidth / width, drawHeight / height);
    const offsetX = padding + (drawWidth - width * scale) / 2;
    const offsetY = padding + (drawHeight - height * scale) / 2;

    function project(lon, lat) {
      const x = offsetX + (lon - minLon) * scale;
      const y = offsetY + (maxLat - lat) * scale;
      return [Number(x.toFixed(2)), Number(y.toFixed(2))];
    }

    // Simplify epsilon based on coordinate span
    const epsilon = Math.max(0.015, (width + height) * 0.002);

    let svgPath = '';
    const threePolygons = [];

    for (const poly of primaryPolys) {
      const simplified = rdp(poly, epsilon);
      if (simplified.length < 3) continue;

      const svgCoords = simplified.map(([lon, lat]) => project(lon, lat));
      let subPath = `M ${svgCoords[0][0]} ${svgCoords[0][1]}`;
      for (let i = 1; i < svgCoords.length; i++) {
        subPath += ` L ${svgCoords[i][0]} ${svgCoords[i][1]}`;
      }
      subPath += ' Z';
      svgPath += (svgPath ? ' ' : '') + subPath;

      const threeCoords = simplified.map(([lon, lat]) => {
        const [sx, sy] = project(lon, lat);
        const tx = ((sx - 50) / 50) * 42;
        const ty = -((sy - 50) / 50) * 42;
        return [Number(tx.toFixed(2)), Number(ty.toFixed(2))];
      });
      threePolygons.push(threeCoords);
    }

    const projectedHubs = (HUBS[c.code] || []).map(h => {
      const [sx, sy] = project(h.lon, h.lat);
      const tx = ((sx - 50) / 50) * 42;
      const ty = -((sy - 50) / 50) * 42;
      return {
        ...h,
        svgX: sx,
        svgY: sy,
        threeX: Number(tx.toFixed(2)),
        threeY: Number(ty.toFixed(2))
      };
    });

    console.log(`Processed ${c.code} (${c.name}): ${primaryPolys.length} polygons, hubs: ${projectedHubs.length}`);

    result[c.code] = {
      code: c.code,
      name: c.name,
      units: c.units,
      microZoneType: c.microZoneType,
      viewBox: '0 0 100 100',
      svgPath,
      threeCoords: threePolygons[0], // primary polygon for 3D extrusion
      additionalPolygons: threePolygons.slice(1),
      hubs: projectedHubs,
      bounds: { minLon, maxLon, minLat, maxLat }
    };
  }

  // Write out to client and master
  const outDirClient = path.join(__dirname, '../client/src/v2/data');
  const outDirMaster = path.join(__dirname, '../master/src/v2/data');
  fs.mkdirSync(outDirClient, { recursive: true });
  fs.mkdirSync(outDirMaster, { recursive: true });

  const outFileClient = path.join(outDirClient, 'sovereignBoundaries.json');
  const outFileMaster = path.join(outDirMaster, 'sovereignBoundaries.json');

  const jsonStr = JSON.stringify(result, null, 2);
  fs.writeFileSync(outFileClient, jsonStr, 'utf-8');
  fs.writeFileSync(outFileMaster, jsonStr, 'utf-8');

  console.log(`\nSUCCESS! Wrote sovereign boundaries for ${Object.keys(result).length} nations.`);
  console.log(`File: ${outFileClient} (${(jsonStr.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error('Error generating country geometries:', err);
  process.exit(1);
});
