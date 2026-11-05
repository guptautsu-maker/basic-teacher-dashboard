import React from 'react';
import { UserProfile } from '../types';
import { AppPage } from './Header';
import { useAppLanguage } from '../utils/i18nManager';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  unreadCount?: number;
}

const DRAWER_ITEMS: Array<{ id: AppPage; labelHi: string; labelEn: string }> = [
  { id: 'dashboard', labelHi: '⚡ आज के काम (Main Dashboard)', labelEn: "⚡ Today's Work (Main Dashboard)" },
  { id: 'classes', labelHi: '📚 बच्चों की हाज़िरी (My Classes)', labelEn: '📚 Attendance & My Classes' },
  { id: 'sheets', labelHi: '📋 एमडीएम व स्कूल रजिस्टर (MDM)', labelEn: '📋 MDM & School Registers' },
  { id: 'portals', labelHi: '🌐 सरकारी पोर्टल (Portals)', labelEn: '🌐 Govt Portals (Prerna/eHRMS)' },
  { id: 'govt_orders', labelHi: '📜 शासनादेश (Govt Orders)', labelEn: '📜 Govt Orders & Notices' },
  { id: 'trainings', labelHi: '🎓 प्रशिक्षण (Trainings)', labelEn: '🎓 Teacher Trainings' },
  { id: 'duties', labelHi: '🛡️ ड्यूटी रोस्टर (Duties)', labelEn: '🛡️ School Duty Roster' },
  { id: 'meetings', labelHi: '🤝 बैठकें (PTM / SMC)', labelEn: '🤝 Meetings (PTM / SMC)' },
  { id: 'safeguards', labelHi: '📄 पीडीएफ रिपोर्ट व समीक्षा', labelEn: '📄 PDF Report & Review' },
  { id: 'notifications', labelHi: '🔔 रिमाइंडर अलर्ट (Alerts)', labelEn: '🔔 Reminders & Alerts' },
  { id: 'rollover', labelHi: '🔄 वार्षिक सत्र परिवर्तन', labelEn: '🔄 Session Rollover' },
  { id: 'keepalive', labelHi: '🔋 Supabase Keep-Alive', labelEn: '🔋 Supabase Keep-Alive' },
  { id: 'home', labelHi: '🏠 मुख्य पृष्ठ (Home)', labelEn: '🏠 Home Page' },
];

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activePage,
  setActivePage,
  currentUser,
  onLogout,
  unreadCount = 0,
}) => {
  const { isEn, toggleLanguage, t, tr } = useAppLanguage();

  const handleNavigate = (page: AppPage) => {
    setActivePage(page);
    onClose();
  };

  return (
    <div
      className={`mobile-drawer ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
    >
      <div className="drawer-overlay" onClick={onClose} />
      <nav className="drawer-panel" aria-label={t('मोबाइल नेविगेशन', 'Mobile Navigation')}>
        <div className="drawer-head">
          <strong>{t('मेनू (Menu)', 'Menu')}</strong>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className="py-1 px-2.5 rounded-lg bg-[#DCEEE6] dark:bg-[#173A2F] text-[#0D5B49] dark:text-[#3FBF9B] text-xs font-bold"
            >
              🌐 {isEn ? 'हिंदी' : 'English'}
            </button>
            <button
              type="button"
              className="drawer-close"
              onClick={onClose}
              aria-label={t('मेनू बंद करें', 'Close menu')}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="drawer-list">
          {DRAWER_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`drawer-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
            >
              <span>{isEn ? item.labelEn : item.labelHi}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="drawer-badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="drawer-divider" />

        {currentUser ? (
          <div className="drawer-footer">
            <div className="drawer-user-info">
              <strong>{tr(currentUser.name)}</strong>
              <span>{currentUser.email}</span>
            </div>
            <button
              type="button"
              className="drawer-link drawer-logout"
              onClick={() => {
                onLogout();
                onClose();
              }}
            >
              {t('लॉगआउट करें (Logout)', 'Logout')}
            </button>
          </div>
        ) : (
          <div className="drawer-footer">
            <button
              type="button"
              className={`drawer-link ${activePage === 'login' ? 'active' : ''}`}
              onClick={() => handleNavigate('login')}
            >
              {t('लॉगिन / साइन अप (Login)', 'Login / Sign Up')}
            </button>
          </div>
        )}
      </nav>
    </div>
  );
};
