import { createHmac } from 'node:crypto';
import type { LicenseInfo } from './types.js';

const LICENSE_PREFIX = 'FA-PRO-';
const HMAC_SECRET = 'fondamenta-archcode-v1';

/**
 * Validate a license key offline using HMAC.
 * Format: FA-PRO-<payload>-<signature>
 * Stub implementation — upgrade to Ed25519 before selling.
 */
export function validateLicense(key?: string): LicenseInfo {
  if (!key) {
    return { valid: false, tier: 'free', message: 'No license key provided' };
  }

  if (!key.startsWith(LICENSE_PREFIX)) {
    return { valid: false, tier: 'free', message: 'Invalid license format' };
  }

  const parts = key.slice(LICENSE_PREFIX.length).split('-');
  if (parts.length < 2) {
    return { valid: false, tier: 'free', message: 'Invalid license format' };
  }

  const signature = parts.pop()!;
  const payload = parts.join('-');

  // Verify HMAC
  const expected = createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16);

  if (signature !== expected) {
    return { valid: false, tier: 'free', message: 'Invalid license key' };
  }

  // Check expiration if payload contains date
  const dateMatch = payload.match(/^(\d{8})/);
  if (dateMatch) {
    const expStr = dateMatch[1];
    const expDate = new Date(
      `${expStr.slice(0, 4)}-${expStr.slice(4, 6)}-${expStr.slice(6, 8)}`,
    );
    if (expDate < new Date()) {
      return {
        valid: false,
        tier: 'free',
        expiresAt: expDate.toISOString().split('T')[0],
        message: 'License expired',
      };
    }
    return {
      valid: true,
      tier: 'pro',
      expiresAt: expDate.toISOString().split('T')[0],
    };
  }

  return { valid: true, tier: 'pro' };
}

/**
 * Generate a license key (for internal/testing use).
 */
export function generateLicenseKey(expirationDate?: string): string {
  const payload = expirationDate
    ? expirationDate.replace(/-/g, '')
    : 'LIFETIME';

  const signature = createHmac('sha256', HMAC_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16);

  return `${LICENSE_PREFIX}${payload}-${signature}`;
}
