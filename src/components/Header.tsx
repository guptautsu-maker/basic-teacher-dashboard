import React from 'react';
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
  | 'keepalive'
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
  onQuickEnterWorkspace?: () => void;
}

export interface SidebarNavItem {
  id: AppPage;
  icon: string;
  label: string;
  subLabel?: string;
}

export const SIDEBAR_GROUPS: Array<{
  groupTitle: string;
  items: SidebarNavItem[];
}> = [
  {
    groupTitle: 'मुख्य कार्यक्षेत्र (Core)',
    items: [
      { id: 'dashboard', icon: '⚡', label: 'डैशबोर्ड (Dashboard)' },
      { id: 'classes', icon: '📚', label: 'मेरी कक्षाएं (Classes)' },
      { id: 'govt_orders', icon: '📜', label: 'शासनादेश (Orders)' },
      { id: 'portals', icon: '🌐', label: 'सरकारी पोर्टल (Portals)' },
    ],
  },
  {
    groupTitle: 'विद्यालय व अकादमिक (School)',
    items: [
      { id: 'trainings', icon: '🎓', label: 'प्रशिक्षण (Trainings)' },
      { id: 'duties', icon: '🛡️', label: 'ड्यूटी रोस्टर (Duties)' },
      { id: 'meetings', icon: '🤝', label: 'बैठकें (Meetings)' },
      { id: 'sheets', icon: '📋', label: 'स्कूल शीट्स (Sheets)' },
    ],
  },
  {
    groupTitle: 'समीक्षा व प्रबंधन (Admin)',
    items: [
      { id: 'keepalive', icon: '🔋', label: 'Supabase Keep-Alive' },
      { id: 'safeguards', icon: '✅', label: 'कार्य समीक्षा (Safeguards)' },
      { id: 'rollover', icon: '🔄', label: 'सत्र परिवर्तन (Rollover)' },
      { id: 'notifications', icon: '🔔', label: 'सूचना केंद्र (Alerts)' },
    ],
  },
];

export const PAGE_TITLES: Record<AppPage, { title: string; subtitle: string }> = {
  home: { title: 'मुख्य पृष्ठ', subtitle: 'बेसिक शिक्षक डैशबोर्ड' },
  login: { title: 'लॉगिन', subtitle: 'शिक्षक खाता प्रवेश' },
  dashboard: { title: 'शिक्षक डैशबोर्ड (Teacher Hub)', subtitle: 'आज के कार्य, समय-सीमा व त्वरित स्थिति' },
  classes: { title: 'मेरी कक्षाएं (My Classes)', subtitle: 'उपस्थिति, छात्र सूची व समय-सारणी' },
  govt_orders: { title: 'शासनादेश (Govt Orders)', subtitle: 'महत्वपूर्ण आदेश, सारांश व कार्य बिंदु' },
  portals: { title: 'सरकारी पोर्टल (Portals)', subtitle: 'प्रेरणा, मानव संपदा, यू-डायस व दीक्षा लिंक्स' },
  trainings: { title: 'प्रशिक्षण (Trainings)', subtitle: 'दीक्षा व विभागीय प्रशिक्षण प्रगति' },
  duties: { title: 'ड्यूटी रोस्टर (Duties)', subtitle: 'MDM, प्रार्थना सभा व साप्ताहिक विद्यालय ड्यूटी' },
  meetings: { title: 'बैठकें (Meetings)', subtitle: 'SMC, PTM व संकुल बैठक एजेंडा व कार्यवृत्त' },
  sheets: { title: 'स्कूल शीट्स (Sheets)', subtitle: 'प्रपत्र, रजिस्टर व उपयोगी तालिकाएं' },
  safeguards: { title: 'कार्य समीक्षा व सुरक्षा (Safeguards)', subtitle: 'दैनिक चेकलिस्ट, साप्ताहिक सारांश व पीडीएफ रिपोर्ट' },
  rollover: { title: 'वार्षिक सत्र परिवर्तन (Session Rollover)', subtitle: 'छात्र प्रोन्नति व नए शैक्षणिक सत्र की तैयारी' },
  notifications: { title: 'सूचना केंद्र (Notifications)', subtitle: 'आगामी डेडलाइन व रिमाइंडर अलर्ट' },
  keepalive: { title: 'Supabase Keep-Alive & Cron', subtitle: 'डेटाबेस REST API पिंग व GitHub Actions वर्कफ़्लो' },
};

/**
 * 1. Pre-Login Ultra-Minimalistic Top Header
 * Shown before login on public pages (Home / Login).
 */
