const { extractFilemoon } = require('../lib/extractors/filemoon');

async function testNativeFetch() {
    console.log('--- Testing Native Fetch (Simulating Proxy) ---');
    const videoUrl = await extractFilemoon('https://bysejikuar.com/e/zxzggpdbkwnz');
    console.log('Video URL:', videoUrl);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Referer': 'https://bysejikuar.com/e/zxzggpdbkwnz',
      'Origin': 'https://bysejikuar.com'
    };

    try {
        console.log('Requesting with global fetch...');
        // Using global.fetch (Node 18+)
        const res = await fetch(videoUrl, { headers });
        console.log('Status:', res.status);
        if (res.status !== 200) {
            const body = await res.text();
            console.log('Error Body:', body.substring(0, 500));
        } else {
            console.log('Success! Manifest starts with:', (await res.text()).substring(0, 50));
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testNativeFetch();
