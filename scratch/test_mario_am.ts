import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://www.cinecalidad.am/ver-pelicula/super-mario-galaxy-la-pelicula/";
    console.log(`\nTesting: ${url}`);
    const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    const html = execSync(`curl -s -L -H "User-Agent: ${BROWSER_UA}" "${url}"`, { encoding: 'utf-8' });
    const $ = cheerio.load(html);
    
    console.log("--- DOOPLAY OPTIONS ---");
    $('li.dooplay_player_option').each((i, el) => {
        console.log(`LI > Text: ${$(el).text().trim()} | Attrs: ${JSON.stringify(el.attribs)}`);
    });
    
    console.log("\n--- OTHER LINKS ---");
    $('a.onlinelink, li[data-option], li[data-url], li[data-post]').each((i, el) => {
        console.log(`Node > Text: ${$(el).text().trim()} | Tag: ${el.tagName} | Attrs: ${JSON.stringify(el.attribs)}`);
    });
}
main();
