/**
 * commodities/index.js
 * Specific commodity & trade product entities (e.g. Turmeric, Chilli, Cotton, TMT Steel).
 */

const COMMODITY_ENTITIES = [
  {
    key: 'turmeric',
    patterns: [/\b(turmeric|haldi|pasupu)\b/i],
    label: 'Turmeric',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Turmeric Wholesalers & Commission Agents',
      'Turmeric Merchants & Mandi Traders',
      'Turmeric Processing & Polishing Units',
      'Turmeric Stockists & Exporters',
      'Turmeric Cold Storage & APMC Traders',
      'Spices & Turmeric Commission Agents',
      'Agricultural Produce Merchants (Turmeric)'
    ]
  },
  {
    key: 'chilli',
    patterns: [/\b(chilli|chillies|mirchi|red\s*chilli|guntur\s*mirchi)\b/i],
    label: 'Chilli & Spices',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Chilli Wholesalers & Commission Agents',
      'Red Chilli Merchants & Mandi Traders',
      'Chilli Cold Storage & Exporters',
      'Spices & Chilli Powder Processing Units',
      'APMC Yard Chilli Commission Agents'
    ]
  },
  {
    key: 'cotton',
    patterns: [
      /\b(raw\s*cotton|cotton\s*(?:ginning|pressing|seed|bale|farming|raw|mandi|market\s*yard|spinning|mill)|ginning|kapas)\b/i,
      /\bcotton\b(?!.*(?:knitwear|garment|hosiery|apparel|fabric|cloth|shirt|dress|wear|textile))/i
    ],
    label: 'Cotton & Ginning',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Cotton Ginning & Pressing Mills',
      'Raw Cotton Merchants & Commission Agents',
      'Cotton Bale Traders & Exporters',
      'Cotton Seed Oil Mills'
    ]
  },
  {
    key: 'rice_paddy',
    patterns: [/\b(rice\s*mill|rice\s*mills|paddy|basmati|rice\s*trader|rice\s*wholesale|rice\s*merchants?)\b/i],
    label: 'Rice Mills & Paddy',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Rice Mills & Paddy Processors',
      'Wholesale Rice Merchants & Stockists',
      'Basmati & Non-Basmati Rice Exporters',
      'Paddy Commission Agents & Mandi Merchants'
    ]
  },
  {
    key: 'pulses_dal',
    patterns: [/\b(pulses?|dal\s*mill|dhal|toor\s*dal|urad\s*dal|chana\s*dal|moong\s*dal)\b/i],
    label: 'Pulses & Dal Mills',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Dal Mills & Pulse Processors',
      'Wholesale Dal & Pulse Merchants',
      'Gram & Legume Commission Agents',
      'Grain Mandi Stockists'
    ]
  },
  {
    key: 'oilseeds_edible_oil',
    patterns: [/\b(oil\s*mill|oil\s*mills|oilseeds?|groundnut|mustard\s*oil|sunflower\s*oil|sesame\s*oil)\b/i],
    label: 'Edible Oil & Oilseeds',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Edible Oil Mills & Refineries',
      'Oilseed Wholesalers & Commission Agents',
      'Groundnut & Mustard Wholesale Traders',
      'Bulk Cooking Oil Distributors'
    ]
  },
  {
    key: 'general_spices',
    patterns: [/\b(spices?|masala|pepper|cardamom|coriander|cumin|jeera|cloves|cinnamon|garam\s*masala)\b/i],
    label: 'Spices & Condiments',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Spices Wholesalers & Exporters',
      'Whole Spice Merchants & Mandi Traders',
      'Masala Grinding & Processing Units',
      'Dry Fruit & Spices Wholesalers',
      'Spice Market Yard Commission Agents'
    ]
  },
  {
    key: 'jaggery_sugar',
    patterns: [/\b(jaggery|bellam|gur|sugar\s*wholesale|sugar\s*merchants?)\b/i],
    label: 'Jaggery & Sugar',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Jaggery Wholesalers & Commission Agents',
      'Gur Mandi Merchants',
      'Wholesale Sugar & Jaggery Stockists'
    ]
  },
  {
    key: 'tobacco',
    patterns: [/\b(tobacco|tobacco\s*leaf|flue\s*cured|tobacco\s*traders?)\b/i],
    label: 'Tobacco',
    sectorKey: 'agriculture_spices',
    subvectors: [
      'Tobacco Leaf Merchants & Exporters',
      'Tobacco Commission Agents & Grading Units',
      'Tobacco Warehouse & Stockists'
    ]
  },
  {
    key: 'iron_steel_tmt',
    patterns: [/\b(iron\s*and\s*steel|iron\s*&\s*steel|tmt\s*steel|tmt\s*bars?|structural\s*steel|steel\s*traders?|steel\s*dealers?)\b/i],
    label: 'Iron & Steel TMT',
    sectorKey: 'metals_steel',
    subvectors: [
      'Iron & Steel TMT Dealers',
      'Structural Steel & Section Wholesalers',
      'TMT Bar Distributors & Stockists',
      'Steel Pipes, Tubes & Sheets Merchants',
      'Steel Railing & Industrial Steel Suppliers'
    ]
  },
  {
    key: 'sarees_handlooms',
    patterns: [/\b(saree|sari|sarees|handloom|handlooms|silk\s*sarees?|dhoti|pattu\s*sarees?)\b/i],
    label: 'Sarees & Handlooms',
    sectorKey: 'textiles_apparel',
    subvectors: [
      'Saree Wholesalers & Showrooms',
      'Handloom Sarees & Silk Merchants',
      'Pattu & Wedding Saree Showrooms',
      'Cotton Handloom & Dhotis Wholesale',
      'Textile Commission Agents (Sarees)'
    ]
  },
  {
    key: 'tiles_granite_sanitary',
    patterns: [/\b(tiles?|vitrified\s*tiles|granite|marble|sanitaryware|bathroom\s*fittings)\b/i],
    label: 'Tiles, Granite & Sanitaryware',
    sectorKey: 'building_materials',
    subvectors: [
      'Tiles & Ceramic Showrooms',
      'Granite & Marble Wholesalers',
      'Sanitaryware & Bathroom Fitting Distributors',
      'Vitrified & Floor Tiles Dealers'
    ]
  },
  {
    key: 'cement',
    patterns: [/\b(cement|cement\s*dealer|cement\s*stockist|ultratech|acc\s*cement)\b/i],
    label: 'Cement',
    sectorKey: 'building_materials',
    subvectors: [
      'Cement Wholesalers & Stockists',
      'Authorized Cement Dealers',
      'Bulk Cement Suppliers & Building Materials'
    ]
  },
  {
    key: 'plywood_hardware',
    patterns: [/\b(plywood|laminates|flush\s*doors|timber|hardware\s*and\s*tools)\b/i],
    label: 'Plywood & Hardware',
    sectorKey: 'building_materials',
    subvectors: [
      'Plywood & Laminates Wholesalers',
      'Hardware & Tools Stores',
      'Timber Merchants & Wood Suppliers',
      'Modular Kitchen Hardware & Fittings'
    ]
  },
  {
    key: 'electrical_goods',
    patterns: [/\b(electrical|electricals|electric|electronics|switchgear|cables?\s*and\s*wires?|industrial\s*lighting|electrical\s*switch|electrical\s*goods|electrical\s*store)\b/i],
    label: 'Electrical Goods',
    sectorKey: 'electrical_goods',
    subvectors: [
      'Electrical Goods Wholesalers',
      'Cables, Wires & Switchgear Distributors',
      'Industrial Electrical Suppliers',
      'LED Lighting & Electrical Fittings'
    ]
  },
  {
    key: 'computers_laptops',
    patterns: [/\b(computer|laptop|laptops|pc\s*builder|desktop\s*pc|gaming\s*pc)\b/i],
    label: 'Computers & Laptops',
    sectorKey: 'technology_computers',
    subvectors: [
      'Laptop Showrooms & Dealers',
      'Computer Hardware & Assembling Shops',
      'Computer & Laptop Repair Centers',
      'Computer Accessories & Peripherals'
    ]
  },
  {
    key: 'cctv_surveillance',
    patterns: [/\b(cctv|surveillance|security\s*cameras?|dvr|nvr|biometric)\b/i],
    label: 'CCTV & Surveillance',
    sectorKey: 'surveillance_cctv',
    subvectors: [
      'CCTV Camera Dealers & Installers',
      'Security Systems & Surveillance Wholesalers',
      'Biometric & Access Control Systems',
      'DVR & NVR Security Equipment'
    ]
  },
  {
    key: 'furniture_woodwork',
    patterns: [/\b(furniture|wooden\s*furniture|sofas?|mattresses?|office\s*furniture)\b/i],
    label: 'Furniture',
    sectorKey: 'furniture_woodwork',
    subvectors: [
      'Furniture Showrooms & Manufacturers',
      'Wooden Furniture & Sofa Makers',
      'Office Furniture Suppliers',
      'Mattress & Home Furnishing Stores'
    ]
  },
  {
    key: 'footwear_shoes',
    patterns: [/\b(footwear|shoes\s*wholesale|shoe\s*showroom|leather\s*shoes|chappal)\b/i],
    label: 'Footwear',
    sectorKey: 'footwear_leather',
    subvectors: [
      'Footwear Wholesalers & Distributors',
      'Shoe Showrooms & Retailers',
      'Sports Shoes & Leather Footwear Stores'
    ]
  },
  {
    key: 'jewelry_gold',
    patterns: [/\b(jewell?ery|gold\s*shop|gold\s*merchants?|bullion|diamond\s*jewell?ery)\b/i],
    label: 'Jewelry & Gold',
    sectorKey: 'jewelry_gems',
    subvectors: [
      'Jewellery Showrooms & Gold Merchants',
      'Gold & Diamond Jewellers',
      'Silver Jewellery & Bullion Traders'
    ]
  },
  {
    key: 'solar_power',
    patterns: [/\b(solar|solar\s*panels?|rooftop\s*solar|solar\s*inverter|solar\s*epc)\b/i],
    label: 'Solar Power',
    sectorKey: 'solar_power',
    subvectors: [
      'Solar Rooftop Installers & EPC Contractors',
      'Solar Panel Dealers & Distributors',
      'Solar Inverter & Battery Suppliers'
    ]
  }
];


/**
 * Extracts specific substantive commodity or trade product entity from query.
 * e.g. "Wholesale Turmeric Suppliers in Tenali" -> Turmeric entity
 */
function extractSpecificCommodity(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return null;

  for (const ent of COMMODITY_ENTITIES) {
    for (const pat of ent.patterns) {
      if (pat.test(q)) {
        return ent;
      }
    }
  }
  return null;
}

module.exports = {
  COMMODITY_ENTITIES,
  extractSpecificCommodity
};
