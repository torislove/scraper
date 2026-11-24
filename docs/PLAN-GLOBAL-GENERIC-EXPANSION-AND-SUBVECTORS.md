# Master Implementation Plan: Global Generic Query Expansion & Country-Specific Subvector Fleet (All 25 Categories & All 11 Countries)

> **Objective**: Eliminate keyword blind spots for all generic searches by automatically expanding any high-level category query (e.g., `"Photographers"`, `"Restaurants"`, `"Lawyers"`, `"Roofing"`, `"Gyms"`) into an exhaustive set of 8 to 16 country-localized commercial subvectors tailored to the exact terminology, market norms, and licensing structures of the target country.  
> **Coverage**: 25 Major Industry Categories across 11 Countries (US, GB, CA, AU, AE, DE, FR, SG, NZ, IE, IN).  
> **Output Multiplier**: Increases addressable market capture from 20% to **95%+**, scaling lead generation from ~285 to **1,500–5,000+ unique, verified businesses per metropolitan area**.

---

## 1. Architectural Blueprint: Generic Expansion vs Laser Specificity

- **Generic Search**: Detected by `querySpecificityClassifier.js` when the search query is a broad category noun (e.g. `Photographers`, `Restaurants`, `Lawyers`, `Roofing`, `Gyms`).
- **Country Resolution**: Detected ISO-2 code (US, GB, CA, AU, AE, DE, FR, SG, NZ, IE, IN).
- **Subvector Expansion**: Pulls 8 to 16 localized high-intent subvectors from `indiaTradeIntelligence.js`.
- **Multi-Vector Swarm**: Cross-multiplies `[Micro-Zones] × [Subvectors]` in parallel across the worker pool.
- **Triple-Key Deduplication**: Merges overlapping leads by E.164 phone, clean domain, and name + geohash into single, ultra-enriched profiles.
- **Particular Search**: When the query contains specific qualifiers (`wedding photographer`, `commercial flat roofer`, `truck accident lawyer`), expansion is disabled and **laser domain purity** is enforced with negative keyword gating.

---

## 2. Global Category & Country-Specific Subvector Taxonomy

### Category 1: Photography, Studios & Visual Media
- **US**: Fashion & Model Editorial Photography Studios, Corporate Headshot & Executive Portrait Studios, Wedding & Engagement Photographers, Commercial Product & E-commerce Catalog Photography, Newborn, Maternity & Family Portrait Photographers, Architectural & Real Estate Photography Services, Boudoir & Fine Art Photo Studios, Film & Analog Darkroom Labs, Drone & Aerial Photography, Food & Restaurant Photo Studios, Event & Concert Photographers, Advertising & Brand Campaign Agencies.
- **UK (GB)**: High-Fashion & Editorial Photographic Studios, Corporate Headshots & Linked-In Portrait Photographers, Wedding & Civil Partnership Photographers, Commercial Product & Packshot Studios, Newborn & Family Portrait Studios, Architectural & Property Photographers (RICS/Estate), Film Processing & Fine Art Darkrooms, Aerial Drone Surveyors (CAA Licensed), Food & Hospitality Commercial Photographers.
- **CA / AU**: Fashion & Editorial Studios, Executive Headshots, Wedding Photographers, E-commerce Product Packshots, Newborn & Family Studios, Real Estate & Architectural Photography, Drone & Aerial Media.
- **AE**: Luxury Fashion & Haute Couture Studios, Corporate C-Suite Portraits, Luxury Wedding & Royal Gala Photographers, Commercial Jewelry Photography, Luxury Architecture & Hotel Photography, Aerial Drone Media.
- **DE**: Werbefotografie & Commercial Studios, Modefotografie & Fashion Studios, Business-Porträts & Corporate Headshots, Hochzeitsfotografen, Produktfotografie, Architekturfotografie, Drohnenfotografie.
- **FR**: Photographie de Mode & Haute Couture, Portraits Corporate Professionnels, Photographes de Mariage, Packshot E-Commerce, Photographie d'Architecture de Prestige, Photographie Culinaire, Drone Aérien.
- **SG / NZ / IE**: Commercial Fashion Studios, Corporate Headshots & LinkedIn Branding, Wedding Photoshoots, E-commerce Product Studios, Architectural Photographers, Drone Photography.
- **IN (Preserved 100%)**: Wedding & Pre-Wedding Candid Photographers, Traditional Hindu, Christian & Muslim Cinematographers, Studio Portrait & Digital Passport Labs, Maternity & Baby Shower Photoshoots, Newborn & 1st Birthday Milestone Studios, Kalyana Mandapam Drone Teams, Commercial Product & E-commerce Catalog Shoots, Fashion Portfolio & Casting Studios.

