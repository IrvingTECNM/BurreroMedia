const fs = require('fs');

async function test() {
  const r2 = await fetch('https://ww9.cuevana3.to/23195/avatar-aang-the-last-airbender');
  const html = await r2.text();
  const voe = html.match(/data-src="([^"]*voe[^"]*)"/);
  if (!voe) {
     console.log("No voe link found in HTML");
     return;
  }
  console.log("Found Voe Iframe:", voe[1]);
  const vr = await fetch(voe[1]);
  const vhtml = await vr.text();

const fs = require('fs');
async function test() {
  const vr = await fetch('https://voe.sx/e/6yy8y8ntetla');
  const vhtml = await vr.text();
  const scriptMatch = vhtml.match(/<script[^>]*>(.*?)<\/script>/gi);
  if (scriptMatch) {
     scriptMatch.forEach(s => {
        if (s.includes('window') || s.includes('let ') || s.includes('var ')) {
          console.log(s.substring(0, 500));
        }
     });
  }
}
test();
