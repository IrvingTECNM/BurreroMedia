import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://www.cinecalidad.am/ver-pelicula/super-mario-galaxy-la-pelicula/";
    const html = execSync(`curl -s -L "${url}"`, { encoding: 'utf-8' });
    const $ = cheerio.load(html);
    
    console.log("--- MOVIE PAGE ---");
    console.log("Online links:", $('a.onlinelink').length);
    $('a.onlinelink').each((i, el) => {
        console.log(`  [${i}] service: ${$(el).attr('service')} | data: ${$(el).attr('data')} | text: ${$(el).text().trim()}`);
    });
    
    console.log("\nDownload links:", $('a.link').not('.onlinelink').length);
    $('a.link').not('.onlinelink').each((i, el) => {
        console.log(`  [${i}] service: ${$(el).attr('service')} | data: ${$(el).attr('data')} | text: ${$(el).text().trim()}`);
    });
}
main();
