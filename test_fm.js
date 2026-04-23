const { execSync } = require('child_process');

function fetch(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://ww9.cuevana3.to/'
  };
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  try { return execSync(`curl -s -L --max-time 15 ${headerArgs} "${url}"`, { encoding: 'utf-8' }); } catch(e) { return ''; }
}

const html = fetch('https://filemoon.sx/e/ptomde0vtik9');
console.log('Filemoon HTML length:', html.length);
require('fs').writeFileSync('test_filemoon.html', html);
const match1 = html.match(/file:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
if (match1) {
  console.log('SUCCESS match1 (direct file/m3u8):', match1[1]);
} else {
  // Check for packed/eval code (common in filemoon)
  const evalMatch = html.match(/eval\(function[^{]+{.*}\('.*?'\)\)/s);
  if (evalMatch) {
    console.log('Found eval/packed JS (needs unpacked)');
  } else {
    console.log('No direct file found and no eval found. (Cloudflare?)');
    console.log(html.substring(0, 300));
  }
}
