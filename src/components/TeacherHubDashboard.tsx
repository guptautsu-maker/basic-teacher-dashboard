import React, { useState, useEffect, useMemo } from 'react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  STATUS_METADATA,
  TASK_CATEGORY_METADATA,
  resolveTaskCategory,
  filterTasksByCategory,
  countTasksByCategory,
  changeTaskStatus,
  syncOverdueTasks,
} from '../utils/taskStatusSystem';
import {
  MeetingItem,
  TrainingItem,
  GovtOrderItem,
  getInitialTeacherHubTasks,
  getInitialTeacherHubMeetings,
  getInitialTeacherHubTrainings,
  getInitialTeacherHubGovtOrders,
} from '../data/teacherHubSampleData';
import { Duty } from '../types/duty';
import { getSampleDuties } from '../utils/trainingsAndDutiesManager';
import {
  getCriticalEscalations,
  generatePendingWorkReportHtml,
  applyEndOfDayAction,
} from '../utils/safeguardsManager';
import { EndOfDayAction } from '../types/safeguards';
import { StartOfDayModal } from './StartOfDayModal';
import { EndOfDayModal } from './EndOfDayModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { PortalApp } from '../types/portalApp';
import { ClassSection } from '../types/classSection';
import { INITIAL_PORTAL_APPS } from '../data/portalAppData';
import { getSampleClassSections } from '../utils/myClassesManager';
import { QuickAddModal } from './QuickAddModal';
import { GovtOrderDetailModal } from './GovtOrderDetailModal';
import { AppSettings, UserRole } from '../types/settingsAndPrivacy';
import {
  getStoredAppSettings,
  saveStoredAppSettings,
} from '../utils/privacyAndSecurityManager';
import { HeadAdminOversightView } from './HeadAdminOversightView';
import { SettingsModal } from './SettingsModal';
import { DemoAndQaModal } from './DemoAndQaModal';
import {
  getStoredAccessibilityPreferences,
  applyAccessibilityPreferencesToDom,
} from '../utils/demoAndQaManager';
import { PrintableSummaryPdfModal } from './PrintableSummaryPdfModal';
import { TaskCompletionChartWidget } from './TaskCompletionChartWidget';
import { PinSecurityModal } from './PinSecurityModal';
import { PWAInstallButton } from './PWAInstallButton';
import { getStoredPinRecord } from '../utils/pinAndGoogleAuthManager';
import { setStoredUser } from '../supabase';

interface TeacherHubDashboardProps {
  onToast: (msg: string) => void;
  currentUser?: { name: string; email: string } | null;
  onNavigate?: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'classes' | 'rollover' | 'safeguards' | 'login') => void;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_BADGES: Record<
  TaskPriority,
  { labelHi: string; labelEn: string; bg: string; text: string; icon: string }
> = {
  urgent: {
    labelHi: 'अति आवश्यक',
    labelEn: 'Urgent',
    bg: 'bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    icon: '🔴',
  },
  high: {
    labelHi: 'उच्च प्राथमिकता',
    labelEn: 'High',
    bg: 'bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-300',
    icon: '🟠',
  },
  medium: {
    labelHi: 'सामान्य',
    labelEn: 'Medium',
    bg: 'bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    icon: '🟡',
  },
  low: {
    labelHi: 'कम प्राथमिकता',
    labelEn: 'Low',
    bg: 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    icon: '🟢',
  },
};

