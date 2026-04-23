import { execSync } from 'child_process';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url: string, extraHeaders?: Record<string, string>): string {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    ...extraHeaders,
  };

  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ');

  try {
    const result = execSync(
      `curl -s -L --max-time 15 ${headerArgs} "${url}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return result;
  } catch (err) {
    console.error('[curlFetch] Failed for:', url);
    return '';
  }
}

async function main() {
    const html = curlFetch('https://www.cinecalidad.rs/?s=moana+2');
    console.log("HTML length:", html.length);
    if (html.includes('Just a moment') || html.includes('Cloudflare')) {
        console.log("BLOCKED BY CLOUDFLARE");
    } else {
        console.log("NOT BLOCKED");
    }
}
main();
