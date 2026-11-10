/**
 * benchmarkScraperFidelity.js
 *
 * Enterprise Automated Benchmarking Suite for Scraper.co.in
 * Evaluates Yield, Telecom Conversion, Category Fidelity, Spatial Mesh, and Quality Tiers.
 *
 * Usage:
 *   node server/src/utils/benchmarkScraperFidelity.js [sessionId]
 */

const fs = require('fs');
const path = require('path');
const { SESSIONS_DIR } = require('../config/paths');
const { calculateLeadQuality } = require('./leadScoring');
const { normalizePhone } = require('./phoneUtils');
const { areNearDuplicates } = require('./indiaTradeIntelligence');
const { isVendorRelevant } = require('../services/categoryFidelity');
const { extractLeadArea } = require('./godLevelExcelGenerator');

function findSessionFiles() {
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.name.endsWith('.json') && !ent.name.includes('manifest')) {
        files.push(full);
      }
    }
  }
  walk(SESSIONS_DIR);
  return files;
}

function runBenchmark(sessionPath) {
  if (!fs.existsSync(sessionPath)) {
    console.error(`Session file not found: ${sessionPath}`);
    return null;
  }

  const raw = fs.readFileSync(sessionPath, 'utf8');
  const data = JSON.parse(raw);
  const leads = Array.isArray(data.leads) ? data.leads : [];
  const sessionId = data.sessionId || path.basename(sessionPath, '.json');
  const category = data.category || 'Business';
  const location = data.location || 'Target City';

  const startTime = Date.now();

  let mobileCount = 0;
  let landlineCount = 0;
  let unlistedCount = 0;
  let multiPhoneCount = 0;
  let whatsAppReadyCount = 0;
  let websiteCount = 0;
  let highRatingCount = 0; // >= 4.0
  let totalQualityScore = 0;

  const tiers = { Platinum: 0, Gold: 0, Silver: 0, Bronze: 0 };
  const areaDistribution = new Map();
  const duplicatePairs = [];
  const negativeGateRejections = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const phones = [lead.phone, ...(Array.isArray(lead.phones) ? lead.phones : [])].filter(Boolean);

    // Telecom Audit
    const primaryParsed = normalizePhone(lead.phone || phones[0]);
    if (primaryParsed?.isMobile) {
      mobileCount++;
      whatsAppReadyCount++;
    } else if (primaryParsed?.isLandline) {
      landlineCount++;
    } else {
      unlistedCount++;
    }

    if (phones.length >= 2) {
      multiPhoneCount++;
    }

    // Digital & Reputation
    if (lead.website && String(lead.website).startsWith('http') && !lead.website.includes('google.com')) {
      websiteCount++;
    }

    const r = parseFloat(lead.rating);
    if (!Number.isNaN(r) && r >= 4.0) {
      highRatingCount++;
    }

    // Quality Scoring
    const quality = calculateLeadQuality(lead);
    totalQualityScore += quality.score;
    tiers[quality.tier] = (tiers[quality.tier] || 0) + 1;

    // Locality Spread
    const area = extractLeadArea(lead, location);
    areaDistribution.set(area, (areaDistribution.get(area) || 0) + 1);

    // Category Fidelity Negative Gate Check
    if (!isVendorRelevant(lead, category)) {
      negativeGateRejections.push(lead.name);
    }

    // Cross-Duplicate Audit
    for (let j = i + 1; j < leads.length; j++) {
      if (areNearDuplicates(lead, leads[j])) {
        duplicatePairs.push([lead.name, leads[j].name]);
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const totalLeads = leads.length;
  const avgQuality = totalLeads ? Math.round(totalQualityScore / totalLeads) : 0;
  const mobileRate = totalLeads ? Math.round((mobileCount / totalLeads) * 100) : 0;
  const duplicateRate = totalLeads ? ((duplicatePairs.length / totalLeads) * 100).toFixed(1) : '0.0';
  const fidelityRate = totalLeads ? Math.round(((totalLeads - negativeGateRejections.length) / totalLeads) * 100) : 100;

  const benchmarkResult = {
    sessionId,
    category,
    location,
    evaluatedAt: new Date().toISOString(),
    benchmarkDurationMs: durationMs,
    metrics: {
      totalLeads,
      mobileCount,
      mobileRatePercent: mobileRate,
      landlineCount,
      unlistedCount,
      multiPhoneCount,
      whatsAppReadyCount,
      websiteCount,
      highRatingCount,
      avgQualityScore: avgQuality,
      qualityTiers: tiers,
      uniqueAreasCovered: areaDistribution.size,
      duplicateCount: duplicatePairs.length,
      duplicateRatePercent: Number(duplicateRate),
      negativeGateViolations: negativeGateRejections.length,
      categoryFidelityPercent: fidelityRate
    },
    topLocalities: Array.from(areaDistribution.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ area: name, count }))
  };

  // Ensure benchmarks directory exists and save
  const benchmarkDir = path.resolve('server/data/benchmarks');
  if (!fs.existsSync(benchmarkDir)) {
    fs.mkdirSync(benchmarkDir, { recursive: true });
  }
  const reportPath = path.join(benchmarkDir, `benchmark_${sessionId}_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(benchmarkResult, null, 2));

  // Print Executive Terminal Scorecard
  console.log('\n================================================================================');
  console.log(` 🏆 ENTERPRISE FIDELITY BENCHMARK SCORECARD: ${sessionId}`);
  console.log('================================================================================');
  console.log(` Category:        ${category}`);
  console.log(` Target Region:   ${location}`);
  console.log(` Evaluated At:    ${benchmarkResult.evaluatedAt}`);
  console.log('--------------------------------------------------------------------------------');
  console.log(` 📊 Total Verified Leads Harvested:     ${totalLeads}`);
  console.log(` 📱 Direct Mobile (+91) Conversion:      ${mobileCount} / ${totalLeads} (${mobileRate}%)`);
  console.log(` ☎️  STD Landlines Preserved:           ${landlineCount}`);
  console.log(` 🗂️ Multi-Phone Merged Leads:          ${multiPhoneCount}`);
  console.log(` 💬 1-Click WhatsApp Direct Links:     ${whatsAppReadyCount}`);
  console.log(` ⭐ High Reputation Rating (>=4.0★):    ${highRatingCount} / ${totalLeads}`);
  console.log(` 🌐 Digital Domain Websites:            ${websiteCount}`);
  console.log('--------------------------------------------------------------------------------');
  console.log(` 🎯 Average Profile Quality Score:      ${avgQuality}%`);
  console.log(`    • Platinum (85%+):                  ${tiers.Platinum}`);
  console.log(`    • Gold (70 - 84%):                  ${tiers.Gold}`);
  console.log(`    • Silver (50 - 69%):                ${tiers.Silver}`);
  console.log(`    • Bronze (< 50%):                   ${tiers.Bronze}`);
  console.log('--------------------------------------------------------------------------------');
  console.log(` 🛡️ Cross-Duplicate Redundancy:         ${duplicatePairs.length} duplicates (${duplicateRate}%) ${duplicatePairs.length === 0 ? '✓ PERFECT ZERO' : '⚠️ DUPLICATES FOUND'}`);
  console.log(` 🚫 Category Fidelity (Non-Vendor Out): ${fidelityRate}% (${negativeGateRejections.length} rejected)`);
  console.log(` 📍 Municipal Locality Mesh:            ${areaDistribution.size} distinct areas covered`);
  console.log('================================================================================');
  console.log(` 💾 Saved Detailed JSON Report to: ${reportPath}\n`);

  return benchmarkResult;
}

// CLI Execution Support
if (require.main === module) {
  const targetId = process.argv[2];
  const allFiles = findSessionFiles();

  if (targetId) {
    const match = allFiles.find(f => f.includes(targetId));
    if (match) {
      runBenchmark(match);
    } else {
      console.error(`No session found matching ID: ${targetId}`);
    }
  } else if (allFiles.length > 0) {
    // Benchmark the most recently modified session
    const sorted = allFiles.map(f => ({ file: f, mtime: fs.statSync(f).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    console.log(`No sessionId passed. Benchmarking latest active session: ${sorted[0].file}`);
    runBenchmark(sorted[0].file);
  } else {
    console.log('No session files found to benchmark in server/db/user_sessions.');
  }
}

module.exports = {
  runBenchmark,
  findSessionFiles
};

