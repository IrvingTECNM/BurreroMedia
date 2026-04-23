const { execSync } = require('child_process');
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curlFetch(url, extraHeaders = {}) {
  const headers = { 'User-Agent': BROWSER_UA, ...extraHeaders };
  const headerArgs = Object.entries(headers).map(([k, v]) => '-H "' + k + ': ' + v + '"').join(' ');
  try { return execSync('curl -s -L --max-time 15 ' + headerArgs + ' "' + url + '"', { encoding: 'utf-8' }); } catch { return ''; }
}

const c = require('cheerio');
const searchUrl = "https://www.cinecalidad.rs/?s=Deadpool%20%26%20Wolverine";
const searchHtml = curlFetch(searchUrl);
const $ = c.load(searchHtml);
const movieUrl = .item_1.items .item a.first().attr('href') || .item a.first().attr('href') || 'https://www.cinecalidad.rs/pelicula/deadpool-wolverine-2024-online-descarga/';
console.log('Movie URL:', movieUrl);

const movieHtml = curlFetch(movieUrl);
const  = c.load(movieHtml);
const doodframe = ('iframe[src*="dood"]').first();
if (doodframe.length) {
    console.log('FOUND DOODSTREAM ON CINECALIDAD:', doodframe.attr('src'));
} else {
    console.log('No doodstream found on Cinecalidad page');
}
