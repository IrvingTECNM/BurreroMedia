/**
 * Standalone Doodstream Extractor Server
 * Runs as a separate Node.js process to bypass Cloudflare
 * because Metro bundler's runtime changes node-fetch's TLS fingerprint.
 * 
 * Usage: node scripts/dood-extractor.js <video-id>
 * Output: JSON { url: "https://..." } or { error: "..." }
 */
const fetch = require('node-fetch');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
};

const DOOD_MIRRORS = [
  'dood.li', 'dood.wf', 'd0000d.com', 'dood.re', 'dood.so',
  'dood.watch', 'dood.pm', 'doodstream.com',
];

async function extract(videoId) {
  for (const mirror of DOOD_MIRRORS) {
    try {
      const embedUrl = `https://${mirror}/e/${videoId}`;
      const res = await fetch(embedUrl, { headers: HEADERS, redirect: 'follow' });
      const html = await res.text();

      if (html.includes('Just a moment') || html.includes('Checking your browser') || html.length < 2000) {
        continue; // Cloudflare blocked
      }

      const passMatch = html.match(/\/pass_md5\/[^\s'"]+/);
      if (!passMatch) continue;

      const domain = `https://${mirror}`;
      const passUrl = domain + passMatch[0];
      const splitPath = passMatch[0].split('/');
      const token = splitPath[splitPath.length - 1];

      await new Promise(r => setTimeout(r, 500));
      const passRes = await fetch(passUrl, { headers: { ...HEADERS, 'Referer': embedUrl } });
      const baseVideoUrl = await passRes.text();

      if (baseVideoUrl.startsWith('http')) {
        const randomStr = Math.random().toString(36).substring(2, 12);
        const finalUrl = `${baseVideoUrl}${randomStr}?token=${token}&expiry=${Date.now()}`;
        return { url: finalUrl, mirror };
      }
    } catch {
      continue;
    }
  }
  return { error: 'all_mirrors_failed' };
}

// CLI mode
const videoId = process.argv[2];
if (!videoId) {
  console.error(JSON.stringify({ error: 'usage: node dood-extractor.js <video-id>' }));
  process.exit(1);
}

extract(videoId).then(result => {
  console.log(JSON.stringify(result));
  process.exit(0);
}).catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
