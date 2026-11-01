import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { UserRole } from '../types/settingsAndPrivacy';

export type AppPage =
  | 'home'
  | 'dashboard'
  | 'portals'
  | 'govt_orders'
  | 'meetings'
  | 'sheets'
  | 'trainings'
  | 'duties'
  | 'notifications'
  | 'classes'
  | 'rollover'
  | 'safeguards'
  | 'login';

interface HeaderProps {
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
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

const PRIMARY_NAV: Array<{ id: AppPage; label: string }> = [
  { id: 'dashboard', label: 'डैशबोर्ड (Hub)' },
  { id: 'classes', label: 'कक्षाएं (Classes)' },
  { id: 'govt_orders', label: 'शासनादेश (Orders)' },
  { id: 'portals', label: 'पोर्टल (Portals)' },
];

const MORE_NAV: Array<{ id: AppPage; label: string; sub: string }> = [
  { id: 'trainings', label: 'प्रशिक्षण (Trainings)', sub: 'दीक्षा व कोर्स प्रगति' },
  { id: 'duties', label: 'ड्यूटी रोस्टर (Duties)', sub: 'MDM, प्रार्थना व साप्ताहिक ड्यूटी' },
  { id: 'meetings', label: 'बैठकें (Meetings)', sub: 'SMC, PTM व संकुल बैठक' },
  { id: 'safeguards', label: 'कार्य समीक्षा (Safeguards)', sub: 'दैनिक चेकलिस्ट व साप्ताहिक सारांश' },
  { id: 'rollover', label: 'सत्र परिवर्तन (Rollover)', sub: 'वार्षिक छात्र प्रोन्नति विजार्ड' },
  { id: 'sheets', label: 'स्कूल शीट्स (Sheets)', sub: 'प्रपत्र व तालिकाएं' },
  { id: 'home', label: 'मुख्य पृष्ठ (Home)', sub: 'परिचय व विशेषताएं' },
];

export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  theme,
  toggleTheme,
  setIsDrawerOpen,
  currentUser,
  onLogout,
  unreadCount = 0,
  onOpenSearch,
  onOpenSettings,
  activeRole = 'teacher',
  onRoleChange,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isMoreActive = MORE_NAV.some((item) => item.id === activePage);
  const activeMoreItem = MORE_NAV.find((item) => item.id === activePage);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand Logo */}
        <button
          type="button"
          className="header-logo"
          onClick={() => setActivePage('dashboard')}
          aria-label="Teacher Hub Dashboard"
        >
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
            <path d="M32 14C24 8 12 8 6 11v35c6-3 18-3 26 3z" fill="#0D5B49" />
            <path d="M32 14c8-6 20-6 26-3v35c-6-3-18-3-26 3z" fill="#107C63" />
            <line x1="32" y1="14" x2="32" y2="49" stroke="#A7F3D0" strokeWidth="2" />
          </svg>
          <span className="header-logo-text">
            Teacher Hub
            <span className="header-logo-sub">शिक्षक डैशबोर्ड</span>
          </span>
        </button>

        {/* Minimal Primary Navigation */}
        <nav className="header-nav" aria-label="Main menu">
          {PRIMARY_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => {
                setActivePage(item.id);
                setMoreOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}

          {/* Clean "More" Dropdown for Secondary Modules */}
          <div className="nav-more-wrap" ref={moreRef}>
            <button
              type="button"
              className={`nav-link nav-more-btn ${isMoreActive || moreOpen ? 'active' : ''}`}
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-expanded={moreOpen}
              aria-haspopup="true"
            >
              <span>{activeMoreItem ? activeMoreItem.label.split(' ')[0] : 'अन्य मॉड्यूल (More)'}</span>
              <span className="nav-caret" aria-hidden="true">▾</span>
            </button>

            {moreOpen && (
              <div className="nav-dropdown" role="menu" aria-label="अन्य मॉड्यूल">
                {MORE_NAV.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={`nav-dropdown-item ${activePage === item.id ? 'active' : ''}`}
                    onClick={() => {
                      setActivePage(item.id);
                      setMoreOpen(false);
                    }}
                  >
                    <span className="nav-dropdown-title">{item.label}</span>
                    <span className="nav-dropdown-sub">{item.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Minimal Right Actions */}
        <div className="header-actions">
          {/* Search (Ctrl+K) */}
          <button
            type="button"
            onClick={onOpenSearch || (() => setActivePage('safeguards'))}
            className="header-icon-btn header-search-btn"
            title="खोजें (Ctrl+K)"
            aria-label="खोजें (Search Ctrl+K)"
          >
            <span>🔍</span>
            <span className="header-search-label">खोजें</span>
            <kbd className="header-kbd">⌘K</kbd>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setActivePage('notifications')}
            className={`header-icon-btn ${activePage === 'notifications' ? 'active' : ''}`}
            title="सूचना केंद्र (Notifications)"
            aria-label={`सूचना केंद्र (${unreadCount} अपठित)`}
          >
            <span>🔔</span>
            {unreadCount > 0 && <span className="header-badge-dot">{unreadCount}</span>}
          </button>

          {/* Role Quick Switch (Compact) */}
          {onRoleChange && (
            <button
              type="button"
              onClick={() =>
                onRoleChange(activeRole === 'teacher' ? 'headmaster' : 'teacher')
              }
              className="header-icon-btn header-role-btn"
              title="भूमिका बदलें: शिक्षक / प्रधानाध्यापक"
              aria-label="भूमिका बदलें"
            >
              <span>{activeRole === 'teacher' ? '🧑‍🏫' : '🏫'}</span>
              <span className="header-role-label">
                {activeRole === 'teacher' ? 'शिक्षक' : 'प्रधानाध्यापक'}
              </span>
            </button>
          )}

          {/* Settings */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => onOpenSettings('general')}
              className="header-icon-btn"
              title="सेटिंग्स व बैकअप (Settings)"
              aria-label="सेटिंग्स खोलें"
            >
              ⚙️
            </button>
          )}

          {/* Theme Toggle */}
          <button
            className="header-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'लाइट मोड' : 'डार्क मोड'}
            type="button"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* User / Login */}
          {currentUser ? (
            <button
              type="button"
              className="header-user-btn"
              onClick={onLogout}
              title={`${currentUser.name} — लॉगआउट करने के लिए क्लिक करें`}
            >
              {currentUser.name.split(' ')[0]} 🚪
            </button>
          ) : (
            <button
              type="button"
              className={`header-user-btn ${activePage === 'login' ? 'active' : ''}`}
              onClick={() => setActivePage('login')}
            >
              लॉगिन
            </button>
          )}

          {/* Mobile Menu Trigger */}
          <button
            className="hamburger"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="मेनू खोलें (Open menu)"
            type="button"
          >
            ☰
          </button>
        </div>
      </div>
    </header>
  );
};
