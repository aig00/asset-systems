/**
 * Security utilities for PIN handling
 * Uses PBKDF2 for secure PIN hashing
 */

// Configuration for PIN security
const CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  SALT_LENGTH: 16,
  ITERATIONS: 100000,
  KEY_LENGTH: 32,
};

/**
 * Generate a random salt for hashing
 * @returns {string} Base64 encoded salt
 */
const generateSalt = () => {
  const salt = new Uint8Array(CONFIG.SALT_LENGTH);
  crypto.getRandomValues(salt);
  return btoa(String.fromCharCode(...salt));
};

/**
 * Hash a PIN using PBKDF2
 * @param {string} pin - The PIN to hash
 * @param {string} salt - Base64 encoded salt
 * @returns {Promise<string>} Base64 encoded hash
 */
const hashPin = async (pin, salt) => {
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);
  const saltBuffer = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "raw",
    pinBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: CONFIG.ITERATIONS,
      hash: "SHA-256",
    },
    key,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign", "verify"]
  );

  const exportedKey = await crypto.subtle.exportKey("raw", derivedKey);
  return btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
};

/**
 * Verify a PIN against a stored hash
 * @param {string} enteredPin - The PIN to verify
 * @param {string} storedHash - The stored hash
 * @param {string} storedSalt - The stored salt
 * @returns {Promise<boolean>} True if PIN matches
 */
const verifyPin = async (enteredPin, storedHash, storedSalt) => {
  try {
    const hash = await hashPin(enteredPin, storedSalt);
    return hash === storedHash;
  } catch (error) {
    console.error("PIN verification error:", error);
    return false;
  }
};

/**
 * Get rate limit info from localStorage
 * @param {string} userId - User ID
 * @returns {Object} Rate limit info
 */
const getRateLimitInfo = (userId) => {
  const key = `pin_attempts_${userId}`;
  const data = localStorage.getItem(key);
  
  if (!data) {
    return {
      attempts: 0,
      lockedUntil: null,
      lastAttempt: null,
    };
  }
  
  try {
    const parsed = JSON.parse(data);
    // Check if lockout has expired
    if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
      localStorage.removeItem(key);
      return {
        attempts: 0,
        lockedUntil: null,
        lastAttempt: null,
      };
    }
    return parsed;
  } catch {
    return {
      attempts: 0,
      lockedUntil: null,
      lastAttempt: null,
    };
  }
};

/**
 * Record a failed PIN attempt
 * @param {string} userId - User ID
 * @returns {Object} Updated rate limit info
 */
const recordFailedAttempt = (userId) => {
  const key = `pin_attempts_${userId}`;
  const info = getRateLimitInfo(userId);
  
  const newAttempts = info.attempts + 1;
  let lockedUntil = info.lockedUntil;
  
  // Lock account if max attempts reached
  if (newAttempts >= CONFIG.MAX_ATTEMPTS) {
    lockedUntil = Date.now() + CONFIG.LOCKOUT_DURATION;
  }
  
  const newInfo = {
    attempts: newAttempts,
    lockedUntil,
    lastAttempt: Date.now(),
  };
  
  localStorage.setItem(key, JSON.stringify(newInfo));
  return newInfo;
};

/**
 * Record a successful PIN verification
 * @param {string} userId - User ID
 */
const recordSuccess = (userId) => {
  const key = `pin_attempts_${userId}`;
  localStorage.removeItem(key);
};

/**
 * Check if account is locked
 * @param {string} userId - User ID
 * @returns {Object} Lock status with remaining time if locked
 */
const checkLockStatus = (userId) => {
  const info = getRateLimitInfo(userId);
  
  if (info.lockedUntil && Date.now() < info.lockedUntil) {
    const remainingSeconds = Math.ceil((info.lockedUntil - Date.now()) / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    
    return {
      isLocked: true,
      remainingTime: `${minutes}:${seconds.toString().padStart(2, "0")}`,
      attemptsRemaining: 0,
    };
  }
  
  const attemptsRemaining = CONFIG.MAX_ATTEMPTS - info.attempts;
  return {
    isLocked: false,
    remainingTime: null,
    attemptsRemaining: Math.max(0, attemptsRemaining),
  };
};

/**
 * Get remaining attempts
 * @param {string} userId - User ID
 * @returns {number} Number of remaining attempts
 */
const getRemainingAttempts = (userId) => {
  const info = getRateLimitInfo(userId);
  return Math.max(0, CONFIG.MAX_ATTEMPTS - info.attempts);
};

/**
 * Format lockout time for display
 * @param {string} userId - User ID
 * @returns {string} Formatted lockout message
 */
const getLockoutMessage = (userId) => {
  const info = getRateLimitInfo(userId);
  if (!info.lockedUntil) return null;
  
  const remainingMs = info.lockedUntil - Date.now();
  if (remainingMs <= 0) return null;
  
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  
  if (minutes > 0) {
    return `Account locked. Try again in ${minutes} minute(s)`;
  }
  return `Account locked. Try again in ${seconds} seconds`;
};

export {
  CONFIG,
  generateSalt,
  hashPin,
  verifyPin,
  getRateLimitInfo,
  recordFailedAttempt,
  recordSuccess,
  checkLockStatus,
  getRemainingAttempts,
  getLockoutMessage,
};
