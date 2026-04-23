import { extractFilemoon } from '../lib/extractors/filemoon';
import { execSync } from 'child_process';

// Embed URL from the Cuevana page HTML (decoded from base64: aHR0cHM6Ly9ieXNlamlrdWFyLmNvbS9lLzhpbXl6aHN3ODE5Yg==)
const EMBED_URL = 'https://bysejikuar.com/e/8imyzhsw819b';
const CUEVANA_REFERER = 'https://cue.cuevana3.nu/';

async function main() {
  console.log('=== Filemoon Extraction Test ===\n');
  console.log('Embed URL:', EMBED_URL);
  console.log('Referer:', CUEVANA_REFERER, '\n');

  const start = Date.now();
  const m3u8 = await extractFilemoon(EMBED_URL, CUEVANA_REFERER);
  const elapsed = Date.now() - start;

  if (!m3u8) {
    console.error('❌ FAILED: Extraction returned null');
    return;
  }

  console.log(`✅ Extracted in ${elapsed}ms`);
  console.log('M3U8 URL:', m3u8);

  // Parse expiry from URL
  const url = new URL(m3u8);
  const expiry = url.searchParams.get('e');
  if (expiry) {
    const expiresAt = new Date(parseInt(expiry) * 1000);
    const ttlSeconds = Math.round((expiresAt.getTime() - Date.now()) / 1000);
    console.log(`\nToken expires at: ${expiresAt.toISOString()}`);
    console.log(`TTL remaining: ${ttlSeconds}s (~${Math.round(ttlSeconds / 60)} minutes)`);
  }

  // Check if M3U8 is actually accessible
  console.log('\nChecking M3U8 accessibility...');
  try {
    const status = execSync(
      `curl.exe -s -o NUL -w "%{http_code}" --max-time 10 "${m3u8}"`,
      { encoding: 'utf-8' }
    );
    console.log('HTTP Status:', status);
    if (status === '200') {
      console.log('✅ M3U8 is accessible!');
    } else {
      console.log('⚠️  M3U8 returned non-200 status - may need Referer header');
      
      // Try with Referer
      const status2 = execSync(
        `curl.exe -s -o NUL -w "%{http_code}" --max-time 10 -H "Referer: ${CUEVANA_REFERER}" "${m3u8}"`,
        { encoding: 'utf-8' }
      );
      console.log('HTTP Status with Referer:', status2);
    }
  } catch (e) {
    console.error('Error checking M3U8:', e);
  }
}

main().catch(console.error);
