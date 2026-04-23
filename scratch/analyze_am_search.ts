import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://www.cinecalidad.am/?s=Super+Mario+Galaxy";
    console.log("Fetching:", url);
    const html = execSync(`curl -s -L "${url}"`, { encoding: 'utf-8' });
    const $ = cheerio.load(html);
    
    console.log("--- RESULTS ---");
    // Try different selectors
    const selectors = ['div.home_post_cont a', 'div.postercnt a', 'div.post-content a', 'article a'];
    
    for (const sel of selectors) {
        const found = $(sel);
        console.log(`Selector '${sel}': ${found.length} results`);
        found.each((i, el) => {
            if (i < 3) console.log(`  [${i}] Href: ${$(el).attr('href')} | Title: ${$(el).find('h2, h3').text().trim() || $(el).find('img').attr('alt')}`);
        });
    }
}
main();
