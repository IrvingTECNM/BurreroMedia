const fs = require('fs');
const html = fs.readFileSync('scratch_voe2.html', 'utf8');
const scripts = [];
let match;
const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
while ((match = regex.exec(html)) !== null) {
  if (match[1].length > 100) {
      scripts.push(match[1]);
  }
}
fs.writeFileSync('scratch_voe_scripts.js', scripts.join('\n//=====================\n'));
console.log('Scripts dumped. Lengths:', scripts.map(s => s.length));
