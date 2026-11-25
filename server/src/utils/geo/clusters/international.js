/**
 * clusters/international.js
 * Authoritative commercial clusters for major global metros (US, UK, CA, AU, AE, etc.).
 */

// ── AUTHORITATIVE COMMERCIAL CLUSTERS FOR MAJOR GLOBAL METROS (US, UK, CA, AU, AE, ETC.) ──
const INTERNATIONAL_AUTHORITATIVE_CLUSTERS = {
  'newyork': [
    'Manhattan Midtown', 'Manhattan Downtown & Wall St', 'SoHo & Tribeca',
    'Chelsea & Meatpacking', 'Flatiron & Union Square', 'Greenwich Village & West Village',
    'East Village & Lower East Side', 'Upper East Side', 'Upper West Side', 'Harlem & Morningside',
    'Hell\'s Kitchen & Hudson Yards', 'Williamsburg Brooklyn', 'DUMBO & Brooklyn Heights',
    'Bushwick & Bedford-Stuyvesant', 'Park Slope & Gowanus', 'Greenpoint Brooklyn',
    'Cobble Hill & Carroll Gardens', 'Crown Heights & Prospect Heights', 'Astoria Queens',
    'Long Island City & Sunnyside', 'Flushing Queens', 'Jackson Heights & Elmhurst',
    'Forest Hills Queens', 'The Bronx South Bronx & Mott Haven', 'The Bronx Riverdale & Fordham',
    'Staten Island St George'
  ],
  'newyorkcity': [
    'Manhattan Midtown', 'Manhattan Downtown & Wall St', 'SoHo & Tribeca',
    'Chelsea & Meatpacking', 'Flatiron & Union Square', 'Greenwich Village & West Village',
    'East Village & Lower East Side', 'Upper East Side', 'Upper West Side', 'Harlem & Morningside',
    'Hell\'s Kitchen & Hudson Yards', 'Williamsburg Brooklyn', 'DUMBO & Brooklyn Heights',
    'Bushwick & Bedford-Stuyvesant', 'Park Slope & Gowanus', 'Greenpoint Brooklyn',
    'Cobble Hill & Carroll Gardens', 'Crown Heights & Prospect Heights', 'Astoria Queens',
    'Long Island City & Sunnyside', 'Flushing Queens', 'Jackson Heights & Elmhurst',
    'Forest Hills Queens', 'The Bronx South Bronx & Mott Haven', 'The Bronx Riverdale & Fordham',
    'Staten Island St George'
  ],
  'nyc': [
    'Manhattan Midtown', 'Manhattan Downtown & Wall St', 'SoHo & Tribeca',
    'Chelsea & Meatpacking', 'Flatiron & Union Square', 'Greenwich Village & West Village',
    'East Village & Lower East Side', 'Upper East Side', 'Upper West Side', 'Harlem & Morningside',
    'Hell\'s Kitchen & Hudson Yards', 'Williamsburg Brooklyn', 'DUMBO & Brooklyn Heights',
    'Bushwick & Bedford-Stuyvesant', 'Park Slope & Gowanus', 'Greenpoint Brooklyn',
    'Cobble Hill & Carroll Gardens', 'Crown Heights & Prospect Heights', 'Astoria Queens',
    'Long Island City & Sunnyside', 'Flushing Queens', 'Jackson Heights & Elmhurst',
    'Forest Hills Queens', 'The Bronx South Bronx & Mott Haven', 'The Bronx Riverdale & Fordham',
    'Staten Island St George'
  ],
  'manhattan': [
    'Midtown & Times Square', 'Downtown & Financial District', 'SoHo & Tribeca',
    'Chelsea & Meatpacking', 'Greenwich Village & East Village', 'Upper East Side',
    'Upper West Side & Lincoln Center', 'Harlem & Washington Heights'
  ],
  'brooklyn': [
    'Williamsburg', 'DUMBO & Brooklyn Heights', 'Downtown Brooklyn & Boerum Hill',
    'Bushwick & Bed-Stuy', 'Park Slope & Gowanus', 'Crown Heights & Prospect Heights',
    'Greenpoint', 'Bay Ridge & Sunset Park', 'Coney Island'
  ],
  'queens': [
    'Astoria & Ditmars', 'Long Island City & Sunnyside', 'Flushing & Main St',
    'Forest Hills & Kew Gardens', 'Jackson Heights', 'Bayside', 'Jamaica'
  ],
  'london': [
    'City of London', 'Westminster & Victoria', 'Soho & Covent Garden',
    'Mayfair & Marylebone', 'Camden Town', 'Islington & Angel',
    'Shoreditch & Hoxton', 'Hackney & Dalston', 'Kensington & Chelsea',
    'Canary Wharf & Docklands', 'Greenwich & Southwark', 'Brixton & Clapham'
  ],
  'toronto': [
    'Downtown Toronto & Financial District', 'Yorkville & The Annex', 'Old Town & Distillery District',
    'King West & Liberty Village', 'Yonge and Eglinton', 'North York Centre',
    'Scarborough Town Centre', 'Mississauga City Centre', 'Etobicoke Lakeshore'
  ],
  'sydney': [
    'Sydney CBD', 'Surry Hills & Darlinghurst', 'Paddington & Woollahra',
    'Bondi & Eastern Suburbs', 'North Sydney & Crows Nest', 'Chatswood',
    'Parramatta CBD', 'Manly & Northern Beaches', 'Newtown & Inner West'
  ],
  'dubai': [
    'Downtown Dubai & Burj Khalifa', 'Business Bay & DIFC', 'Dubai Marina & JBR',
    'Jumeirah Lakes Towers (JLT)', 'Al Barsha & Mall of Emirates', 'Deira & Gold Souk',
    'Bur Dubai & Al Fahidi', 'Palm Jumeirah', 'Dubai Silicon Oasis'
  ],
  'losangeles': [
    'Downtown LA (DTLA)', 'Hollywood & West Hollywood', 'Beverly Hills & Century City',
    'Santa Monica & Venice', 'Koreatown & Silver Lake', 'Pasadena & Glendale',
    'San Fernando Valley & Sherman Oaks', 'Long Beach & South Bay'
  ],
  'chicago': [
    'The Loop & Downtown', 'River North & Magnificent Mile', 'West Loop & Fulton Market',
    'Lincoln Park & Lakeview', 'Wicker Park & Bucktown', 'South Loop & Bronzeville'
  ],
  'sanfrancisco': [
    'Financial District & SOMA', 'Union Square & Tenderloin', 'Mission District',
    'Marina & Pacific Heights', 'Castro & Noe Valley', 'Richmond & Sunset'
  ],
  'paris': [
    '1er Louvre & Châtelet', '8e Champs-Élysées', '9e Opéra',
    '4e Le Marais', '6e Saint-Germain-des-Prés', '11e Bastille & Oberkampf',
    '16e Trocadéro & Passy', 'Montmartre & 18e'
  ],
  'berlin': [
    'Mitte & Alexanderplatz', 'Charlottenburg & Kurfürstendamm', 'Kreuzberg',
    'Friedrichshain', 'Prenzlauer Berg', 'Schöneberg'
  ],
  'singapore': [
    'Marina Bay & Downtown Core', 'Orchard Road & River Valley', 'Tanjong Pagar & Chinatown',
    'Bugis & Kampong Glam', 'Jurong East & Gateway', 'Tampines & East Coast'
  ],
  'tokyo': [
    'Shinjuku', 'Shibuya & Harajuku', 'Ginza & Chuo',
    'Roppongi & Minato', 'Akihabara & Chiyoda', 'Ikebukuro & Toshima'
  ],
  'houston': [
    'Downtown Houston', 'Midtown Houston', 'Galleria & Uptown', 'Montrose & Museum District',
    'The Heights', 'Sugar Land', 'Katy & Energy Corridor', 'Westchase'
  ],
  'dallas': [
    'Downtown Dallas', 'Uptown & Victory Park', 'Deep Ellum', 'Bishop Arts & Oak Cliff',
    'North Dallas & Galleria', 'Plano Legacy', 'Irving & Las Colinas', 'Richardson'
  ],
  'austin': [
    'Downtown Austin', 'South Congress (SoCo)', 'East Austin', 'The Domain & North Burnet',
    'Zilker & Barton Springs', 'Round Rock', 'Cedar Park'
  ],
  'miami': [
    'Downtown Miami', 'Brickell', 'Wynwood & Design District', 'Miami Beach & South Beach',
    'Coral Gables', 'Coconut Grove', 'Doral'
  ],
  'manchester': [
    'Manchester City Centre', 'Spinningfields & Deansgate', 'Northern Quarter & Ancoats',
    'Salford Quays', 'Didsbury', 'Trafford & Stretford', 'Chorlton'
  ],
  'birmingham': [
    'Birmingham City Centre', 'Jewellery Quarter', 'Digbeth', 'Edgbaston',
    'Sutton Coldfield', 'Solihull', 'Moseley'
  ],
  'melbourne': [
    'Melbourne CBD', 'Southbank & Docklands', 'Fitzroy & Collingwood', 'Richmond',
    'St Kilda & South Yarra', 'Carlton', 'Brunswick', 'Box Hill'
  ],
  'vancouver': [
    'Downtown Vancouver', 'Yaletown', 'Gastown', 'Mount Pleasant',
    'Kitsilano', 'Burnaby Metrotown', 'Richmond Centre'
  ],
  'abudhabi': [
    'Al Zahiyah & Tourist Club Area', 'Al Khalidiyah', 'Hamdan Street', 'Electra Street',
    'Al Reem Island', 'Al Maryah Island', 'Mussafah Industrial', 'Khalifa City'
  ],
  'amsterdam': [
    'Amsterdam Centrum', 'De Pijp', 'Jordaan', 'Oud-Zuid',
    'Amsterdam Noord', 'Oost & Watergraafsmeer', 'Zuidas'
  ]
};

module.exports = {
  INTERNATIONAL_AUTHORITATIVE_CLUSTERS
};
