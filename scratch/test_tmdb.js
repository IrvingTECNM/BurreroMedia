const https = require('https');

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.EXPO_PUBLIC_TMDB_API_KEY;
if (!TMDB_API_KEY) {
  throw new Error('Missing TMDB_API_KEY or EXPO_PUBLIC_TMDB_API_KEY');
}
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
