/**
 * Teacher Hub - Google Login & 4-Digit Security PIN Manager
 * Pure functions and local persistence helpers for Google account sign-in
 * and 4-digit quick security PIN setup, salted hashing, verification, and lockout protection.
 */

import { UserProfile } from '../types.js';

export const PIN_STORAGE_KEY = 'btd-user-pin-record';
export const PIN_LOCKOUT_STORAGE_KEY = 'btd-user-pin-lockout';
export const GOOGLE_AUTH_PROFILE_STORAGE_KEY = 'btd-google-auth-profile';
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

export type AuthProviderType = 'google' | 'email' | 'pin';

export interface UserPinRecord {
  email: string;
  name: string;
  pinHash: string;
  pinHint: string; // e.g. "••34" (last digit or masked indicator)
  authProvider: AuthProviderType;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
}

export interface PinLockoutState {
  failedAttempts: number;
  lockedUntilMs: number | null;
  lastFailedAt?: string;
}

export interface PinValidationResult {
  isValid: boolean;
  errorHi?: string;
  errorEn?: string;
}

export interface PinVerificationResult {
  verified: boolean;
  profile?: UserProfile;
  authProvider?: AuthProviderType;
  remainingAttempts: number;
  lockedOut: boolean;
  lockedUntilMs?: number | null;
  errorHi?: string;
  errorEn?: string;
}

export interface GoogleAccountProfile {
  uid: string;
  name: string;
  email: string;
  avatarText: string;
  schoolRoleHi: string;
  udiseHint?: string;
  provider: 'google';
  connectedAt: string;
}

export const CURATED_GOOGLE_TEACHER_ACCOUNTS: readonly Omit<
  GoogleAccountProfile,
  'connectedAt'
>[] = [
  {
    uid: 'google-prt-rajesh-01',
    name: 'श्री राजेश कुमार शर्मा',
    email: 'rajesh.sharma.prt@gmail.com',
    avatarText: 'रा',
    schoolRoleHi: 'सहायक अध्यापक (प्राथमिक विद्यालय आदर्श नगर)',
    udiseHint: '09150401201',
    provider: 'google',
  },
  {
    uid: 'google-hm-sunita-02',
    name: 'श्रीमती सुनीता वर्मा',
    email: 'sunita.verma.hm@gmail.com',
    avatarText: 'सु',
    schoolRoleHi: 'प्रधानाध्यापिका (उच्च प्राथमिक विद्यालय कंपोजिट)',
    udiseHint: '09150401202',
    provider: 'google',
  },
  {
    uid: 'google-arp-amit-03',
    name: 'श्री अमित कुमार सिंह',
    email: 'amit.singh.basicshiksha@gmail.com',
    avatarText: 'अ',
    schoolRoleHi: 'संकुल नोडल शिक्षक (CRC / NIPUN Mentor)',
    udiseHint: '09150401209',
    provider: 'google',
  },
] as const;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Checks if a string is strictly a 4-digit numeric PIN (0000 - 9999).
 */
export function isValidFourDigitPin(pin: string): boolean {
  if (typeof pin !== 'string') return false;
  return /^\d{4}$/.test(pin.trim());
}

/**
 * Validates a 4-digit PIN and its confirmation string during setup/change.
 */
export function validatePinSetup(pin: string, confirmPin: string): PinValidationResult {
  const cleanPin = (pin || '').trim();
  const cleanConfirm = (confirmPin || '').trim();

  if (!cleanPin) {
    return {
      isValid: false,
      errorHi: 'कृपया 4 अंकों का पिन दर्ज करें',
      errorEn: 'Please enter a 4-digit PIN',
    };
  }

  if (!isValidFourDigitPin(cleanPin)) {
    return {
      isValid: false,
      errorHi: 'पिन में केवल 4 संख्यात्मक अंक (0-9) होने चाहिए',
      errorEn: 'PIN must be exactly 4 numeric digits (0-9)',
    };
  }

  if (!cleanConfirm) {
    return {
      isValid: false,
      errorHi: 'कृपया पिन की पुष्टि (Confirm PIN) करें',
      errorEn: 'Please confirm your 4-digit PIN',
    };
  }

  if (cleanPin !== cleanConfirm) {
    return {
      isValid: false,
      errorHi: 'दोनों 4-अंकीय पिन एक समान नहीं हैं',
      errorEn: 'Both 4-digit PINs do not match',
    };
  }

  return { isValid: true };
}

/**
 * Deterministic salted hash for 4-digit PINs using dual-pass FNV-1a 32-bit rounds.
 * Ensures plaintext PINs are never persisted in localStorage.
 */
