import { execSync } from 'child_process';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function curlFetch(url: string, extraHeaders?: Record<string, string>): string {
  const headers: Record<string, string> = {
    'User-Agent': BROWSER_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    ...extraHeaders,
  };
  const headerArgs = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
  try {
    return execSync(`curl -s -L --max-time 15 ${headerArgs} "${url}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  } catch { return ''; }
}

const doodId = "kh1soh1t1r6z";
const embedUrl = `https://dood.li/e/${doodId}`;
console.log(curlFetch(embedUrl).substring(0, 2000));
