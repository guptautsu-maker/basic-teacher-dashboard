import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidFourDigitPin,
  validatePinSetup,
  computeSaltedPinHash,
  createPinRecord,
  saveUserPinRecord,
  getStoredPinRecord,
  hasConfiguredPin,
  clearUserPinRecord,
  verifyFourDigitPin,
  saveGoogleAuthProfile,
  getStoredGoogleAuthProfile,
  clearStoredGoogleAuthProfile,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_DURATION_MS,
  CURATED_GOOGLE_TEACHER_ACCOUNTS,
} from './pinAndGoogleAuthManager.js';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
    removeItem(key: string): void {
      store.delete(key);
    },
  };
}

describe('Google Login & 4-Digit PIN Setup / Verification Manager', () => {
  describe('1. 4-Digit PIN Validation', () => {
    it('accepts strictly 4 numeric digits and rejects invalid formats', () => {
      assert.equal(isValidFourDigitPin('1234'), true);
      assert.equal(isValidFourDigitPin('0007'), true);
      assert.equal(isValidFourDigitPin(' 9876 '), true);

      assert.equal(isValidFourDigitPin('123'), false);
      assert.equal(isValidFourDigitPin('12345'), false);
      assert.equal(isValidFourDigitPin('12a4'), false);
      assert.equal(isValidFourDigitPin(''), false);
    });

    it('validatePinSetup checks format and confirmation equality', () => {
      assert.equal(validatePinSetup('2580', '2580').isValid, true);

      const emptyRes = validatePinSetup('', '');
      assert.equal(emptyRes.isValid, false);
      assert.ok(emptyRes.errorHi);

      const nonFourRes = validatePinSetup('123', '123');
      assert.equal(nonFourRes.isValid, false);

      const mismatchRes = validatePinSetup('1234', '1235');
      assert.equal(mismatchRes.isValid, false);
      assert.ok(mismatchRes.errorHi?.includes('समान नहीं'));
    });
  });

  describe('2. Salted Hashing & Record Creation', () => {
    it('produces deterministic salted hashes that never contain the plaintext PIN', () => {
      const h1 = computeSaltedPinHash('4321', 'rajesh@gmail.com');
      const h2 = computeSaltedPinHash('4321', 'RAJESH@GMAIL.COM');
      const h3 = computeSaltedPinHash('4321', 'sunita@gmail.com');
      const h4 = computeSaltedPinHash('1234', 'rajesh@gmail.com');

      assert.equal(h1, h2, 'Email normalization should produce identical hashes');
      assert.notEqual(h1, h3, 'Different user emails must salt differently');
      assert.notEqual(h1, h4, 'Different PINs must produce different hashes');
      assert.equal(h1.startsWith('pinhash_'), true);
      assert.equal(h1.includes('4321'), false);
    });

    it('creates a masked pinHint and stores record in storage', () => {
      const storage = createMemoryStorage();
      const record = saveUserPinRecord(
        {
          pin: '7894',
          email: 'rajesh.sharma.prt@gmail.com',
          name: 'श्री राजेश कुमार शर्मा',
          authProvider: 'google',
          nowIso: '2026-10-31T10:00:00.000Z',
        },
        storage
      );

      assert.equal(record.pinHint, '•••4');
      assert.equal(record.authProvider, 'google');
      assert.equal(hasConfiguredPin(storage), true);

      const loaded = getStoredPinRecord(storage);
      assert.ok(loaded);
      assert.equal(loaded.email, 'rajesh.sharma.prt@gmail.com');
      assert.equal(loaded.name, 'श्री राजेश कुमार शर्मा');

      clearUserPinRecord(storage);
      assert.equal(hasConfiguredPin(storage), false);
    });
  });

  describe('3. PIN Verification & Brute-Force Lockout Protection', () => {
    it('verifies correct 4-digit PIN and returns user profile', () => {
      const storage = createMemoryStorage();
      saveUserPinRecord(
        {
          pin: '5678',
          email: 'sunita.verma.hm@gmail.com',
          name: 'श्रीमती सुनीता वर्मा',
          authProvider: 'google',
        },
        storage
      );

      const okRes = verifyFourDigitPin('5678', { storage, nowMs: 1000 });
      assert.equal(okRes.verified, true);
      assert.equal(okRes.lockedOut, false);
      assert.equal(okRes.profile?.email, 'sunita.verma.hm@gmail.com');
      assert.equal(okRes.profile?.name, 'श्रीमती सुनीता वर्मा');
      assert.equal(okRes.remainingAttempts, MAX_PIN_ATTEMPTS);
    });

    it('tracks failed attempts, locks out after 5 failures, and unlocks after cooldown', () => {
      const storage = createMemoryStorage();
      saveUserPinRecord(
        {
          pin: '1947',
          email: 'teacher@gmail.com',
          name: 'शिक्षक जी',
        },
        storage
      );

      const baseNow = 1_700_000_000_000;

      // Attempts 1 to 4 fail without lockout
      for (let attempt = 1; attempt <= 4; attempt++) {
        const res = verifyFourDigitPin('0000', { storage, nowMs: baseNow + attempt * 1000 });
        assert.equal(res.verified, false);
        assert.equal(res.lockedOut, false);
        assert.equal(res.remainingAttempts, MAX_PIN_ATTEMPTS - attempt);
      }

      // Attempt 5 triggers lockout
      const res5 = verifyFourDigitPin('0000', { storage, nowMs: baseNow + 5000 });
      assert.equal(res5.verified, false);
      assert.equal(res5.lockedOut, true);
      assert.equal(res5.remainingAttempts, 0);

      // Even correct PIN is rejected while locked out
      const duringLock = verifyFourDigitPin('1947', { storage, nowMs: baseNow + 10_000 });
      assert.equal(duringLock.verified, false);
      assert.equal(duringLock.lockedOut, true);

      // After cooldown (2 minutes + 1s), correct PIN succeeds
      const afterCooldown = verifyFourDigitPin('1947', {
        storage,
        nowMs: baseNow + 5000 + PIN_LOCKOUT_DURATION_MS + 1000,
      });
      assert.equal(afterCooldown.verified, true);
      assert.equal(afterCooldown.lockedOut, false);
    });
  });

  describe('4. Google Auth Profile Persistence', () => {
    it('saves and retrieves Google account profile and provides curated teacher accounts', () => {
      assert.ok(CURATED_GOOGLE_TEACHER_ACCOUNTS.length >= 3);
      const storage = createMemoryStorage();
      const firstAccount = CURATED_GOOGLE_TEACHER_ACCOUNTS[0];

      const saved = saveGoogleAuthProfile(firstAccount, storage);
      assert.equal(saved.email, firstAccount.email);
      assert.equal(saved.provider, 'google');

      const retrieved = getStoredGoogleAuthProfile(storage);
      assert.ok(retrieved);
      assert.equal(retrieved.name, firstAccount.name);

      clearStoredGoogleAuthProfile(storage);
      assert.equal(getStoredGoogleAuthProfile(storage), null);
    });
  });
});
