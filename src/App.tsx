import React, { useState, useEffect, useRef } from 'react';
import { Header, WorkspaceSidebar, WorkspaceTopbar } from './components/Header';
import { MobileDrawer } from './components/MobileDrawer';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Sheets } from './pages/Sheets';
import { Login } from './pages/Login';
import { PortalsManager } from './components/PortalsManager';
import { GovtOrdersManager } from './components/GovtOrdersManager';
import { MeetingsManager } from './components/MeetingsManager';
import { TrainingsManager } from './components/TrainingsManager';
import { DutiesManager } from './components/DutiesManager';
import { NotificationCenter } from './components/NotificationCenter';
import { MyClassesManager } from './components/MyClassesManager';
import { AnnualRolloverWizard } from './components/AnnualRolloverWizard';
import { SafeguardsHub } from './components/SafeguardsHub';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { useReminderService } from './utils/useReminderService';
import { getStoredUser, setStoredUser, supabase } from './supabase';
import { UserProfile } from './types';
import { Task } from './utils/taskStatusSystem';
import { Duty } from './types/duty';
import {
  MeetingItem,
  TrainingItem,
  GovtOrderItem,
  getInitialTeacherHubTasks,
  getInitialTeacherHubMeetings,
  getInitialTeacherHubTrainings,
  getInitialTeacherHubGovtOrders,
} from './data/teacherHubSampleData';
import { getSampleDuties } from './utils/trainingsAndDutiesManager';
import { INITIAL_PORTAL_APPS } from './data/portalAppData';
import { getSampleClassSections } from './utils/myClassesManager';
import { PortalApp } from './types/portalApp';
import { ClassSection } from './types/classSection';
import { SettingsModal } from './components/SettingsModal';
import { AppSettings, UserRole } from './types/settingsAndPrivacy';
import {
  getStoredAppSettings,
  saveStoredAppSettings,
  restoreBackupBundle,
} from './utils/privacyAndSecurityManager';
import {
  CLOUD_SYNC_BROADCAST_CHANNEL,
  syncLocalDataToCloud,
} from './utils/cloudSyncManager';
import {
  ThemeMode,
  getBrowserInitialTheme,
  getNextTheme,
  applyThemeToDom,
  normalizeTheme,
  THEME_STORAGE_KEY,
} from './utils/themeManager';

