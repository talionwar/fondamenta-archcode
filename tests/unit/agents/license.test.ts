import { describe, it, expect } from 'vitest';
import { validateLicense, generateLicenseKey } from '../../../src/agents/license.js';

describe('License Agent', () => {
  it('should return free tier without key', () => {
    const result = validateLicense();

    expect(result.valid).toBe(false);
    expect(result.tier).toBe('free');
    expect(result.message).toContain('No license key');
  });

  it('should validate a generated key', () => {
    const key = generateLicenseKey();

    expect(key).toMatch(/^FA-PRO-/);

    const result = validateLicense(key);

    expect(result.valid).toBe(true);
    expect(result.tier).toBe('pro');
  });

  it('should reject invalid key format', () => {
    const result = validateLicense('INVALID-KEY');

    expect(result.valid).toBe(false);
    expect(result.tier).toBe('free');
    expect(result.message).toContain('Invalid license format');
  });

  it('should accept lifetime key', () => {
    const key = generateLicenseKey();

    const result = validateLicense(key);

    expect(result.valid).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.expiresAt).toBeUndefined();
  });

  it('should generate key with expiration date', () => {
    const futureDate = '2099-12-31';
    const key = generateLicenseKey(futureDate);

    const result = validateLicense(key);

    expect(result.valid).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.expiresAt).toBe(futureDate);
  });

  it('should reject expired key', () => {
    const pastDate = '2020-01-01';
    const key = generateLicenseKey(pastDate);

    const result = validateLicense(key);

    expect(result.valid).toBe(false);
    expect(result.message).toContain('expired');
  });

  it('should detect tampered keys', () => {
    const key = generateLicenseKey();
    const tampered = key.slice(0, -5) + 'XXXXX';

    const result = validateLicense(tampered);

    expect(result.valid).toBe(false);
    expect(result.message).toContain('Invalid license');
  });
});
