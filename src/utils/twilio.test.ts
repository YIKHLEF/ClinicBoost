import { describe, it, expect, vi } from 'vitest';
import { validatePhoneNumber } from './twilio';

describe('Twilio Utils', () => {
  describe('validatePhoneNumber', () => {
    it('should validate correct Moroccan phone numbers', () => {
      expect(validatePhoneNumber('+212661234567')).toBe(true);
      expect(validatePhoneNumber('0661234567')).toBe(true);
      expect(validatePhoneNumber('+212761234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(false);
      expect(validatePhoneNumber('12345')).toBe(false);
      expect(validatePhoneNumber('not a number')).toBe(false);
    });
  });
});