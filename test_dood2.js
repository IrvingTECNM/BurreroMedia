const { execSync } = require('child_process');
const html = execSync('curl -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://doodstream.com/e/rwh7ggnrd65d"', { encoding: 'utf-8' });
console.log(html.substring(0, 500));
console.log('\n----------------\n');
console.log(html.substring(html.length - 500));
const fs = require('fs');
fs.writeFileSync('dood_failed.html', html);
