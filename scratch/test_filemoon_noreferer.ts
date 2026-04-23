import { extractFilemoon } from '../lib/extractors/filemoon';

async function main() {
    const m3u8 = await extractFilemoon('https://bysejikuar.com/e/tej0310ztcvd', 'https://www.cinecalidad.rs');
    
    // get index
    const m3u8Res = await fetch(m3u8, { headers: { 'User-Agent': 'Mozilla/5.0...' }});
    const m3u8Text = await m3u8Res.text();
    let indexUrl = m3u8Text.split('\n').filter(l => l.trim() && !l.startsWith('#'))[0];
    if (!indexUrl.startsWith('http')) indexUrl = new URL(indexUrl, m3u8).href;
    
    // get seg
    const indexRes = await fetch(indexUrl, { headers: { 'User-Agent': 'Mozilla/5.0...' }});
    const indexText = await indexRes.text();
    let segUrl = indexText.split('\n').filter(l => l.trim() && !l.startsWith('#'))[0];
    if (!segUrl.startsWith('http')) segUrl = new URL(segUrl, indexUrl).href;
    
    console.log("Segment:", segUrl);
    
    const res = await fetch(segUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
        } // NO REFERER, NO ORIGIN
    });
    
    console.log("Status without Referer/Origin:", res.status);
    console.log("Headers:", res.headers);
}
main();
