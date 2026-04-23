const fetch = require('node-fetch');
async function run() {
  const FETCH_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
  let url = 'https://voe.sx/e/sh0r7io7vn8e';
  const res = await fetch(url, { headers: FETCH_HEADERS });
  let html = await res.text();
  const jsRedirect = html.match(/window\.location\.href\s*=\s*'([^']+)'/);
  if (jsRedirect) {
     url = jsRedirect[1];
     const res2 = await fetch(url, { headers: FETCH_HEADERS });
     html = await res2.text();
  }
  require('fs').writeFileSync('voe_source.txt', html);
  console.log('Saved to voe_source.txt. Length:', html.length);
}
run();
