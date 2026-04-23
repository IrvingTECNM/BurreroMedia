import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://voe.sx/e/oeglyycaeqor";
    console.log(`\nTesting Voe: ${url}`);
    const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    const html = execSync(`curl -s -L -H "User-Agent: ${BROWSER_UA}" "${url}"`, { encoding: 'utf-8' });
    
    // Look for m3u8 string match
    const m3u8Match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g);
    console.log("Raw m3u8 matches:", m3u8Match);

    // Let's execute Script 4 in a restricted node environment or mock the window to decrypt it
    const $ = cheerio.load(html);
    const script4 = $('script').eq(4).html();
    
    if (script4) {
        // Try to decode it
        // The script starts with !function(){"use strict";for(var n=decodeURI...
        // We can just evaluate it inside a Function with mock variables
        const scriptCode = script4.replace('!function()', 'return function(window, document)') + '(globalThis, {})';
        // wait, we just want to see the strings it generates
    }
}
main();
