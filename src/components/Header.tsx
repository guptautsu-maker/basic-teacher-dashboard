import React from 'react';
import { UserProfile } from '../types';
import { UserRole } from '../types/settingsAndPrivacy';
import { useAppLanguage } from '../utils/i18nManager';

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
  labelEn: string;
  subLabel?: string;
}

export const SIDEBAR_GROUPS: Array<{
  groupTitle: string;
  groupTitleEn: string;
  items: SidebarNavItem[];
}> = [
  {
    groupTitle: 'रोज़ के मुख्य काम (Daily Work)',
    groupTitleEn: 'Daily School Work',
    items: [
      { id: 'dashboard', icon: '⚡', label: 'आज के काम (Home)', labelEn: "Today's Work (Home)" },
      { id: 'classes', icon: '📚', label: 'बच्चों की हाज़िरी (Classes)', labelEn: 'Attendance & Classes' },
      { id: 'sheets', icon: '📋', label: 'एमडीएम व रजिस्टर (MDM)', labelEn: 'MDM & School Sheets' },
      { id: 'portals', icon: '🌐', label: 'सरकारी पोर्टल (Portals)', labelEn: 'Govt Portals (Prerna/eHRMS)' },
      { id: 'govt_orders', icon: '📜', label: 'सरकारी आदेश (Orders)', labelEn: 'Govt Orders & Notices' },
    ],
  },
  {
    groupTitle: 'स्कूल की अन्य गतिविधियाँ',
    groupTitleEn: 'School Activities',
    items: [
      { id: 'trainings', icon: '🎓', label: 'प्रशिक्षण (Trainings)', labelEn: 'Teacher Trainings' },
      { id: 'duties', icon: '🛡️', label: 'ड्यूटी रोस्टर (Duties)', labelEn: 'School Duty Roster' },
      { id: 'meetings', icon: '🤝', label: 'बैठकें (PTM / SMC)', labelEn: 'Meetings (PTM / SMC)' },
    ],
  },
  {
    groupTitle: 'रिपोर्ट व अन्य सुविधाएँ',
    groupTitleEn: 'Reports & Extra Tools',
    items: [
      { id: 'safeguards', icon: '📄', label: 'पीडीएफ रिपोर्ट व समीक्षा', labelEn: 'PDF Report & Review' },
      { id: 'notifications', icon: '🔔', label: 'रिमाइंडर अलर्ट (Alerts)', labelEn: 'Reminders & Alerts' },
      { id: 'rollover', icon: '🔄', label: 'नया सत्र (Session Rollover)', labelEn: 'New Session Rollover' },
      { id: 'keepalive', icon: '🔋', label: 'Supabase Keep-Alive', labelEn: 'Supabase Keep-Alive' },
    ],
  },
];

export const PAGE_TITLES: Record<
  AppPage,
  { title: string; subtitle: string; titleEn: string; subtitleEn: string }
> = {
  home: {
    title: 'मुख्य पृष्ठ',
    subtitle: 'सरल शिक्षक ऐप',
    titleEn: 'Home',
    subtitleEn: 'Simple Teacher App',
  },
  login: {
    title: 'लॉगिन',
    subtitle: 'शिक्षक खाता प्रवेश',
    titleEn: 'Teacher Login',
    subtitleEn: 'Sign in with Google or 4-Digit PIN',
  },
  dashboard: {
    title: 'शिक्षक का सरल डैशबोर्ड',
    subtitle: 'बड़े बटन दबाएँ और अपना रोज़ का काम आसानी से पूरा करें',
    titleEn: 'Simple Teacher Dashboard',
    subtitleEn: 'Tap any big button below to finish your daily school work easily',
  },
  classes: {
    title: 'बच्चों की हाज़िरी व कक्षाएं',
    subtitle: 'उपस्थिति लगाएं और छात्र सूची देखें',
    titleEn: 'Attendance & My Classes',
    subtitleEn: 'Mark daily student attendance and view class lists',
  },
  govt_orders: {
    title: 'सरकारी आदेश (शासनादेश)',
    subtitle: 'नए आदेश सरल भाषा में पढ़ें',
    titleEn: 'Government Orders & Notices',
    subtitleEn: 'Read important BSA/BEO orders and action points simply',
  },
  portals: {
    title: 'सरकारी पोर्टल (1-क्लिक लिंक्स)',
    subtitle: 'प्रेरणा, मानव संपदा, यू-डायस व दीक्षा सीधे खोलें',
    titleEn: 'Government Portals (1-Click Open)',
    subtitleEn: 'Open Prerna, Manav Sampada, UDISE+ and DIKSHA directly',
  },
  trainings: {
    title: 'प्रशिक्षण (Trainings)',
    subtitle: 'दीक्षा व विभागीय प्रशिक्षण प्रगति',
    titleEn: 'Teacher Trainings',
    subtitleEn: 'Track DIKSHA and departmental training progress',
  },
  duties: {
    title: 'ड्यूटी रोस्टर (Duties)',
    subtitle: 'MDM, प्रार्थना सभा व साप्ताहिक ड्यूटी',
    titleEn: 'School Duty Roster',
    subtitleEn: 'MDM, morning assembly and weekly school duties',
  },
  meetings: {
    title: 'बैठकें (PTM / SMC)',
    subtitle: 'अभिभावक व विद्यालय प्रबंध समिति बैठक रिकॉर्ड',
    titleEn: 'Meetings (PTM & SMC)',
    subtitleEn: 'Parent-Teacher and SMC meeting notes & agenda',
  },
  sheets: {
    title: 'एमडीएम (MDM) व स्कूल रजिस्टर',
    subtitle: 'मध्याह्न भोजन, उपस्थिति व ग्रांट शीट्स',
    titleEn: 'MDM & School Registers',
    subtitleEn: 'Mid-Day Meal, attendance and school grant sheets',
  },
  safeguards: {
    title: 'पीडीएफ रिपोर्ट व कार्य समीक्षा',
    subtitle: 'प्रिंटेबल सारांश व दैनिक चेकलिस्ट',
    titleEn: 'PDF Report & Work Review',
    subtitleEn: 'Printable summary report and daily checklist',
  },
  rollover: {
    title: 'नए सत्र में छात्र प्रोन्नति',
    subtitle: 'अगली कक्षा में बच्चों को प्रमोट करें',
    titleEn: 'New Session Student Promotion',
    subtitleEn: 'Promote students to the next class for the new academic year',
  },
  notifications: {
    title: 'सूचना केंद्र (Reminders)',
    subtitle: 'ज़रूरी काम के रिमाइंडर अलर्ट',
    titleEn: 'Notifications & Reminders',
    subtitleEn: 'Important deadline reminders and alerts',
  },
  keepalive: {
    title: 'Supabase Keep-Alive & Cron',
    subtitle: 'डेटाबेस REST API पिंग व GitHub Actions वर्कफ़्लो',
    titleEn: 'Supabase Keep-Alive & Cron',
    subtitleEn: 'Database REST API Ping & GitHub Actions Workflow',
  },
};