export function computeSaltedPinHash(pin: string, email: string): string {
  const normalizedEmail = (email || 'default@teacherhub.in').trim().toLowerCase();
  const payload = `btd_pin_v1::${normalizedEmail}::${pin.trim()}::sarkari_mitra_salt`;

  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i & 0xff);
    h2 = Math.imul(h2, 0x811c9dc5);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `pinhash_${hex1}${hex2}`;
}

/**
 * Pure factory to construct a UserPinRecord.
 */
export function createPinRecord(params: {
  pin: string;
  email: string;
  name: string;
  authProvider?: AuthProviderType;
  nowIso?: string;
}): UserPinRecord {
  const cleanPin = params.pin.trim();
  if (!isValidFourDigitPin(cleanPin)) {
    throw new Error('Invalid 4-digit PIN format');
  }

  const email = (params.email || 'teacher@gmail.com').trim().toLowerCase();
  const name = (params.name || email.split('@')[0] || 'शिक्षक जी').trim();
  const nowIso = params.nowIso || new Date().toISOString();

  return {
    email,
    name,
    pinHash: computeSaltedPinHash(cleanPin, email),
    pinHint: `•••${cleanPin.slice(3)}`,
    authProvider: params.authProvider || 'google',
    createdAt: nowIso,
    updatedAt: nowIso,
    lastVerifiedAt: nowIso,
  };
}

/**
 * Saves the 4-digit PIN record to storage and clears any previous lockout state.
 */
export function saveUserPinRecord(
  params: {
    pin: string;
    email: string;
    name: string;
    authProvider?: AuthProviderType;
    nowIso?: string;
  },
  storage: StorageLike | null = getDefaultStorage()
): UserPinRecord {
  const record = createPinRecord(params);
  if (storage) {
    try {
      storage.setItem(PIN_STORAGE_KEY, JSON.stringify(record));
      storage.removeItem(PIN_LOCKOUT_STORAGE_KEY);
    } catch {
      // ignore storage quota errors
    }
  }
  return record;
}

/**
 * Retrieves the currently stored 4-digit PIN record, or null if none is set.
 */