export const TeacherHubDashboard: React.FC<TeacherHubDashboardProps> = ({
  onToast,
  currentUser,
  onNavigate,
}) => {
  // -------------------------------------------------------------
  // Persistent State
  // -------------------------------------------------------------
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('th-tasks');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getInitialTeacherHubTasks();
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

  const [govtOrders, setGovtOrders] = useState<GovtOrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('th-govt-orders');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getInitialTeacherHubGovtOrders();
  });

  // Sync Overdue on mount
  useEffect(() => {
    const syncRes = syncOverdueTasks(tasks, {
      changedBy: 'system_auto_sync',
    });
    if (syncRes.overdueCount > 0) {
      setTasks(syncRes.tasks);
      try {
        localStorage.setItem('th-tasks', JSON.stringify(syncRes.tasks));
      } catch {
        // ignore
      }
    }
  }, []);

  // Listen for storage or focus updates from GovtOrdersManager
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedTasks = localStorage.getItem('th-tasks');
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        const savedOrders = localStorage.getItem('th-govt-orders');
        if (savedOrders) setGovtOrders(JSON.parse(savedOrders));
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Save changes & notify automatic Cloud Sync watcher
  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem('th-tasks', JSON.stringify(newTasks));
      window.dispatchEvent(new CustomEvent('th-local-data-mutated', { detail: { key: 'th-tasks' } }));
    } catch {
      // ignore
    }
  };

  const saveMeetings = (newMeetings: MeetingItem[]) => {
    setMeetings(newMeetings);
    try {
      localStorage.setItem('th-meetings', JSON.stringify(newMeetings));
      window.dispatchEvent(new CustomEvent('th-local-data-mutated', { detail: { key: 'th-meetings' } }));
    } catch {
      // ignore
    }
  };

  const saveTrainings = (newTrainings: TrainingItem[]) => {
    setTrainings(newTrainings);
    try {
      localStorage.setItem('th-trainings', JSON.stringify(newTrainings));
      window.dispatchEvent(new CustomEvent('th-local-data-mutated', { detail: { key: 'th-trainings' } }));
    } catch {
      // ignore
    }
  };

  const saveGovtOrders = (newOrders: GovtOrderItem[]) => {
    setGovtOrders(newOrders);
    try {
      localStorage.setItem('th-govt-orders', JSON.stringify(newOrders));
      window.dispatchEvent(new CustomEvent('th-local-data-mutated', { detail: { key: 'th-govt-orders' } }));
    } catch {
      // ignore
    }
  };

  // -------------------------------------------------------------
  // Modals & UI Controls
  // -------------------------------------------------------------
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTab, setQuickAddTab] = useState<'task' | 'meeting' | 'training'>('task');
  const [selectedOrder, setSelectedOrder] = useState<GovtOrderItem | null>(null);
  const [activeFilterStatus, setActiveFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [activeFilterCategory, setActiveFilterCategory] = useState<TaskCategory | 'all'>('all');
  const [timelineDayOffset, setTimelineDayOffset] = useState<number | 'all'>('all');
  const [activeSectionTab, setActiveSectionTab] = useState<'today' | 'upcoming' | 'orders' | 'tools'>('today');

  // Safeguards Data & Modals
  const [duties, setDuties] = useState<Duty[]>(() => {
    try {
      const saved = localStorage.getItem('th-duties');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getSampleDuties();
  });

  const [portals] = useState<PortalApp[]>(() => {
    try {
      const saved = localStorage.getItem('th-portal-apps');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_PORTAL_APPS;
  });

  const [classes] = useState<ClassSection[]>(() => {
    try {
      const saved = localStorage.getItem('th-class-sections');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getSampleClassSections();
  });

  const [isStartOfDayOpen, setIsStartOfDayOpen] = useState(false);
  const [isEndOfDayOpen, setIsEndOfDayOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Settings, Role Setup, DPDP Privacy & Backup Modal State
  const [appSettings, setAppSettings] = useState<AppSettings>(() => getStoredAppSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    'general' | 'school' | 'notifications' | 'privacy' | 'backup'
  >('general');

  // Demo Teacher Profile, QA Test Checklist & Accessibility Hub Modal State
  const [isDemoQaOpen, setIsDemoQaOpen] = useState(false);
  const [demoQaTab, setDemoQaTab] = useState<'demo' | 'qa' | 'a11y' | 'readme'>('demo');
  const [isPrintablePdfOpen, setIsPrintablePdfOpen] = useState(false);
  const [isPinSecurityOpen, setIsPinSecurityOpen] = useState(false);
  const [pinSecurityMode, setPinSecurityMode] = useState<'setup_pin' | 'google_login' | 'lock_screen'>('setup_pin');
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean>(() => Boolean(getStoredPinRecord()));

  useEffect(() => {
    applyAccessibilityPreferencesToDom(getStoredAccessibilityPreferences());
    const syncSettings = () => {
      setAppSettings(getStoredAppSettings());
    };
    window.addEventListener('th-settings-updated', syncSettings);
    window.addEventListener('storage', syncSettings);
    return () => {
      window.removeEventListener('th-settings-updated', syncSettings);
      window.removeEventListener('storage', syncSettings);
    };
  }, []);

  const handleUpdateSettings = (updated: AppSettings) => {
    saveStoredAppSettings(updated);
    setAppSettings(updated);
    window.dispatchEvent(new Event('th-settings-updated'));
  };

  const handleSwitchRole = (newRole: UserRole) => {
    handleUpdateSettings({
      ...appSettings,
      role: newRole,
    });
    onToast(
      newRole === 'teacher'
        ? '🧑‍🏫 शिक्षक दृश्य (Teacher View - Default) सक्रिय किया गया'
        : '🏫 प्रधानाध्यापक / Admin निरीक्षण दृश्य सक्रिय किया गया'
    );
  };

  const openSettingsWithTab = (
    tab: 'general' | 'school' | 'notifications' | 'privacy' | 'backup'
  ) => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  // Critical Escalations (> 3 days overdue)
  const criticalEscalations = useMemo(() => {
    return getCriticalEscalations(tasks, new Date(), 3);
  }, [tasks]);

  const handlePrintPendingReport = () => {
    setIsPrintablePdfOpen(true);
  };

  // Task status transition
  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    const result = changeTaskStatus({
      task,
      newStatus,
      changedBy: currentUser?.name || 'शिक्षक / Teacher',
      comment: `स्थिति अपडेट: ${STATUS_METADATA[newStatus].labelHi} (${STATUS_METADATA[newStatus].labelEn})`,
    });

    let updatedList = tasks.map((t) => (t.id === task.id ? result.updatedTask : t));

    if (result.nextRecurringTask) {
      updatedList = [result.nextRecurringTask, ...updatedList];
      onToast(
        `कार्य पूर्ण! अगली आवृत्ति का नया कार्य स्वतः जोड़ा गया (${result.nextRecurringTask.deadline?.slice(0, 10)})`
      );
    } else {
      onToast(`स्थिति बदली: ${STATUS_METADATA[newStatus].labelHi}`);
    }

    saveTasks(updatedList);
  };

  // Govt order read/acknowledge
  const handleAcknowledgeOrder = (orderId: string) => {
    const updated = govtOrders.map((o) =>
      o.id === orderId ? { ...o, isAcknowledged: true, isRead: true } : o
    );
    saveGovtOrders(updated);
    onToast('शासनादेश प्राप्ति स्वीकार की गई / Acknowledged');
  };

  const handleMarkOrderRead = (orderId: string) => {
    const updated = govtOrders.map((o) => (o.id === orderId ? { ...o, isRead: true } : o));
    saveGovtOrders(updated);
  };

  // Reset to initial sample data
  const handleResetSampleData = () => {
    if (window.confirm('क्या आप डेमो डेटा पुनः रीसेट करना चाहते हैं? / Reset sample data?')) {
      const freshTasks = getInitialTeacherHubTasks();
      const freshMeetings = getInitialTeacherHubMeetings();
      const freshTrainings = getInitialTeacherHubTrainings();
      const freshOrders = getInitialTeacherHubGovtOrders();
      saveTasks(freshTasks);
      saveMeetings(freshMeetings);
      saveTrainings(freshTrainings);
      saveGovtOrders(freshOrders);
      onToast('डेमो डेटा सफलतापूर्वक रीसेट किया गया / Sample data reset');
    }
  };

  // -------------------------------------------------------------
  // Filtered & Derived Data
  // -------------------------------------------------------------
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Category Counts & Filtered Task List
  const categoryCounts = useMemo(() => countTasksByCategory(tasks), [tasks]);

  const categoryFilteredTasks = useMemo(
    () => filterTasksByCategory(tasks, activeFilterCategory),
    [tasks, activeFilterCategory]
  );

  // Quick Status Counts (respects selected Category filter)
  const statusCounts = useMemo(() => {
    const counts = {
      not_started: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    };
    for (const t of categoryFilteredTasks) {
      if (t.status === 'not_started') counts.not_started++;
      else if (t.status === 'in_progress') counts.in_progress++;
      else if (t.status === 'done') counts.done++;
      else if (t.status === 'overdue') counts.overdue++;
    }
    return counts;
  }, [categoryFilteredTasks]);

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    return categoryFilteredTasks
      .filter((t) => t.status === 'overdue')
      .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
  }, [categoryFilteredTasks]);

  // Today tasks & meetings ("Aaj ka kaam") or filtered by status
  const todayTasks = useMemo(() => {
    return categoryFilteredTasks
      .filter((t) => {
        if (activeFilterStatus !== 'all') {
          return t.status === activeFilterStatus;
        }
        if (t.status === 'overdue') return false; // Overdue is in its own section above
        if (!t.deadline) return false;
        return t.deadline.startsWith(todayStr);
      })
      .sort((a, b) => {
        const weightDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (weightDiff !== 0) return weightDiff;
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return 0;
      });
  }, [categoryFilteredTasks, todayStr, activeFilterStatus]);

  const todayMeetings = useMemo(() => {
    return meetings.filter((m) => m.date === todayStr);
  }, [meetings, todayStr]);

  // Unread Govt Orders
  const unreadGovtOrdersCount = useMemo(() => {
    return govtOrders.filter((o) => !o.isRead || (o.acknowledgementRequired && !o.isAcknowledged))
      .length;
  }, [govtOrders]);

  // Upcoming 7 Days timeline buckets (Days 1 to 7)
  const upcomingTimeline = useMemo(() => {
    const days: Array<{
      offset: number;
      dateStr: string;
      dayLabelHi: string;
      dayLabelEn: string;
      tasks: Task[];
      meetings: MeetingItem[];
      trainings: TrainingItem[];
    }> = [];

    const hindiDays = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
    const engDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayIdx = d.getDay();

      const dayTasks = categoryFilteredTasks.filter(
        (t) => t.deadline && t.deadline.startsWith(dateStr)
      );
      const dayMeetings = meetings.filter((m) => m.date === dateStr);
      const dayTrainings = trainings.filter((tr) => tr.dueDate === dateStr);

      days.push({
        offset: i,
        dateStr,
        dayLabelHi: `${hindiDays[dayIdx]} (${d.getDate()} ${d.toLocaleDateString('hi-IN', { month: 'short' })})`,
        dayLabelEn: `${engDays[dayIdx]} (${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })})`,
        tasks: dayTasks,
        meetings: dayMeetings,
        trainings: dayTrainings,
      });
    }

    return days;
  }, [categoryFilteredTasks, meetings, trainings]);

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================= */}
      {/* 1. MINIMAL WORKSPACE HEADER                               */}
      {/* ========================================================= */}
      <div className="rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#52645B] dark:text-[#9DB0A5]">
              <span>{appSettings.schoolProfile.schoolName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">UDISE+ {appSettings.schoolProfile.udiseCode}</span>
              <span aria-hidden="true">·</span>
              <span>सत्र {appSettings.activeAcademicYear}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#13231C] dark:text-[#E7F0EA] tracking-tight m-0">
              आज की कार्यसूची व विद्यालय प्रबंधन
            </h2>
          </div>

          {/* Primary Actions & Clean Utility Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setQuickAddTab('task');
                setQuickAddOpen(true);
              }}
              className="py-2 px-4 rounded-lg bg-[#0D5B49] hover:bg-[#094537] text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 min-h-[40px]"
            >
              <span>+ कार्य जोड़ें (Add Task)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsStartOfDayOpen(true)}
              className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] font-medium text-xs sm:text-sm transition-colors min-h-[40px]"
              title="दैनिक आरंभ चेकलिस्ट (Start of Day)"
            >
              सुबह की चेकलिस्ट
            </button>

            <button
              type="button"
              onClick={() => setIsEndOfDayOpen(true)}
              className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] font-medium text-xs sm:text-sm transition-colors min-h-[40px]"
              title="शाम की कार्य समीक्षा (End of Day Review)"
            >
              शाम की समीक्षा
            </button>

            <button
              id="open-demo-qa-modal-btn"
              type="button"
              onClick={() => {
                setDemoQaTab('demo');
                setIsDemoQaOpen(true);
              }}
              className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] hover:bg-[#E6EDE8] dark:hover:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] font-medium text-xs transition-colors min-h-[40px]"
              aria-label="डेमो शिक्षक प्रोफ़ाइल एवं QA परीक्षण चेकलिस्ट खोलें"
            >
              डेमो प्रोफ़ाइल व QA परीक्षण
            </button>

            <button
              type="button"
              onClick={() => {
                setDemoQaTab('a11y');
                setIsDemoQaOpen(true);
              }}
              className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] hover:bg-[#E6EDE8] dark:hover:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] font-medium text-xs transition-colors min-h-[40px]"
              aria-label="बड़े फ़ॉन्ट और सुगम्यता नियंत्रण खोलें"
            >
              A+ फ़ॉन्ट व सुगम्यता
            </button>

            <button
              id="open-pin-security-modal-btn"
              type="button"
              onClick={() => {
                setPinSecurityMode('setup_pin');
                setIsPinSecurityOpen(true);
              }}
              className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-[#0D5B49] dark:text-[#3FBF9B] font-semibold text-xs transition-colors min-h-[40px]"
              aria-label="Google लॉगिन एवं 4-अंकीय पिन सेटअप खोलें"
            >
              {hasPinConfigured ? '🔢 4-Digit PIN (सक्रिय)' : '🔐 Google व 4-Digit PIN'}
            </button>

            <PWAInstallButton variant="button" onToast={onToast} />

            <button
              type="button"
              onClick={() => openSettingsWithTab('general')}
              className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] hover:bg-[#E6EDE8] dark:hover:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] font-medium text-xs transition-colors min-h-[40px]"
              aria-label="ऐप सेटिंग्स खोलें"
            >
              सेटिंग्स
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* HEADMASTER / ADMIN PLACEHOLDER VIEW (WHEN SELECTED)       */}
      {/* ========================================================= */}
      {(appSettings.role === 'headmaster' || appSettings.role === 'admin') && (
        <HeadAdminOversightView
          currentRole={appSettings.role}
          onRoleChange={handleSwitchRole}
          tasks={tasks}
          duties={duties}
          meetings={meetings}
          trainings={trainings}
          orders={govtOrders}
          schoolName={`${appSettings.schoolProfile.schoolName} (${appSettings.schoolProfile.udiseCode})`}
          onToast={onToast}
          onNavigate={onNavigate}
        />
      )}

      {/* ========================================================= */}
      {/* 2. MINIMAL 4-METRIC STATUS BAR                            */}
      {/* ========================================================= */}
      <section aria-labelledby="status-counts-heading">
        <h2 id="status-counts-heading" className="sr-only">
          कार्य स्थिति संक्षेप (Work Status Overview)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveFilterStatus(activeFilterStatus === 'not_started' ? 'all' : 'not_started');
              setActiveSectionTab('today');
            }}
            className={`p-4 rounded-xl border text-left transition-colors ${
              activeFilterStatus === 'not_started'
                ? 'border-[#0D5B49] dark:border-[#00F5D4] bg-[#F1F5F2] dark:bg-[#1E2E26]'
                : 'border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] hover:bg-[#F8FAF9] dark:hover:bg-[#1E2E26]'
            }`}
          >
            <div className="text-xs text-[#52645B] dark:text-[#9DB0A5]">शुरू नहीं (Not Started)</div>
            <div className="text-2xl font-bold tabular-nums text-[#13231C] dark:text-[#E7F0EA] mt-1">
              {statusCounts.not_started}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilterStatus(activeFilterStatus === 'in_progress' ? 'all' : 'in_progress');
              setActiveSectionTab('today');
            }}
            className={`p-4 rounded-xl border text-left transition-colors ${
              activeFilterStatus === 'in_progress'
                ? 'border-[#0D5B49] dark:border-[#00F5D4] bg-[#F1F5F2] dark:bg-[#1E2E26]'
                : 'border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] hover:bg-[#F8FAF9] dark:hover:bg-[#1E2E26]'
            }`}
          >
            <div className="text-xs text-[#52645B] dark:text-[#9DB0A5]">प्रगति पर (In Progress)</div>
            <div className="text-2xl font-bold tabular-nums text-[#0D5B49] dark:text-[#3FBF9B] mt-1">
              {statusCounts.in_progress}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilterStatus(activeFilterStatus === 'overdue' ? 'all' : 'overdue');
              setActiveSectionTab('today');
            }}
            className={`p-4 rounded-xl border text-left transition-colors ${
              activeFilterStatus === 'overdue'
                ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40'
                : 'border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] hover:bg-rose-50/40 dark:hover:bg-rose-950/30'
            }`}
          >
            <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">
              विलंबित (Overdue)
            </div>
            <div className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-1">
              {statusCounts.overdue}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilterStatus(activeFilterStatus === 'done' ? 'all' : 'done');
              setActiveSectionTab('today');
            }}
            className={`p-4 rounded-xl border text-left transition-colors ${
              activeFilterStatus === 'done'
                ? 'border-[#0D5B49] dark:border-[#00F5D4] bg-[#F1F5F2] dark:bg-[#1E2E26]'
                : 'border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] hover:bg-[#F8FAF9] dark:hover:bg-[#1E2E26]'
            }`}
          >
            <div className="text-xs text-[#52645B] dark:text-[#9DB0A5]">पूर्ण (Done)</div>
            <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
              {statusCounts.done}
            </div>
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2B. RECHARTS 30-DAY TASK COMPLETION BY CATEGORY WIDGET    */}
      {/* ========================================================= */}
      <TaskCompletionChartWidget
        tasks={tasks}
        activeFilterCategory={activeFilterCategory}
        onSelectCategory={(cat) => {
          setActiveFilterCategory(cat);
          setActiveSectionTab('today');
        }}
      />

      {/* ========================================================= */}
      {/* 3. FOCUSED VIEW TABS (AVOIDS VISUAL OVERLOAD)             */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D3DDD6] dark:border-[#2B3C34] pb-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#E6EDE8] dark:bg-[#1E2E26]">
          <button
            type="button"
            onClick={() => setActiveSectionTab('today')}
            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
              activeSectionTab === 'today'
                ? 'bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-[#E7F0EA]'
            }`}
          >
            आज व लंबित कार्य ({todayTasks.length + overdueTasks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('upcoming')}
            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
              activeSectionTab === 'upcoming'
                ? 'bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-[#E7F0EA]'
            }`}
          >
            आगामी 7 दिन (7-Day Plan)
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('orders')}
            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
              activeSectionTab === 'orders'
                ? 'bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-[#E7F0EA]'
            }`}
          >
            शासनादेश ({unreadGovtOrdersCount} अपठित)
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionTab('tools')}
            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
              activeSectionTab === 'tools'
                ? 'bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-[#E7F0EA]'
            }`}
          >
            समीक्षा, बैकअप व रिपोर्ट
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {(activeFilterStatus !== 'all' || activeFilterCategory !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setActiveFilterStatus('all');
                setActiveFilterCategory('all');
              }}
              className="text-[#0D5B49] dark:text-[#00F5D4] font-semibold hover:underline"
            >
              फिल्टर हटाएं (Show All) ✕
            </button>
          )}
          <button
            id="open-printable-summary-pdf-btn"
            type="button"
            onClick={handlePrintPendingReport}
            className="text-[#0D5B49] dark:text-[#00F5D4] hover:text-[#13231C] dark:hover:text-white font-semibold"
          >
            📄 पीडीएफ रिपोर्ट (Tasks &amp; Classes PDF)
          </button>
          <button
            type="button"
            onClick={handleResetSampleData}
            className="text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white font-medium"
          >
            रीसेट (Reset)
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3B. TASK CATEGORY FILTER BAR                              */}
      {/* ========================================================= */}
      {(activeSectionTab === 'today' || activeSectionTab === 'upcoming') && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34]"
          role="region"
          aria-label="कार्य श्रेणी फिल्टर (Task Category Filter)"
        >
          <span className="text-xs font-semibold text-[#52645B] dark:text-[#9DB0A5]">
            श्रेणी अनुसार छाँटें (Filter by Category):
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilterCategory === 'all'
                  ? 'bg-[#0D5B49] text-white'
                  : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-[#E7F0EA] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34]'
              }`}
            >
              सभी श्रेणियाँ (All · {categoryCounts.all})
            </button>

            {(['Administrative', 'Academic', 'Extra-curricular'] as TaskCategory[]).map((cat) => {
              const meta = TASK_CATEGORY_METADATA[cat];
              const isSelected = activeFilterCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveFilterCategory(isSelected ? 'all' : cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0D5B49] text-white'
                      : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34]'
                  }`}
                >
                  <span aria-hidden="true">{meta.icon}</span>
                  <span>
                    {meta.labelHi} ({meta.labelEn} · {categoryCounts[cat]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: TODAY & OVERDUE TASKS                              */}
      {/* ========================================================= */}
      {activeSectionTab === 'today' && (
        <div className="space-y-6">
          {/* Overdue Section (Clean, Uncluttered) */}
          {overdueTasks.length > 0 && (
            <section
              aria-labelledby="overdue-heading"
              className="rounded-xl border border-rose-300 dark:border-rose-800/70 bg-rose-50/40 dark:bg-rose-950/20 p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-200/80 dark:border-rose-800/50">
                <div>
                  <h3
                    id="overdue-heading"
                    className="text-base sm:text-lg font-bold text-rose-900 dark:text-rose-100"
                  >
                    विलंबित कार्य ({overdueTasks.length})
                    {criticalEscalations.length > 0 && (
                      <span className="ml-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                        · {criticalEscalations.length} अति गंभीर (&gt;3 दिन)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
                    इन कार्यों की समय-सीमा समाप्त हो चुकी है।
                  </p>
                </div>

                {criticalEscalations.length > 0 && onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('safeguards')}
                    className="text-xs font-semibold text-rose-700 dark:text-rose-300 hover:underline self-start sm:self-center"
                  >
                    गंभीर सूची देखें →
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {overdueTasks.map((task) => {
                  const priorityInfo = PRIORITY_BADGES[task.priority];
                  const catMeta = TASK_CATEGORY_METADATA[resolveTaskCategory(task)];
                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#52645B] dark:text-[#9DB0A5]">
                          <span className="font-semibold text-rose-700 dark:text-rose-400">
                            {priorityInfo.labelHi}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${catMeta.badgeBg} ${catMeta.badgeText}`}
                          >
                            {catMeta.icon} {catMeta.labelHi} ({catMeta.labelEn})
                          </span>
                          {task.source && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{task.source}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>अंतिम तिथि: {task.deadline?.slice(0, 10)}</span>
                        </div>

                        <h4 className="font-semibold text-sm sm:text-base text-[#13231C] dark:text-[#E7F0EA]">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {task.portalUrl && (
                          <a
                            href={task.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] text-xs font-medium hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34]"
                          >
                            पोर्टल ↗
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStatusChange(task, 'in_progress')}
                          className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] text-xs font-medium hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34]"
                        >
                          प्रगति पर
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(task, 'done')}
                          className="py-2 px-3.5 rounded-lg bg-[#0D5B49] hover:bg-[#094537] text-white font-semibold text-xs transition-colors"
                        >
                          ✓ पूर्ण करें (Mark Done)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Today's Tasks & Meetings */}
          <section aria-labelledby="aaj-ka-kaam-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3
                id="aaj-ka-kaam-heading"
                className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA]"
              >
                आज के कार्य व बैठकें (Due Today)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddTab('meeting');
                    setQuickAddOpen(true);
                  }}
                  className="text-xs font-medium text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white"
                >
                  + बैठक जोड़ें
                </button>
                <span aria-hidden="true" className="text-xs text-[#52645B]">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddTab('training');
                    setQuickAddOpen(true);
                  }}
                  className="text-xs font-medium text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white"
                >
                  + प्रशिक्षण जोड़ें
                </button>
              </div>
            </div>

            {todayTasks.length === 0 && todayMeetings.length === 0 ? (
              <div className="p-6 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] text-center">
                <p className="font-semibold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                  आज के सभी निर्धारित कार्य संपन्न हैं।
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Today Meetings */}
                {todayMeetings.map((meet) => (
                  <div
                    key={meet.id}
                    className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#52645B] dark:text-[#9DB0A5]">
                        <span className="font-semibold text-[#0D5B49] dark:text-[#3FBF9B]">
                          बैठक (Meeting)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{meet.time}</span>
                        <span aria-hidden="true">·</span>
                        <span>{meet.mode === 'online' ? 'ऑनलाइन' : 'विद्यालय परिसर'}</span>
                      </div>

                      <h4 className="font-semibold text-sm sm:text-base text-[#13231C] dark:text-[#E7F0EA]">
                        {meet.title}
                      </h4>

                      <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] line-clamp-1">
                        {meet.locationOrLink} · {meet.organizedBy}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {meet.mode === 'online' && (
                        <a
                          href={meet.locationOrLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] hover:bg-[#F1F5F2] dark:hover:bg-[#1E2E26] text-xs font-medium"
                        >
                          लिंक खोलें ↗
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = meetings.map((m) =>
                            m.id === meet.id ? { ...m, status: 'completed' as const } : m
                          );
                          saveMeetings(updated);
                          onToast('बैठक संपन्न दर्ज की गई');
                        }}
                        className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] hover:bg-[#F1F5F2] dark:hover:bg-[#1E2E26] text-xs font-semibold"
                      >
                        ✓ संपन्न
                      </button>
                    </div>
                  </div>
                ))}

                {/* Today Tasks */}
                {todayTasks.map((task) => {
                  const priorityInfo = PRIORITY_BADGES[task.priority];
                  const catMeta = TASK_CATEGORY_METADATA[resolveTaskCategory(task)];
                  const isCompleted = task.status === 'done';

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        isCompleted
                          ? 'bg-[#F8FAF9] dark:bg-[#14201B] border-[#D3DDD6] dark:border-[#2B3C34] opacity-75'
                          : 'bg-white dark:bg-[#16231D] border-[#D3DDD6] dark:border-[#2B3C34]'
                      } flex flex-col md:flex-row items-start md:items-center justify-between gap-3`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#52645B] dark:text-[#9DB0A5]">
                          <span className="font-semibold text-[#13231C] dark:text-[#E7F0EA]">
                            {priorityInfo.labelHi}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${catMeta.badgeBg} ${catMeta.badgeText}`}
                          >
                            {catMeta.icon} {catMeta.labelHi} ({catMeta.labelEn})
                          </span>
                          {task.source && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{task.source}</span>
                            </>
                          )}
                          {task.recurrence && task.recurrence !== 'none' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{task.recurrence === 'daily' ? 'दैनिक' : task.recurrence}</span>
                            </>
                          )}
                        </div>

                        <h4
                          className={`font-semibold text-sm sm:text-base ${
                            isCompleted
                              ? 'line-through text-[#52645B] dark:text-[#9DB0A5]'
                              : 'text-[#13231C] dark:text-[#E7F0EA]'
                          }`}
                        >
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {task.portalUrl && (
                          <a
                            href={task.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] text-xs font-medium hover:bg-[#F1F5F2] dark:hover:bg-[#1E2E26]"
                          >
                            पोर्टल ↗
                          </a>
                        )}

                        <select
                          aria-label={`कार्य स्थिति: ${task.title}`}
                          value={task.status}
                          onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                          className="py-2 px-2.5 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-xs font-medium text-[#13231C] dark:text-[#E7F0EA]"
                        >
                          <option value="not_started">शुरू नहीं (Not Started)</option>
                          <option value="in_progress">प्रगति पर (In Progress)</option>
                          <option value="waiting_on_others">प्रतीक्षारत (Waiting)</option>
                          <option value="blocked">रुका हुआ (Blocked)</option>
                          <option value="done">पूर्ण (Done)</option>
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(task, isCompleted ? 'in_progress' : 'done')
                          }
                          className={`py-2 px-3.5 rounded-lg font-semibold text-xs transition-colors ${
                            isCompleted
                              ? 'border border-[#D3DDD6] dark:border-[#2B3C34] text-[#52645B] dark:text-[#9DB0A5] hover:bg-[#F1F5F2] dark:hover:bg-[#1E2E26]'
                              : 'bg-[#0D5B49] hover:bg-[#094537] text-white'
                          }`}
                        >
                          {isCompleted ? '↺ पुनः खोलें' : '✓ पूर्ण करें'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: UPCOMING 7 DAYS TIMELINE                           */}
      {/* ========================================================= */}
      {activeSectionTab === 'upcoming' && (
        <section aria-labelledby="upcoming-timeline-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3
              id="upcoming-timeline-heading"
              className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA]"
            >
              आगामी 7 दिन की कार्ययोजना (Upcoming 7 Days)
            </h3>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTimelineDayOffset('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  timelineDayOffset === 'all'
                    ? 'bg-[#0D5B49] text-white'
                    : 'bg-white dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] border border-[#D3DDD6] dark:border-[#2B3C34]'
                }`}
              >
                सभी 7 दिन
              </button>
              {upcomingTimeline.map((day) => (
                <button
                  key={day.offset}
                  type="button"
                  onClick={() => setTimelineDayOffset(day.offset)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    timelineDayOffset === day.offset
                      ? 'bg-[#0D5B49] text-white'
                      : 'bg-white dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] border border-[#D3DDD6] dark:border-[#2B3C34]'
                  }`}
                >
                  +{day.offset}d
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {upcomingTimeline
              .filter((day) => timelineDayOffset === 'all' || timelineDayOffset === day.offset)
              .map((day) => {
                const totalItems =
                  day.tasks.length + day.meetings.length + day.trainings.length;

                return (
                  <div
                    key={day.offset}
                    className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] space-y-2.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                          {day.dayLabelHi}
                        </span>
                        <span className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                          · {day.dateStr}
                        </span>
                      </div>
                      <span className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                        {totalItems} कार्य
                      </span>
                    </div>

                    {totalItems === 0 ? (
                      <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                        कोई पूर्व-निर्धारित कार्य नहीं।
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {day.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 rounded-lg bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                                कार्य · {task.source || 'सामान्य'}
                              </div>
                              <div className="font-semibold text-xs sm:text-sm text-[#13231C] dark:text-[#E7F0EA]">
                                {task.title}
                              </div>
                            </div>
                            {task.portalUrl && (
                              <a
                                href={task.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#0D5B49] dark:text-[#00F5D4] font-semibold shrink-0"
                              >
                                लिंक ↗
                              </a>
                            )}
                          </div>
                        ))}

                        {day.meetings.map((meet) => (
                          <div
                            key={meet.id}
                            className="p-3 rounded-lg bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34]"
                          >
                            <div className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                              बैठक · {meet.time}
                            </div>
                            <div className="font-semibold text-xs sm:text-sm text-[#13231C] dark:text-[#E7F0EA]">
                              {meet.title}
                            </div>
                          </div>
                        ))}

                        {day.trainings.map((tr) => (
                          <div
                            key={tr.id}
                            className="p-3 rounded-lg bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34]"
                          >
                            <div className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                              प्रशिक्षण · {tr.provider}
                            </div>
                            <div className="font-semibold text-xs sm:text-sm text-[#13231C] dark:text-[#E7F0EA]">
                              {tr.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 3: GOVT ORDERS                                        */}
      {/* ========================================================= */}
      {activeSectionTab === 'orders' && (
        <section aria-labelledby="govt-orders-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="govt-orders-heading"
              className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA]"
            >
              शासनादेश व विभागीय परिपत्र ({govtOrders.length})
            </h3>
            <div className="flex items-center gap-2">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('govt_orders')}
                  className="text-xs font-semibold text-[#0D5B49] dark:text-[#00F5D4] hover:underline"
                >
                  सभी शासनादेश खोलें →
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const markAll = govtOrders.map((o) => ({ ...o, isRead: true }));
                  saveGovtOrders(markAll);
                  onToast('सभी आदेश पठित चिह्नित किए गए');
                }}
                className="py-1.5 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] hover:bg-[#F1F5F2] dark:hover:bg-[#1E2E26] text-xs font-medium"
              >
                सभी पठित करें
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {govtOrders.map((order) => {
              const isUnread = !order.isRead;
              const needsAck = order.acknowledgementRequired && !order.isAcknowledged;

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#52645B] dark:text-[#9DB0A5]">
                      <span className="font-mono">{order.orderNumber}</span>
                      <span>
                        {isUnread ? '● अपठित · ' : ''}
                        {order.date}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm sm:text-base text-[#13231C] dark:text-[#E7F0EA]">
                      {order.title}
                    </h4>
                    <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] line-clamp-2">
                      {order.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleMarkOrderRead(order.id);
                        setSelectedOrder(order);
                      }}
                      className="py-1.5 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] text-xs font-medium hover:bg-[#F1F5F2] dark:hover:bg-[#1E2E26]"
                    >
                      पूरा आदेश देखें
                    </button>

                    {needsAck ? (
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeOrder(order.id)}
                        className="py-1.5 px-3 rounded-lg bg-[#0D5B49] text-white text-xs font-semibold"
                      >
                        अभिस्वीकृति दें
                      </button>
                    ) : order.acknowledgementRequired ? (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        ✓ अभिस्वीकृत
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SAFEGUARDS, BACKUP, PRIVACY & QA TOOLS             */}
      {/* ========================================================= */}
      {activeSectionTab === 'tools' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setIsStartOfDayOpen(true)}
              className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] hover:border-[#0D5B49] text-left transition-colors"
            >
              <div className="font-semibold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                1. दैनिक आरंभ चेकलिस्ट (Start of Day)
              </div>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1">
                आज के आवश्यक कार्यों व ड्यूटी की सुबह की चेकलिस्ट
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsEndOfDayOpen(true)}
              className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] hover:border-[#0D5B49] text-left transition-colors"
            >
              <div className="font-semibold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                2. शाम की कार्य समीक्षा (End-of-Day Review)
              </div>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1">
                बचे हुए कार्यों को पूर्ण चिह्नित करें या कल के लिए आगे बढ़ाएँ
              </p>
            </button>

            <button
              type="button"
              onClick={handlePrintPendingReport}
              className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] hover:border-[#0D5B49] text-left transition-colors"
            >
              <div className="font-semibold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                3. कार्य व कक्षा सारांश पीडीएफ रिपोर्ट (Summary PDF)
              </div>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1">
                वर्तमान कार्य एवं कक्षा डेटा को उच्च-कंट्रास्ट पीडीएफ में प्रिंट/निर्यात करें
              </p>
            </button>

            <button
              type="button"
              onClick={() => openSettingsWithTab('backup')}
              className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] hover:border-[#0D5B49] text-left transition-colors"
            >
              <div className="font-semibold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                4. लोकल JSON बैकअप व रीस्टोर (Backup)
              </div>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1">
                संपूर्ण डेटा को अपने डिवाइस पर सुरक्षित डाउनलोड व रीस्टोर करें
              </p>
            </button>

            <button
              type="button"
              onClick={() => openSettingsWithTab('privacy')}
              className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] hover:border-[#0D5B49] text-left transition-colors"
            >
              <div className="font-semibold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                5. DPDP Act 2023 डेटा गोपनीयता नीति
              </div>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1">
                न्यूनतम छात्र डेटा व आधार/पासवर्ड सुरक्षा नियम
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setDemoQaTab('demo');
                setIsDemoQaOpen(true);
              }}
              className="p-4 rounded-xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] hover:border-[#0D5B49] text-left transition-colors"
            >
              <div className="font-semibold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                6. डेमो प्रोफ़ाइल, QA चेकलिस्ट व README
              </div>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1">
                1-क्लिक डेमो शिक्षक डेटा, 6 ऑटो-टेस्ट व सेटअप गाइड
              </p>
            </button>
          </div>
        </section>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddOpen}
        initialTab={quickAddTab}
        onClose={() => setQuickAddOpen(false)}
        onAddTask={(newTask) => saveTasks([newTask, ...tasks])}
        onAddMeeting={(newMeeting) => saveMeetings([newMeeting, ...meetings])}
        onAddTraining={(newTraining) => saveTrainings([newTraining, ...trainings])}
        onToast={onToast}
      />

      {/* Govt Order Detail Modal */}
      <GovtOrderDetailModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onAcknowledge={handleAcknowledgeOrder}
        onToast={onToast}
      />

      {/* Start of Day Checklist Modal */}
      <StartOfDayModal
        isOpen={isStartOfDayOpen}
        onClose={() => setIsStartOfDayOpen(false)}
        tasks={tasks}
        duties={duties}
        meetings={meetings}
        onCompleteTask={(taskId: string) => {
          const target = tasks.find((t) => t.id === taskId);
          if (target) handleStatusChange(target, 'done');
        }}
        onNavigate={onNavigate}
        onToast={onToast}
      />

      {/* End of Day Review Modal */}
      <EndOfDayModal
        isOpen={isEndOfDayOpen}
        onClose={() => setIsEndOfDayOpen(false)}
        tasks={tasks}
        onTasksUpdated={(updatedTasks: Task[]) => {
          saveTasks(updatedTasks);
          onToast('✅ शाम की समीक्षा सुरक्षित की गई');
        }}
        onToast={onToast}
        currentUser={currentUser}
      />

      {/* Universal Search Modal (6 Modules) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        tasks={tasks}
        orders={govtOrders}
        meetings={meetings}
        trainings={trainings}
        portals={portals}
        classes={classes}
        onNavigate={(page) => {
          if (onNavigate) onNavigate(page);
          else window.location.hash = `#${page}`;
          setIsGlobalSearchOpen(false);
        }}
        onSelectTask={(task: Task) => {
          setIsGlobalSearchOpen(false);
          onToast(`कार्य चुना गया: ${task.title}`);
        }}
      />

      {/* Settings, School Profile, DPDP Privacy & Local JSON Backup Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={appSettings}
        onUpdateSettings={handleUpdateSettings}
        onDataRestored={() => {
          setAppSettings(getStoredAppSettings());
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
            if (o) setGovtOrders(JSON.parse(o));
          } catch {
            // ignore
          }
          window.dispatchEvent(new Event('storage'));
        }}
        onToast={onToast}
        initialTab={settingsTab}
      />

      {/* Demo Teacher Profile, 6-Category QA Checklist & Accessibility Hub Modal */}
      <DemoAndQaModal
        isOpen={isDemoQaOpen}
        onClose={() => setIsDemoQaOpen(false)}
        initialTab={demoQaTab}
        onDemoLoaded={(dataset) => {
          setTasks(dataset.tasks);
          setDuties(dataset.duties);
          setMeetings(dataset.meetings);
          setTrainings(dataset.trainings);
          setGovtOrders(dataset.govtOrders);
          setAppSettings(dataset.settings);
          window.dispatchEvent(new Event('storage'));
        }}
        onToast={onToast}
      />

      {/* Printable Tasks & Class Data Summary PDF Modal */}
      <PrintableSummaryPdfModal
        isOpen={isPrintablePdfOpen}
        onClose={() => setIsPrintablePdfOpen(false)}
        tasks={tasks}
        classes={classes}
        duties={duties}
        schoolName={appSettings.schoolProfile.schoolName}
        udiseCode={appSettings.schoolProfile.udiseCode}
        teacherName={currentUser?.name || 'सुरेश कुमार (सहायक अध्यापक)'}
        academicYear={appSettings.activeAcademicYear}
        initialCategoryFilter={activeFilterCategory}
        initialStatusFilter={activeFilterStatus}
        onToast={onToast}
      />

      {/* Google Login & 4-Digit PIN Security Modal */}
      <PinSecurityModal
        isOpen={isPinSecurityOpen}
        onClose={() => {
          setIsPinSecurityOpen(false);
          setHasPinConfigured(Boolean(getStoredPinRecord()));
        }}
        currentUser={currentUser || null}
        onUserAuthenticated={(profile) => {
          setStoredUser(profile);
          setHasPinConfigured(Boolean(getStoredPinRecord()));
          window.dispatchEvent(new Event('storage'));
        }}
        onToast={onToast}
        initialMode={pinSecurityMode}
      />
    </div>
  );
};