/**
 * 1. Pre-Login Ultra-Minimalistic Top Header
 */
export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  theme,
  toggleTheme,
  currentUser,
  onQuickEnterWorkspace,
}) => {
  const { isEn, toggleLanguage, t } = useAppLanguage();

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
            <span className="header-logo-sub">
              {t('सरल शिक्षक ऐप', 'Simple Teacher App')}
            </span>
          </span>
        </button>

        {/* Center: Ultra-Minimalistic Links */}
        <nav className="header-minimal-nav" aria-label="Public navigation">
          <button
            type="button"
            className={`minimal-nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => setActivePage('home')}
          >
            {t('मुख्य पृष्ठ', 'Home')}
          </button>
          <button
            type="button"
            className="minimal-nav-link"
            onClick={() => scrollToSection('features')}
          >
            {t('विशेषताएं', 'Features')}
          </button>
          <button
            type="button"
            className="minimal-nav-link"
            onClick={() => scrollToSection('faq')}
          >
            {t('सवाल-जवाब', 'FAQs')}
          </button>
        </nav>

        {/* Right: Prominent 1-Click Language Toggle + Theme + CTA */}
        <div className="header-actions">
          <button
            type="button"
            onClick={toggleLanguage}
            data-testid="public-lang-toggle-btn"
            className="py-1.5 px-3 rounded-lg border-2 border-[#0D5B49] dark:border-[#3FBF9B] bg-[#DCEEE6]/60 dark:bg-[#173A2F] text-[#0D5B49] dark:text-[#3FBF9B] font-bold text-xs sm:text-sm cursor-pointer transition-all hover:bg-[#0D5B49] hover:text-white"
            title={t('अंग्रेजी में बदलें (Switch to English)', 'हिंदी में बदलें (Switch to Hindi)')}
          >
            {isEn ? '🌐 हिंदी में देखें' : '🌐 English'}
          </button>

          <button
            className="header-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? t('लाइट मोड', 'Light Mode') : t('डार्क मोड', 'Dark Mode')}
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
              {t('ऐप खोलें →', 'Open App →')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className={`header-user-btn ${activePage === 'login' ? 'active' : ''}`}
                onClick={() => setActivePage('login')}
              >
                {t('लॉगिन', 'Login')}
              </button>
              <button
                type="button"
                className="minimal-cta-btn"
                onClick={
                  onQuickEnterWorkspace || (() => setActivePage('login'))
                }
              >
                {t('सीधे शुरू करें →', 'Start Now →')}
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
  const { isEn, toggleLanguage, t, tr } = useAppLanguage();

  return (
    <aside className="app-left-sidebar" aria-label={t('मुख्य कार्यक्षेत्र मेनू', 'Main Workspace Menu')}>
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
            <span className="header-logo-sub">
              {t('सरल शिक्षक ऐप', 'Simple Teacher App')}
            </span>
          </span>
        </button>
      </div>

      {/* Scrollable Vertical Navigation Groups */}
      <nav className="sidebar-nav-scroll" aria-label="Main workspace menu">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.groupTitle} className="sidebar-nav-group">
            <div className="sidebar-group-label">
              {isEn ? group.groupTitleEn : group.groupTitle}
            </div>
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
                    <span className="sidebar-nav-text">
                      {isEn ? item.labelEn : item.label}
                    </span>
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
        {/* 1-Click Language Switcher + Settings Row */}
        <div className="sidebar-footer-tools">
          <button
            type="button"
            onClick={toggleLanguage}
            className="sidebar-tool-btn font-bold text-[#0D5B49] dark:text-[#3FBF9B]"
            title={t('Switch to English', 'हिंदी में बदलें')}
          >
            <span>🌐</span>
            <span>{isEn ? 'हिंदी करें' : 'English'}</span>
          </button>

          {onOpenSettings && (
            <button
              type="button"
              onClick={() => onOpenSettings('general')}
              className="sidebar-tool-btn"
              title={t('सेटिंग्स व बैकअप', 'Settings & Backup')}
            >
              <span>⚙️</span>
              <span>{t('सेटिंग्स', 'Settings')}</span>
            </button>
          )}
        </div>

        {/* Logged-in User Card + Logout */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {isEn ? 'R' : (currentUser?.name || 'शि')[0]}
            </div>
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">
                {tr(currentUser?.name || 'श्री राजेश कुमार शर्मा')}
              </div>
              <div className="sidebar-user-sub">
                {activeRole === 'teacher'
                  ? t('सहायक अध्यापक', 'Assistant Teacher')
                  : t('प्रधानाध्यापक', 'Headmaster')}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={onLogout}
            title={t('लॉगआउट करें', 'Logout')}
            aria-label={t('लॉगआउट (Logout)', 'Logout')}
          >
            {t('🚪 लॉगआउट', '🚪 Logout')}
          </button>
        </div>

        {onRoleChange && (
          <button
            type="button"
            onClick={() =>
              onRoleChange(activeRole === 'teacher' ? 'headmaster' : 'teacher')
            }
            className="mt-1.5 w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold text-[#52645B] dark:text-[#9DB0A5] hover:bg-[#E6EDE8] dark:hover:bg-[#1E2E26] transition-colors text-center cursor-pointer"
          >
            {activeRole === 'teacher'
              ? t('🏫 प्रधानाध्यापक व्यू में बदलें', '🏫 Switch to Headmaster View')
              : t('🧑‍🏫 शिक्षक व्यू में वापस जाएं', '🧑‍🏫 Back to Teacher View')}
          </button>
        )}
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
  const { isEn, toggleLanguage, t } = useAppLanguage();
  const pageMeta = PAGE_TITLES[activePage] || PAGE_TITLES.dashboard;

  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-left">
        <button
          className="hamburger workspace-hamburger"
          onClick={() => setIsDrawerOpen(true)}
          aria-label={t('मेनू खोलें', 'Open Menu')}
          type="button"
        >
          ☰
        </button>
        <div>
          <h1 className="workspace-topbar-title">
            {isEn ? pageMeta.titleEn : pageMeta.title}
          </h1>
          <p className="workspace-topbar-sub">
            {isEn ? pageMeta.subtitleEn : pageMeta.subtitle}
          </p>
        </div>
      </div>

      <div className="header-actions">
        {/* 1-Click Language Switcher Button (Always Visible!) */}
        <button
          type="button"
          onClick={toggleLanguage}
          data-testid="global-lang-toggle-btn"
          className="py-1.5 px-3 rounded-xl border-2 border-[#0D5B49] dark:border-[#3FBF9B] bg-[#DCEEE6]/70 dark:bg-[#173A2F] text-[#0D5B49] dark:text-[#3FBF9B] hover:bg-[#0D5B49] hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
          title={t('Click to switch app to English', 'हिंदी भाषा में बदलने के लिए क्लिक करें')}
          aria-label={isEn ? 'Switch to Hindi' : 'Switch to English'}
        >
          <span>🌐</span>
          <span>{isEn ? 'हिंदी' : 'English'}</span>
        </button>

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="header-icon-btn header-search-btn"
            title={t('खोजें (Ctrl+K)', 'Search (Ctrl+K)')}
            aria-label={t('खोजें (Search Ctrl+K)', 'Search (Ctrl+K)')}
          >
            <span>🔍</span>
            <span className="header-search-label">{t('खोजें', 'Search')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActivePage('notifications')}
          className={`header-icon-btn ${activePage === 'notifications' ? 'active' : ''}`}
          title={t('सूचना केंद्र (Notifications)', 'Notifications')}
          aria-label={t(`सूचना केंद्र (${unreadCount} अपठित)`, `Notifications (${unreadCount} unread)`)}
        >
          <span>🔔</span>
          {unreadCount > 0 && <span className="header-badge-dot">{unreadCount}</span>}
        </button>

        {onOpenSettings && (
          <button
            type="button"
            onClick={() => onOpenSettings('general')}
            className="header-icon-btn"
            title={t('सेटिंग्स व भाषा', 'Settings & Language')}
            aria-label={t('सेटिंग्स खोलें', 'Open Settings')}
          >
            ⚙️
          </button>
        )}

        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? t('लाइट मोड', 'Light Mode') : t('डार्क मोड', 'Dark Mode')}
          type="button"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};
