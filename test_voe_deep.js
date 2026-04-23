const fetch = require('node-fetch');

async function testVoeDeep() {
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Encoding': 'identity',
  };

  let res = await fetch('https://voe.sx/e/sh0r7io7vn8e', { headers: HEADERS });
  let html = await res.text();
  const jsRedirect = html.match(/window\.location\.href\s*=\s*'([^']+)'/);
  if (jsRedirect) {
    res = await fetch(jsRedirect[1], { headers: HEADERS });
    html = await res.text();
  }
  
  // Extract all script tags
  const scripts = [];
  const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (m[1].trim().length > 50) scripts.push(m[1].trim());
  }
  
  console.log('Found', scripts.length, 'non-trivial scripts');
  scripts.forEach((s, i) => {
    console.log('--- Script', i, '(length:', s.length, ') ---');
    // Show first 300 chars
    console.log(s.substring(0, 300));
    console.log('...');
  });
}

testVoeDeep().catch(console.error);
