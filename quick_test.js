const fetch = require('node-fetch');
async function test() {
  const url = 'https://dood.li/e/fmdarm4vs0jx';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  console.log('Length:', html.length);
  console.log('CF?', html.includes('Just a moment'));
  console.log('First 200:', html.substring(0, 200));
}
test();
