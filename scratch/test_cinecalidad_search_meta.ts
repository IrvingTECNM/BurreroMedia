import * as cheerio from 'cheerio';

async function main() {
    const html = await fetch('https://www.cinecalidad.rs/?s=moana').then(r => r.text());
    const $ = cheerio.load(html);
    
    console.log("=== SEARCH INFO ===");
    $('div.home_post_cont').each((i, el) => {
        const pTags = $(el).find('p').text();
        const aHref = $(el).find('a').attr('href');
        console.log("href:", aHref, "p:", pTags);
    });
}
main();
