import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

function unpack(packed: string): string {
  try {
    const pMatch = packed.match(/eval\(function\(p,a,c,k,e,d\).*?return p}\('(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/);
    if (!pMatch) return '';
    let [_, p, aStr, cStr, kStr] = pMatch;
    let a = parseInt(aStr, 10);
    let c = parseInt(cStr, 10);
    let k = kStr.split('|');

    const e = function (c: number) {
      return (c < a ? '' : e(Math.floor(c / a))) + ((c % a) > 35 ? String.fromCharCode((c % a) + 29) : (c % a).toString(36));
    };

    while (c--) {
      if (k[c]) {
        p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
      }
    }
    return p;
  } catch (e) {
    return '';
  }
}

async function main() {
    // Vimeos: https://vimeos.net/embed-b7o6j67cn5pr.html
    // Goodstream: https://goodstream.one/embed-nqf57pq1bon9.html
    // Hlswish: https://hlswish.com/e/ng61a2x2lbtg
    
    const urls = [
        "https://vimeos.net/embed-b7o6j67cn5pr.html",
        "https://goodstream.one/embed-nqf57pq1bon9.html",
        "https://hlswish.com/e/ng61a2x2lbtg"
    ];
    
    const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    for(const url of urls) {
        console.log(`\nTesting: ${url}`);
        const html = execSync(`curl -s -L -H "User-Agent: ${BROWSER_UA}" "${url}"`, { encoding: 'utf-8' });
        
        let foundUrls: string[] = [];
        
        // 1. Try unpacking script tags
        const $ = cheerio.load(html);
        $('script').each((i, el) => {
            const text = $(el).html() || '';
            if (text.includes('eval(function(p,a,c,k,e,d)')) {
                const unpacked = unpack(text);
                const matches = unpacked.match(/(https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)/g);
                if (matches) foundUrls.push(...matches);
                else {
                    const match2 = unpacked.match(/['"](?:file|src)['"]\s*:\s*['"](https?:[^'"]+)['"]/);
                    if (match2) foundUrls.push(match2[1]);
                }
            } else if (text.includes('sources:')) {
                // Not packed, maybe JSON array
                const matches = text.match(/(https?:\/\/[^"']+\.(m3u8|mp4)[^"']*)/g);
                if (matches) foundUrls.push(...matches);
            }
        });
        
        console.log("  Direct M3U8/MP4 URLs:", foundUrls);
    }
}
main();
