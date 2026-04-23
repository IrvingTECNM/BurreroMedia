import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://www.cinecalidad.am/ver-pelicula/moana-2/";
    const html = execSync(`curl -s -L "${url}"`, { encoding: 'utf-8' });
    const $ = cheerio.load(html);
    
    console.log("--- MOVIE PAGE ---");
    // Find ALL links
    $('a').each((i, el) => {
        const h = $(el).attr('href');
        const s = $(el).attr('service');
        if (s || (h && h.includes('filemoon'))) {
            console.log(`Link: ${h} | Service: ${s} | Text: ${$(el).text().trim()}`);
        }
    });
    
    // Check if they use buttons
    $('button').each((i, el) => {
        console.log(`Button: ${$(el).text().trim()} | Data: ${$(el).attr('data-url') || $(el).attr('data-id')}`);
    });
}
main();
