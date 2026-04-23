const fetch = require('node-fetch');

async function decodeVoe() {
  const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Encoding': 'identity' };
  let res = await fetch('https://voe.sx/e/sh0r7io7vn8e', { headers: HEADERS });
  let html = await res.text();
  const jsRedirect = html.match(/window\.location\.href\s*=\s*'([^']+)'/);
  if (jsRedirect) { res = await fetch(jsRedirect[1], { headers: HEADERS }); html = await res.text(); }
  
  const scripts = [];
  const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) { if (m[1].trim().length > 50) scripts.push(m[1].trim()); }
  
  // Script 7 is the encoded data - it starts with a JSON array
  const encodedData = scripts[7];
  console.log('Encoded data (full):');
  console.log(encodedData);
  console.log('---');
  
  // Try to parse it as JSON array
  try {
    const parsed = JSON.parse(encodedData);
    console.log('It is a JSON array with', parsed.length, 'elements');
    if (parsed.length > 0) console.log('First element:', typeof parsed[0], parsed[0].substring(0, 100));
  } catch(e) {
    // Not JSON, try treating it as a string with delimiters
    // Split by the delimiters: ^^ !! @$ %? *~ #&
    const tokens = encodedData.split(/[\^]{2}|[!]{2}|[@][$]|[%][?]|[*][~]|[#][&]/);
    console.log('Token count:', tokens.length);
    console.log('First 5 tokens:', tokens.slice(0, 5));
    console.log('Last 5 tokens:', tokens.slice(-5));
  }
}
decodeVoe().catch(console.error);
