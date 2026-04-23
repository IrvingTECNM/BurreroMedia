const { execSync } = require('child_process');

function curlFetch(url, extraHeaders = {}) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    ...extraHeaders,
  };
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  try {
    return execSync(`curl -s -L --max-time 15 ${headerArgs} "${url}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    console.error('Curl error:', e.message);
    return '';
  }
}

const embedUrl = 'https://doodstream.com/e/rwh7ggnrd65d';
const videoIdMatch = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/);
const videoId = videoIdMatch[1];
console.log('Video ID:', videoId);

const mirrors = ['doodstream.com', 'dood.li', 'dood.wf', 'd0000d.com', 'dood.re', 'dood.pm'];

for (const mirror of mirrors) {
  const url = 'https://' + mirror + '/e/' + videoId;
  console.log('Trying mirror:', url);
  const html = curlFetch(url);
  console.log('HTML length:', html.length);
  if (!html || html.includes('Just a moment') || html.length < 2000) {
     console.log('Skipping (blocked or too short)');
     continue;
  }

  const passMatch = html.match(/\/pass_md5\/[^\s'"]+/);
  console.log('Pass match:', passMatch ? passMatch[0] : 'None');
  if (!passMatch) continue;

  const passUrl = 'https://' + mirror + passMatch[0];
  const token = passMatch[0].split('/').pop();
  console.log('Pass URL:', passUrl);

  const baseVideoUrl = curlFetch(passUrl, { 'Referer': url });
  console.log('Base video URL:', baseVideoUrl);
  
  if (baseVideoUrl && baseVideoUrl.trim().startsWith('http')) {
    const rand = Math.random().toString(36).substring(2, 12);
    console.log('SUCCESS:', baseVideoUrl.trim() + rand + '?token=' + token + '&expiry=' + Date.now());
    process.exit(0);
  }
}
