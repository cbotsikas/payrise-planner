const CRYPTO_ITERATIONS = 310000;
const cryptoEncoder = new TextEncoder();
const cryptoDecoder = new TextDecoder();

function bytesToBase64(bytes) {
  let binary = "";
  new Uint8Array(bytes).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function encryptionKey(passphrase, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    cryptoEncoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: CRYPTO_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPayload(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    cryptoEncoder.encode(JSON.stringify(data)),
  );
  return {
    encrypted: true,
    cryptoVersion: 1,
    kdf: "PBKDF2-SHA-256",
    iterations: CRYPTO_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
}

async function decryptPayload(payload, passphrase) {
  if (!payload?.encrypted || payload.cryptoVersion !== 1)
    throw new Error("Unsupported encrypted data");
  const salt = base64ToBytes(payload.salt),
    iv = base64ToBytes(payload.iv);
  const key = await encryptionKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBytes(payload.ciphertext),
  );
  return JSON.parse(cryptoDecoder.decode(plaintext));
}
