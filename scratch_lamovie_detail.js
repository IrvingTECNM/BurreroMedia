import fs from 'fs';

async function fetchLaMovieDetailApi() {
  const url = 'https://la.movie/wp-api/v1/movies/36843';
  console.log('Fetching API', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const text = await res.text();
    fs.writeFileSync('scratch_lamovie_detail.json', text);
    console.log('Saved to scratch_lamovie_detail.json, bytes:', text.length);
  } catch (err) {
    console.error(err);
  }
}

fetchLaMovieDetailApi();
