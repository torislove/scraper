const http = require('http');

http.get('http://localhost:5002/api/leads', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const allLeads = parsed.vendors || parsed.leads || parsed;
      const schoolLeads = allLeads.filter(l => 
        (l.query && l.query.includes('school')) || 
        (l.category && l.category.toLowerCase().includes('school')) ||
        (l.name && (l.name.toLowerCase().includes('school') || l.name.toLowerCase().includes('vidya') || l.name.toLowerCase().includes('academy') || l.name.toLowerCase().includes('college')))
      );

      console.log('Total Leads In Store:', allLeads.length);
      console.log('Total Schools In Store:', schoolLeads.length);
      console.log('Sample Harvested Schools (first 20):');
      schoolLeads.slice(0, 20).forEach((l, i) => {
        console.log(`${i+1}. [${l.name}] Phone: ${l.phone || l.mobilePhone} | Zone: ${l.zone} | WA: ${l.whatsappLink ? 'YES (' + l.whatsappLink + ')' : 'NO'}`);
      });
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  });
});
