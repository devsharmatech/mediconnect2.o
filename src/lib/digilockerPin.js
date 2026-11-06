import crypto from "crypto";
import sql from "./db.js";

/**
 * Validates that PIN is exactly 4 numeric digits.
 * @param {string|number} pin 
 * @returns {boolean}
 */
export function isValidPin(pin) {
  if (pin === undefined || pin === null) return false;
  return /^\d{4}$/.test(String(pin).trim());
}

/**
 * Hashes a 4-digit PIN using PBKDF2-SHA512 with a salt.
 * @param {string|number} pin 
 * @param {string} [salt] - Optional hex salt. If not provided, generates 16 bytes hex.
 * @returns {{ hash: string, salt: string }}
 */
export function hashPin(pin, salt) {
  const pinStr = String(pin).trim();
  const saltHex = salt || crypto.randomBytes(16).toString("hex");
  const hashHex = crypto.pbkdf2Sync(pinStr, saltHex, 10000, 64, "sha512").toString("hex");
  return {
    hash: hashHex,
    salt: saltHex,
  };
}

/**
 * Verifies a 4-digit PIN against stored hash and salt.
 * @param {string|number} pin 
 * @param {string} storedHash 
 * @param {string} storedSalt 
 * @returns {boolean}
 */
export function verifyPin(pin, storedHash, storedSalt) {
  if (!isValidPin(pin) || !storedHash || !storedSalt) return false;
  try {
    const computedHash = crypto.pbkdf2Sync(String(pin).trim(), storedSalt, 10000, 64, "sha512").toString("hex");
    const a = Buffer.from(computedHash, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    console.error("PIN verification error:", err);
    return false;
  }
}

/**
 * Masks a phone number for privacy display (e.g., "+91 ******4662" or "******4662").
 * @param {string} phone 
 * @returns {string}
 */
export function maskPhoneNumber(phone) {
  if (!phone) return "";
  const clean = String(phone).replace(/\D/g, "");
  if (clean.length >= 10) {
    const last4 = clean.slice(-4);
    return `+91 ******${last4}`;
  }
  return phone;
}

/**
 * Returns whether a number is a known test/dev account.
 * @param {string} phone 
 * @returns {boolean}
 */
export function isTestAccountPhone(phone) {
  if (!phone) return false;
  const clean = String(phone).replace(/\D/g, "").slice(-10);
  const testNumbers = [
    "9999999991", "9999999992", "9999999993",
    "9027924662", "7289043777", "8082253151",
    "8744412521", "9876543210", "0000000002"
  ];
  return testNumbers.includes(clean);
}

/**
 * Fetches user digilocker PIN record by user_id.
 * @param {string} userId 
 */
export async function getPinRecord(userId) {
  if (!userId) return null;
  const rows = await sql`
    SELECT *
    FROM user_digilocker_pins
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] || null;
}

/**
 * Ensures table existence in AWS RDS.
 */
export async function ensurePinTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_digilocker_pins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        pin_hash VARCHAR(255) NOT NULL,
        pin_salt VARCHAR(64) NOT NULL,
        failed_attempts INT DEFAULT 0,
        locked_until TIMESTAMPTZ,
        reset_token VARCHAR(255),
        reset_token_expires_at TIMESTAMPTZ,
        last_verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_digilocker_pins_user_id ON user_digilocker_pins(user_id);
    `;
  } catch (err) {
    console.warn("ensurePinTable error (may already exist):", err.message);
  }
}