export const App: React.FC = () => {
  // Theme management — applies synchronously to <html> and <body> so all dynamic Tailwind dark:* and CSS token elements update immediately
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const initial = getBrowserInitialTheme();
    applyThemeToDom(initial);
    return initial;
  });

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageOrCustomTheme = (e: Event) => {
      if (e.type === 'btd-theme-changed') {
        const customEvt = e as CustomEvent<{ theme?: ThemeMode }>;
        const next = normalizeTheme(customEvt.detail?.theme);
        if (next) {
          setTheme((prev) => (prev === next ? prev : next));
        }
        return;
      }
      try {
        const stored = normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
        if (stored) {
          setTheme((prev) => {
            if (prev !== stored) {
              applyThemeToDom(stored);
              return stored;
            }
            return prev;
          });
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('btd-theme-changed', handleStorageOrCustomTheme);
    window.addEventListener('storage', handleStorageOrCustomTheme);
    return () => {
      window.removeEventListener('btd-theme-changed', handleStorageOrCustomTheme);
      window.removeEventListener('storage', handleStorageOrCustomTheme);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = getNextTheme(prev);
      applyThemeToDom(next);
      return next;
    });
  };

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Reminders Service Layer (runs on app load + every 15 minutes)
  const reminderService = useReminderService(showToast);

  // Page Routing
  const [activePage, setActivePage] = useState<
    'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'classes' | 'rollover' | 'safeguards' | 'login'
  >(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('dashboard')) return 'dashboard';
    if (hash.includes('safeguard') || hash.includes('review') || hash.includes('summary')) return 'safeguards';
    if (hash.includes('rollover') || hash.includes('session')) return 'rollover';
    if (hash.includes('class')) return 'classes';
    if (hash.includes('notif') || hash.includes('alert') || hash.includes('remind')) return 'notifications';
    if (hash.includes('train')) return 'trainings';
    if (hash.includes('dut') || hash.includes('roster')) return 'duties';
    if (hash.includes('portal')) return 'portals';
    if (hash.includes('order') || hash.includes('shashanadesh') || hash.includes('govt')) return 'govt_orders';
    if (hash.includes('meet')) return 'meetings';
    if (hash.includes('sheets')) return 'sheets';
    if (hash.includes('login')) return 'login';
    return 'home';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('dashboard')) setActivePage('dashboard');
      else if (hash.includes('safeguard') || hash.includes('review') || hash.includes('summary')) setActivePage('safeguards');
      else if (hash.includes('rollover') || hash.includes('session')) setActivePage('rollover');
      else if (hash.includes('class')) setActivePage('classes');
      else if (hash.includes('notif') || hash.includes('alert') || hash.includes('remind')) setActivePage('notifications');
      else if (hash.includes('train')) setActivePage('trainings');
      else if (hash.includes('dut') || hash.includes('roster')) setActivePage('duties');
      else if (hash.includes('portal')) setActivePage('portals');
      else if (hash.includes('order') || hash.includes('shashanadesh') || hash.includes('govt')) setActivePage('govt_orders');
      else if (hash.includes('meet')) setActivePage('meetings');
      else if (hash.includes('sheets')) setActivePage('sheets');
      else if (hash.includes('login')) setActivePage('login');
      else if (hash.includes('home') || hash === '') setActivePage('home');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (
    page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'classes' | 'rollover' | 'safeguards' | 'login'
  ) => {
    setActivePage(page);
    window.location.hash =
      page === 'home'
        ? ''
        : page === 'safeguards'
        ? 'safeguards'
        : page === 'govt_orders'
        ? 'govt-orders'
        : page === 'meetings'
        ? 'meetings'
        : page === 'trainings'
        ? 'trainings'
        : page === 'duties'
        ? 'duties'
        : page === 'notifications'
        ? 'notifications'
        : page === 'classes'
        ? 'classes'
        : page === 'rollover'
        ? 'rollover'
        : page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // User Profile & Authentication
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        const profile: UserProfile = {
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'शिक्षक जी',
          email: u.email || '',
        };
        setCurrentUser(profile);
        setStoredUser(profile);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const profile: UserProfile = {
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'शिक्षक जी',
          email: u.email || '',
        };
        setCurrentUser(profile);
        setStoredUser(profile);
      } else {
        // do not forcibly remove if user logged in via local mode
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    setCurrentUser(null);
    setStoredUser(null);
    showToast('👋 सफलतापूर्वक लॉगआउट हो गए');
    navigateTo('home');
  };

  // Mobile drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Global search modal & keyboard shortcut (Ctrl+K / Cmd+K)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Global App Settings, Role Setup, DPDP Privacy & Local JSON Backup Modal
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getStoredAppSettings());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<
    'general' | 'school' | 'notifications' | 'privacy' | 'backup'
  >('general');

  useEffect(() => {
    const syncAppSettings = () => {
      setAppSettings(getStoredAppSettings());
    };
    window.addEventListener('th-settings-updated', syncAppSettings);
    window.addEventListener('storage', syncAppSettings);
    return () => {
      window.removeEventListener('th-settings-updated', syncAppSettings);
      window.removeEventListener('storage', syncAppSettings);
    };
  }, []);

  const handleUpdateAppSettings = (updated: AppSettings) => {
    saveStoredAppSettings(updated);
    setAppSettings(updated);
    window.dispatchEvent(new Event('th-settings-updated'));
  };

  const handleGlobalRoleChange = (newRole: UserRole) => {
    handleUpdateAppSettings({
      ...appSettings,
      role: newRole,
    });
    showToast(
      newRole === 'teacher'
        ? '🧑‍🏫 शिक्षक दृश्य (Teacher View - Default) सक्रिय किया गया'
        : '🏫 प्रधानाध्यापक / Admin निरीक्षण दृश्य सक्रिय किया गया'
    );
    if (activePage !== 'dashboard') {
      navigateTo('dashboard');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Shared Data State for Safeguards & Universal Search across modules
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('th-tasks');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getInitialTeacherHubTasks();
  });

  const [duties, setDuties] = useState<Duty[]>(() => {
    try {
      const saved = localStorage.getItem('th-duties');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getSampleDuties();
  });

  const [meetings, setMeetings] = useState<MeetingItem[]>(() => {
    try {
      const saved = localStorage.getItem('th-meetings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getInitialTeacherHubMeetings();
  });

  const [trainings, setTrainings] = useState<TrainingItem[]>(() => {
    try {
      const saved = localStorage.getItem('th-trainings');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getInitialTeacherHubTrainings();
  });

  const [orders, setOrders] = useState<GovtOrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('th-govt-orders');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getInitialTeacherHubGovtOrders();
  });

  const [portals, setPortals] = useState<PortalApp[]>(() => {
    try {
      const saved = localStorage.getItem('th-portal-apps');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_PORTAL_APPS;
  });

  const [classes, setClasses] = useState<ClassSection[]>(() => {
    try {
      const saved = localStorage.getItem('th-class-sections');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getSampleClassSections();
  });

  const refreshAllData = () => {
    try {
      const t = localStorage.getItem('th-tasks');
      if (t) setTasks(JSON.parse(t));
      const d = localStorage.getItem('th-duties');
      if (d) setDuties(JSON.parse(d));
      const m = localStorage.getItem('th-meetings');
      if (m) setMeetings(JSON.parse(m));
      const tr = localStorage.getItem('th-trainings');
      if (tr) setTrainings(JSON.parse(tr));
      const o = localStorage.getItem('th-govt-orders');
      if (o) setOrders(JSON.parse(o));
      const p = localStorage.getItem('th-portal-apps');
      if (p) setPortals(JSON.parse(p));
      const c = localStorage.getItem('th-class-sections');
      if (c) setClasses(JSON.parse(c));
      setAppSettings(getStoredAppSettings());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    window.addEventListener('storage', refreshAllData);
    window.addEventListener('focus', refreshAllData);
    return () => {
      window.removeEventListener('storage', refreshAllData);
      window.removeEventListener('focus', refreshAllData);
    };
  }, []);

  const handleTasksUpdated = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    try {
      localStorage.setItem('th-tasks', JSON.stringify(updatedTasks));
      window.dispatchEvent(new CustomEvent('th-local-data-mutated', { detail: { key: 'th-tasks' } }));
    } catch {
      // ignore
    }
  };

  // Automatic Multi-Device Cloud Sync Watcher when Cloud Sync is enabled in Settings
  useEffect(() => {
    const isSyncEnabled = Boolean(
      appSettings.cloudSyncEnabled ?? appSettings.cloudSync?.enabled
    );
    if (!isSyncEnabled) return;

    let debounceTimer: any = null;
    const handleLocalMutation = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncLocalDataToCloud().catch(() => {
          // ignore background sync errors
        });
      }, 250);
    };

    window.addEventListener('th-local-data-mutated', handleLocalMutation);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(CLOUD_SYNC_BROADCAST_CHANNEL);
        bc.onmessage = (event) => {
          if (event.data?.type === 'CLOUD_SYNC_PUSH' && event.data?.envelope?.bundle) {
            restoreBackupBundle(event.data.envelope.bundle, 'merge');
            refreshAllData();
          }
        };
      } catch {
        // ignore
      }
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('th-local-data-mutated', handleLocalMutation);
      if (bc) {
        try {
          bc.close();
        } catch {
          // ignore
        }
      }
    };
  }, [appSettings.cloudSyncEnabled, appSettings.cloudSync?.enabled]);

  const handleQuickEnterWorkspace = () => {
    if (!currentUser) {
      const demoUser: UserProfile = {
        name: 'श्री राजेश कुमार शर्मा',
        email: 'rajesh.sharma.prt@basicshiksha.up.gov.in',
      };
      setCurrentUser(demoUser);
      setStoredUser(demoUser);
    }
    navigateTo('dashboard');
  };

  const isPublicLayout = activePage === 'home' || activePage === 'login';

  const headerProps = {
    activePage,
    setActivePage: navigateTo,
    theme,
    toggleTheme,
    isDrawerOpen,
    setIsDrawerOpen,
    currentUser,
    onLogout: handleLogout,
    unreadCount: reminderService.unreadCount,
    onOpenSearch: () => setIsGlobalSearchOpen(true),
    onOpenSettings: (
      tab: 'general' | 'school' | 'notifications' | 'privacy' | 'backup' = 'general'
    ) => {
      setSettingsModalTab(tab);
      setIsSettingsModalOpen(true);
    },
    activeRole: appSettings.role,
    onRoleChange: handleGlobalRoleChange,
    onQuickEnterWorkspace: handleQuickEnterWorkspace,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activePage={activePage}
        setActivePage={navigateTo}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadCount={reminderService.unreadCount}
      />

      {isPublicLayout ? (
        <>
          <Header {...headerProps} />
          <main style={{ flex: 1 }}>
            {activePage === 'home' && (
              <Home
                onNavigate={(page) => {
                  if (page === 'dashboard' && !currentUser) {
                    handleQuickEnterWorkspace();
                  } else {
                    navigateTo(page);
                  }
                }}
                onToast={showToast}
              />
            )}
            {activePage === 'login' && (
              <Login
                onSuccess={(profile) => {
                  setCurrentUser(profile);
                  setStoredUser(profile);
                }}
                onNavigate={navigateTo}
                onToast={showToast}
              />
            )}
          </main>
          <Footer
            variant={activePage === 'home' ? 'full' : 'slim'}
            onNavigate={navigateTo}
            onToast={showToast}
          />
        </>
      ) : (
        <div className="app-shell-authenticated">
          <WorkspaceSidebar {...headerProps} />
          <div className="app-main-area">
            <WorkspaceTopbar {...headerProps} />
            <main className="app-workspace-content">
              {activePage === 'notifications' && (
                <NotificationCenter
                  notifications={reminderService.notifications}
                  settings={reminderService.settings}
                  unreadCount={reminderService.unreadCount}
                  lastCheckedAt={reminderService.lastCheckedAt}
                  isScanning={reminderService.isScanning}
                  onScanNow={reminderService.scanNow}
                  onSnooze={reminderService.handleSnooze}
                  onDismiss={reminderService.handleDismiss}
                  onMarkRead={reminderService.handleMarkRead}
                  onMarkAllRead={reminderService.handleMarkAllRead}
                  onClearAll={reminderService.handleClearAll}
                  onUpdateSettings={reminderService.updateSettings}
                  onNavigate={navigateTo}
                  onToast={showToast}
                />
              )}
              {activePage === 'classes' && (
                <MyClassesManager
                  onToast={showToast}
                  onNavigate={navigateTo}
                  currentUser={currentUser}
                />
              )}
              {activePage === 'rollover' && (
                <AnnualRolloverWizard
                  onToast={showToast}
                  onNavigate={navigateTo}
                  currentUser={currentUser}
                />
              )}
              {activePage === 'dashboard' && (
                <Dashboard
                  currentUser={currentUser}
                  onToast={showToast}
                  onNavigate={navigateTo}
                />
              )}
              {activePage === 'trainings' && (
                <TrainingsManager
                  onToast={showToast}
                  onNavigate={navigateTo}
                  currentUser={currentUser}
                />
              )}
              {activePage === 'duties' && (
                <DutiesManager
                  onToast={showToast}
                  onNavigate={navigateTo}
                  currentUser={currentUser}
                />
              )}
              {activePage === 'portals' && (
                <PortalsManager
                  onToast={showToast}
                  onNavigate={navigateTo}
                />
              )}
              {activePage === 'govt_orders' && (
                <GovtOrdersManager
                  onToast={showToast}
                  onNavigate={navigateTo}
                  currentUser={currentUser}
                />
              )}
              {activePage === 'meetings' && (
                <MeetingsManager
                  onToast={showToast}
                  onNavigate={navigateTo}
                  currentUser={currentUser}
                />
              )}
              {activePage === 'sheets' && (
                <Sheets
                  currentUser={currentUser}
                  onToast={showToast}
                  onNavigate={navigateTo}
                />
              )}
              {activePage === 'safeguards' && (
                <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
                  <SafeguardsHub
                    tasks={tasks}
                    onTasksUpdated={handleTasksUpdated}
                    duties={duties}
                    meetings={meetings}
                    trainings={trainings}
                    orders={orders}
                    portals={portals}
                    classes={classes}
                    onToast={showToast}
                    onNavigate={navigateTo}
                    currentUser={currentUser}
                  />
                </div>
              )}
            </main>
            <Footer
              variant="slim"
              onNavigate={navigateTo}
              onToast={showToast}
            />
          </div>
        </div>
      )}

      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        tasks={tasks}
        orders={orders}
        meetings={meetings}
        trainings={trainings}
        portals={portals}
        classes={classes}
        onNavigate={(page) => {
          navigateTo(page);
          setIsGlobalSearchOpen(false);
        }}
        onSelectTask={(task: Task) => {
          navigateTo('dashboard');
          setIsGlobalSearchOpen(false);
          showToast(`कार्य चुना गया: ${task.title}`);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={appSettings}
        onUpdateSettings={handleUpdateAppSettings}
        onDataRestored={() => {
          refreshAllData();
          window.dispatchEvent(new Event('storage'));
        }}
        onToast={showToast}
        initialTab={settingsModalTab}
      />

      <Toast message={toastMessage} />
    </div>
  );
};

export default App;
