import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import vm from 'vm';

async function main() {
    const url = "https://voe.sx/e/oeglyycaeqor";
    console.log(`\nTesting Voe: ${url}`);
    const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    const html = execSync(`curl -s -L -H "User-Agent: ${BROWSER_UA}" "${url}"`, { encoding: 'utf-8' });
    const $ = cheerio.load(html);
    
    // Find the script that contains "decodeURI"
    let targetScript = '';
    $('script').each((i, el) => {
        const text = $(el).html() || '';
        if (text.includes('decodeURI(') && text.includes('!function()')) {
            targetScript = text;
        }
    });

    if (targetScript) {
        console.log("Found obfuscated script, length:", targetScript.length);
        
        // mock window to capture what it does
        const sandbox = {
            console: console,
            eval: (code: string) => {
                console.log("EVAL CAPTURED:", code.substring(0, 500));
                
                // try to find hls inside the evaled code
                const hlsMatch = code.match(/'hls'\s*:\s*'([^']+)'/);
                if (hlsMatch) console.log("HLS MATCH!!!", hlsMatch[1]);
                
                // or just any m3u8
                const urlMatch = code.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/);
                if (urlMatch) console.log("URL MATCH!!!", urlMatch[1]);
            },
            document: {
                write: (ext: string) => {},
                getElementById: () => null
            },
            window: {
                location: { href: url }
            }
        };

        try {
            // override the last call to somehow intercept?
            // Actually, if it evaluates it, it might just run it directly.
            // Let's replace 'eval(' if it uses it.
            // Voe usually uses a function constructor or eval.
            
            // Let's just run it in a VM
            vm.createContext(sandbox);
            // Replace Function constructor, if used
            targetScript = `
                var originalFunction = Function;
                Function = function(...args) {
                    var code = args[args.length - 1];
                    console.log("Function intercepted code length:", code.length);
                    var hlsMatch = code.match(/'hls'\\s*:\\s*'([^']+)'/);
                    if (hlsMatch) console.log("HLS MATCH IN FUNCTION!!!", hlsMatch[1]);
                    return originalFunction.apply(this, args);
                };
                ` + targetScript;
                
            vm.runInContext(targetScript, sandbox);
        } catch (e) {
            console.error("VM Error:", e);
        }
        
    } else {
        console.log("No obfuscated script found");
        // Look for window.voe = '...'?
        const voeUrlMatch = html.match(/(https?:\/\/[a-zA-Z0-9.\-]+\/hls\/[^\/]+\/index\.m3u8)/);
        if (voeUrlMatch) console.log("Direct match?", voeUrlMatch[1]);
    }
}
main();
