import React from 'react';
import { UserProfile } from '../types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'login';
  setActivePage: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'login') => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  unreadCount?: number;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activePage,
  setActivePage,
  currentUser,
  onLogout,
  unreadCount = 0,
}) => {
  const handleNavigate = (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'login') => {
    setActivePage(page);
    onClose();
  };

  return (
    <div className={`mobile-drawer ${isOpen ? 'open' : ''}`}>
      <div className="drawer-overlay" onClick={onClose} />
      <nav className="drawer-panel" aria-label="Mobile navigation">
        <div className="drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
              <path d="M32 14C24 8 12 8 6 11v35c6-3 18-3 26 3z" fill="#0D5B49" opacity=".9" />
              <path d="M32 14c8-6 20-6 26-3v35c-6-3-18-3-26 3z" fill="#00B39B" opacity=".75" />
              <circle cx="32" cy="4" r="4" fill="#9B5DE5" />
            </svg>
            <strong>मेनू</strong>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <button
          className={`drawer-link ${activePage === 'home' ? 'active' : ''}`}
          onClick={() => handleNavigate('home')}
        >
          🏠 Home
        </button>
        <button
          className={`drawer-link ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavigate('dashboard')}
        >
          ⚡ Teacher Hub (मुख्य डैशबोर्ड)
        </button>
        <button
          className={`drawer-link ${activePage === 'notifications' ? 'active' : ''}`}
          onClick={() => handleNavigate('notifications')}
        >
          🔔 Notification Center (सूचना केंद्र)
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                backgroundColor: '#EF4444',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 800,
                borderRadius: '9999px',
                padding: '1px 7px',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <button
          className={`drawer-link ${activePage === 'trainings' ? 'active' : ''}`}
          onClick={() => handleNavigate('trainings')}
        >
          🎓 Trainings (प्रशिक्षण व दीक्षा)
        </button>
        <button
          className={`drawer-link ${activePage === 'duties' ? 'active' : ''}`}
          onClick={() => handleNavigate('duties')}
        >
          🛡️ Duties (विशेष दायित्व व रोस्टर)
        </button>
        <button
          className={`drawer-link ${activePage === 'portals' ? 'active' : ''}`}
          onClick={() => handleNavigate('portals')}
        >
          🌐 Portals & Apps (सरकारी पोर्टल)
        </button>
        <button
          className={`drawer-link ${activePage === 'govt_orders' ? 'active' : ''}`}
          onClick={() => handleNavigate('govt_orders')}
        >
          📜 Govt Orders (शासनादेश व आदेश)
        </button>
        <button
          className={`drawer-link ${activePage === 'meetings' ? 'active' : ''}`}
          onClick={() => handleNavigate('meetings')}
        >
          🤝 Meetings (बैठकें व गुरु-गोष्ठी)
        </button>
        <button
          className={`drawer-link ${activePage === 'sheets' ? 'active' : ''}`}
          onClick={() => handleNavigate('sheets')}
        >
          📋 School Sheets
        </button>
        <button
          className="drawer-link"
          onClick={() => {
            handleNavigate('dashboard');
            setTimeout(() => {
              const el = document.getElementById('quick-notes');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        >
          📌 Quick Notes
        </button>

        <div className="drawer-divider" />

        {currentUser ? (
          <>
            <div style={{ padding: '8px 14px', fontSize: '0.85rem', color: 'var(--ink2)' }}>
              लॉगिन: <strong>{currentUser.name}</strong>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{currentUser.email}</div>
            </div>
            <button
              className="drawer-link"
              onClick={() => {
                onLogout();
                onClose();
              }}
              style={{ color: 'var(--danger)' }}
            >
              🚪 लॉगआउट करें
            </button>
          </>
        ) : (
          <>
            <button
              className={`drawer-link ${activePage === 'login' ? 'active' : ''}`}
              onClick={() => handleNavigate('login')}
            >
              🔐 Login / Sign Up
            </button>
            <button
              className="btn btn-neon drawer-cta"
              onClick={() => handleNavigate('dashboard')}
            >
              Start Free →
            </button>
          </>
        )}
      </nav>
    </div>
  );
};
