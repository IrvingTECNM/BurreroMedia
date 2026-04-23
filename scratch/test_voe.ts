import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://voe.sx/e/oeglyycaeqor";
    console.log(`\nTesting Voe: ${url}`);
    const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    const html = execSync(`curl -s -L -H "User-Agent: ${BROWSER_UA}" "${url}"`, { encoding: 'utf-8' });
    
    // Look for hls inside scripts
    const $ = cheerio.load(html);
    
    $('script').each((i, el) => {
        const text = $(el).html() || '';
        if (text.length > 500) {
            console.log(`Script ${i}: length ${text.length}`);
            console.log(text.substring(0, 150));
            console.log("...");
        }
    });

}
main();
