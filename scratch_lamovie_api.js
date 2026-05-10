import fs from 'fs';

async function fetchLaMovieApi() {
  const url = 'https://la.movie/wp-api/v1/search?q=batman';
  console.log('Fetching API', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const text = await res.text();
    fs.writeFileSync('scratch_lamovie_api.json', text);
    console.log('Saved to scratch_lamovie_api.json, bytes:', text.length);
  } catch (err) {
    console.error(err);
  }
}

fetchLaMovieApi();
