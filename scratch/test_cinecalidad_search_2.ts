import * as cheerio from 'cheerio';

async function main() {
    const urls = [
        'https://www.cinecalidad.rs/?s=los+feos',
        'https://www.cinecalidad.rs/?s=deadpool'
    ];
    for (const u of urls) {
        console.log("=== SEARCH ", u, " ===");
        const html = await fetch(u).then(r => r.text());
        const $ = cheerio.load(html);
        
        $('div.home_post_cont a').each((i, el) => {
            const titleAlt = $(el).find('img').attr('alt');
            const titleH3 = $(el).find('h3').text().trim();
            // sometimes there's a span inside the link
            const spanTxt = $(el).find('span').text().trim();
            console.log(`Title: ${titleAlt || titleH3} | Span: ${spanTxt}`);
        });
    }
}
main();
