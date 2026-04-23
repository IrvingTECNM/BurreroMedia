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
    
    const b64 = Buffer.from(segUrl).toString('base64url');
    const b64ref = Buffer.from('https://bysejikuar.com').toString('base64url');
    
    const proxyUrl = `http://localhost:8081/api/proxy?q=${b64}&r=${b64ref}`;
    console.log("Proxy URL:", proxyUrl);
    
    const res = await fetch(proxyUrl);
    console.log("Proxy Status:", res.status);
    console.log("Proxy Headers:", res.headers.get('Content-Type'));
}
main();
