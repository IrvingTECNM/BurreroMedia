const url = 'https://edge1-madrid-sprintcdn.r66nv9ed.com/hls2/06/11090/tej0310ztcvd_x/seg-1-v1-a1.ts?t=uHLy9fahd8nn7D2N8CTiN4rR1Gp5tpjglh9LDMQk6aI&s=1776918331&e=10800&f=55451017&srv=1075&asn=22884&sp=5500&p=0';

async function main() {
    console.log("Fetching TS segment...");
    const res = await fetch(url, {
        headers: {
            'Referer': 'https://bysejikuar.com',
            'Origin': 'https://bysejikuar.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    if (!res.ok) {
        console.log("Body:", await res.text());
    } else {
        const body = res.body;
        // read first few bytes
        const reader = body?.getReader();
        if (reader) {
             const { value } = await reader.read();
             console.log("First bytes length:", value?.byteLength);
        }
    }
}
main();
