import fs from 'fs';

const js = fs.readFileSync('scratch_app.js', 'utf-8');
const urls = [...new Set(js.match(/(https?:\/\/[^\s"'`]+)/g))];
const apiUrls = urls.filter(u => u.includes('api') || u.includes('json') || u.includes('{'));
console.log(apiUrls);
