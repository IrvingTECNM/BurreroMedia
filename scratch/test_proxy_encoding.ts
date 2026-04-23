async function main() {
    const origUrl = 'https://edge1-madrid-sprintcdn.r66nv9ed.com/hls2/06/11090/tej0310ztcvd_x/seg-1-v1-a1.ts?t=uHLy9fahd8nn7D2N8CTiN4rR1Gp5tpjglh9LDMQk6aI&s=1776918331&e=10800&f=55451017&srv=1075&asn=22884&sp=5500&p=0';
    
    // Simulate what the proxy does
    const encoded = Buffer.from(origUrl).toString('base64url');
    console.log("Encoded:", encoded);
    
    // Simulate reqUrl.searchParams parsing
    // URL would be /api/proxy?q=encoded
    const reqUrl = new URL(`http://localhost/api/proxy?q=${encoded}`);
    const qParam = reqUrl.searchParams.get('q') || '';
    console.log("qParam == encoded", qParam === encoded);
    
    const decoded = Buffer.from(qParam, 'base64url').toString();
    console.log("Decoded:", decoded);
    console.log("Decoded == OrigUrl:", decoded === origUrl);
}
main();
