import React, { useState } from 'react';
import { AppPage } from './Header';
import { usePWAInstall } from '../utils/usePWAInstall';

interface MobileBottomNavProps {
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  unreadCount?: number;
  onOpenSettings?: (tab?: 'general' | 'school' | 'notifications' | 'privacy' | 'backup') => void;
  onOpenSearch?: () => void;
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
  onToast?: (msg: string) => void;
}

const PRIMARY_TABS: Array<{
  id: AppPage;
  icon: string;
  labelHi: string;
  labelEn: string;
}> = [
  { id: 'dashboard', icon: '⚡', labelHi: 'डैशबोर्ड', labelEn: 'Home' },
  { id: 'classes', icon: '📚', labelHi: 'कक्षाएं', labelEn: 'Classes' },
  { id: 'govt_orders', icon: '📜', labelHi: 'आदेश', labelEn: 'Orders' },
  { id: 'keepalive', icon: '🔋', labelHi: 'Keep-Alive', labelEn: 'Supabase' },
];

const ALL_ANDROID_APPS: Array<{
  id: AppPage;
  icon: string;
  label: string;
  sub: string;
}> = [
  { id: 'dashboard', icon: '⚡', label: 'डैशबोर्ड', sub: 'Teacher Hub' },
  { id: 'keepalive', icon: '🔋', label: 'Keep-Alive', sub: 'Supabase Cron' },
  { id: 'classes', icon: '📚', label: 'मेरी कक्षाएं', sub: 'उपस्थिति व छात्र' },
  { id: 'govt_orders', icon: '📜', label: 'शासनादेश', sub: 'आदेश व PDF' },
  { id: 'portals', icon: '🌐', label: 'सरकारी पोर्टल', sub: 'प्रेरणा, मानव संपदा' },
  { id: 'trainings', icon: '🎓', label: 'प्रशिक्षण', sub: 'दीक्षा व कोर्स' },
  { id: 'duties', icon: '🛡️', label: 'ड्यूटी रोस्टर', sub: 'MDM व सभा' },
  { id: 'meetings', icon: '🤝', label: 'बैठकें', sub: 'PTM व SMC' },
  { id: 'sheets', icon: '📋', label: 'स्कूल शीट्स', sub: 'पंजिका व तालिका' },
  { id: 'safeguards', icon: '✅', label: 'कार्य समीक्षा', sub: 'रिपोर्ट व PDF' },
  { id: 'rollover', icon: '🔄', label: 'सत्र परिवर्तन', sub: 'प्रोन्नति विज़ार्ड' },
  { id: 'notifications', icon: '🔔', label: 'सूचना केंद्र', sub: 'रिमाइंडर अलर्ट' },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  setActivePage,
  unreadCount = 0,
  onOpenSettings,
  onOpenSearch,
  theme,
  toggleTheme,
  onToast,
}) => {
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleSelectPage = (page: AppPage) => {
    setActivePage(page);
    setIsLauncherOpen(false);
  };

  const handleInstallNativeApp = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        onToast?.('📲 Android होम स्क्रीन पर ऐप इंस्टॉल हो रहा है!');
      }
      return;
    }
    onToast?.('📲 Chrome मेनू (⋮) → "Add to Home screen / Install app" चुनें');
  };

  const isSecondaryPageActive = !PRIMARY_TABS.some((t) => t.id === activePage);

  return (
    <>
      {/* Native Android Material 3 Bottom Sheet App Launcher */}
      {isLauncherOpen && (
        <div
          className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden"
          onClick={() => setIsLauncherOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Android App Launcher Sheet"
        >
          <div
            className="w-full max-h-[82vh] rounded-t-3xl bg-white dark:bg-[#16231D] border-t border-[#D3DDD6] dark:border-[#2B3C34] p-4 pb-24 overflow-y-auto shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Android Drag Handle */}
            <div className="w-12 h-1.5 rounded-full bg-[#D3DDD6] dark:bg-[#2B3C34] mx-auto" />

            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base font-bold text-[#13231C] dark:text-[#E7F0EA]">
                  📱 सभी ऐप्स व मॉड्यूल (Android Launcher)
                </h3>
                <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                  किसी भी मॉड्यूल पर टैप करके तुरंत खोलें
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLauncherOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] font-bold text-xs flex items-center justify-center"
                aria-label="बंद करें"
              >
                ✕
              </button>
            </div>

            {/* Quick Android System Controls Row */}
            <div className="grid grid-cols-3 gap-2">
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLauncherOpen(false);
                    onOpenSearch();
                  }}
                  className="p-2.5 rounded-2xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center gap-1.5 text-xs font-bold text-[#13231C] dark:text-[#E7F0EA] active:scale-95 transition-transform"
                >
                  <span>🔍</span>
                  <span>खोजें</span>
                </button>
              )}
              {toggleTheme && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2.5 rounded-2xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center gap-1.5 text-xs font-bold text-[#13231C] dark:text-[#E7F0EA] active:scale-95 transition-transform"
                >
                  <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span>{theme === 'dark' ? 'लाइट मोड' : 'डार्क मोड'}</span>
                </button>
              )}
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsLauncherOpen(false);
                    onOpenSettings('general');
                  }}
                  className="p-2.5 rounded-2xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center gap-1.5 text-xs font-bold text-[#13231C] dark:text-[#E7F0EA] active:scale-95 transition-transform"
                >
                  <span>⚙️</span>
                  <span>सेटिंग्स</span>
                </button>
              )}
            </div>

            {/* 3-Column Android App Icon Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {ALL_ANDROID_APPS.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPage(item.id)}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition-all active:scale-95 relative ${
                      isActive
                        ? 'bg-[#DCEEE6] dark:bg-[#173A2F] border-[#0D5B49] dark:border-[#3FBF9B] text-[#0D5B49] dark:text-[#3FBF9B]'
                        : 'bg-[#F8FAF9] dark:bg-[#0F1814] border-[#D3DDD6] dark:border-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA]'
                    }`}
                  >
                    <span className="text-xl leading-none">{item.icon}</span>
                    <span className="text-xs font-bold leading-tight line-clamp-1">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-[#52645B] dark:text-[#9DB0A5] line-clamp-1">
                      {item.sub}
                    </span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Install Native Android WebAPK Card */}
            {!isInstalled && (
              <div className="p-3.5 rounded-2xl bg-[#0D5B49] text-white flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold">
                    📲 Native Android App की तरह इंस्टॉल करें
                  </div>
                  <div className="text-[11px] text-white/80">
                    फुल-स्क्रीन स्टैंडअलोन मोड व ऑफ़लाइन एक्सेस
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleInstallNativeApp}
                  className="py-2 px-3 rounded-xl bg-white text-[#0D5B49] font-bold text-xs shrink-0 active:scale-95"
                >
                  इंस्टॉल करें
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Native Android Bottom Navigation Bar (Visible on Mobile/Tablet < 1024px) */}
      <nav
        className="android-bottom-nav lg:hidden"
        aria-label="Android Bottom Navigation"
        data-testid="android-bottom-nav"
      >
        {PRIMARY_TABS.map((tab) => {
          const isActive = activePage === tab.id && !isLauncherOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectPage(tab.id)}
              data-testid={`android-nav-${tab.id}`}
              className={`android-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="android-nav-pill" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="android-nav-label">{tab.labelHi}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsLauncherOpen((prev) => !prev)}
          data-testid="android-nav-launcher"
          className={`android-bottom-nav-item ${
            isLauncherOpen || isSecondaryPageActive ? 'active' : ''
          }`}
        >
          <span className="android-nav-pill relative" aria-hidden="true">
            ⊞
            {unreadCount > 0 && (
              <span className="android-nav-badge">{unreadCount}</span>
            )}
          </span>
          <span className="android-nav-label">सभी ऐप्स</span>
        </button>
      </nav>
    </>
  );
};
