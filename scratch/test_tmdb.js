const https = require('https');

const TMDB_API_KEY = 'ded2a315221e6d1d975e15f43377321d';
const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`;

https.get(url, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.results) {
      console.log('Success! Found', json.results.length, 'movies.');
    } else {
      console.log('Error:', json);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
