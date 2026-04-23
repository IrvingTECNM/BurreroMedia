import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

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

async function main() {
    // Get fresh Voe URL from Mario Galaxy page
    const movieUrl = "https://www.cinecalidad.am/ver-pelicula/super-mario-galaxy-la-pelicula/";
    const html = curlFetch(movieUrl);
    const $ = cheerio.load(html);
    
    let voeUrl = '';
    $('li.dooplay_player_option').each((i, el) => {
        if ($(el).text().includes('Voe')) {
            voeUrl = $(el).attr('data-option') || '';
        }
    });
    
    console.log("Voe URL:", voeUrl);
    if (!voeUrl) return;
    
    const voeHtml = curlFetch(voeUrl);
    console.log("Voe HTML length:", voeHtml.length);
    console.log("First 100:", voeHtml.substring(0, 100));
}
main();
