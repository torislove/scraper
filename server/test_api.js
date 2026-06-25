const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://localhost:5002/api/scrape/omni', {
            query: 'photographers in guntur',
            category: 'photographers',
            location: 'guntur',
            enabledEngines: ['maps']
        });
        console.log(res.data);
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
test();
