import React, { useState, useEffect, useMemo } from 'react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  STATUS_METADATA,
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
import { QuickAddModal } from './QuickAddModal';
import { GovtOrderDetailModal } from './GovtOrderDetailModal';

interface TeacherHubDashboardProps {
  onToast: (msg: string) => void;
  currentUser?: { name: string; email: string } | null;
  onNavigate?: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'login') => void;
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

  // Save changes
  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem('th-tasks', JSON.stringify(newTasks));
    } catch {
      // ignore
    }
  };

  const saveMeetings = (newMeetings: MeetingItem[]) => {
    setMeetings(newMeetings);
    try {
      localStorage.setItem('th-meetings', JSON.stringify(newMeetings));
    } catch {
      // ignore
    }
  };

  const saveTrainings = (newTrainings: TrainingItem[]) => {
    setTrainings(newTrainings);
    try {
      localStorage.setItem('th-trainings', JSON.stringify(newTrainings));
    } catch {
      // ignore
    }
  };

  const saveGovtOrders = (newOrders: GovtOrderItem[]) => {
    setGovtOrders(newOrders);
    try {
      localStorage.setItem('th-govt-orders', JSON.stringify(newOrders));
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
  const [timelineDayOffset, setTimelineDayOffset] = useState<number | 'all'>('all');

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

  // Quick Status Counts
  const statusCounts = useMemo(() => {
    const counts = {
      not_started: 0,
      in_progress: 0,
      done: 0,
      overdue: 0,
    };
    for (const t of tasks) {
      if (t.status === 'not_started') counts.not_started++;
      else if (t.status === 'in_progress') counts.in_progress++;
      else if (t.status === 'done') counts.done++;
      else if (t.status === 'overdue') counts.overdue++;
    }
    return counts;
  }, [tasks]);

  // Overdue tasks
  const overdueTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'overdue')
      .sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);
  }, [tasks]);

  // Today tasks & meetings ("Aaj ka kaam")
  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.status === 'overdue') return false; // Overdue is in section 2
        if (!t.deadline) return false;
        return t.deadline.startsWith(todayStr);
      })
      .sort((a, b) => {
        // Sort by urgency first
        const weightDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (weightDiff !== 0) return weightDiff;
        // Then by status (done last)
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        return 0;
      });
  }, [tasks, todayStr]);

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

      const dayTasks = tasks.filter((t) => t.deadline && t.deadline.startsWith(dateStr));
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
  }, [tasks, meetings, trainings]);

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ========================================================= */}
      {/* HERO BANNER & HEADER                                      */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0D5B49] via-[#106A56] to-[#0A4739] text-white p-5 sm:p-7 shadow-xl border border-[#00F5D4]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#00F5D4]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-[#9B5DE5]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-[#00F5D4] border border-white/10">
              <span>🏫</span>
              <span>बेसिक शिक्षा परिषद शिक्षक कार्यक्षेत्र • Teacher Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white m-0">
              मुख्य कार्य डैशबोर्ड
            </h1>
            <p className="text-sm sm:text-base font-medium text-emerald-100/90 leading-snug m-0">
              One Teacher, One Dashboard — हर पोर्टल, हर आदेश, हर कार्य समय पर।
            </p>
          </div>

          {/* Quick Add Big Buttons Top Bar */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setQuickAddTab('task');
                setQuickAddOpen(true);
              }}
              className="flex-1 sm:flex-initial py-3 px-4.5 rounded-2xl bg-[#00F5D4] text-[#0D5B49] font-bold text-sm shadow-lg shadow-[#00F5D4]/25 hover:bg-white hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span className="text-lg">📝</span>
              <span>+ कार्य जोड़ें</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuickAddTab('meeting');
                setQuickAddOpen(true);
              }}
              className="flex-1 sm:flex-initial py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold text-sm border border-white/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span className="text-lg">👥</span>
              <span>+ बैठक जोड़ें</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setQuickAddTab('training');
                setQuickAddOpen(true);
              }}
              className="flex-1 sm:flex-initial py-3 px-4 rounded-2xl bg-[#9B5DE5] hover:bg-[#8338EC] text-white font-bold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span className="text-lg">🎓</span>
              <span>+ प्रशिक्षण</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('trainings');
                else window.location.hash = '#trainings';
              }}
              className="flex-1 sm:flex-initial py-3 px-4 rounded-2xl bg-teal-500/80 hover:bg-teal-400 text-slate-900 font-bold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              title="प्रशिक्षण व दीक्षा कोर्स प्रबंधन"
            >
              <span className="text-lg">🎓</span>
              <span>प्रशिक्षण (Trainings)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('duties');
                else window.location.hash = '#duties';
              }}
              className="flex-1 sm:flex-initial py-3 px-4 rounded-2xl bg-emerald-500/80 hover:bg-emerald-400 text-slate-900 font-bold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              title="साप्ताहिक रोस्टर व विशेष दायित्व"
            >
              <span className="text-lg">🛡️</span>
              <span>दायित्व व रोस्टर (Duties)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('portals');
                else window.location.hash = '#portals';
              }}
              className="flex-1 sm:flex-initial py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[48px]"
              title="सभी विभागीय पोर्टल व ऐप्स देखें"
            >
              <span className="text-lg">🌐</span>
              <span>पोर्टल व ऐप्स (Portals)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 5: QUICK STATUS COUNTS (4 METRIC CARDS)           */}
      {/* ========================================================= */}
      <section aria-labelledby="status-counts-heading">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 id="status-counts-heading" className="text-base sm:text-lg font-bold">
              कार्य स्थिति संक्षेप / Work Status Overview
            </h2>
            {activeFilterStatus !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveFilterStatus('all')}
                className="text-xs px-2.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-[#52645B] dark:text-[#9DB0A5] hover:text-black dark:hover:text-white"
              >
                फिल्टर हटाएं (Show All) ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetSampleData}
            className="text-xs text-[#52645B] dark:text-[#9DB0A5] hover:text-[#0D5B49] dark:hover:text-[#00F5D4] underline"
          >
            डेमो रीसेट / Reset Demo
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Not Started */}
          <button
            type="button"
            onClick={() =>
              setActiveFilterStatus(activeFilterStatus === 'not_started' ? 'all' : 'not_started')
            }
            className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeFilterStatus === 'not_started'
                ? 'ring-2 ring-gray-600 bg-gray-50 dark:bg-gray-800/80'
                : 'bg-white dark:bg-[#16231D] hover:shadow-md'
            } border-gray-200 dark:border-gray-800`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xl">
                ⭕
              </span>
              <span className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-gray-100">
                {statusCounts.not_started}
              </span>
            </div>
            <p className="font-bold text-sm sm:text-base leading-tight">
              शुरू नहीं हुआ
            </p>
            <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
              Not Started
            </p>
          </button>

          {/* 2. In Progress */}
          <button
            type="button"
            onClick={() =>
              setActiveFilterStatus(activeFilterStatus === 'in_progress' ? 'all' : 'in_progress')
            }
            className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeFilterStatus === 'in_progress'
                ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                : 'bg-white dark:bg-[#16231D] hover:shadow-md'
            } border-blue-200 dark:border-blue-900/40`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xl">
                ⏳
              </span>
              <span className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-400">
                {statusCounts.in_progress}
              </span>
            </div>
            <p className="font-bold text-sm sm:text-base leading-tight text-blue-900 dark:text-blue-200">
              प्रगति पर
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              In Progress
            </p>
          </button>

          {/* 3. Done */}
          <button
            type="button"
            onClick={() =>
              setActiveFilterStatus(activeFilterStatus === 'done' ? 'all' : 'done')
            }
            className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeFilterStatus === 'done'
                ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40'
                : 'bg-white dark:bg-[#16231D] hover:shadow-md'
            } border-emerald-200 dark:border-emerald-900/40`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xl">
                ✅
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                {statusCounts.done}
              </span>
            </div>
            <p className="font-bold text-sm sm:text-base leading-tight text-emerald-900 dark:text-emerald-200">
              पूर्ण / संपन्न
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Done / Completed
            </p>
          </button>

          {/* 4. Overdue (Red Attention Card) */}
          <button
            type="button"
            onClick={() =>
              setActiveFilterStatus(activeFilterStatus === 'overdue' ? 'all' : 'overdue')
            }
            className={`p-4 sm:p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              activeFilterStatus === 'overdue'
                ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/60'
                : 'bg-rose-50/60 dark:bg-rose-950/30 hover:shadow-md'
            } border-rose-300 dark:border-rose-900/60`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center text-xl animate-pulse">
                ⚠️
              </span>
              <span className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-400">
                {statusCounts.overdue}
              </span>
            </div>
            <p className="font-bold text-sm sm:text-base leading-tight text-rose-900 dark:text-rose-200">
              विलंबित कार्य
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
              Overdue (Deadline passed)
            </p>
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 2: "OVERDUE" IN RED WITH COUNT                     */}
      {/* ========================================================= */}
      {overdueTasks.length > 0 && (
        <section
          aria-labelledby="overdue-heading"
          className="rounded-2xl border-2 border-rose-500/80 bg-rose-50 dark:bg-rose-950/40 p-4 sm:p-6 shadow-lg relative overflow-hidden"
        >
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-200 dark:border-rose-800">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-2xl shadow-md animate-bounce">
                🚨
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="overdue-heading"
                    className="text-lg sm:text-xl font-black text-rose-900 dark:text-rose-100 tracking-tight"
                  >
                    विलंबित कार्य / Overdue Tasks
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black shadow-sm">
                    {overdueTasks.length} अति आवश्यक
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-rose-800 dark:text-rose-300 mt-0.5">
                  इन कार्यों की अंतिम तिथि समाप्त हो चुकी है। कृपया प्राथमिकता से तुरंत पूर्ण करें।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setQuickAddTab('task');
                setQuickAddOpen(true);
              }}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
            >
              <span>+ नया कार्य</span>
            </button>
          </div>

          {/* Overdue Task List */}
          <div className="space-y-3 mt-4">
            {overdueTasks.map((task) => {
              const priorityInfo = PRIORITY_BADGES[task.priority];
              return (
                <div
                  key={task.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#16231D] border border-rose-300 dark:border-rose-800/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-rose-500"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${priorityInfo.bg} ${priorityInfo.text}`}>
                        {priorityInfo.icon} {priorityInfo.labelHi} ({priorityInfo.labelEn})
                      </span>
                      {task.source && (
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-semibold">
                          📌 {task.source}
                        </span>
                      )}
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <span>⏰ अंतिम तिथि: </span>
                        <span>{task.deadline?.slice(0, 16).replace('T', ' ')}</span>
                      </span>
                    </div>

                    <h3 className="font-bold text-base sm:text-lg text-rose-950 dark:text-rose-100 leading-snug">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5] line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons with Big Touch Target */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {task.portalUrl && (
                      <a
                        href={task.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
                      >
                        <span>🌐 पोर्टल खोलें</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleStatusChange(task, 'in_progress')}
                      className="py-2.5 px-3.5 rounded-xl border border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 min-h-[44px]"
                    >
                      <span>⏳ प्रगति पर दर्ज करें</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(task, 'done')}
                      className="py-2.5 px-4.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 min-h-[44px]"
                    >
                      <span>✓ अभी पूर्ण करें (Mark Done)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* SECTION 1: "AAJ KA KAAM" (TODAY) - TASKS & MEETINGS       */}
      {/* ========================================================= */}
      <section aria-labelledby="aaj-ka-kaam-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <h2
                id="aaj-ka-kaam-heading"
                className="text-xl sm:text-2xl font-black text-[#13231C] dark:text-[#E7F0EA] tracking-tight"
              >
                आज का काम (Aaj ka Kaam — Due Today)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5]">
              आज पूर्ण किए जाने वाले आवश्यक कार्य एवं निर्धारित बैठकें (प्राथमिकता अनुसार व्यवस्थित)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0D5B49]/10 text-[#0D5B49] dark:text-[#00F5D4] dark:bg-[#00F5D4]/10">
              कुल: {todayTasks.length + todayMeetings.length} कार्य/बैठक
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('meetings')}
                className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 transition-colors flex items-center gap-1"
              >
                <span>🤝</span>
                <span>कैलेंडर व बैठकें →</span>
              </button>
            )}
          </div>
        </div>

        {todayTasks.length === 0 && todayMeetings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] text-center space-y-2">
            <span className="text-4xl">🎉</span>
            <h3 className="font-bold text-base">आज के सभी कार्य संपन्न हैं!</h3>
            <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
              आज के लिए कोई लंबित कार्य अथवा बैठक शेष नहीं है।
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {/* Today Meetings Cards First */}
            {todayMeetings.map((meet) => (
              <div
                key={meet.id}
                className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-purple-50/50 dark:from-purple-950/30 dark:via-[#16231D] dark:to-purple-950/20 border-2 border-purple-300 dark:border-purple-800/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm">
                      <span>👥 बैठक (Meeting)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 text-xs font-bold">
                      ⏰ {meet.time}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium">
                      {meet.mode === 'online' ? '💻 ऑनलाइन' : '🏫 भौतिक/ऑफ़लाइन'}
                    </span>
                  </div>

                  <h3 className="font-bold text-base sm:text-lg text-purple-950 dark:text-purple-100 leading-snug">
                    {meet.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5]">
                    <span className="font-semibold">एजेंडा: </span>
                    {meet.agenda}
                  </p>

                  <div className="text-xs text-purple-800 dark:text-purple-300 font-medium">
                    📍 {meet.locationOrLink} • आयोजक: {meet.organizedBy}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {meet.mode === 'online' && (
                    <a
                      href={meet.locationOrLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-initial py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <span>💻 लिंक खोलें / Join</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const updated = meetings.map((m) =>
                        m.id === meet.id ? { ...m, status: 'completed' as const } : m
                      );
                      saveMeetings(updated);
                      onToast('बैठक संपन्न दर्ज की गई / Meeting marked completed');
                    }}
                    className="flex-1 md:flex-initial py-3 px-4 rounded-xl border border-purple-400 bg-white dark:bg-[#1E2E26] hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-800 dark:text-purple-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <span>✓ संपन्न / Attended</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Today Tasks Sorted by Urgency */}
            {todayTasks.map((task) => {
              const priorityInfo = PRIORITY_BADGES[task.priority];
              const isCompleted = task.status === 'done';

              return (
                <div
                  key={task.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-80'
                      : 'bg-white dark:bg-[#16231D] border-[#D3DDD6] dark:border-[#2B3C34] hover:shadow-md hover:border-[#00F5D4]'
                  } flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${priorityInfo.bg} ${priorityInfo.text}`}>
                        {priorityInfo.icon} {priorityInfo.labelHi} ({priorityInfo.labelEn})
                      </span>

                      {task.recurrence && task.recurrence !== 'none' && (
                        <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 text-[11px] font-bold">
                          🔄 {task.recurrence === 'daily' ? 'दैनिक (Daily)' : task.recurrence}
                        </span>
                      )}

                      {task.source && (
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-semibold">
                          📌 {task.source}
                        </span>
                      )}

                      <span className="text-xs text-[#52645B] dark:text-[#9DB0A5] font-semibold">
                        ⏰ समय: {task.deadline ? new Date(task.deadline).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : 'आज'}
                      </span>
                    </div>

                    <h3
                      className={`font-bold text-base sm:text-lg leading-snug ${
                        isCompleted
                          ? 'line-through text-gray-500 dark:text-gray-400'
                          : 'text-[#13231C] dark:text-[#E7F0EA]'
                      }`}
                    >
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5]">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Actions & Status Selector */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {task.portalUrl && (
                      <a
                        href={task.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
                      >
                        <span>🌐 पोर्टल</span>
                      </a>
                    )}

                    {/* Status Dropdown */}
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                      className="py-2.5 px-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-xs font-bold text-[#13231C] dark:text-[#E7F0EA] min-h-[44px]"
                    >
                      <option value="not_started">⭕ Not Started (शुरू नहीं)</option>
                      <option value="in_progress">⏳ In Progress (प्रगति पर)</option>
                      <option value="waiting_on_others">⏸️ Waiting (प्रतीक्षारत)</option>
                      <option value="blocked">🚫 Blocked (रुका हुआ)</option>
                      <option value="done">✅ Done (पूर्ण)</option>
                    </select>

                    {/* Quick Done / Reopen Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(task, isCompleted ? 'in_progress' : 'done')}
                      className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 min-h-[44px] ${
                        isCompleted
                          ? 'border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E2E26] text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                          : 'bg-[#0D5B49] text-white hover:bg-[#00B39B] shadow-md shadow-[#0D5B49]/20'
                      }`}
                    >
                      <span>{isCompleted ? '↺ पुनः खोलें' : '✓ पूर्ण (Mark Done)'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* SECTION 4: "NEW GOVT ORDERS" WITH UNREAD COUNT             */}
      {/* ========================================================= */}
      <section aria-labelledby="govt-orders-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📜</span>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="govt-orders-heading"
                  className="text-xl sm:text-2xl font-black text-[#13231C] dark:text-[#E7F0EA] tracking-tight"
                >
                  नवीन शासनादेश व विभागीय परिपत्र / Govt Orders
                </h2>
                {unreadGovtOrdersCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black shadow-sm animate-pulse">
                    {unreadGovtOrdersCount} नए आदेश
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5]">
                बेसिक शिक्षा विभाग, महानिदेशक एवं बीएसए कार्यालय द्वारा जारी ताज़ा आदेश व अनुपालन दिशा-निर्देश
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('govt_orders')}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0D5B49] to-[#00F5D4] text-[#13231C] shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
              >
                <span>📜</span>
                <span>सम्पूर्ण शासनादेश मॉड्यूल →</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const markAll = govtOrders.map((o) => ({ ...o, isRead: true }));
                saveGovtOrders(markAll);
                onToast('सभी आदेश पठित चिह्नित किए गए / All marked read');
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5"
            >
              सभी पठित करें / Mark All Read
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {govtOrders.map((order) => {
            const isUnread = !order.isRead;
            const needsAck = order.acknowledgementRequired && !order.isAcknowledged;

            return (
              <div
                key={order.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isUnread
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-md ring-1 ring-amber-400/40'
                    : 'bg-white dark:bg-[#16231D] border-[#D3DDD6] dark:border-[#2B3C34]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {order.orderNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      )}
                      <span className="text-xs text-[#52645B] dark:text-[#9DB0A5] font-semibold">
                        📅 {order.date}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-[#13231C] dark:text-[#E7F0EA] leading-snug">
                    {order.title}
                  </h3>

                  <p className="text-xs font-semibold text-[#0D5B49] dark:text-[#00F5D4] flex items-center gap-1">
                    <span>🏛️</span>
                    <span>{order.issuingAuthority}</span>
                  </p>

                  <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] line-clamp-3 leading-relaxed">
                    {order.summary}
                  </p>

                  {order.deadline && (
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 p-2 rounded-xl border border-rose-200 dark:border-rose-900">
                      ⏳ अंतिम तिथि: {order.deadline}
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-[#D3DDD6] dark:border-[#2B3C34] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleMarkOrderRead(order.id);
                      setSelectedOrder(order);
                    }}
                    className="py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>📄 पूरा आदेश देखें / View</span>
                  </button>

                  {needsAck ? (
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeOrder(order.id)}
                      className="py-2 px-3.5 rounded-xl bg-[#0D5B49] hover:bg-[#00B39B] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <span>✍️ अभिस्वीकृति दें / Acknowledge</span>
                    </button>
                  ) : order.acknowledgementRequired ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span>✓</span>
                      <span>अभिस्वीकृत</span>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 3: "UPCOMING 7 DAYS" TIMELINE                     */}
      {/* ========================================================= */}
      <section aria-labelledby="upcoming-timeline-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗓️</span>
            <div>
              <h2
                id="upcoming-timeline-heading"
                className="text-xl sm:text-2xl font-black text-[#13231C] dark:text-[#E7F0EA] tracking-tight"
              >
                आगामी 7 दिन की कार्ययोजना / Upcoming 7 Days Timeline
              </h2>
              <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5]">
                अगले एक सप्ताह के निर्धारित पोर्टल कार्य, गुरु-गोष्ठी, प्रशिक्षण एवं विशेष दायित्व
              </p>
            </div>
          </div>

          {/* Timeline Day Switcher Chips */}
          <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTimelineDayOffset('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timelineDayOffset === 'all'
                  ? 'bg-[#0D5B49] text-white shadow-sm'
                  : 'bg-white dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] border border-[#D3DDD6] dark:border-[#2B3C34]'
              }`}
            >
              सभी 7 दिन (All)
            </button>
            {upcomingTimeline.map((day) => (
              <button
                key={day.offset}
                type="button"
                onClick={() => setTimelineDayOffset(day.offset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timelineDayOffset === day.offset
                    ? 'bg-[#0D5B49] text-white shadow-sm'
                    : 'bg-white dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] border border-[#D3DDD6] dark:border-[#2B3C34]'
                }`}
              >
                +{day.offset} दिन
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Cards Container */}
        <div className="space-y-4">
          {upcomingTimeline
            .filter((day) => timelineDayOffset === 'all' || timelineDayOffset === day.offset)
            .map((day) => {
              const totalItems = day.tasks.length + day.meetings.length + day.trainings.length;

              return (
                <div
                  key={day.offset}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] shadow-sm space-y-3"
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-[#0D5B49]/10 text-[#0D5B49] dark:text-[#00F5D4] dark:bg-[#00F5D4]/10 flex items-center justify-center font-bold text-xs">
                        +{day.offset}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                          {day.dayLabelHi}
                        </h3>
                        <p className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                          {day.dayLabelEn} • {day.dateStr}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {totalItems} कार्यक्रम
                    </span>
                  </div>

                  {/* Day Items */}
                  {totalItems === 0 ? (
                    <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] italic py-1">
                      इस दिन कोई विशेष पूर्व-निर्धारित कार्य दर्ज नहीं है।
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Tasks */}
                      {day.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3.5 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] space-y-1.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-[#0D5B49] dark:text-[#00F5D4] flex items-center gap-1">
                                <span>📝 कार्य: </span>
                                <span>{task.source || 'General'}</span>
                              </span>
                              <span className="font-semibold text-gray-500">
                                {task.deadline ? new Date(task.deadline).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-[#13231C] dark:text-[#E7F0EA]">
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold">
                              {STATUS_METADATA[task.status].labelHi}
                            </span>
                            {task.portalUrl && (
                              <a
                                href={task.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#0D5B49] dark:text-[#00F5D4] font-bold hover:underline"
                              >
                                लिंक ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Meetings */}
                      {day.meetings.map((meet) => (
                        <div
                          key={meet.id}
                          className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-1.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-purple-700 dark:text-purple-300">
                                👥 बैठक: {meet.time}
                              </span>
                              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                                {meet.mode === 'online' ? 'ऑनलाइन' : 'ऑफ़लाइन'}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-purple-950 dark:text-purple-100">
                              {meet.title}
                            </h4>
                            <p className="text-xs text-purple-800 dark:text-purple-300 line-clamp-1">
                              📍 {meet.locationOrLink}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Trainings */}
                      {day.trainings.map((tr) => (
                        <div
                          key={tr.id}
                          className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-1.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-teal-800 dark:text-teal-300">
                                🎓 प्रशिक्षण: {tr.provider} ({tr.hours} घंटे)
                              </span>
                              {tr.certificateRequired && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-100">
                                  प्रमाणपत्र आवश्यक
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-sm text-teal-950 dark:text-teal-100">
                              {tr.name}
                            </h4>
                          </div>

                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-xs text-teal-700 dark:text-teal-300 font-semibold">
                              अंतिम तिथि: {tr.dueDate}
                            </span>
                            {tr.link && (
                              <a
                                href={tr.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-teal-800 dark:text-teal-300 hover:underline"
                              >
                                दीक्षा पोर्टल ↗
                              </a>
                            )}
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

      {/* ========================================================= */}
      {/* FLOATING ACTION BUTTON (MOBILE-FIRST QUICK-ADD)           */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => {
            setQuickAddTab('task');
            setQuickAddOpen(true);
          }}
          className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#0D5B49] to-[#00B39B] hover:from-[#00B39B] hover:to-[#0D5B49] text-white font-extrabold text-sm sm:text-base shadow-2xl shadow-[#0D5B49]/40 border-2 border-[#00F5D4] hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 min-h-[52px]"
          aria-label="Quick Add Task or Meeting"
        >
          <span className="text-xl">⚡</span>
          <span>+ त्वरित जोड़ें (Quick Add)</span>
        </button>
      </div>

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
    </div>
  );
};
