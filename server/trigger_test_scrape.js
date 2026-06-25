const axios = require('axios');

async function trigger() {
  console.log('Sending omni scrape request to backend...');
  try {
    const res = await axios.post('http://localhost:5002/api/scrape/omni', {
      query: 'Banquet Halls in Suryapet',
      category: 'Banquet Halls',
      location: 'Suryapet',
      strategy: 'mandal',
      enabledEngines: ['maps']
    });
    console.log('Backend response:', res.data);
  } catch (err) {
    console.error('Trigger failed:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
  }
}

trigger();
