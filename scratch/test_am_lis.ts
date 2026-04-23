import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://www.cinecalidad.am/ver-pelicula/moana-2/";
    const html = execSync(`curl -s -L "${url}"`, { encoding: 'utf-8' });
    const $ = cheerio.load(html);
    
    console.log("--- LIs ---");
    $('li').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('Vimeos') || text.includes('Voe') || text.includes('Filemoon') || text.includes('Goodstream')) {
            console.log(`LI > Text: ${text} | Attrs: ${JSON.stringify(el.attribs)}`);
        }
    });

}
main();
