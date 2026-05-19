const { execSync } = require('child_process');

// Use the packed extractor to get the M3U8 URL
const embedUrl = 'https://vimeos.net/embed-sbo8fqhvho8t.html';
const html = execSync(`curl.exe -s -L --max-time 15 -H "User-Agent: Mozilla/5.0" -H "Referer: https://vimeos.net/" "${embedUrl}"`, { encoding: 'utf-8' });

// Unpack using the same logic as lib/extractors/packed.ts
const evalMatch = html.match(/eval\(function\(p,a,c,k,e,d\)\{[^}]+\}\('(.+)',(\d+),(\d+),'([^']*)'/s);
if (!evalMatch) {
  console.log('No packed JS found, looking for plain URL...');
  const plain = html.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
  if (plain) console.log('Plain URL:', plain[1]);
  else console.log('Nothing found');
  process.exit(1);
}

// Unpack
function unpack(packed, radix, count, keywords) {
  const kw = keywords.split('|');
  function itoa(n, base) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (n < base) return chars[n] || '';
    return itoa(Math.floor(n / base), base) + (chars[n % base] || '');
  }
  let result = packed;
  for (let i = count - 1; i >= 0; i--) {
    if (kw[i]) {
      const key = itoa(i, parseInt(radix));
      result = result.replace(new RegExp('\\b' + key + '\\b', 'g'), kw[i]);
    }
  }
  return result;
}

const unpacked = unpack(evalMatch[1], evalMatch[2], evalMatch[3], evalMatch[4]);
const m3u8Match = unpacked.match(/(https?:\/\/[^\s"'\\]+master\.m3u8[^\s"'\\]*)/);
if (!m3u8Match) {
  // Try sources pattern
  const srcMatch = unpacked.match(/file:\s*["'](https?:\/\/[^"']+)/);
  if (srcMatch) {
    console.log('Found file source:', srcMatch[1].substring(0, 150));
  }
  console.log('No master.m3u8 URL, snippet:', unpacked.substring(0, 600));
  process.exit(1);
}

const m3u8Url = m3u8Match[1];
console.log('M3U8 URL:', m3u8Url.substring(0, 180));

// Fetch the master manifest
console.log('\nFetching master.m3u8...');
const m3u8Content = execSync(`curl.exe -s -L --max-time 10 -H "User-Agent: Mozilla/5.0" -H "Referer: https://vimeos.net/" "${m3u8Url}"`, { encoding: 'utf-8' });

console.log('\n=== MASTER M3U8 ===');
console.log(m3u8Content);
console.log('=== END ===');

const variants = m3u8Content.split('\n').filter(l => l.includes('#EXT-X-STREAM-INF'));
console.log(`\n${variants.length} quality variants:`);
variants.forEach(v => {
  const res = v.match(/RESOLUTION=(\d+x\d+)/);
  const bw = v.match(/BANDWIDTH=(\d+)/);
  console.log(`  ${res ? res[1] : 'no-res'} @ ${bw ? (parseInt(bw[1])/1000000).toFixed(1) + ' Mbps' : 'no-bw'}`);
});
