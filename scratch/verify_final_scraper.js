const { extractFilemoon } = require('../lib/extractors/filemoon');

// Link proporcionado por el usuario
const testUrl = 'https://e7cod.com/5/9809950';

async function test() {
    console.log('Testing Filemoon extraction for:', testUrl);
    try {
        const result = await extractFilemoon(testUrl);
        if (result) {
            console.log('✅ SUCCESS! Extracted URL:', result);
            if (result.includes('.m3u8')) {
                console.log('✅ Link is a valid .m3u8 stream.');
            }
        } else {
            console.log('❌ FAILED: Extraction returned null');
        }
    } catch (error) {
        console.error('❌ FATAL ERROR:', error);
    }
}

test();