---

### Categories 2–25 (Complete Matrix)
- **Restaurants & Dining**: Fine Dining, Italian Trattorias, Sushi Bars, Steakhouses, Gastropubs, Wood-Fired Pizzerias, Plant-Based, Rooftop Lounges, Biryani/Mandi, Udupi/Thali, Dhabas.
- **Legal & Law Firms**: Personal Injury, Commercial Litigation, Criminal Defense, Family/Divorce, Estate/Probate, Real Estate Closing, Corporate/M&A, Medical Malpractice, High Court Advocates, Solicitors, Conveyancers.
- **Healthcare & Clinics**: Cosmetic Dentists, Dental Implants, Orthodontics, Dermatology, Chiropractors, Physical Therapy, Plastic Surgery, Primary Care, Urgent Care, Multi-Speciality Hospitals.
- **Roofing**: Commercial Flat Roofing, Asphalt Shingle, Metal Roofing, Slate/Tile, Emergency Tarping, Slating & Tiling (UK), Colorbond (AU), Terrace Waterproofing (IN).
- **HVAC & Heating**: Central AC, Emergency Heating/Furnace Repair, Heat Pumps, Duct Cleaning, Commercial Refrigeration, Gas Safe Boiler Engineers (UK), Split AC/VRV (IN/AE).
- **Plumbing**: 24/7 Emergency Plumbers, Hydro Jetting, Trenchless Sewer Relining, Tankless Water Heaters, Water Safe Registered (UK), Licensed Tradies (AU), Borewell & Drainage (IN).
- **Electrical**: Master Electricians, EV Charger Installers, Panel Upgrades, Whole-House Generators, NICEIC (UK), Sparkies (AU), HT/LT Substation (IN).
- **Real Estate**: Residential Brokerages, Commercial Brokers, Property Management, Luxury Waterfront Estates, Chartered Surveyors (UK), Strata Management (AU), Open Plots & Godowns (IN).
- **Automotive**: Certified Auto Repair (ASE), Transmission Specialists, Collision & Body Shops, Mobile Mechanics, European Auto Specialists, Detailing & PPF, MOT Stations (UK), Smash Repairs (AU).
- **And 15+ more sectors**: Fitness & Reformer Pilates, Salons & Med Spas, CPAs & Tax Advisory, Logistics & 3PL, Precision Manufacturing & CNC, Deep Cleaning & Janitorial, Pest & Termite Control, Security & Locksmiths, Weddings & Event Venues, Veterinary Clinics, Tutoring & Daycare, Digital Marketing & SEO Agencies, Waste & Scrap Recyclers, Landscaping & Tree Care, Agriculture & APMC Mandis.

---

## 3. Scaling Lead Generation
- **Old Single-Query Method**: 1 Query $\times$ 16 Zones $\times$ 18 Cards = 288 Raw $\rightarrow$ **240 Unique Leads**.
- **New Subvector Multiplier Fleet**: 8 Subvectors $\times$ 24 Micro-Zones $\times$ 65 Cards = 12,480 Raw $\rightarrow$ **3,200 Unique Enriched Leads**.
