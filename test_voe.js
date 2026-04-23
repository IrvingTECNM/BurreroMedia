const fs = require('fs');
const html = fs.readFileSync('scratch_voe2.html', 'utf8');
const lines = html.split('\n');
const scriptLine = lines.find(l => l.includes('DROH#') || l.includes('function(') || l.includes('hls'));
if (scriptLine) {
   fs.writeFileSync('voe_script.txt', scriptLine);
   console.log('Script line extracted, length:', scriptLine.length);
}
