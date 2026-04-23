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
    const url = "https://vimeos.net/embed-b7o6j67cn5pr.html";
    const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    const html = execSync(`curl -s -L -H "User-Agent: ${BROWSER_UA}" -H "Referer: https://www.cinecalidad.am/" "${url}"`, { encoding: 'utf-8' });
    
    // Look for m3u8 or sources inside script tags
    const $ = cheerio.load(html);
    let foundUrls: string[] = [];
    
    $('script').each((i, el) => {
        const text = $(el).html() || '';
        
        // match base64 packed (eval)
        if (text.includes('eval(function(p,a,c,k,e,d)')) {
            const unpacked = unpack(text);
            console.log(`Unpacked Script length: ${unpacked.length}`);
            console.log(unpacked.substring(0, 500));
            
            const matches = unpacked.match(/(https?:\/\/[^"']+\.m3u8[^"']*)/g);
            if (matches) foundUrls.push(...matches);
            else {
                // look for 'file': '...'
                const match2 = unpacked.match(/['"](?:file|src)['"]\s*:\s*['"](https?:[^'"]+)['"]/);
                if (match2) foundUrls.push(match2[1]);
            }
        }
    });
    
    console.log("Found direct URLs from Vimeos:", foundUrls);
}
main();