export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  theme,
  toggleTheme,
  currentUser,
  onQuickEnterWorkspace,
}) => {
  const scrollToSection = (sectionId: string) => {
    if (activePage !== 'home') {
      setActivePage('home');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="site-header site-header-minimal" role="banner">
      <div className="header-inner header-inner-minimal">
        {/* Left: Clean Brand Logo */}
        <button
          type="button"
          className="header-logo"
          onClick={() => setActivePage('home')}
          aria-label="Teacher Hub Home"
        >
          <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
            <path d="M32 14C24 8 12 8 6 11v35c6-3 18-3 26 3z" fill="#0D5B49" />
            <path d="M32 14c8-6 20-6 26-3v35c-6-3-18-3-26 3z" fill="#107C63" />
            <line x1="32" y1="14" x2="32" y2="49" stroke="#A7F3D0" strokeWidth="2" />
          </svg>
          <span className="header-logo-text">
            Teacher Hub
            <span className="header-logo-sub">बेसिक शिक्षक डैशबोर्ड</span>
          </span>
        </button>

        {/* Center: Ultra-Minimalistic Links */}
        <nav className="header-minimal-nav" aria-label="Public navigation">
          <button
            type="button"
            className={`minimal-nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => setActivePage('home')}
          >
            मुख्य पृष्ठ
          </button>
          <button
            type="button"
            className="minimal-nav-link"
            onClick={() => scrollToSection('features')}
          >
            विशेषताएं
          </button>
          <button
            type="button"
            className="minimal-nav-link"
            onClick={() => scrollToSection('faq')}
          >
            सवाल-जवाब
          </button>
        </nav>

        {/* Right: Minimal Theme + Login + Primary CTA */}
        <div className="header-actions">
          <button
            className="header-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'लाइट मोड' : 'डार्क मोड'}
            type="button"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {currentUser ? (
            <button
              type="button"
              className="minimal-cta-btn"
              onClick={() => setActivePage('dashboard')}
            >
              डैशबोर्ड खोलें →
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`header-user-btn ${activePage === 'login' ? 'active' : ''}`}
                onClick={() => setActivePage('login')}
              >
                लॉगिन
              </button>
              <button
                type="button"
                className="minimal-cta-btn"
                onClick={
                  onQuickEnterWorkspace || (() => setActivePage('login'))
                }
              >
                मुफ़्त शुरू करें →
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

/**
 * 2. Post-Login Vertical Left Sidebar
 * Shown on the left side after login / inside workspace modules.
 */
export const WorkspaceSidebar: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  currentUser,
  onLogout,
  unreadCount = 0,
  onOpenSettings,
  activeRole = 'teacher',
  onRoleChange,
}) => {
  return (
    <aside className="app-left-sidebar" aria-label="मुख्य कार्यक्षेत्र मेनू (Left Sidebar)">
      {/* Top Brand Header */}
      <div className="sidebar-brand-bar">
        <button
          type="button"
          className="header-logo"
          onClick={() => setActivePage('dashboard')}
          aria-label="Teacher Hub Dashboard"
        >
          <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
            <path d="M32 14C24 8 12 8 6 11v35c6-3 18-3 26 3z" fill="#0D5B49" />
            <path d="M32 14c8-6 20-6 26-3v35c-6-3-18-3-26 3z" fill="#107C63" />
            <line x1="32" y1="14" x2="32" y2="49" stroke="#A7F3D0" strokeWidth="2" />
          </svg>
          <span className="header-logo-text">
            Teacher Hub
            <span className="header-logo-sub">शिक्षक कार्यक्षेत्र</span>
          </span>
        </button>
      </div>

      {/* Scrollable Vertical Navigation Groups */}
      <nav className="sidebar-nav-scroll" aria-label="Main workspace menu">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.groupTitle} className="sidebar-nav-group">
            <div className="sidebar-group-label">{group.groupTitle}</div>
            <div className="sidebar-group-items">
              {group.items.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setActivePage(item.id)}
                  >
                    <span className="sidebar-nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="sidebar-nav-text">{item.label}</span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="sidebar-badge">{unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom User & Controls Footer */}
      <div className="sidebar-footer">
        {/* Role Switcher + Settings Row */}
        <div className="sidebar-footer-tools">
          {onRoleChange && (
            <button
              type="button"
              onClick={() =>
                onRoleChange(activeRole === 'teacher' ? 'headmaster' : 'teacher')
              }
              className="sidebar-tool-btn"
              title="भूमिका बदलें: शिक्षक / प्रधानाध्यापक"
            >
              <span>{activeRole === 'teacher' ? '🧑‍🏫' : '🏫'}</span>
              <span>{activeRole === 'teacher' ? 'शिक्षक मोड' : 'प्रधानाध्यापक'}</span>
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              onClick={() => onOpenSettings('general')}
              className="sidebar-tool-btn"
              title="सेटिंग्स व बैकअप"
            >
              <span>⚙️</span>
              <span>सेटिंग्स</span>
            </button>
          )}
        </div>

        {/* Logged-in User Card + Logout */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {(currentUser?.name || 'शि')[0]}
            </div>
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">
                {currentUser?.name || 'श्री राजेश कुमार शर्मा'}
              </div>
              <div className="sidebar-user-sub">
                {activeRole === 'teacher' ? 'सहायक अध्यापक' : 'प्रधानाध्यापक'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={onLogout}
            title="लॉगआउट करें और मुख्य पृष्ठ पर जाएं"
            aria-label="लॉगआउट (Logout)"
          >
            🚪 लॉगआउट
          </button>
        </div>
      </div>
    </aside>
  );
};

/**
 * 3. Post-Login Slim Topbar (Right Content Header)
 */
export const WorkspaceTopbar: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  theme,
  toggleTheme,
  setIsDrawerOpen,
  unreadCount = 0,
  onOpenSearch,
  onOpenSettings,
}) => {
  const pageMeta = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-left">
        <button
          className="hamburger workspace-hamburger"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="मेनू खोलें (Open menu)"
          type="button"
        >
          ☰
        </button>
        <div>
          <h1 className="workspace-topbar-title">{pageMeta.title}</h1>
          <p className="workspace-topbar-sub">{pageMeta.subtitle}</p>
        </div>
      </div>

      <div className="header-actions">
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="header-icon-btn header-search-btn"
            title="खोजें (Ctrl+K)"
            aria-label="खोजें (Search Ctrl+K)"
          >
            <span>🔍</span>
            <span className="header-search-label">खोजें</span>
            <kbd className="header-kbd">⌘K</kbd>
          </button>
        )}

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

        {onOpenSettings && (
          <button
            type="button"
            onClick={() => onOpenSettings('general')}
            className="header-icon-btn"
            title="सेटिंग्स व बैकअप"
            aria-label="सेटिंग्स खोलें"
          >
            ⚙️
          </button>
        )}

        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'लाइट मोड' : 'डार्क मोड'}
          type="button"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};

