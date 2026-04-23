import * as cheerio from 'cheerio';

async function main() {
    const html = await fetch('https://www.cinecalidad.rs/?s=moana+2').then(r => r.text());
    const $ = cheerio.load(html);
    
    console.log("=== SEARCH RESULTS ===");
    $('div.home_post_cont a').each((i, el) => {
        const href = $(el).attr('href');
        const langSpan = $(el).find('span').text().trim();
        const year = $(el).find('.year').text().trim();
        // Since cinecalidad has titles in h2 or img alt:
        const titleAlt = $(el).find('img').attr('alt');
        const titleH3 = $(el).find('h3').text().trim();
        console.log(`Href: ${href} | LangSpan: ${langSpan} | Year: ${year} | Title: ${titleAlt || titleH3}`);
    });
}
main();
