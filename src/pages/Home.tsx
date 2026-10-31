import React, { useEffect, useState } from 'react';

interface HomeProps {
  onNavigate: (page: 'home' | 'dashboard' | 'sheets' | 'login') => void;
  onToast: (msg: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, onToast }) => {
  const [stats, setStats] = useState({ portals: 0, cats: 0, free: 0, langs: 0 });

  useEffect(() => {
    let frameId: number;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setStats({
        portals: Math.floor(progress * 34),
        cats: Math.floor(progress * 6),
        free: Math.floor(progress * 100),
        langs: Math.floor(progress * 2),
      });

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <main>
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="hero-inner">
          <div>
            <span className="hero-pill">🇮🇳 Made for India's Basic Teachers</span>
            <h1>
              Every Portal. Every Update.{' '}
              <span className="grad-text">One Dashboard.</span>
            </h1>
            <p className="hero-sub">
              सारे सरकारी पोर्टल, नोटिस, रिकॉर्ड और टूल्स — एक ही जगह। बेसिक शिक्षकों के लिए बना सुपरफास्ट और सुरक्षित डैशबोर्ड।
            </p>
            <div className="hero-cta">
              <button
                type="button"
                className="btn btn-neon btn-lg"
                onClick={() => onNavigate('dashboard')}
              >
                Start Free →
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-lg"
                onClick={() => {
                  onNavigate('dashboard');
                  onToast('▶️ डैशबोर्ड और स्मार्ट वर्कस्पेस लोड हो गया है');
                }}
              >
                ▶ Watch Demo
              </button>
            </div>
            <div className="hero-trust">
              <span>🔒 256-bit Encrypted</span>
              <span>⚡ Superfast</span>
              <span>🆓 Free Forever</span>
            </div>
          </div>

          <div className="hero-visual">
            <span className="float-icon fi1">🔗</span>
            <span className="float-icon fi2">📢</span>
            <span className="float-icon fi3">🤖</span>
            <div className="hero-mock glass-card">
              <div className="mock-row">
                🔗 मानव सम्पदा पोर्टल{' '}
                <span className="badge badge-completed" style={{ marginLeft: 'auto' }}>
                  ● Open
                </span>
              </div>
              <div className="mock-row">
                📢 जनगणना 2027 अपडेट{' '}
                <span className="badge badge-pending" style={{ marginLeft: 'auto' }}>
                  ● New
                </span>
              </div>
              <div className="mock-row">
                ▶️ नया ट्रेनिंग वीडियो{' '}
                <span className="badge badge-notstarted" style={{ marginLeft: 'auto' }}>
                  ● 12m
                </span>
              </div>
              <div className="mock-row">
                ✅ MDM शीट{' '}
                <span className="badge badge-completed" style={{ marginLeft: 'auto' }}>
                  ● Done
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="stats">
        <div className="stats-inner">
          <div className="stat-item">
            <span className="stat-num">{stats.portals}</span>
            <span className="stat-plus">+</span>
            <span className="stat-label">Portals & Apps</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{stats.cats}</span>
            <span className="stat-label">Categories</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{stats.free}</span>
            <span className="stat-plus">%</span>
            <span className="stat-label">Free Forever</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{stats.langs}</span>
            <span className="stat-label">Languages</span>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="features" id="features">
        <div className="features-inner">
          <h2 className="section-title">
            सब कुछ एक जगह — <span className="grad-text">Everything in One Place</span>
          </h2>
          <p className="section-sub">
            शिक्षकों के रोज़मर्रा के काम के लिए बनाए गए 6 पावरफुल सेक्शन।
          </p>
          <div className="features-grid">
            <div
              className="glass-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate('dashboard')}
            >
              <div className="feature-icon">🔗</div>
              <div className="card-title">Portal Directory</div>
              <p className="card-text">
                सारे सरकारी पोर्टल और ऐप — श्रेणी अनुसार, एक क्लिक पर। खोजो और तुरंत खोलो।
              </p>
            </div>
            <div
              className="glass-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate('dashboard')}
            >
              <div className="feature-icon alt">📢</div>
              <div className="card-title">Live Notice Board</div>
              <p className="card-text">
                जनगणना, ट्रेनिंग और सरकारी अपडेट — सबसे पहले, पिन किए हुए नोटिस के साथ।
              </p>
            </div>
            <div
              className="glass-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate('dashboard')}
            >
              <div className="feature-icon">💬</div>
              <div className="card-title">WhatsApp + YouTube Hub</div>
              <p className="card-text">
                ग्रुप जॉइन लिंक और चैनल अपडेट — सीधे डैशबोर्ड पर, एक क्लिक दूर।
              </p>
            </div>
            <div
              className="glass-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate('dashboard')}
            >
              <div className="feature-icon alt">✅</div>
              <div className="card-title">Tasks & Reminders</div>
              <p className="card-text">
                टू-डू लिस्ट, नोट्स और रिमाइंडर — हर सेक्शन में, कभी कुछ न भूले।
              </p>
            </div>
            <div
              className="glass-card"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate('sheets')}
            >
              <div className="feature-icon">📊</div>
              <div className="card-title">School Sheets</div>
              <p className="card-text">
                MDM, हाज़िरी, रिज़ल्ट, ग्रांट — सब शीट्स एक जगह, एक्सपोर्ट बटन के साथ।
              </p>
            </div>
            <div
              className="glass-card"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                onToast('🤖 AI सहायक सुविधा डैशबोर्ड में सक्रिय है');
                onNavigate('dashboard');
              }}
            >
              <div className="feature-icon alt">🤖</div>
              <div className="card-title">AI Assistant</div>
              <p className="card-text">
                नोटिस सारांश, प्रश्न पत्र ड्राफ्ट, अनुवाद — चुटकी में, हिंदी में।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="how">
        <h2 className="section-title">
          कैसे काम करता है? — <span className="grad-text">3 आसान स्टेप</span>
        </h2>
        <p className="section-sub">
          न कोई लंबा फॉर्म, न कोई झंझट। बस 3 क्लिक और आप अंदर।
        </p>
        <div className="how-grid">
          <div className="how-step">
            <div className="how-num">1</div>
            <div className="card-title">Free साइन अप करें</div>
            <p className="card-text">
              ईमेल या Google अकाउंट से 10 सेकंड में लॉगिन। कोई क्रेडिट कार्ड नहीं।
            </p>
          </div>
          <div className="how-step">
            <div className="how-num">2</div>
            <div className="card-title">अपने पोर्टल खोलें</div>
            <p className="card-text">
              34+ सरकारी पोर्टल और ऐप — एक क्लिक पर, श्रेणी अनुसार सजे हुए।
            </p>
          </div>
          <div className="how-step">
            <div className="how-num">3</div>
            <div className="card-title">काम ट्रैक करें</div>
            <p className="card-text">
              नोटिस, टास्क, शीट्स और AI सहायक — सब कुछ एक डैशबोर्ड में।
            </p>
          </div>
        </div>
      </section>

      {/* ============ PRICING SECTION ============ */}
      <section className="features" id="pricing" style={{ paddingTop: '20px' }}>
        <div className="features-inner">
          <h2 className="section-title">
            सरल और पारदर्शी — <span className="grad-text">100% Free Plan</span>
          </h2>
          <p className="section-sub">
            शिक्षकों के लिए मूल सेवाएं हमेशा के लिए मुफ़्त रहेंगी।
          </p>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <div
              className="glass-card"
              style={{
                border: '2px solid var(--neon)',
                textAlign: 'center',
                padding: '36px 28px',
              }}
            >
              <span className="badge badge-pin" style={{ marginBottom: '12px' }}>
                🌟 ऑल-इन-वन बेसिक शिक्षक प्लान
              </span>
              <h3 style={{ fontSize: '2.4rem', fontWeight: 700, margin: '8px 0' }}>
                ₹0 <span style={{ fontSize: '1rem', color: 'var(--ink2)' }}>/ हमेशा के लिए</span>
              </h3>
              <p className="card-text" style={{ marginBottom: '20px' }}>
                सभी 34 सरकारी पोर्टल, लाइव नोटिस, MDM/हाज़िरी/रिजल्ट शीट्स, स्मार्ट वर्कस्पेस और क्लाउड सिंक पूरी तरह मुफ़्त।
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  textAlign: 'left',
                  margin: '20px 0 28px',
                  fontSize: '0.92rem',
                }}
              >
                <div>✅ 34+ सरकारी पोर्टल डायरेक्टरी</div>
                <div>✅ MDM & अटेंडेंस शीट्स</div>
                <div>✅ ऑटो-ग्रेड रिजल्ट शीट</div>
                <div>✅ CSV व प्रिंटेबल एक्सपोर्ट</div>
                <div>✅ WhatsApp & YouTube हब</div>
                <div>✅ क्लाउड व लोकल ऑटो-सेव</div>
              </div>
              <button
                type="button"
                className="btn btn-neon btn-lg"
                onClick={() => onNavigate('dashboard')}
              >
                मुफ़्त डैशबोर्ड खोलें →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ SECTION ============ */}
      <section className="features" id="faq" style={{ paddingTop: '30px' }}>
        <div className="features-inner">
          <h2 className="section-title">
            अक्सर पूछे जाने वाले सवाल — <span className="grad-text">FAQ</span>
          </h2>
          <p className="section-sub">आपके प्रश्नों के सरल उत्तर।</p>
          <div
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div className="glass-card">
              <div className="card-title">❓ क्या यह सभी राज्यों के बेसिक शिक्षकों के लिए है?</div>
              <p className="card-text">
                हाँ! यह उत्तर प्रदेश, बिहार, मध्य प्रदेश सहित भारत के सभी राज्यों के प्राथमिक व उच्च प्राथमिक शिक्षकों के लिए तैयार किया गया है।
              </p>
            </div>
            <div className="glass-card">
              <div className="card-title">❓ क्या मेरा डेटा सुरक्षित रहता है?</div>
              <p className="card-text">
                बिल्कुल! आपका सारा रिकॉर्ड (MDM, हाज़िरी, टास्क, नोट्स) आपके ब्राउज़र और Supabase के 256-bit RLS एन्क्रिप्शन के साथ सुरक्षित रहता है।
              </p>
            </div>
            <div className="glass-card">
              <div className="card-title">❓ क्या बिना इंटरनेट के भी काम करेगा?</div>
              <p className="card-text">
                हाँ! लोकल स्टोरेज समर्थन के कारण टू-डू लिस्ट, नोट्स और शीट्स ऑफलाइन भी काम करते हैं और इंटरनेट आने पर सिंक हो जाते हैं।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="testi">
        <h2 className="section-title">
          शिक्षक क्या कहते हैं — <span className="grad-text">Real Voices</span>
        </h2>
        <p className="section-sub">हज़ारों शिक्षक पहले से हमें भरोसा कर रहे हैं।</p>
        <div className="testi-grid">
          <div className="glass-card">
            <div className="stars">★★★★★</div>
            <p className="card-text">
              "पहले 10 पोर्टल के लिंक याद रखने पड़ते थे। अब एक डैशबोर्ड ने सब आसान कर दिया। जनगणना का काम भी इसी से हो रहा है!"
            </p>
            <div className="testi-name">रमेश शर्मा</div>
            <div className="testi-role">Primary Teacher, Uttar Pradesh</div>
          </div>
          <div className="glass-card">
            <div className="stars">★★★★★</div>
            <p className="card-text">
              "MDM और हाज़िरी की शीट एक जगह मिल गई। एक्सपोर्ट बटन दबाओ, प्रिंट निकालो — मिनटों का काम सेकंडों में।"
            </p>
            <div className="testi-name">सुनीता देवी</div>
            <div className="testi-role">Head Teacher, Bihar</div>
          </div>
          <div className="glass-card">
            <div className="stars">★★★★★</div>
            <p className="card-text">
              "हिंदी में पूरा डैशबोर्ड — यही सबसे बड़ी बात है। स्मार्ट वर्कस्पेस और YouTube ट्रेनिंग वीडियो फीचर कमाल का है!"
            </p>
            <div className="testi-name">अनिल कुमार</div>
            <div className="testi-role">Field Trainer, Madhya Pradesh</div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="cta-banner" id="cta">
        <div className="cta-inner">
          <h2>आज ही शुरू करें — बिल्कुल मुफ़्त</h2>
          <p>कोई क्रेडिट कार्ड नहीं। कोई झंझट नहीं। बस एक क्लिक में अपना डैशबोर्ड पाएँ।</p>
          <button
            type="button"
            className="btn btn-light btn-lg"
            onClick={() => onNavigate('dashboard')}
          >
            Start Free →
          </button>
        </div>
      </section>
    </main>
  );
};
