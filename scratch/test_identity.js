const fetch = require('node-fetch');

async function getFreshLink() {
   const { extractFilemoon } = require('../lib/extractors/filemoon');
   return await extractFilemoon('https://bysejikuar.com/e/zxzggpdbkwnz');
}

async function testUpstream() {
    console.log('Fetching new video link...');
    const videoUrl = await getFreshLink();
    if (!videoUrl) return console.log('Failed to get link');
    console.log('Video URL:', videoUrl);
    
    // First request: without Accept-Encoding: identity
    console.log('\n--- Test 1: Standard Headers ---');
    try {
        const res1 = await fetch(videoUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
              'Connection': 'keep-alive',
              'Referer': 'https://bysejikuar.com/e/zxzggpdbkwnz',
              'Origin': 'https://bysejikuar.com'
            }
        });
        console.log('Status:', res1.status);
        if(res1.status !== 200) console.log(await res1.text().then(t => t.substring(0, 200)));
    } catch(e) { console.error(e); }

    // Second request: WITH Accept-Encoding: identity
    console.log('\n--- Test 2: With Accept-Encoding: identity ---');
    try {
         const res2 = await fetch(videoUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
              'Connection': 'keep-alive',
              'Referer': 'https://bysejikuar.com/e/zxzggpdbkwnz',
              'Origin': 'https://bysejikuar.com',
              'Accept-Encoding': 'identity'
            }
        });
        console.log('Status:', res2.status);
        if(res2.status !== 200) console.log(await res2.text().then(t => t.substring(0, 200)));
    } catch(e) { console.error(e); }
}

testUpstream();
