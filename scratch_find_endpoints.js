import fs from 'fs';

const js = fs.readFileSync('scratch_app.js', 'utf-8');
const fastApiMatches = [...new Set(js.match(/fastApi\s*\+\s*["'`][^"'`]+["'`]/g))];
const apiUrlMatches = [...new Set(js.match(/apiUrl\s*\+\s*["'`][^"'`]+["'`]/g))];
console.log('fastApi', fastApiMatches);
console.log('apiUrl', apiUrlMatches);
