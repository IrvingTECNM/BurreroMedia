import { extractFilemoon } from '../lib/extractors/filemoon';

async function main() {
    const m3u8 = await extractFilemoon('https://bysejikuar.com/e/tej0310ztcvd', 'https://www.cinecalidad.rs');
    console.log("Master M3U8 URL:", m3u8);
    
    if (m3u8) {
        const res = await fetch(m3u8, {
            headers: {
                'Referer': 'https://bysejikuar.com',
                'Origin': 'https://bysejikuar.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const text = await res.text();
        console.log("--- MASTER MANIFEST ---");
        console.log(text);
        
        // Find an index manifest
        const lines = text.split('\n');
        let indexUrl = '';
        for (const line of lines) {
            if (line.trim() && !line.startsWith('#')) {
                indexUrl = line.trim();
                break;
            }
        }
        
        if (indexUrl) {
            // resolve relative
            if (!indexUrl.startsWith('http')) {
                indexUrl = new URL(indexUrl, m3u8.substring(0, m3u8.lastIndexOf('/') + 1)).href;
            }
            console.log("\nIndex M3U8 URL:", indexUrl);
            
            const indexRes = await fetch(indexUrl, {
                headers: {
                    'Referer': 'https://bysejikuar.com',
                    'Origin': 'https://bysejikuar.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const indexText = await indexRes.text();
            console.log("--- INDEX MANIFEST ---");
            console.log(indexText.substring(0, 500) + '...');
        }
    }
}
main();
