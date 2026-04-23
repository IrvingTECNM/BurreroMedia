import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://www.cinecalidad.am/?s=Super+Mario+Galaxy";
    const html = execSync(`curl -s -L "${url}"`, { encoding: 'utf-8' });
    const $ = cheerio.load(html);
    
    console.log("--- ARTICLE CONTENT ---");
    $('article').first().each((i, el) => {
       console.log($.html(el));
    });
}
main();