export function getStoredPinRecord(
  storage: StorageLike | null = getDefaultStorage()
): UserPinRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserPinRecord;
    if (!parsed || typeof parsed.pinHash !== 'string' || typeof parsed.email !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Returns true if a valid 4-digit PIN record is configured in storage.
 */
export function hasConfiguredPin(
  storage: StorageLike | null = getDefaultStorage()
): boolean {
  return getStoredPinRecord(storage) !== null;
}

/**
 * Removes the stored 4-digit PIN record and lockout state.
 */
export function clearUserPinRecord(
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.removeItem(PIN_STORAGE_KEY);
    storage.removeItem(PIN_LOCKOUT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Reads current brute-force lockout state.
 */
export function getPinLockoutState(
  storage: StorageLike | null = getDefaultStorage()
): PinLockoutState {
  if (!storage) return { failedAttempts: 0, lockedUntilMs: null };
  try {
    const raw = storage.getItem(PIN_LOCKOUT_STORAGE_KEY);
    if (!raw) return { failedAttempts: 0, lockedUntilMs: null };
    const parsed = JSON.parse(raw) as PinLockoutState;
    return {
      failedAttempts: Number(parsed.failedAttempts) || 0,
      lockedUntilMs: parsed.lockedUntilMs ? Number(parsed.lockedUntilMs) : null,
      lastFailedAt: parsed.lastFailedAt,
    };
  } catch {
    return { failedAttempts: 0, lockedUntilMs: null };
  }
}

/**
 * Verifies a 4-digit PIN input against the stored PIN record with lockout protection.
 */
export function verifyFourDigitPin(
  inputPin: string,
  options?: {
    storage?: StorageLike | null;
    nowMs?: number;
  }
): PinVerificationResult {
  const storage = options?.storage !== undefined ? options.storage : getDefaultStorage();
  const nowMs = options?.nowMs ?? Date.now();

  const record = getStoredPinRecord(storage);
  if (!record) {
    return {
      verified: false,
      remainingAttempts: MAX_PIN_ATTEMPTS,
      lockedOut: false,
      errorHi: 'कोई 4-अंकीय पिन सेट नहीं है। कृपया पहले पिन सेट करें या Google से लॉगिन करें।',
      errorEn: 'No 4-digit PIN is configured. Please set a PIN first or sign in with Google.',
    };
  }

  const lockout = getPinLockoutState(storage);
  if (lockout.lockedUntilMs && lockout.lockedUntilMs > nowMs) {
    const waitSec = Math.ceil((lockout.lockedUntilMs - nowMs) / 1000);
    return {
      verified: false,
      remainingAttempts: 0,
      lockedOut: true,
      lockedUntilMs: lockout.lockedUntilMs,
      errorHi: `सुरक्षा लॉक: 5 गलत प्रयासों के कारण पिन ${waitSec} सेकंड के लिए लॉक है। आप Google लॉगिन से रीसेट कर सकते हैं।`,
      errorEn: `Security lock: PIN is locked for ${waitSec}s after 5 failed attempts.`,
    };
  }

  // If previous lockout expired, reset counter
  const baseFailedAttempts =
    lockout.lockedUntilMs && lockout.lockedUntilMs <= nowMs ? 0 : lockout.failedAttempts;

  const cleanPin = (inputPin || '').trim();
  if (!isValidFourDigitPin(cleanPin)) {
    return {
      verified: false,
      remainingAttempts: MAX_PIN_ATTEMPTS - baseFailedAttempts,
      lockedOut: false,
      errorHi: 'कृपया पूरे 4 अंक (0-9) दर्ज करें',
      errorEn: 'Please enter all 4 digits (0-9)',
    };
  }

  const candidateHash = computeSaltedPinHash(cleanPin, record.email);
  if (candidateHash === record.pinHash) {
    const nowIso = new Date(nowMs).toISOString();
    const updatedRecord: UserPinRecord = {
      ...record,
      lastVerifiedAt: nowIso,
    };
    if (storage) {
      try {
        storage.setItem(PIN_STORAGE_KEY, JSON.stringify(updatedRecord));
        storage.removeItem(PIN_LOCKOUT_STORAGE_KEY);
      } catch {
        // ignore
      }
    }

    return {
      verified: true,
      profile: {
        name: record.name,
        email: record.email,
      },
      authProvider: record.authProvider,
      remainingAttempts: MAX_PIN_ATTEMPTS,
      lockedOut: false,
    };
  }

  // Failed attempt
  const nextFailed = baseFailedAttempts + 1;
  const isNowLocked = nextFailed >= MAX_PIN_ATTEMPTS;
  const lockedUntilMs = isNowLocked ? nowMs + PIN_LOCKOUT_DURATION_MS : null;
  const remainingAttempts = Math.max(0, MAX_PIN_ATTEMPTS - nextFailed);

  if (storage) {
    try {
      const nextLockout: PinLockoutState = {
        failedAttempts: nextFailed,
        lockedUntilMs,
        lastFailedAt: new Date(nowMs).toISOString(),
      };
      storage.setItem(PIN_LOCKOUT_STORAGE_KEY, JSON.stringify(nextLockout));
    } catch {
      // ignore
    }
  }

  if (isNowLocked) {
    return {
      verified: false,
      remainingAttempts: 0,
      lockedOut: true,
      lockedUntilMs,
      errorHi:
        '❌ 5 गलत प्रयास! सुरक्षा कारणों से पिन 2 मिनट के लिए लॉक कर दिया गया है। (Google से लॉगिन कर पिन रीसेट करें)',
      errorEn: '5 failed attempts! PIN locked for 2 minutes.',
    };
  }

  return {
    verified: false,
    remainingAttempts,
    lockedOut: false,
    errorHi: `❌ गलत 4-अंकीय पिन! (${remainingAttempts} प्रयास शेष)`,
    errorEn: `Incorrect 4-digit PIN! (${remainingAttempts} attempts remaining)`,
  };
}

/**
 * Persists connected Google Account metadata locally so UI can display verified Google badge.
 */
export function saveGoogleAuthProfile(
  profile: Omit<GoogleAccountProfile, 'connectedAt'> & { connectedAt?: string },
  storage: StorageLike | null = getDefaultStorage()
): GoogleAccountProfile {
  const full: GoogleAccountProfile = {
    ...profile,
    connectedAt: profile.connectedAt || new Date().toISOString(),
  };
  if (storage) {
    try {
      storage.setItem(GOOGLE_AUTH_PROFILE_STORAGE_KEY, JSON.stringify(full));
    } catch {
      // ignore
    }
  }
  return full;
}

export function getStoredGoogleAuthProfile(
  storage: StorageLike | null = getDefaultStorage()
): GoogleAccountProfile | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(GOOGLE_AUTH_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleAccountProfile;
    if (!parsed || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearStoredGoogleAuthProfile(
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.removeItem(GOOGLE_AUTH_PROFILE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
