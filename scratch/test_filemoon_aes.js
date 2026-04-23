const crypto = require('crypto');

// Capturado del scratchpad
const key_parts = ["P5KKIW_mMY6Xs6u7VeBCHQ","8XH0Z5VuC4wlf81R518iow"];
const iv_b64 = "8amGhe7_UonsY8Nt";
// El payload es demasiado largo para escribirlo a mano aquí, 
// pero vamos a implementar la lógica de procesamiento de la Key.

function decodeB64(str) {
    // Reemplazar URL-safe base64 characters
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64');
}

function processKey(parts) {
    const buffers = parts.map(decodeB64);
    return Buffer.concat(buffers);
}

const key = processKey(key_parts);
console.log('Key length:', key.length); // Debería ser 32
console.log('Key (hex):', key.toString('hex'));

const iv = decodeB64(iv_b64);
console.log('IV length:', iv.length); // Debería ser 12 para GCM típicamente, o 16
console.log('IV (hex):', iv.toString('hex'));

// Lógica de desencriptación (Draft)
function decrypt(ciphertext64, key, iv) {
    const ciphertext = decodeB64(ciphertext64);
    // En AES-GCM, el tag suele estar concatenado al final (últimos 16 bytes)
    const tag = ciphertext.slice(-16);
    const data = ciphertext.slice(0, -16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(data, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

console.log('Logic ready to be tested with real payload.');
