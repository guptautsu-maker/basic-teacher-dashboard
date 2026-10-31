import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
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
import { useReminderService } from './utils/useReminderService';
import { getStoredUser, setStoredUser, supabase } from './supabase';
import { UserProfile } from './types';

export const App: React.FC = () => {
  // Theme management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('btd-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('btd-theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
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
    'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'classes' | 'login'
  >(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('dashboard')) return 'dashboard';
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
    page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'classes' | 'login'
  ) => {
    setActivePage(page);
    window.location.hash =
      page === 'home'
        ? ''
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        activePage={activePage}
        setActivePage={navigateTo}
        theme={theme}
        toggleTheme={toggleTheme}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpen={setIsDrawerOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadCount={reminderService.unreadCount}
      />

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activePage={activePage}
        setActivePage={navigateTo}
        currentUser={currentUser}
        onLogout={handleLogout}
        unreadCount={reminderService.unreadCount}
      />

      <div style={{ flex: 1 }}>
        {activePage === 'home' && <Home onNavigate={navigateTo} onToast={showToast} />}
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
      </div>

      <Footer
        variant={activePage === 'home' ? 'full' : 'slim'}
        onNavigate={navigateTo}
        onToast={showToast}
      />

      <Toast message={toastMessage} />
    </div>
  );
};

export default App;
