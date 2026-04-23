import { extractFilemoon } from '../lib/extractors/filemoon';
import { execSync } from 'child_process';

async function main() {
    const m3u8 = await extractFilemoon('https://bysejikuar.com/e/tej0310ztcvd', 'https://www.cinecalidad.rs');
    
    const m3u8Res = await fetch(m3u8, { headers: { 'User-Agent': 'Mozilla/5.0...' }});
    const m3u8Text = await m3u8Res.text();
    let indexUrl = m3u8Text.split('\n').filter(l => l.trim() && !l.startsWith('#'))[0];
    if (!indexUrl.startsWith('http')) indexUrl = new URL(indexUrl, m3u8).href;
    
    const indexRes = await fetch(indexUrl, { headers: { 'User-Agent': 'Mozilla/5.0...' }});
    const indexText = await indexRes.text();
    let segUrl = indexText.split('\n').filter(l => l.trim() && !l.startsWith('#'))[0];
    if (!segUrl.startsWith('http')) segUrl = new URL(segUrl, indexUrl).href;
    
    console.log("Segment:", segUrl);
    
    const out = execSync(`curl.exe -s -D - -o NUL "${segUrl}" -H "Referer: https://bysejikuar.com/" -H "Origin: https://bysejikuar.com" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -H "Range: bytes=0-1000"`, { encoding: 'utf8' });
    console.log(out);
}
main();
