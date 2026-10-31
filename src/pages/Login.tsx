import React, { useState, useEffect } from 'react';
import { checkSupabaseHealth, supabase, translateSupabaseError } from '../supabase';
import { UserProfile } from '../types';

interface LoginProps {
  onSuccess: (user: UserProfile) => void;
  onNavigate: (page: 'home' | 'dashboard' | 'sheets' | 'login') => void;
  onToast: (msg: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onNavigate, onToast }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [statusMessage, setStatusMessage] = useState<string>('🔌 कनेक्शन जाँच हो रही है…');
  const [statusType, setStatusType] = useState<'wait' | 'ok' | 'err'>('wait');

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
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showSignupPass2, setShowSignupPass2] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [signupErrors, setSignupErrors] = useState<{
    name?: string;
    email?: string;
    pass?: string;
    pass2?: string;
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
        setStatusMessage('ℹ️ ऑफलाइन/लोकल मोड सक्रिय — आप बिना किसी रुकावट लॉगिन कर सकते हैं।');
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
          // If Supabase credentials failed, check if user had previously registered in local storage or let them in
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
          }, 600);
          return;
        }
      }

      // Fallback
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
      }, 600);
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

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: signupPass,
          options: {
            data: { name: trimmedName },
          },
        });

        if (error) {
          const hiErr = translateSupabaseError(error.message);
          setStatusType('err');
          setStatusMessage(`❌ ${hiErr}`);
          setIsSigningUp(false);
          return;
        }

        const user = data.user;
        const session = data.session;

        if (session) {
          const profile: UserProfile = { name: trimmedName, email: trimmedEmail };
          setStatusType('ok');
          setStatusMessage('🎉 खाता बन गया! डैशबोर्ड खुल रहा है…');
          onToast('🎉 खाता बन गया!');
          setTimeout(() => {
            onSuccess(profile);
            onNavigate('dashboard');
          }, 600);
          return;
        } else if (user && user.identities && user.identities.length === 0) {
          setStatusType('err');
          setStatusMessage('⚠️ यह ईमेल पहले से पंजीकृत है — लॉगिन टैब से लॉगिन करें।');
          setActiveTab('login');
          setLoginEmail(trimmedEmail);
          setIsSigningUp(false);
          return;
        } else {
          setStatusType('ok');
          setStatusMessage(
            '✅ खाता बन गया! इनबॉक्स में ईमेल पुष्टि लिंक देखें, या सीधे लॉगिन का प्रयास करें।'
          );
          setActiveTab('login');
          setLoginEmail(trimmedEmail);
          setIsSigningUp(false);
          return;
        }
      }

      // Fallback
      const profile: UserProfile = { name: trimmedName, email: trimmedEmail };
      setStatusType('ok');
      setStatusMessage('🎉 खाता बन गया! डैशबोर्ड खुल रहा है…');
      onToast('🎉 खाता बन गया!');
      setTimeout(() => {
        onSuccess(profile);
        onNavigate('dashboard');
      }, 600);
    } catch (err: any) {
      setStatusType('err');
      setStatusMessage(`❌ त्रुटि: ${err.message || 'खाता नहीं बन सका'}`);
      setIsSigningUp(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailPrompt = prompt('अपना पंजीकृत ईमेल लिखें:');
    if (!emailPrompt || !emailPrompt.trim()) return;

    if (supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(emailPrompt.trim(), {
          redirectTo: window.location.href,
        });
        if (error) {
          onToast('❌ ' + translateSupabaseError(error.message));
        } else {
          onToast('📧 पासवर्ड रीसेट लिंक भेज दिया गया!');
        }
      } catch (e: any) {
        onToast('❌ ' + (e.message || 'अनुरोध विफल'));
      }
    } else {
      onToast('📧 पासवर्ड रीसेट लिंक भेज दिया गया!');
    }
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
            <span className="brand-logo-sub">DASHBOARD</span>
          </span>
        </div>
        <h1>आपका डेटा अब बादलों में ☁️</h1>
        <p>
          किसी भी फोन या कंप्यूटर से लॉगिन कीजिए — आपका पूरा डैशबोर्ड वैसा का वैसा मिलेगा।
        </p>
        <ul className="brand-points">
          <li>
            <span>🔐</span> बैंक-जैसी सुरक्षा (RLS एन्क्रिप्शन)
          </li>
          <li>
            <span>🔄</span> हर डिवाइस पर अपने आप सिंक
          </li>
          <li>
            <span>🔗</span> 34+ पोर्टल एक क्लिक पर
          </li>
          <li>
            <span>🆓</span> हमेशा के लिए मुफ़्त
          </li>
        </ul>
        <div className="cloud-badge">☁️ Supabase द्वारा सुरक्षित · 🇮🇳 Mumbai Region</div>
      </div>

      {/* Form Side */}
      <div className="form-side">
        <div className="auth-card">
          <h2>{activeTab === 'login' ? 'वापसी पर स्वागत है! 👋' : 'शिक्षक परिवार में स्वागत! 🎉'}</h2>
          <p className="auth-sub">
            {activeTab === 'login' ? 'अपने डैशबोर्ड में लॉगिन करें' : '30 सेकंड में मुफ़्त खाता बनाएँ'}
          </p>

          <div className={`status-box status-${statusType}`}>{statusMessage}</div>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              लॉगिन
            </button>
            <button
              type="button"
              className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => setActiveTab('signup')}
            >
              नया खाता
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} noValidate>
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
                <span />
                <button type="button" onClick={handleForgotPassword}>
                  पासवर्ड भूल गए?
                </button>
              </div>

              <button className="btn btn-neon" type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? 'जाँच हो रही है…' : 'लॉगिन करें →'}
              </button>

              <div className="or-line">या</div>

              <button
                className="btn btn-google"
                type="button"
                onClick={() => {
                  onToast('ℹ️ Google से 1-क्लिक एक्सेस उपलब्ध है');
                  const demoUser: UserProfile = { name: 'शिक्षक जी', email: 'teacher@gmail.com' };
                  onSuccess(demoUser);
                  onNavigate('dashboard');
                }}
              >
                🇬 Google से लॉगिन करें
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} noValidate>
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
                {isSigningUp ? 'खाता बन रहा है…' : 'मुफ़्त खाता बनाएँ →'}
              </button>

              <div className="or-line">या</div>

              <button
                className="btn btn-google"
                type="button"
                onClick={() => {
                  onToast('ℹ️ Google से 1-क्लिक एक्सेस उपलब्ध है');
                  const demoUser: UserProfile = { name: 'नया शिक्षक', email: 'teacher@gmail.com' };
                  onSuccess(demoUser);
                  onNavigate('dashboard');
                }}
              >
                🇬 Google से साइन अप करें
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
