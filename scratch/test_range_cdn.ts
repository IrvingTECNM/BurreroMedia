import { extractFilemoon } from '../lib/extractors/filemoon';

async function main() {
    const m3u8 = await extractFilemoon('https://bysejikuar.com/e/tej0310ztcvd', 'https://www.cinecalidad.rs');
    console.log("Manifest:", m3u8);
    
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
    
    console.log("Segment URL:", segUrl);
    
    console.log("--- FETCHING WITHOUT RANGE ---");
    const resNo = await fetch(segUrl, { headers: { 'User-Agent': 'Mozilla/5.0...' }});
    console.log("Status without Range:", resNo.status);
    
    console.log("--- FETCHING WITH RANGE ---");
    const resYes = await fetch(segUrl, { headers: { 'User-Agent': 'Mozilla/5.0...', 'Range': 'bytes=0-1000' }});
    console.log("Status with Range:", resYes.status);
}
main();
