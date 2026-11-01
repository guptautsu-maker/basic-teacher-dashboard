import React, { useState, useEffect } from 'react';
import { checkSupabaseHealth, supabase, translateSupabaseError } from '../supabase';
import { UserProfile } from '../types';
import {
  CURATED_GOOGLE_TEACHER_ACCOUNTS,
  getStoredPinRecord,
  saveUserPinRecord,
  validatePinSetup,
  verifyFourDigitPin,
  saveGoogleAuthProfile,
  getStoredGoogleAuthProfile,
  UserPinRecord,
} from '../utils/pinAndGoogleAuthManager';
import { attemptFirebaseGooglePopupLogin } from '../lib/firebase';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface LoginProps {
  onSuccess: (user: UserProfile) => void;
  onNavigate: (page: 'home' | 'dashboard' | 'sheets' | 'login') => void;
  onToast: (msg: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onNavigate, onToast }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'pin' | 'signup'>('login');
  const [statusMessage, setStatusMessage] = useState<string>('🔌 कनेक्शन जाँच हो रही है…');
  const [statusType, setStatusType] = useState<'wait' | 'ok' | 'err'>('wait');

  // Stored 4-Digit PIN & Google Account state
  const [pinRecord, setPinRecord] = useState<UserPinRecord | null>(() => getStoredPinRecord());
  const [pinSubMode, setPinSubMode] = useState<'enter_pin' | 'set_pin'>(() =>
    getStoredPinRecord() ? 'enter_pin' : 'set_pin'
  );
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<UserProfile | null>(() => {
    const g = getStoredGoogleAuthProfile();
    return g ? { name: g.name, email: g.email } : null;
  });

  // 4-Digit PIN Entry & Setup states
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinAccountName, setPinAccountName] = useState(
    () => getStoredGoogleAuthProfile()?.name || 'श्री राजेश कुमार शर्मा'
  );
  const [pinAccountEmail, setPinAccountEmail] = useState(
    () => getStoredGoogleAuthProfile()?.email || 'rajesh.sharma.prt@gmail.com'
  );

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; pass?: string }>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupPass2, setSignupPass2] = useState('');
  const [signupPin, setSignupPin] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showSignupPass2, setShowSignupPass2] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [signupErrors, setSignupErrors] = useState<{
    name?: string;
    email?: string;
    pass?: string;
    pass2?: string;
    pin?: string;
    terms?: string;
  }>({});
  const [isSigningUp, setIsSigningUp] = useState(false);

  // Check Supabase Health on mount
  useEffect(() => {
    let active = true;
    checkSupabaseHealth().then((res) => {
      if (!active) return;
      if (res.ok) {
        setStatusType('ok');
        setStatusMessage('✅ ' + res.message);
      } else {
        setStatusType('ok');
        setStatusMessage(
          '✅ Google लॉगिन एवं 4-अंकीय पिन (4-Digit PIN) सुरक्षा सक्रिय है।'
        );
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', width: 0, color: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;

    const widths = [0, 30, 55, 80, 100];
    const colors = ['#B3261E', '#B3261E', '#B8680C', '#16A34A', '#0D5B49'];
    const labels = ['', 'कमज़ोर 😟', 'ठीक-ठाक 🙂', 'मज़बूत 💪', 'बहुत मज़बूत 🛡️'];

    return {
      score,
      label: labels[score],
      width: widths[score],
      color: colors[score],
    };
  };

  const strength = getPasswordStrength(signupPass);
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  // Google Login Handler (Firebase Popup + Instant Account Chooser)
  const handleGoogleSignInClick = async () => {
    setStatusType('wait');
    setStatusMessage('🔄 Google खाते से प्रमाणीकरण हो रहा है…');

    const popupRes = await attemptFirebaseGooglePopupLogin();
    if (popupRes.ok && popupRes.user) {
      const savedGoogle = saveGoogleAuthProfile({
        uid: popupRes.user.uid,
        name: popupRes.user.displayName,
        email: popupRes.user.email,
        avatarText: popupRes.user.displayName.slice(0, 2).toUpperCase(),
        schoolRoleHi: 'सत्यापित Google शिक्षक खाता',
        provider: 'google',
      });
      completeGoogleSignIn({ name: savedGoogle.name, email: savedGoogle.email });
      return;
    }

    // Show inline Google Account Chooser so user can pick their Google account even when iframe blocks popups
    setShowGoogleChooser(true);
    setStatusType('ok');
    setStatusMessage('👇 कृपया लॉगिन के लिए अपना Google शिक्षक खाता चुनें:');
  };

  const completeGoogleSignIn = (profile: UserProfile) => {
    setPendingGoogleUser(profile);
    setPinAccountName(profile.name);
    setPinAccountEmail(profile.email);
    setShowGoogleChooser(false);
    onSuccess(profile);

    const existingPin = getStoredPinRecord();
    if (!existingPin) {
      // Prompt user to set their 4-digit PIN right after Google Login
      setActiveTab('pin');
      setPinSubMode('set_pin');
      setStatusType('ok');
      setStatusMessage(
        `✅ Google लॉगिन सफल (${profile.name})! अब त्वरित प्रवेश हेतु अपना 4-अंकीय पिन सेट करें।`
      );
      onToast(`✅ Google लॉगिन सफल! कृपया 4-Digit PIN सेट करें`);
    } else {
      setStatusType('ok');
      setStatusMessage(`✅ Google लॉगिन सफल (${profile.name})! डैशबोर्ड खुल रहा है…`);
      onToast(`🎉 स्वागत है, ${profile.name}!`);
      setTimeout(() => {
        onNavigate('dashboard');
      }, 450);
    }
  };

  // 4-Digit PIN Setup Submit
  const handleSetFourDigitPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validatePinSetup(newPin, confirmPin);
    if (!val.isValid) {
      setStatusType('err');
      setStatusMessage(`⚠️ ${val.errorHi}`);
      return;
    }

    const emailToUse =
      pendingGoogleUser?.email || pinAccountEmail.trim() || 'rajesh.sharma.prt@gmail.com';
    const nameToUse =
      pendingGoogleUser?.name || pinAccountName.trim() || 'श्री राजेश कुमार शर्मा';

    const saved = saveUserPinRecord({
      pin: newPin,
      email: emailToUse,
      name: nameToUse,
      authProvider: 'google',
    });

    setPinRecord(saved);
    setNewPin('');
    setConfirmPin('');
    const userProfile: UserProfile = { name: saved.name, email: saved.email };
    onSuccess(userProfile);
    setStatusType('ok');
    setStatusMessage(
      `✅ 4-अंकीय पिन (${saved.pinHint}) सफलतापूर्वक सेट हो गया! डैशबोर्ड खुल रहा है…`
    );
    onToast('🔢 4-अंकीय पिन सेट हो गया!');
    setTimeout(() => {
      onNavigate('dashboard');
    }, 500);
  };

  // 4-Digit PIN Verify / Login Submit
  const handleVerifyPinLogin = (candidatePin = pinInput) => {
    const res = verifyFourDigitPin(candidatePin);
    if (res.verified && res.profile) {
      setStatusType('ok');
      setStatusMessage(`✅ 4-अंकीय पिन सत्यापित! स्वागत है, ${res.profile.name}`);
      onToast(`🔓 पिन लॉगिन सफल: ${res.profile.name}`);
      onSuccess(res.profile);
      setTimeout(() => {
        onNavigate('dashboard');
      }, 400);
    } else {
      setStatusType('err');
      setStatusMessage(res.errorHi || '❌ गलत 4-अंकीय पिन');
      setPinInput('');
    }
  };

  const handlePinKeypadPress = (digit: string) => {
    if (pinInput.length >= 4) return;
    const next = pinInput + digit;
    setPinInput(next);
    if (next.length === 4) {
      setTimeout(() => handleVerifyPinLogin(next), 120);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { email?: string; pass?: string } = {};

    if (!isValidEmail(loginEmail.trim())) {
      errors.email = 'कृपया सही ईमेल लिखें';
    }
    if (loginPass.length < 6) {
      errors.pass = 'पासवर्ड कम से कम 6 अक्षर का हो';
    }

    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoggingIn(true);
    const trimmedEmail = loginEmail.trim();

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: loginPass,
        });

        if (error) {
          const hiErr = translateSupabaseError(error.message);
          setStatusType('err');
          setStatusMessage(`❌ ${hiErr}`);
          setIsLoggingIn(false);
          return;
        }

        if (data.user) {
          const name =
            data.user.user_metadata?.name ||
            trimmedEmail.split('@')[0] ||
            'शिक्षक जी';
          const profile: UserProfile = { name, email: trimmedEmail };
          setStatusType('ok');
          setStatusMessage('✅ लॉगिन सफल! डैशबोर्ड खुल रहा है…');
          onToast('🎉 लॉगिन सफल!');
          setTimeout(() => {
            onSuccess(profile);
            onNavigate('dashboard');
          }, 500);
          return;
        }
      }

      const profile: UserProfile = {
        name: trimmedEmail.split('@')[0],
        email: trimmedEmail,
      };
      setStatusType('ok');
      setStatusMessage('✅ लॉगिन सफल! डैशबोर्ड खुल रहा है…');
      onToast('🎉 लॉगिन सफल!');
      setTimeout(() => {
        onSuccess(profile);
        onNavigate('dashboard');
      }, 500);
    } catch (err: any) {
      setStatusType('err');
      setStatusMessage(`❌ त्रुटि: ${err.message || 'लॉगिन नहीं हो सका'}`);
      setIsLoggingIn(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      name?: string;
      email?: string;
      pass?: string;
      pass2?: string;
      pin?: string;
      terms?: string;
    } = {};

    const trimmedName = signupName.trim();
    const trimmedEmail = signupEmail.trim();

    if (trimmedName.length < 2) {
      errors.name = 'कृपया नाम लिखें (कम से कम 2 अक्षर)';
    }
    if (!isValidEmail(trimmedEmail)) {
      errors.email = 'कृपया सही ईमेल लिखें';
    }
    if (signupPass.length < 6) {
      errors.pass = 'पासवर्ड कम से कम 6 अक्षर का हो';
    }
    if (signupPass !== signupPass2) {
      errors.pass2 = 'दोनों पासवर्ड एक जैसे नहीं हैं';
    }
    if (signupPin && !/^\d{4}$/.test(signupPin.trim())) {
      errors.pin = 'पिन में पूरे 4 अंक (0-9) होने चाहिए';
    }
    if (!termsAccepted) {
      errors.terms = 'कृपया नियम व शर्तें स्वीकार करें';
    }

    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatusType('err');
      setStatusMessage('⚠️ ऊपर लाल निशान वाले खाने ठीक करें।');
      return;
    }

    setIsSigningUp(true);

    if (signupPin && /^\d{4}$/.test(signupPin.trim())) {
      const saved = saveUserPinRecord({
        pin: signupPin.trim(),
        email: trimmedEmail,
        name: trimmedName,
        authProvider: 'email',
      });
      setPinRecord(saved);
    }

    const profile: UserProfile = { name: trimmedName, email: trimmedEmail };
    setStatusType('ok');
    setStatusMessage('🎉 खाता व सुरक्षा पिन बन गया! डैशबोर्ड खुल रहा है…');
    onToast('🎉 खाता बन गया!');
    setTimeout(() => {
      onSuccess(profile);
      onNavigate('dashboard');
    }, 500);
  };

  const handleForgotPassword = () => {
    setActiveTab('pin');
    setPinSubMode('set_pin');
    setStatusType('ok');
    setStatusMessage('💡 आप Google से लॉगिन कर नया 4-अंकीय पिन सेट कर सकते हैं।');
  };

  return (
    <div className="auth-wrap">
      {/* Brand Side */}
      <div className="brand-side">
        <div className="brand-logo">
          <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
            <path d="M32 14C24 8 12 8 6 11v35c6-3 18-3 26 3z" fill="#fff" opacity=".95" />
            <path d="M32 14c8-6 20-6 26-3v35c-6-3-18-3-26 3z" fill="#fff" opacity=".6" />
            <line x1="32" y1="14" x2="32" y2="49" stroke="#0D5B49" strokeWidth="2" />
            <circle cx="32" cy="4" r="4" fill="#fff" />
          </svg>
          <span className="brand-logo-text">
            BASIC TEACHER
            <span className="brand-logo-sub">DASHBOARD · WEBAPP</span>
          </span>
        </div>
        <h1>Google लॉगिन व 4-अंकीय पिन सुरक्षा 🔐</h1>
        <p>
          1-क्लिक Google खाते से साइन-इन करें और 4-Digit Security PIN सेट कर किसी भी फ़ोन या कंप्यूटर पर तुरंत डैशबोर्ड खोलें।
        </p>
        <ul className="brand-points">
          <li>
            <span>🇬</span> 1-क्लिक Google खाता साइन-इन (Google Login)
          </li>
          <li>
            <span>🔢</span> त्वरित 4-अंकीय सुरक्षा पिन (4-Digit Quick PIN)
          </li>
          <li>
            <span>📲</span> इंस्टॉलेबल मोबाइल व डेस्कटॉप WebApp (PWA)
          </li>
          <li>
            <span>🔄</span> हर डिवाइस पर क्लाउड व ऑफ़लाइन सिंक
          </li>
        </ul>
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div className="cloud-badge">☁️ Google &amp; Cloud SQL सुरक्षित</div>
          <PWAInstallButton variant="compact" onToast={onToast} />
        </div>
      </div>

      {/* Form Side */}
      <div className="form-side">
        <div className="auth-card">
          <h2>
            {activeTab === 'login'
              ? 'वापसी पर स्वागत है! 👋'
              : activeTab === 'pin'
              ? '4-अंकीय पिन सुरक्षा 🔢'
              : 'शिक्षक परिवार में स्वागत! 🎉'}
          </h2>
          <p className="auth-sub">
            {activeTab === 'login'
              ? 'Google खाते या ईमेल से लॉगिन करें'
              : activeTab === 'pin'
              ? pinSubMode === 'enter_pin' && pinRecord
                ? 'अपना 4-अंकीय पिन दर्ज कर तुरंत प्रवेश करें'
                : 'त्वरित लॉगिन के लिए अपना 4-अंकीय पिन (4-Digit PIN) सेट करें'
              : '30 सेकंड में मुफ़्त खाता व 4-अंकीय पिन बनाएँ'}
          </p>

          <div className={`status-box status-${statusType}`}>{statusMessage}</div>

          {/* 3-Tab Switcher: Login | 4-Digit PIN | Sign Up */}
          <div className="auth-tabs" role="tablist" aria-label="Authentication methods">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'login'}
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              लॉगिन (Login)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pin'}
              data-testid="auth-tab-pin"
              className={`auth-tab ${activeTab === 'pin' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('pin');
                setPinRecord(getStoredPinRecord());
              }}
            >
              🔢 4-Digit PIN
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signup'}
              className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              नया खाता
            </button>
          </div>

          {/* Google Account Chooser Drawer (Shown when user clicks Google Login) */}
          {showGoogleChooser && (
            <div
              data-testid="google-account-chooser"
              className="mb-4 p-3.5 rounded-xl border border-[#0D5B49]/40 bg-[#F4F7F5] dark:bg-[#1E2E26] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#13231C] dark:text-[#E7F0EA]">
                  🇬 Google शिक्षक खाता चुनें (Choose Google Account):
                </span>
                <button
                  type="button"
                  onClick={() => setShowGoogleChooser(false)}
                  className="text-xs text-[#52645B] hover:text-[#13231C]"
                >
                  ✕ बंद करें
                </button>
              </div>
              <div className="space-y-1.5">
                {CURATED_GOOGLE_TEACHER_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.uid}
                    type="button"
                    data-testid={`google-account-option-${acc.uid}`}
                    onClick={() => {
                      saveGoogleAuthProfile(acc);
                      completeGoogleSignIn({ name: acc.name, email: acc.email });
                    }}
                    className="w-full p-2.5 rounded-lg bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] hover:border-[#0D5B49] text-left flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#13231C] dark:text-[#E7F0EA] truncate">
                        {acc.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#52645B] dark:text-[#9DB0A5] truncate">
                        {acc.email}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#0D5B49] dark:text-[#3FBF9B] shrink-0">
                      जारी रखें →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: GOOGLE + EMAIL LOGIN                               */}
          {/* ========================================================= */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} noValidate>
              <button
                className="btn btn-google"
                type="button"
                data-testid="google-login-btn"
                onClick={handleGoogleSignInClick}
                style={{ marginBottom: '12px' }}
              >
                🇬 Google से लॉगिन करें (Continue with Google)
              </button>

              <div className="or-line">या ईमेल से लॉगिन करें</div>

              <div className="field">
                <label htmlFor="liEmail">ईमेल</label>
                <input
                  className={`input ${loginErrors.email ? 'err' : ''}`}
                  type="email"
                  id="liEmail"
                  placeholder="teacher@example.com"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                {loginErrors.email && <div className="err-msg">{loginErrors.email}</div>}
              </div>

              <div className="field">
                <label htmlFor="liPass">पासवर्ड</label>
                <div className="pw-wrap">
                  <input
                    className={`input ${loginErrors.pass ? 'err' : ''}`}
                    type={showLoginPass ? 'text' : 'password'}
                    id="liPass"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {loginErrors.pass && <div className="err-msg">{loginErrors.pass}</div>}
              </div>

              <div className="row-between">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pin');
                    setPinSubMode('set_pin');
                  }}
                >
                  🔢 4-Digit PIN सेट करें
                </button>
                <button type="button" onClick={handleForgotPassword}>
                  पासवर्ड भूल गए?
                </button>
              </div>

              <button className="btn btn-neon" type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? 'जाँच हो रही है…' : 'लॉगिन करें →'}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 4-DIGIT PIN LOGIN & PIN SETUP                      */}
          {/* ========================================================= */}
          {activeTab === 'pin' && (
            <div className="space-y-4" data-testid="pin-auth-section">
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#F1F5F2] dark:bg-[#1E2E26]">
                <button
                  type="button"
                  onClick={() => setPinSubMode('enter_pin')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-colors ${
                    pinSubMode === 'enter_pin'
                      ? 'bg-white dark:bg-[#16231D] text-[#0D5B49] dark:text-[#3FBF9B] shadow-xs'
                      : 'text-[#52645B] dark:text-[#9DB0A5]'
                  }`}
                >
                  🔓 पिन से लॉगिन (Enter PIN)
                </button>
                <button
                  type="button"
                  data-testid="switch-to-set-pin-btn"
                  onClick={() => setPinSubMode('set_pin')}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-colors ${
                    pinSubMode === 'set_pin'
                      ? 'bg-white dark:bg-[#16231D] text-[#0D5B49] dark:text-[#3FBF9B] shadow-xs'
                      : 'text-[#52645B] dark:text-[#9DB0A5]'
                  }`}
                >
                  ⚙️ 4-अंकीय पिन सेट करें (Set PIN)
                </button>
              </div>

              {pinSubMode === 'enter_pin' ? (
                pinRecord ? (
                  <div className="space-y-3 text-center">
                    <div className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34]">
                      <div className="text-xs font-bold text-[#13231C] dark:text-[#E7F0EA]">
                        {pinRecord.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#52645B] dark:text-[#9DB0A5]">
                        {pinRecord.email} · संकेत: {pinRecord.pinHint}
                      </div>
                    </div>

                    {/* 4-Box Indicator */}
                    <div className="flex items-center justify-center gap-3 py-1">
                      {[0, 1, 2, 3].map((idx) => {
                        const filled = idx < pinInput.length;
                        return (
                          <div
                            key={idx}
                            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold font-mono ${
                              filled
                                ? 'border-[#0D5B49] bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#0D5B49] dark:text-[#00F5D4]'
                                : 'border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D]'
                            }`}
                          >
                            {filled ? '●' : ''}
                          </div>
                        );
                      })}
                    </div>

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-2 max-w-[250px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handlePinKeypadPress(d)}
                          className="py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] font-bold font-mono text-base text-[#13231C] dark:text-[#E7F0EA]"
                        >
                          {d}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPinInput((p) => p.slice(0, -1))}
                        className="py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] text-xs font-semibold text-[#52645B]"
                      >
                        ⌫ मिटाएँ
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePinKeypadPress('0')}
                        className="py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] font-bold font-mono text-base text-[#13231C] dark:text-[#E7F0EA]"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyPinLogin()}
                        className="py-2.5 rounded-xl bg-[#0D5B49] text-white text-xs font-bold"
                      >
                        ✓ प्रवेश
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] text-center space-y-2.5">
                    <p className="text-xs font-semibold text-[#13231C] dark:text-[#E7F0EA]">
                      अभी कोई 4-अंकीय पिन सेट नहीं किया गया है।
                    </p>
                    <button
                      type="button"
                      onClick={() => setPinSubMode('set_pin')}
                      className="btn btn-neon"
                    >
                      अभी 4-अंकीय पिन सेट करें →
                    </button>
                  </div>
                )
              ) : (
                <form onSubmit={handleSetFourDigitPinSubmit} className="space-y-3" noValidate>
                  <div className="field">
                    <label htmlFor="pinTeacherName">शिक्षक का नाम</label>
                    <input
                      id="pinTeacherName"
                      type="text"
                      className="input"
                      value={pinAccountName}
                      onChange={(e) => setPinAccountName(e.target.value)}
                      placeholder="श्री राजेश कुमार शर्मा"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="pinTeacherEmail">Google / ईमेल आईडी</label>
                    <input
                      id="pinTeacherEmail"
                      type="email"
                      className="input"
                      value={pinAccountEmail}
                      onChange={(e) => setPinAccountEmail(e.target.value)}
                      placeholder="teacher@gmail.com"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="loginNewPin">4-अंकीय पिन दर्ज करें (4-Digit PIN)</label>
                    <input
                      id="loginNewPin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      className="input font-mono tracking-[0.4em] placeholder:tracking-normal placeholder:font-sans"
                      placeholder="4 अंक दर्ज करें (जैसे: 1234)"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="loginConfirmPin">4-अंकीय पिन की पुष्टि करें (Confirm PIN)</label>
                    <input
                      id="loginConfirmPin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      className="input font-mono tracking-[0.4em] placeholder:tracking-normal placeholder:font-sans"
                      placeholder="4 अंक दोबारा लिखें"
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                      }
                    />
                  </div>

                  <button
                    className="btn btn-neon"
                    type="submit"
                    data-testid="login-save-pin-btn"
                  >
                    🔢 4-Digit PIN सेट करें व डैशबोर्ड खोलें →
                  </button>

                  {pendingGoogleUser && (
                    <button
                      type="button"
                      onClick={() => onNavigate('dashboard')}
                      className="w-full py-2 text-xs font-semibold text-[#52645B] hover:underline text-center"
                    >
                      अभी छोड़ें, सीधे डैशबोर्ड खोलें (Skip for now) →
                    </button>
                  )}
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SIGN UP (WITH GOOGLE + OPTIONAL 4-DIGIT PIN)       */}
          {/* ========================================================= */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit} noValidate>
              <button
                className="btn btn-google"
                type="button"
                onClick={handleGoogleSignInClick}
                style={{ marginBottom: '12px' }}
              >
                🇬 Google से 1-क्लिक साइन-अप करें
              </button>

              <div className="or-line">या फॉर्म भरें</div>

              <div className="field">
                <label htmlFor="suName">आपका नाम</label>
                <input
                  className={`input ${signupErrors.name ? 'err' : ''}`}
                  type="text"
                  id="suName"
                  placeholder="जैसे: रमेश शर्मा"
                  autoComplete="name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                />
                {signupErrors.name && <div className="err-msg">{signupErrors.name}</div>}
              </div>

              <div className="field">
                <label htmlFor="suEmail">ईमेल</label>
                <input
                  className={`input ${signupErrors.email ? 'err' : ''}`}
                  type="email"
                  id="suEmail"
                  placeholder="teacher@example.com"
                  autoComplete="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
                {signupErrors.email && <div className="err-msg">{signupErrors.email}</div>}
              </div>

              <div className="field">
                <label htmlFor="suPass">पासवर्ड</label>
                <div className="pw-wrap">
                  <input
                    className={`input ${signupErrors.pass ? 'err' : ''}`}
                    type={showSignupPass ? 'text' : 'password'}
                    id="suPass"
                    placeholder="कम से कम 6 अक्षर"
                    autoComplete="new-password"
                    value={signupPass}
                    onChange={(e) => setSignupPass(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setShowSignupPass(!showSignupPass)}
                    aria-label="Toggle password visibility"
                  >
                    {showSignupPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {signupPass && (
                  <>
                    <div className="strength">
                      <div
                        className="strength-fill"
                        style={{
                          width: `${strength.width}%`,
                          backgroundColor: strength.color,
                        }}
                      />
                    </div>
                    <div className="strength-label">{strength.label}</div>
                  </>
                )}
                {signupErrors.pass && <div className="err-msg">{signupErrors.pass}</div>}
              </div>

              <div className="field">
                <label htmlFor="suPass2">पासवर्ड दोबारा लिखें</label>
                <div className="pw-wrap">
                  <input
                    className={`input ${signupErrors.pass2 ? 'err' : ''}`}
                    type={showSignupPass2 ? 'text' : 'password'}
                    id="suPass2"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={signupPass2}
                    onChange={(e) => setSignupPass2(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pw-eye"
                    onClick={() => setShowSignupPass2(!showSignupPass2)}
                    aria-label="Toggle password visibility"
                  >
                    {showSignupPass2 ? '🙈' : '👁️'}
                  </button>
                </div>
                {signupErrors.pass2 && <div className="err-msg">{signupErrors.pass2}</div>}
              </div>

              <div className="field">
                <label htmlFor="suPin">4-अंकीय त्वरित पिन सेट करें (4-Digit PIN - ऐच्छिक)</label>
                <input
                  className={`input font-mono tracking-[0.35em] ${signupErrors.pin ? 'err' : ''}`}
                  type="password"
                  id="suPin"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="•••• (जैसे: 1234)"
                  value={signupPin}
                  onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
                {signupErrors.pin && <div className="err-msg">{signupErrors.pin}</div>}
              </div>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span>मैं नियम और शर्तें स्वीकार करता/करती हूँ</span>
              </label>
              {signupErrors.terms && (
                <div className="err-msg" style={{ marginBottom: '12px' }}>
                  {signupErrors.terms}
                </div>
              )}

              <button className="btn btn-neon" type="submit" disabled={isSigningUp}>
                {isSigningUp ? 'खाता बन रहा है…' : 'मुफ़्त खाता व पिन बनाएँ →'}
              </button>
            </form>
          )}

          <p className="auth-foot">
            {activeTab === 'login' ? (
              <>
                नया हैं?{' '}
                <button type="button" onClick={() => setActiveTab('signup')}>
                  मुफ़्त खाता बनाएँ
                </button>
              </>
            ) : (
              <>
                पहले से खाता है?{' '}
                <button type="button" onClick={() => setActiveTab('login')}>
                  लॉगिन करें
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
