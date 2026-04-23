import { execSync } from 'child_process';

// URL is fresh - let's get a fresh one first 
async function main() {
    const embedUrl = "https://goodstream.one/embed-nqf57pq1bon9.html";
    const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    // Get fresh m3u8 from the embed
    const html = execSync(`curl -s -L -H "User-Agent: ${BROWSER_UA}" "${embedUrl}"`, {encoding:'utf-8'});
    
    const m3u8Match = html.match(/(https?:\/\/[^"']+\.m3u8[^"']*)/);
    if (!m3u8Match) {
        // Try packed
        const packMatch = html.match(/eval\(function\(p,a,c,k,e,d\)/);
        console.log("Has packed JS:", !!packMatch);
        console.log("HTML snippet:", html.substring(0,500));
        return;
    }
    const m3u8 = m3u8Match[1];
    console.log("Fresh M3U8:", m3u8);

    // Test 1: with embed as Referer
    try {
        const r2 = execSync(`curl -s -o NUL -w "%{http_code}" -H "User-Agent: ${BROWSER_UA}" -H "Referer: ${embedUrl}" -H "Origin: https://goodstream.one" "${m3u8}"`, {encoding:'utf-8'});
        console.log("\nWith embed Referer:", r2);
    } catch(e: any) {
        console.log("\nWith embed Referer:", e.stdout || e.status);
    }

    // Test 2: No Referer
    try {
        const r1 = execSync(`curl -s -o NUL -w "%{http_code}" -H "User-Agent: ${BROWSER_UA}" "${m3u8}"`, {encoding:'utf-8'});
        console.log("No Referer:", r1);
    } catch(e: any) {
        console.log("No Referer:", e.stdout || e.status);
    }
}
main();
