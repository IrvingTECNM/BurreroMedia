import * as cheerio from 'cheerio';

async function main() {
    const html = await fetch('https://www.cinecalidad.rs/pelicula/los-feos-2024-online-descarga/').then(r => r.text());
    const $ = cheerio.load(html);
    
    console.log("=== MOVIE PAGE INFO ===");
    $('a.onlinelink').each((i, el) => {
        console.log("Link Text:", $(el).text().trim());
    });
    
    // maybe there's a language tag?
    const audioItems = [];
    $('.item_audio').each((i, el) => {
       audioItems.push($(el).text().trim());
    });
    console.log("Item Audios:", audioItems);
    
    // Check titles for Castellano/Latino
    $('ul.dropdown-menu li a').each((i,el) => {
        console.log("Dropdown item:", $(el).text().trim());
    });
}
main();
