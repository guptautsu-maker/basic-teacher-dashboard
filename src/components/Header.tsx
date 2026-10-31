import React from 'react';
import { UserProfile } from '../types';

interface HeaderProps {
  activePage: 'home' | 'dashboard' | 'sheets' | 'login';
  setActivePage: (page: 'home' | 'dashboard' | 'sheets' | 'login') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
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
            BASIC TEACHER
            <span className="header-logo-sub">DASHBOARD</span>
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
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-link ${activePage === 'sheets' ? 'active' : ''}`}
            onClick={() => setActivePage('sheets')}
          >
            Sheets
          </button>
          {activePage === 'dashboard' && (
            <>
              <a href="#portals" className="nav-link">
                Portals
              </a>
              <a href="#quick-notes" className="nav-link">
                Quick Notes
              </a>
              <a href="#tools" className="nav-link">
                Tools
              </a>
            </>
          )}
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
