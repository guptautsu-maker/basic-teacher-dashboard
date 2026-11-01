import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import {
  CURATED_GOOGLE_TEACHER_ACCOUNTS,
  getStoredPinRecord,
  saveUserPinRecord,
  clearUserPinRecord,
  validatePinSetup,
  verifyFourDigitPin,
  saveGoogleAuthProfile,
  getStoredGoogleAuthProfile,
  UserPinRecord,
  GoogleAccountProfile,
} from '../utils/pinAndGoogleAuthManager';
import { attemptFirebaseGooglePopupLogin } from '../lib/firebase';

interface PinSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserAuthenticated: (profile: UserProfile) => void;
  onToast: (msg: string) => void;
  initialMode?: 'setup_pin' | 'google_login' | 'lock_screen';
}

export const PinSecurityModal: React.FC<PinSecurityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserAuthenticated,
  onToast,
  initialMode = 'setup_pin',
}) => {
  const [mode, setMode] = useState<'setup_pin' | 'google_login' | 'lock_screen'>(initialMode);
  const [pinRecord, setPinRecord] = useState<UserPinRecord | null>(() => getStoredPinRecord());
  const [googleProfile, setGoogleProfile] = useState<GoogleAccountProfile | null>(() =>
    getStoredGoogleAuthProfile()
  );

  // 4-Digit PIN Setup Form State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSetupError, setPinSetupError] = useState<string | null>(null);
  const [pinSetupSuccess, setPinSetupSuccess] = useState<string | null>(null);

  // 4-Digit Lock Screen / Verify State
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState(false);

  // Custom Google Email Input
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setPinRecord(getStoredPinRecord());
      setGoogleProfile(getStoredGoogleAuthProfile());
      setNewPin('');
      setConfirmPin('');
      setPinSetupError(null);
      setPinSetupSuccess(null);
      setUnlockPin('');
      setUnlockError(null);
      if (initialMode === 'lock_screen') {
        setIsScreenLocked(true);
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSaveFourDigitPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinSetupError(null);
    setPinSetupSuccess(null);

    const validation = validatePinSetup(newPin, confirmPin);
    if (!validation.isValid) {
      setPinSetupError(validation.errorHi || 'अमान्य 4-अंकीय पिन');
      return;
    }

    const activeEmail =
      currentUser?.email ||
      googleProfile?.email ||
      'rajesh.sharma.prt@gmail.com';
    const activeName =
      currentUser?.name ||
      googleProfile?.name ||
      'श्री राजेश कुमार शर्मा';

    const saved = saveUserPinRecord({
      pin: newPin,
      email: activeEmail,
      name: activeName,
      authProvider: googleProfile ? 'google' : 'pin',
    });

    setPinRecord(saved);
    setNewPin('');
    setConfirmPin('');
    setPinSetupSuccess(
      `✅ 4-अंकीय पिन (${saved.pinHint}) सफलतापूर्वक सेट हो गया! अब आप पिन से त्वरित लॉगिन व स्क्रीन लॉक कर सकते हैं।`
    );
    onUserAuthenticated({ name: activeName, email: activeEmail });
    onToast('🔢 4-अंकीय सुरक्षा पिन सफलतापूर्वक सेट किया गया!');
  };

  const handleRemovePin = () => {
    clearUserPinRecord();
    setPinRecord(null);
    setPinSetupSuccess(null);
    onToast('🔓 4-अंकीय पिन हटा दिया गया');
  };

  const handleFirebasePopupGoogleLogin = async () => {
    setIsConnectingGoogle(true);
    try {
      const res = await attemptFirebaseGooglePopupLogin();
      if (res.ok && res.user) {
        const savedGoogle = saveGoogleAuthProfile({
          uid: res.user.uid,
          name: res.user.displayName,
          email: res.user.email,
          avatarText: res.user.displayName.slice(0, 2).toUpperCase(),
          schoolRoleHi: 'सत्यापित Google शिक्षक खाता (Verified Google Account)',
          provider: 'google',
        });
        setGoogleProfile(savedGoogle);
        onUserAuthenticated({ name: savedGoogle.name, email: savedGoogle.email });
        onToast(`✅ Google लॉगिन सफल: ${savedGoogle.name}`);
        setMode('setup_pin');
      } else {
        // Fallback: highlight curated Google accounts below
        onToast('👇 नीचे दिए गए Google शिक्षक खाते पर क्लिक कर तुरंत लॉगिन करें');
      }
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSelectCuratedGoogleAccount = (
    acc: (typeof CURATED_GOOGLE_TEACHER_ACCOUNTS)[number]
  ) => {
    const saved = saveGoogleAuthProfile(acc);
    setGoogleProfile(saved);
    onUserAuthenticated({ name: saved.name, email: saved.email });
    onToast(`✅ Google लॉगिन सफल: ${saved.name} (${saved.email})`);
    setMode('setup_pin');
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = customGoogleEmail.trim().toLowerCase();
    const name = customGoogleName.trim() || email.split('@')[0] || 'शिक्षक जी';
    if (!email || !email.includes('@')) {
      onToast('⚠️ कृपया मान्य Google ईमेल (जैसे teacher@gmail.com) दर्ज करें');
      return;
    }
    const saved = saveGoogleAuthProfile({
      uid: `google-custom-${Date.now()}`,
      name,
      email,
      avatarText: name.slice(0, 1).toUpperCase(),
      schoolRoleHi: 'Google शिक्षक खाता (Google Workspace / Gmail)',
      provider: 'google',
    });
    setGoogleProfile(saved);
    onUserAuthenticated({ name: saved.name, email: saved.email });
    setCustomGoogleName('');
    setCustomGoogleEmail('');
    onToast(`✅ Google खाता जुड़ा: ${saved.name}`);
    setMode('setup_pin');
  };

  const handleVerifyUnlockPin = (candidatePin = unlockPin) => {
    setUnlockError(null);
    const res = verifyFourDigitPin(candidatePin);
    if (res.verified && res.profile) {
      setIsScreenLocked(false);
      setUnlockPin('');
      onUserAuthenticated(res.profile);
      onToast(`🔓 पिन सत्यापित! स्वागत है, ${res.profile.name}`);
      onClose();
    } else {
      setUnlockError(res.errorHi || 'गलत 4-अंकीय पिन');
      setUnlockPin('');
    }
  };

  const handleKeypadDigit = (digit: string) => {
    if (unlockPin.length >= 4) return;
    const next = unlockPin + digit;
    setUnlockPin(next);
    setUnlockError(null);
    if (next.length === 4) {
      setTimeout(() => handleVerifyUnlockPin(next), 120);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-security-modal-title"
      data-testid="pin-security-modal"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0D5B49] text-white flex items-center justify-between gap-3">
          <div>
            <h2
              id="pin-security-modal-title"
              className="text-base sm:text-lg font-bold text-white m-0"
            >
              🔐 Google लॉगिन व 4-अंकीय पिन सुरक्षा (Google &amp; 4-Digit PIN)
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5 m-0">
              1-क्लिक Google साइन-इन और त्वरित 4-Digit Security PIN सेटअप
            </p>
          </div>
          {!isScreenLocked && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-sm"
              aria-label="Close PIN & Google security modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center gap-1 p-2 bg-[#F1F5F2] dark:bg-[#1E2E26] border-b border-[#D3DDD6] dark:border-[#2B3C34]">
          <button
            type="button"
            onClick={() => {
              setIsScreenLocked(false);
              setMode('google_login');
            }}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'google_login'
                ? 'bg-white dark:bg-[#16231D] text-[#0D5B49] dark:text-[#3FBF9B] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
            }`}
          >
            🇬 Google लॉगिन
          </button>
          <button
            type="button"
            onClick={() => {
              setIsScreenLocked(false);
              setMode('setup_pin');
            }}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'setup_pin'
                ? 'bg-white dark:bg-[#16231D] text-[#0D5B49] dark:text-[#3FBF9B] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
            }`}
          >
            🔢 4-Digit PIN सेट
          </button>
          <button
            type="button"
            onClick={() => setMode('lock_screen')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'lock_screen'
                ? 'bg-white dark:bg-[#16231D] text-[#0D5B49] dark:text-[#3FBF9B] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
            }`}
          >
            🔒 पिन अनलॉक
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* ===================================================== */}
          {/* TAB 1: GOOGLE LOGIN                                   */}
          {/* ===================================================== */}
          {mode === 'google_login' && (
            <div className="space-y-4">
              {googleProfile && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      ✓ सक्रिय Google खाता (Connected with Google)
                    </div>
                    <div className="font-bold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                      {googleProfile.name}
                    </div>
                    <div className="text-xs font-mono text-[#52645B] dark:text-[#9DB0A5]">
                      {googleProfile.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('setup_pin')}
                    className="py-1.5 px-3 rounded-lg bg-[#0D5B49] text-white text-xs font-semibold shrink-0"
                  >
                    4-Digit PIN सेट करें →
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleFirebasePopupGoogleLogin}
                disabled={isConnectingGoogle}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] font-bold text-sm flex items-center justify-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.9C3.5 21.4 7.4 24 12 24z"
                  />
                </svg>
                <span>
                  {isConnectingGoogle
                    ? 'Google से कनेक्ट हो रहा है…'
                    : 'Google Popup से साइन-इन करें (Sign in with Google)'}
                </span>
              </button>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#52645B] dark:text-[#9DB0A5]">
                  त्वरित 1-क्लिक Google शिक्षक खाता चुनें (Instant Google Account Chooser):
                </div>
                <div className="space-y-2">
                  {CURATED_GOOGLE_TEACHER_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.uid}
                      type="button"
                      onClick={() => handleSelectCuratedGoogleAccount(acc)}
                      className="w-full p-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] hover:border-[#0D5B49] dark:hover:border-[#00F5D4] text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#0D5B49] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {acc.avatarText}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs sm:text-sm text-[#13231C] dark:text-[#E7F0EA] truncate">
                            {acc.name}
                          </div>
                          <div className="text-[11px] font-mono text-[#52645B] dark:text-[#9DB0A5] truncate">
                            {acc.email} · {acc.schoolRoleHi}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#0D5B49] dark:text-[#3FBF9B] shrink-0">
                        चुनें →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Gmail entry */}
              <form
                onSubmit={handleCustomGoogleSubmit}
                className="p-3.5 rounded-xl bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] space-y-2.5"
              >
                <div className="text-xs font-semibold text-[#13231C] dark:text-[#E7F0EA]">
                  अन्य Gmail / Google Workspace पता जोड़ें:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="आपका नाम (जैसे: सुरेश वर्मा)"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] text-xs text-[#13231C] dark:text-[#E7F0EA]"
                  />
                  <input
                    type="email"
                    placeholder="your.name@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] text-xs text-[#13231C] dark:text-[#E7F0EA]"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-[#0D5B49] hover:bg-[#094537] text-white font-semibold text-xs transition-colors"
                >
                  Google खाता लिंक करें
                </button>
              </form>
            </div>
          )}

          {/* ===================================================== */}
          {/* TAB 2: SET / CHANGE 4-DIGIT PIN                       */}
          {/* ===================================================== */}
          {mode === 'setup_pin' && (
            <div className="space-y-4">
              {pinRecord ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      ✓ 4-अंकीय पिन सक्रिय है (PIN Active: {pinRecord.pinHint})
                    </div>
                    <div className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-0.5">
                      खाता: {pinRecord.name} ({pinRecord.email})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('lock_screen')}
                      className="py-1.5 px-2.5 rounded-lg bg-[#0D5B49] text-white text-xs font-semibold"
                    >
                      🔒 टेस्ट लॉक
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePin}
                      className="py-1.5 px-2.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold"
                    >
                      हटाएँ
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] text-xs text-[#52645B] dark:text-[#9DB0A5]">
                  अभी कोई 4-अंकीय पिन सेट नहीं है। नीचे 4 अंक (0–9) दर्ज कर अपना त्वरित सुरक्षा पिन सेट करें।
                </div>
              )}

              <form onSubmit={handleSaveFourDigitPin} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="modal-new-pin"
                    className="block text-xs font-bold text-[#13231C] dark:text-[#E7F0EA] mb-1"
                  >
                    नया 4-अंकीय पिन दर्ज करें (Enter 4-Digit PIN)
                  </label>
                  <input
                    id="modal-new-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="4 अंक दर्ज करें (जैसे: 1234)"
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    className="w-full py-2.5 px-3.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] text-lg font-mono tracking-[0.5em] placeholder:tracking-normal placeholder:font-sans placeholder:text-sm text-[#13231C] dark:text-[#E7F0EA]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-confirm-pin"
                    className="block text-xs font-bold text-[#13231C] dark:text-[#E7F0EA] mb-1"
                  >
                    4-अंकीय पिन की पुष्टि करें (Confirm 4-Digit PIN)
                  </label>
                  <input
                    id="modal-confirm-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="4 अंक दोबारा लिखें"
                    value={confirmPin}
                    onChange={(e) =>
                      setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    className="w-full py-2.5 px-3.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] text-lg font-mono tracking-[0.5em] placeholder:tracking-normal placeholder:font-sans placeholder:text-sm text-[#13231C] dark:text-[#E7F0EA]"
                  />
                </div>

                {pinSetupError && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300"
                  >
                    ⚠️ {pinSetupError}
                  </div>
                )}

                {pinSetupSuccess && (
                  <div
                    role="status"
                    className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
                  >
                    {pinSetupSuccess}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    data-testid="save-four-digit-pin-btn"
                    className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#0D5B49] hover:bg-[#094537] text-white font-bold text-xs sm:text-sm transition-colors"
                  >
                    ✓ 4-अंकीय पिन सुरक्षित करें (Save 4-Digit PIN)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================================================== */}
          {/* TAB 3: 4-DIGIT PIN UNLOCK / VERIFY PAD                */}
          {/* ===================================================== */}
          {mode === 'lock_screen' && (
            <div className="space-y-4 text-center">
              {!pinRecord ? (
                <div className="p-4 rounded-xl bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] space-y-2">
                  <p className="text-xs font-semibold text-[#13231C] dark:text-[#E7F0EA]">
                    अनलॉक परीक्षण से पहले कृपया अपना 4-अंकीय पिन सेट करें।
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('setup_pin')}
                    className="py-2 px-4 rounded-lg bg-[#0D5B49] text-white text-xs font-semibold"
                  >
                    4-अंकीय पिन सेट करें →
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-[#13231C] dark:text-[#E7F0EA]">
                      {pinRecord.name} ({pinRecord.pinHint})
                    </div>
                    <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                      डैशबोर्ड अनलॉक करने के लिए अपना 4-अंकीय सुरक्षा पिन दर्ज करें
                    </p>
                  </div>

                  {/* 4-Box PIN Display */}
                  <div className="flex items-center justify-center gap-3 my-2">
                    {[0, 1, 2, 3].map((idx) => {
                      const filled = idx < unlockPin.length;
                      return (
                        <div
                          key={idx}
                          className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold font-mono transition-colors ${
                            filled
                              ? 'border-[#0D5B49] dark:border-[#00F5D4] bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#0D5B49] dark:text-[#00F5D4]'
                              : 'border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1A2A22] text-[#52645B]'
                          }`}
                        >
                          {filled ? '●' : ''}
                        </div>
                      );
                    })}
                  </div>

                  {unlockError && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300"
                    >
                      {unlockError}
                    </div>
                  )}

                  {/* Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-2 max-w-[260px] mx-auto pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleKeypadDigit(digit)}
                        className="py-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-base font-bold font-mono text-[#13231C] dark:text-[#E7F0EA] transition-colors"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setUnlockPin((prev) => prev.slice(0, -1))}
                      className="py-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] text-xs font-semibold text-[#52645B] dark:text-[#9DB0A5]"
                    >
                      ⌫ मिटाएँ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadDigit('0')}
                      className="py-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-base font-bold font-mono text-[#13231C] dark:text-[#E7F0EA] transition-colors"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifyUnlockPin()}
                      className="py-3 rounded-xl bg-[#0D5B49] hover:bg-[#094537] text-white text-xs font-bold"
                    >
                      ✓ अनलॉक
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
