import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

async function main() {
    const url = "https://www.cinecalidad.am/ver-pelicula/moana-2/";
    const html = execSync(`curl -s -L "${url}"`, { encoding: 'utf-8' });
    const $ = cheerio.load(html);
    
    // Find ajax url if available in scripts
    let ajaxUrl = "https://www.cinecalidad.am/wp-admin/admin-ajax.php";
    
    console.log("--- AJAX DOOPLAY LINKS ---");
    $('li[data-post]').each((i, el) => {
        const post = $(el).attr('data-post');
        const nume = $(el).attr('data-nume');
        const type = $(el).attr('data-type');
        const label = $(el).text().trim();
        console.log(`[${i}] ${label} -> post:${post} nume:${nume} type:${type}`);
        
        if (post && nume && type) {
            // Do the ajax call
            try {
                const response = execSync(`curl -s -X POST "${ajaxUrl}" -d "action=doo_player_ajax&post=${post}&nume=${nume}&type=${type}" -H "X-Requested-With: XMLHttpRequest" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -H "Referer: ${url}"`, { encoding: 'utf-8' });
                console.log(`  Response: ${response.trim().substring(0, 150)}...`);
            } catch (e) {
                console.log(`  Failed to fetch: ${e}`);
            }
        }
    });

}
main();
