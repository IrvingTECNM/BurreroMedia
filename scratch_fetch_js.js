import fs from 'fs';

async function fetchLaMovieAppJS() {
  const url = 'https://la.movie/wp-content/themes/lamovie/assets/build/static/assets/app.js';
  console.log('Fetching JS', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const text = await res.text();
    fs.writeFileSync('scratch_app.js', text);
    console.log('Saved to scratch_app.js, bytes:', text.length);
  } catch (err) {
    console.error(err);
  }
}

fetchLaMovieAppJS();
