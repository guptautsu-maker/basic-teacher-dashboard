import React from 'react';
import { UserProfile } from '../types';
import { AppPage } from './Header';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  unreadCount?: number;
}

const DRAWER_ITEMS: Array<{ id: AppPage; label: string }> = [
  { id: 'dashboard', label: 'डैशबोर्ड (Teacher Hub)' },
  { id: 'keepalive', label: '🔋 Supabase Keep-Alive & Cron' },
  { id: 'classes', label: 'मेरी कक्षाएं व उपस्थिति (My Classes)' },
  { id: 'govt_orders', label: 'शासनादेश व परिपत्र (Govt Orders)' },
  { id: 'portals', label: 'सरकारी पोर्टल (Portals & Apps)' },
  { id: 'trainings', label: 'प्रशिक्षण (Trainings)' },
  { id: 'duties', label: 'ड्यूटी रोस्टर (Duties)' },
  { id: 'meetings', label: 'बैठकें (Meetings)' },
  { id: 'safeguards', label: 'कार्य समीक्षा व रिपोर्ट (Safeguards)' },
  { id: 'rollover', label: 'वार्षिक सत्र परिवर्तन (Session Rollover)' },
  { id: 'notifications', label: 'सूचना केंद्र (Notifications)' },
  { id: 'sheets', label: 'स्कूल शीट्स (Sheets)' },
  { id: 'home', label: 'मुख्य पृष्ठ (Home)' },
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
      <nav className="drawer-panel" aria-label="मोबाइल नेविगेशन (Mobile navigation)">
        <div className="drawer-head">
          <strong>मेनू (Menu)</strong>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="मेनू बंद करें (Close menu)"
          >
            ✕
          </button>
        </div>

        <div className="drawer-list">
          {DRAWER_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`drawer-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
            >
              <span>{item.label}</span>
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
              <strong>{currentUser.name}</strong>
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
              लॉगआउट करें (Logout)
            </button>
          </div>
        ) : (
          <div className="drawer-footer">
            <button
              type="button"
              className={`drawer-link ${activePage === 'login' ? 'active' : ''}`}
              onClick={() => handleNavigate('login')}
            >
              लॉगिन / साइन अप (Login)
            </button>
          </div>
        )}
      </nav>
    </div>
  );
};
