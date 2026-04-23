const fetch = require('node-fetch');

async function test() {
    const { extractFilemoon } = require('../lib/extractors/filemoon');
    const videoUrl = await extractFilemoon('https://bysejikuar.com/e/zxzggpdbkwnz');
    console.log('Target URL:', videoUrl);

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://bysejikuar.com/e/zxzggpdbkwnz',
      'Origin': 'https://bysejikuar.com'
    };

    console.log('\n--- Fetching with follow redirect ---');
    const res = await fetch(videoUrl, { 
        headers,
        redirect: 'manual' // Let's see the redirect headers
    });

    console.log('Initial Status:', res.status);
    console.log('Location:', res.headers.get('location'));
    
    if (res.status >= 300 && res.status < 400) {
        const nextUrl = new URL(res.headers.get('location'), videoUrl).href;
        console.log('Redirecting to:', nextUrl);
        const res2 = await fetch(nextUrl, { headers });
        console.log('Final Status:', res2.status);
    } else {
        console.log('Direct Status:', res.status);
    }
}

test();
