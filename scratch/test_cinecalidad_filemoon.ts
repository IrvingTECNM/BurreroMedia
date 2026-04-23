import { extractFilemoon } from '../lib/extractors/filemoon';

async function main() {
    const id = 'xyehpp9unl7e';
    const url = `https://filemoon.sx/e/${id}`;
    const referer = 'https://www.cinecalidad.rs';

    console.log("Extracting Filemoon via:", url);
    const m3u8 = await extractFilemoon(url, referer);
    console.log("M3U8:", m3u8);
}
main();
