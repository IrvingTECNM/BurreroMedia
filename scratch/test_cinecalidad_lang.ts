import * as cheerio from 'cheerio';

async function main() {
    const html = await fetch('https://www.cinecalidad.rs/?s=secret+life+of+pets').then(r => r.text());
    const $ = cheerio.load(html);
    const href = $('div.home_post_cont a').first().attr('href');
    console.log("Found:", href);
    if (!href) return;
    
    const movieHtml = await fetch(href).then(r=>r.text());
    const $m = cheerio.load(movieHtml);
    
    // the title inside the page
    console.log("H1:", $m('h1').text().trim());
    console.log("Title fallback:", $m('title').text());
    // sometimes it's in a category or div
    $m('.calidad').each((i, el) => console.log("Calidad:", $(el).text().trim()));
    $m('.idioma, .language').each((i, el) => console.log("Idioma:", $(el).text().trim()));
    
    // print all spans?
    const spanText = $m('span').map((i, el) => $m(el).text().trim()).get().filter(x=>x.toLowerCase().includes('latino') || x.toLowerCase().includes('castellano') || x.toLowerCase().includes('ingles') || x.toLowerCase().includes('inglés'));
    console.log("Spans with lang:", spanText);
}
main();
