const crypto = require("crypto");

// AES-256-GCM, key derived from the user's master password via PBKDF2.
// The master password itself is never stored anywhere - only a salt and a
// "check value" (a known string encrypted with the derived key) so we can
// verify a future unlock attempt without ever persisting the password or key.

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const DIGEST = "sha256";
const CHECK_VALUE = "LIFEOS_VAULT_OK";

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function deriveKey(masterPassword, saltHex) {
  return crypto.pbkdf2Sync(masterPassword, Buffer.from(saltHex, "hex"), PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
}

// Encrypts a UTF-8 string, returning hex-encoded ciphertext/iv/authTag
function encrypt(plainText, key) {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

// Decrypts hex-encoded ciphertext/iv/authTag back to a UTF-8 string.
// Throws if the key is wrong or the data has been tampered with.
function decrypt(ciphertextHex, ivHex, authTagHex, key) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plain.toString("utf8");
}

function buildCheckValue(key) {
  return encrypt(CHECK_VALUE, key);
}

function verifyCheckValue(ciphertextHex, ivHex, authTagHex, key) {
  try {
    return decrypt(ciphertextHex, ivHex, authTagHex, key) === CHECK_VALUE;
  } catch {
    return false; // wrong key -> GCM auth tag check fails -> decrypt throws
  }
}

module.exports = { generateSalt, deriveKey, encrypt, decrypt, buildCheckValue, verifyCheckValue };
