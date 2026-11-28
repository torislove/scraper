/**
 * shared/data/tradeExpansions.js
 * Localized Trade, Home-Service & Corporate Service Sub-Categories across all 5 Active Countries (IN, US, GB, AU, AE).
 */

export const TRADE_EXPANSIONS = [
  {
    key: 'plumbing_trades',
    label: 'Plumbers & Plumbing Contractors',
    intentType: 'service',
    matchRe: /\b(plumb\w*(?!.*supply|.*store|.*shop|.*dealer)|pipe\s*(?:repair|fitter|leak\w*)|drain\w*|leak\w*\s*(?:repair|detection)|boiler\s*(?:repair|service)|gas\s*safe|sewer|septic\s*tank\s*clean\w*)\b/i,
    byCountry: {
      IN: ['Plumbers', 'Plumbing Contractors', 'Emergency Plumbing Services', 'Drainage & Septic Tank Cleaning', 'Water Leak Detection Services', 'Bathroom & Kitchen Pipe Fitting'],
      US: ['Plumbers', 'Emergency Plumbing & Rooter', 'Drain Cleaning & Hydro Jetting', 'Water Heater & Tankless Repair', 'Sewer Line & Trenchless Repair', 'Commercial Plumbing Contractors'],
      GB: ['Plumbers & Heating Engineers', 'Gas Safe Boiler Repair', 'Emergency Drainage & Blocked Drains', 'Bathroom Fitters & Plumbing', 'Commercial Plumbing Contractors'],
      AU: ['Licensed Plumbers & Gasfitters', 'Blocked Drains & Hydro-Jetting', 'Hot Water System Specialists', 'Roof Plumbing & Stormwater', 'Commercial Plumbing Contractors'],
      AE: ['Plumbing Contractors & Maintenance', 'MEP Plumbing Services', 'Drainage & Pipe Repair', 'Emergency Leak Repair'],
      default: ['Plumbers', 'Emergency Plumbing & Drain Repair', 'Water Heater & Boiler Service', 'Commercial Plumbing Contractors']
    }
  },
  {
    key: 'borewell_pump_repair',
    label: 'Borewell & Water Pump Repair Services',
    intentType: 'service',
    matchRe: /\b(borewell\w*|submersible\s*pump\s*repair|water\s*pump\s*repair|motor\s*winding)\b/i,
    byCountry: {
      IN: ['Borewell & Submersible Pump Repair', 'Water Pump Repair & Winding Services', 'Borewell Drilling Contractors'],
      US: ['Well Pump Repair Services', 'Submersible Pump Service Contractors'],
      GB: ['Water Pump & Borehole Engineers', 'Booster Pump Repair Services'],
      AU: ['Bore Pump Repair & Service', 'Submersible Water Pump Technicians'],
      AE: ['Water Booster Pump Repair', 'MEP Submersible Pump Maintenance'],
      default: ['Water Pump Repair & Service', 'Submersible Pump Technicians']
    }
  },
  {
    key: 'geyser_appliance_repair',
    label: 'Geyser & Home Appliance Repair Services',
    intentType: 'service',
    matchRe: /\b(geyser\s*repair|water\s*heater\s*repair|appliance\s*repair|washing\s*machine\s*repair)\b/i,
    byCountry: {
      IN: ['Geyser & Water Heater Repair', 'Washing Machine & Fridge Repair', 'Home Appliance Service Centers'],
      US: ['Appliance Repair Services', 'Water Heater Repair Technicians'],
      GB: ['Domestic Appliance Repair Engineers', 'Boiler & Water Heater Repair'],
      AU: ['Hot Water & Appliance Repair', 'Whitegoods Repair Technicians'],
      AE: ['Home Appliance & Water Heater Repair', 'Kitchen Appliance Maintenance'],
      default: ['Home Appliance Repair Services', 'Water Heater Repair Technicians']
    }
  },
  {
    key: 'business_formation_pro',
    label: 'Company Formation & Corporate PRO Services',
    intentType: 'service',
    matchRe: /\b(company\s*formation|business\s*setup|pro\s*services|freezone\s*setup|gst\s*registration|roc\s*filing)\b/i,
    byCountry: {
      IN: ['Company Registration & ROC Consultants', 'GST & Startup Compliance Firms', 'MSME & Trademark Consultants'],
      US: ['LLC & Corporate Formation Services', 'Registered Agent & Business Licensing'],
      GB: ['Company Formation Agents', 'Corporate Secretarial & Compliance Firms'],
      AU: ['ASIC Company Registration Agents', 'Business Setup & ABN Advisors'],
      AE: ['Dubai & Abu Dhabi PRO Services', 'Freezone & Mainland Business Setup', 'DED Licensing & Golden Visa Consultants'],
      default: ['Company Formation Consultants', 'Business Licensing & PRO Services']
    }
  },
  {
    key: 'electrical_trades',
    label: 'Electricians & Electrical Contractors',
    intentType: 'service',
    matchRe: /\b(electr\w*(?!.*goods|.*store|.*shop|.*dealer)|wiring|switchboard|inverter\s*repair|ups\s*repair)\b/i,
    byCountry: {
      IN: ['Electricians', 'Electrical Contractors', 'Inverter & UPS Battery Repair', 'House Wiring & Switchboard Repair', 'Generator & Transformer Maintenance'],
      US: ['Licensed Electricians', 'Commercial Electrical Contractors', 'Electrical Panel & Rewiring', 'EV Charger Installation', 'Emergency Electricians'],
      GB: ['NICEIC Electricians', 'Domestic Rewiring & Consumer Units', 'Commercial Electrical Contractors', 'EV Charger Installers'],
      AU: ['Licensed Master Electricians', 'Switchboard & Rewiring Specialists', '24/7 Emergency Electricians', 'EV Charger Installers'],
      AE: ['DEWA Approved Electrical Contractors', 'MEP Electrical Maintenance', 'Switchgear & Cabling Contractors'],
      default: ['Licensed Electricians', 'Commercial Electrical Contractors', 'Wiring & Panel Repair', 'EV Charger Installers']
    }
  },
  {
    key: 'hvac_trades',
    label: 'HVAC, AC & Cooling Contractors',
    intentType: 'service',
    matchRe: /\b(hvac|air\s*conditioning\s*(?:repair|service|contractor)|ac\s*(?:repair|service|installation)|aircon|heating\s*contractor|chiller)\b/i,
    byCountry: {
      IN: ['AC Repair & Service', 'Split & Window AC Installation', 'HVAC & VRF Commercial Contractors', 'Cold Storage & Chiller Repair'],
      US: ['HVAC Contractors', 'Air Conditioning Repair & Service', 'Heating & Furnace Repair', 'Duct Cleaning & Ventilation'],
      GB: ['Air Conditioning Engineers', 'Commercial HVAC & Heat Pump Contractors', 'Ventilation & Chiller Engineers'],
      AU: ['Air Conditioning Installers & Repair', 'Ducted HVAC Specialists', 'Commercial Refrigeration & Cooling'],
      AE: ['AC Maintenance & Duct Cleaning', 'HVAC Chillers & VRF Contractors', 'District Cooling Maintenance'],
      default: ['HVAC Contractors', 'Air Conditioning Repair', 'Heating & Ventilation Systems', 'Commercial Cooling Service']
    }
  },
  {
    key: 'roofing_trades',
    label: 'Roofing & Waterproofing Contractors',
    intentType: 'service',
    matchRe: /\b(roof\w*|gutter|shingle|fascia|waterproofing|terrace\s*leak)\b/i,
    byCountry: {
      IN: ['Waterproofing Contractors', 'Terrace & Roof Leakage Repair', 'Roofing Sheet & Shed Contractors', 'Epoxy Grouting & Damp Proofing'],
      US: ['Residential Roofing Contractors', 'Commercial Flat Roofing', 'Storm Damage & Gutter Repair'],
      GB: ['Roofing Contractors & Roofers', 'Flat Roof & Leadwork Specialists', 'Damp Proofing & Gutter Repair'],
      AU: ['Metal & Tile Roofers', 'Roof Restoration & Gutter Guards', 'Waterproofing & Membrane Contractors'],
      AE: ['Roof Waterproofing Contractors', 'Terrace Thermal & Leak Insulation', 'Industrial Roofing & Cladding'],
      default: ['Roofing Contractors', 'Roof Repair & Leak Specialists', 'Commercial Flat Roofing', 'Gutter & Waterproofing']
    }
  },
  {
    key: 'pest_control',
    label: 'Pest Control & Termite Services',
    intentType: 'service',
    matchRe: /\b(pest\s*control|termite|cockroach|rodent|fumigation|exterminator|bed\s*bug)\b/i,
    byCountry: {
      IN: ['Pest Control Services', 'Termite Treatment & Anti-Termite', 'Cockroach & Bed Bug Control', 'Rodent & Mosquito Fogging'],
      US: ['Pest Control & Exterminators', 'Termite Inspection & Treatment', 'Commercial Wildlife & Rodent Removal'],
      GB: ['BPCA Pest Control Services', 'Rodent & Wasp Nest Removal', 'Commercial Pest Management'],
      AU: ['Licensed Pest & Termite Control', 'Pre-Purchase Timber Pest Inspections', 'Cockroach & Spider Treatment'],
      AE: ['Dubai Municipality Approved Pest Control', 'Termite & Bed Bug Control', 'Commercial Sanitization & Fumigation'],
      default: ['Pest Control Services', 'Termite Inspection & Treatment', 'Commercial Exterminators']
    }
  },
  {
    key: 'cleaning_services',
    label: 'Deep Cleaning & Facility Services',
    intentType: 'service',
    matchRe: /\b(cleaning\s*service|deep\s*cleaning|housekeeping|janitorial|sofa\s*cleaning|carpet\s*cleaning|facility\s*management)\b/i,
    byCountry: {
      IN: ['Home Deep Cleaning Services', 'Office & Commercial Housekeeping', 'Water Tank & Sump Cleaning', 'Sofa & Carpet Cleaning'],
      US: ['Commercial Janitorial & Office Cleaning', 'Residential Deep Cleaning', 'Carpet & Upholstery Cleaning'],
      GB: ['Commercial Office Cleaning', 'End of Tenancy & Deep Cleaning', 'Carpet & Oven Cleaning Services'],
      AU: ['Commercial & Strata Cleaning', 'Bond & End of Lease Cleaning', 'Carpet & Water Tank Cleaning'],
      AE: ['Deep Villa & Apartment Cleaning', 'Water Tank Cleaning & Disinfection', 'Commercial Facility Management'],
      default: ['Commercial Cleaning & Janitorial', 'Residential Deep Cleaning', 'Carpet & Upholstery Cleaning']
    }
  },
  {
    key: 'painting_interiors',
    label: 'Painters & Interior Contractors',
    intentType: 'service',
    matchRe: /\b(paint\w*(?!.*store|.*shop)|interior\s*design\w*|false\s*ceiling|modular\s*kitchen|wallpaper|renovations?|fit[\s-]*out)\b/i,
    byCountry: {
      IN: ['Painting Contractors', 'Interior Designers & Turnkey', 'Modular Kitchen & Wardrobes', 'False Ceiling & POP Contractors'],
      US: ['Painting & Decorating Contractors', 'Interior Design Studios', 'Home & Commercial Remodeling'],
      GB: ['Painters & Decorators', 'Interior Architecture & Design', 'Kitchen & Loft Renovation'],
      AU: ['Residential & Commercial Painters', 'Interior Design & Fit-outs', 'Kitchen & Bathroom Renovations'],
      AE: ['Villa & Office Fit-Out Contractors', 'Interior Design & Turnkey Studios', 'Painting & Gypsum Partition'],
      default: ['Painting & Decorating Contractors', 'Interior Design Studios', 'Home & Commercial Renovation']
    }
  },
  {
    key: 'solar_energy',
    label: 'Solar EPC & Renewable Installers',
    intentType: 'service',
    matchRe: /\b(solar|photovoltaic|rooftop\s*solar|solar\s*panel|solar\s*water\s*heater)\b/i,
    byCountry: {
      IN: ['Solar EPC Contractors', 'Rooftop Solar Installers', 'Solar Water Heater Installers', 'Commercial Solar Systems'],
      US: ['Residential Solar Installers', 'Commercial Solar EPC', 'Solar Battery & Backup Systems'],
      GB: ['MCS Accredited Solar PV Installers', 'Solar Battery Storage Installers', 'Commercial Rooftop Solar'],
      AU: ['CEC Accredited Solar Installers', 'Rooftop Solar & Home Battery Systems', 'Commercial Solar Energy'],
      AE: ['DEWA Shams Solar Contractors', 'Commercial Solar EPC', 'Solar Water Heating Systems'],
      default: ['Residential Solar Installers', 'Commercial Solar EPC', 'Solar Battery Storage']
    }
  }
];

export function resolveTradeExpansion(rawQuery = '', countryCode = 'IN') {
  const clean = String(rawQuery || '').trim();
  const cc = String(countryCode || 'IN').toUpperCase();
  if (!clean) return null;
  for (const item of TRADE_EXPANSIONS) {
    if (item.matchRe.test(clean)) {
      const byC = item.byCountry;
      const subs = byC[cc] || byC.default || [];
      return { key: item.key, label: item.label, intentType: item.intentType || 'service', subcategories: subs };
    }
  }
  return null;
}
