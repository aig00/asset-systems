import crypto from 'crypto';

const CONFIG = {
  SALT_LENGTH: 16,
  ITERATIONS: 100000,
  KEY_LENGTH: 32,
};

function generateSalt() {
  const salt = crypto.randomBytes(CONFIG.SALT_LENGTH);
  return salt.toString('base64');
}

function hashPin(pin, salt) {
  const saltBuffer = Buffer.from(salt, 'base64');
  
  const hash = crypto.pbkdf2Sync(
    pin,
    saltBuffer,
    CONFIG.ITERATIONS,
    CONFIG.KEY_LENGTH,
    'sha256'
  );
  
  return hash.toString('base64');
}

const pin = "0719";
const salt = generateSalt();
const hash = hashPin(pin, salt);

console.log('PIN:', pin);
console.log('SALT:', salt);
console.log('HASH:', hash);
console.log('\nSQL Update:');
console.log(`UPDATE profiles SET pin_salt = '${salt}', pin_hash = '${hash}' WHERE email = 'YOUR_ADMIN_EMAIL';`);
