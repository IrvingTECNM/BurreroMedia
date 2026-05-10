import fs from 'fs';

async function fetchLaMovie() {
  const url = 'https://la.movie/search/batman/';
  console.log('Fetching', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });
    const text = await res.text();
    fs.writeFileSync('scratch_lamovie.html', text);
    console.log('Saved to scratch_lamovie.html, bytes:', text.length);
  } catch (err) {
    console.error(err);
  }
}

fetchLaMovie();
