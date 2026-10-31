import React from 'react';
import { UserProfile } from '../types';
import { UserRole } from '../types/settingsAndPrivacy';

interface HeaderProps {
  activePage: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'classes' | 'rollover' | 'safeguards' | 'login';
  setActivePage: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'classes' | 'rollover' | 'safeguards' | 'login') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  unreadCount?: number;
  onOpenSearch?: () => void;
  onOpenSettings?: (initialTab?: 'general' | 'school' | 'notifications' | 'privacy' | 'backup') => void;
  activeRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  theme,
  toggleTheme,
  isDrawerOpen,
  setIsDrawerOpen,
  currentUser,
  onLogout,
  unreadCount = 0,
  onOpenSearch,
  onOpenSettings,
  activeRole = 'teacher',
  onRoleChange,
}) => {
  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="header-logo"
          style={{ background: 'none', border: 'none', padding: 0 }}
          onClick={() => setActivePage('home')}
        >
          <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
            <defs>
              <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#0D5B49" />
                <stop offset="1" stopColor="#00F5D4" />
              </linearGradient>
            </defs>
            <path d="M32 14C24 8 12 8 6 11v35c6-3 18-3 26 3z" fill="url(#lg1)" opacity=".9" />
            <path d="M32 14c8-6 20-6 26-3v35c-6-3-18-3-26 3z" fill="#0D5B49" opacity=".75" />
            <line x1="32" y1="14" x2="32" y2="49" stroke="#00F5D4" strokeWidth="2" />
            <circle cx="20" cy="6" r="3" fill="#00F5D4" />
            <circle cx="32" cy="2" r="3.5" fill="#9B5DE5" />
            <circle cx="44" cy="6" r="3" fill="#F15BB5" />
            <circle cx="32" cy="28" r="2.5" fill="#00F5D4" />
          </svg>
          <span className="header-logo-text">
            TEACHER HUB
            <span className="header-logo-sub">बेसिक शिक्षक डैशबोर्ड</span>
          </span>
        </button>

        <nav className="header-nav" aria-label="Main menu">
          <button
            type="button"
            className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => setActivePage('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            ⚡ Teacher Hub
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'safeguards' ? 'active' : ''}`}
            onClick={() => setActivePage('safeguards')}
            title="कार्य सुरक्षा, दैनिक चेकलिस्ट व समीक्षा (Safeguards & Reviews)"
          >
            🛡️ Safeguards
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'classes' ? 'active' : ''}`}
            onClick={() => setActivePage('classes')}
          >
            📚 My Classes
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'rollover' ? 'active' : ''}`}
            onClick={() => setActivePage('rollover')}
            title="वार्षिक सत्र परिवर्तन विजार्ड (Annual Session Rollover)"
          >
            🔄 Rollover
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'notifications' ? 'active' : ''}`}
            onClick={() => setActivePage('notifications')}
            style={{ position: 'relative' }}
          >
            🔔 Alerts
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-6px',
                  backgroundColor: '#EF4444',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '9999px',
                  padding: '1px 5px',
                  lineHeight: '1.2',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'trainings' ? 'active' : ''}`}
            onClick={() => setActivePage('trainings')}
          >
            🎓 Trainings
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'duties' ? 'active' : ''}`}
            onClick={() => setActivePage('duties')}
          >
            🛡️ Duties
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'portals' ? 'active' : ''}`}
            onClick={() => setActivePage('portals')}
          >
            🌐 Portals & Apps
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'govt_orders' ? 'active' : ''}`}
            onClick={() => setActivePage('govt_orders')}
          >
            📜 Govt Orders
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'meetings' ? 'active' : ''}`}
            onClick={() => setActivePage('meetings')}
          >
            🤝 Meetings
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'sheets' ? 'active' : ''}`}
            onClick={() => setActivePage('sheets')}
          >
            Sheets
          </button>
          {activePage === 'home' && (
            <>
              <a href="#features" className="nav-link">
                Features
              </a>
              <a href="#pricing" className="nav-link">
                Pricing
              </a>
              <a href="#faq" className="nav-link">
                FAQ
              </a>
            </>
          )}
        </nav>

        <div className="header-actions">
          {/* Universal Search Button */}
          <button
            type="button"
            onClick={onOpenSearch || (() => setActivePage('safeguards'))}
            className="nav-link"
            style={{
              background: 'rgba(0, 245, 212, 0.08)',
              border: '1px solid rgba(0, 245, 212, 0.25)',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="सार्वभौमिक खोज (Ctrl+K) - सभी मॉड्यूल में खोजें"
          >
            <span>🔍</span>
            <span className="hidden sm:inline">खोजें</span>
            <kbd style={{ fontSize: '10px', opacity: 0.7, padding: '1px 4px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px' }}>Ctrl+K</kbd>
          </button>

          {/* Direct Bell Icon in Actions */}
          <button
            type="button"
            onClick={() => setActivePage('notifications')}
            className={`nav-link ${activePage === 'notifications' ? 'active' : ''}`}
            style={{
              position: 'relative',
              background: activePage === 'notifications' ? 'rgba(0, 245, 212, 0.15)' : 'none',
              border: 'none',
              padding: '6px 10px',
              fontSize: '16px',
              cursor: 'pointer',
              borderRadius: '12px',
            }}
            title="सूचना व रिमाइंडर केंद्र (Notification Center)"
          >
            🔔
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  backgroundColor: '#EF4444',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 900,
                  borderRadius: '9999px',
                  padding: '1px 4px',
                  minWidth: '15px',
                  textAlign: 'center',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Role Indicator / Quick Toggle */}
          {onRoleChange && (
            <button
              type="button"
              onClick={() => {
                const nextRole: UserRole = activeRole === 'teacher' ? 'headmaster' : 'teacher';
                onRoleChange(nextRole);
              }}
              className="nav-link"
              style={{
                background:
                  activeRole === 'teacher'
                    ? 'rgba(13, 91, 73, 0.14)'
                    : 'rgba(155, 93, 229, 0.18)',
                border:
                  activeRole === 'teacher'
                    ? '1px solid rgba(0, 245, 212, 0.3)'
                    : '1px solid rgba(155, 93, 229, 0.45)',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="भूमिका बदलें: शिक्षक (डिफ़ॉल्ट) अथवा प्रधानाध्यापक/Admin दृश्य"
            >
              <span>{activeRole === 'teacher' ? '🧑‍🏫' : '🏫'}</span>
              <span className="hidden md:inline">
                {activeRole === 'teacher' ? 'Teacher' : 'Head/Admin'}
              </span>
            </button>
          )}

          {/* Settings, DPDP Privacy & Local Backup Button */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => onOpenSettings('general')}
              className="nav-link"
              style={{
                background: 'rgba(0, 245, 212, 0.08)',
                border: '1px solid rgba(0, 245, 212, 0.25)',
                padding: '6px 10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="सेटिंग्स, विद्यालय प्रोफ़ाइल, DPDP डेटा गोपनीयता व JSON बैकअप (Settings & Backup)"
            >
              <span>⚙️</span>
              <span className="hidden lg:inline">सेटिंग्स</span>
            </button>
          )}

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            type="button"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActivePage('dashboard')}
                title={currentUser.email}
              >
                👤 {currentUser.name.split(' ')[0]}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onLogout}
                style={{ padding: '8px 12px' }}
                title="लॉगआउट"
              >
                🚪
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${activePage === 'login' ? 'active' : ''}`}
                onClick={() => setActivePage('login')}
              >
                Login
              </button>
              <button
                type="button"
                className="btn btn-neon btn-sm"
                onClick={() => setActivePage('dashboard')}
              >
                Start Free
              </button>
            </>
          )}

          <button
            className="hamburger"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
            type="button"
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
};
