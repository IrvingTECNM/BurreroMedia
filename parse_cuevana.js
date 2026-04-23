const fs = require('fs');
const h = fs.readFileSync('cuevana_movie.html', 'utf8');

// Check if iframes have src attributes in raw HTML
const iframeMatches = h.match(/<iframe[^>]+src="([^"]+)"/gi);
if (iframeMatches) {
  console.log('Iframes with src:', iframeMatches.length);
  iframeMatches.slice(0, 5).forEach(function(m) { console.log(' ', m.substring(0, 100)); });
} else {
  console.log('No iframes with direct src attributes found');
}

// Check for data-src
const dataSrcMatches = h.match(/<iframe[^>]+data-src="([^"]+)"/gi);
if (dataSrcMatches) {
  console.log('\nIframes with data-src:', dataSrcMatches.length);
  dataSrcMatches.slice(0, 5).forEach(function(m) { console.log(' ', m.substring(0, 100)); });
}

// Show context around first iframe
const idx = h.indexOf('<iframe');
if (idx >= 0) {
  console.log('\nFirst iframe context:', h.substring(idx, idx + 200));
}
