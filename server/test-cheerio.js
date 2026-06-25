const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.google.com/maps/place/Ravi+Photo+Studio/@16.3067,80.4365,15z').then(res => {
  const $ = cheerio.load(res.data);
  console.log('Description:', $('meta[property="og:description"]').attr('content'));
  console.log('Title:', $('meta[property="og:title"]').attr('content'));
  console.log('Name:', $('meta[itemprop="name"]').attr('content'));
  console.log('Image:', $('meta[property="og:image"]').attr('content'));
}).catch(console.error);
