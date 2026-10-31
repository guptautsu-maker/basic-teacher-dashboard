import React from 'react';

interface FooterProps {
  variant?: 'full' | 'slim';
  onNavigate?: (page: 'home' | 'dashboard' | 'sheets' | 'login') => void;
  onToast?: (msg: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ variant = 'slim', onNavigate, onToast }) => {
  if (variant === 'slim') {
    return (
      <footer className="slim-footer">
        © 2026 Basic Teacher Dashboard · Made with 💚 for Teachers
      </footer>
    );
  }

  const handleLinkClick = (name: string) => {
    if (onToast) {
      onToast(`🔗 ${name} जल्द उपलब्ध होगा`);
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden="true">
              <defs>
                <linearGradient id="lg3" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#0D5B49" />
                  <stop offset="1" stopColor="#00F5D4" />
                </linearGradient>
              </defs>
              <path d="M32 14C24 8 12 8 6 11v35c6-3 18-3 26 3z" fill="url(#lg3)" opacity=".9" />
              <path d="M32 14c8-6 20-6 26-3v35c-6-3-18-3-26 3z" fill="#0D5B49" opacity=".75" />
              <line x1="32" y1="14" x2="32" y2="49" stroke="#00F5D4" strokeWidth="2" />
              <circle cx="32" cy="4" r="4" fill="#9B5DE5" />
            </svg>
            <p>
              Every Portal. Every Update. One Dashboard.
              <br />
              भारत के बेसिक शिक्षकों के लिए बनाया गया।
            </p>
            <div className="footer-social">
              <a
                href="https://chat.whatsapp.com/BqcCSUbJLoQ1SxjwqDv7rL?s=cl&p=a&mlu=4&ilr=4"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
              >
                💬
              </a>
              <button
                type="button"
                onClick={() => handleLinkClick('YouTube चैनल')}
                aria-label="YouTube"
              >
                ▶️
              </button>
              <button
                type="button"
                onClick={() => handleLinkClick('Twitter / X')}
                aria-label="Twitter"
              >
                🐦
              </button>
              <button
                type="button"
                onClick={() => handleLinkClick('Telegram')}
                aria-label="Telegram"
              >
                ✈️
              </button>
            </div>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <button type="button" onClick={() => handleLinkClick('About Us')}>
              About
            </button>
            <button type="button" onClick={() => handleLinkClick('Blog')}>
              Blog
            </button>
            <button type="button" onClick={() => handleLinkClick('Contact')}>
              Contact
            </button>
            <button type="button" onClick={() => handleLinkClick('Changelog')}>
              Changelog
            </button>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            {onNavigate ? (
              <>
                <button type="button" onClick={() => onNavigate('dashboard')}>
                  Portal Directory
                </button>
                <button type="button" onClick={() => onNavigate('sheets')}>
                  School Sheets
                </button>
              </>
            ) : null}
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <button type="button" onClick={() => handleLinkClick('Help Center')}>
              Help Center
            </button>
            <a href="#faq">FAQ</a>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <button type="button" onClick={() => handleLinkClick('Privacy Policy')}>
              Privacy Policy
            </button>
            <button type="button" onClick={() => handleLinkClick('Terms of Service')}>
              Terms of Service
            </button>
            <button type="button" onClick={() => handleLinkClick('Refund Policy')}>
              Refund Policy
            </button>
            <button type="button" onClick={() => handleLinkClick('Security')}>
              Security
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Basic Teacher Dashboard. All rights reserved.</span>
          <span>Made with 💚 for Teachers</span>
        </div>
      </div>
    </footer>
  );
};
