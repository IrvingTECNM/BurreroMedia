const fetch = require('node-fetch');

// Datos capturados de los logs del usuario
const videoUrl = 'https://edge1-vienna-sprintcdn.owphbf24.com/hls2/02/10999/zxzggpdbkwnz_x/master.m3u8?t=pu70_NvhafdYpqGi41cVvWjWAvThsVz0m6-oC3kEvBo&s=1776636196&e=10800&f=54999247&srv=1055&asn=22884&sp=5500&p=0';
const referer = 'https://bysejikuar.com/e/zxzggpdbkwnz';

// El proxy corre localmente en el puerto 8081 durante 'npm run web'
// Pero como no puedo acceder a localhost:8081 fácilmente desde aquí mientras corre expo,
// voy a simular la petición que HARÍA el proxy directamente al CDN para ver el error.

const PROXY_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
  'Connection': 'keep-alive',
  'Referer': referer,
  'Origin': 'https://bysejikuar.com'
};

async function testUpstream() {
    console.log('Testing direct upstream request with proxy headers...');
    try {
        const res = await fetch(videoUrl, { headers: PROXY_HEADERS });
        console.log('Status:', res.status);
        console.log('Response Headers:', JSON.stringify(res.headers.raw()));
        const body = await res.text();
        console.log('Body snippet:', body.substring(0, 500));
    } catch (error) {
        console.error('Error:', error);
    }
}

testUpstream();
