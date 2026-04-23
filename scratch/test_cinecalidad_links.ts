import * as cheerio from 'cheerio';

async function main() {
    const html = await fetch('https://www.cinecalidad.rs/pelicula/moana-2-2024-online-descarga/').then(r => r.text());
    const $ = cheerio.load(html);
    
    console.log("=== ONLINE LINKS ===");
    $('a.onlinelink').each((i, el) => {
        console.log($(el).text().trim(), '| Service:', $(el).attr('service'), '| Data:', $(el).attr('data'));
    });
}
main();
