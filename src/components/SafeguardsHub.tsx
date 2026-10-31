import React, { useState, useMemo } from 'react';
import { Task } from '../utils/taskStatusSystem';
import { Duty } from '../types/duty';
import { MeetingItem, TrainingItem, GovtOrderItem } from '../data/teacherHubSampleData';
import { PortalApp } from '../types/portalApp';
import { ClassSection } from '../types/classSection';
import {
  getCriticalEscalations,
  generateWeeklySummary,
  generatePendingWorkReportHtml,
} from '../utils/safeguardsManager';
import { GlobalSearchModal } from './GlobalSearchModal';
import { StartOfDayModal } from './StartOfDayModal';
import { EndOfDayModal } from './EndOfDayModal';

interface SafeguardsHubProps {
  tasks: Task[];
  onTasksUpdated: (updated: Task[]) => void;
  duties: Duty[];
  meetings: MeetingItem[];
  trainings: TrainingItem[];
  orders: GovtOrderItem[];
  portals?: PortalApp[];
  classes?: ClassSection[];
  onToast: (msg: string) => void;
  onNavigate?: (page: any) => void;
  currentUser?: { name: string; email: string } | null;
}

export const SafeguardsHub: React.FC<SafeguardsHubProps> = ({
  tasks,
  onTasksUpdated,
  duties,
  meetings,
  trainings,
  orders,
  portals,
  classes,
  onToast,
  onNavigate,
  currentUser,
}) => {
  // Modal states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isStartOfDayOpen, setIsStartOfDayOpen] = useState(false);
  const [isEndOfDayOpen, setIsEndOfDayOpen] = useState(false);

  // Tab state: 'overview' | 'critical' | 'weekly' | 'report'
  const [activeTab, setActiveTab] = useState<'overview' | 'critical' | 'weekly' | 'report'>('overview');

  // Compute critical escalations (>3 days overdue)
  const criticalEscalations = useMemo(() => {
    return getCriticalEscalations(tasks, new Date(), 3);
  }, [tasks]);

  // Compute weekly summary
  const weeklySummary = useMemo(() => {
    return generateWeeklySummary(tasks, new Date());
  }, [tasks]);

  // Handle resolving a critical task immediately
  const handleResolveCriticalTask = (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: 'done' as const,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    onTasksUpdated(updated);
    onToast('✓ गंभीर कार्य सफलतापूर्वक पूर्ण किया गया');
  };

  // Generate Report HTML for print/download
  const reportHtml = useMemo(() => {
    return generatePendingWorkReportHtml({
      generatedAt: new Date().toISOString(),
      schoolName: 'प्रा० वि० कंपोजिट (बेसिक शिक्षा परिषद)',
      teacherName: currentUser?.name || 'सुरेश कुमार (सहायक अध्यापक)',
      academicYear: '2026-27',
      criticalTasks: criticalEscalations,
      highPriorityPendingTasks: tasks.filter((t) => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high')),
      allPendingTasks: tasks.filter((t) => t.status !== 'done'),
      pendingDuties: duties.filter((d) => d.status === 'active'),
      trainingsNearingDeadline: trainings.filter((tr) => tr.status !== 'completed'),
      unreadGovtOrders: orders.filter((o) => !o.isRead),
    });
  }, [tasks, duties, trainings, orders, criticalEscalations, currentUser]);

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      onToast('⚠️ कृपया पॉप-अप विंडो की अनुमति दें');
    }
  };

  const handleDownloadReport = () => {
    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pending_Work_Report_${new Date().toISOString().split('T')[0]}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('📥 पेंडिंग कार्य रिपोर्ट डाउनलोड हो गई');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ========================================================= */}
        {/* BANNER & HEADER                                          */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-r from-teal-900 via-cyan-900 to-indigo-900 text-white p-5 sm:p-7 rounded-3xl shadow-lg border border-teal-700/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-200">
              <span>🛡️ कार्य सुरक्षा तंत्र / Task Safeguards & Zero-Miss System</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1 flex items-center gap-2">
              <span>समयबद्ध अनुपालन एवं कार्य सुरक्षा केंद्र (Safeguards Hub)</span>
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1 max-w-2xl">
              दैनिक प्रभात चेकलिस्ट, सांध्य समीक्षा, साप्ताहिक सारांश, 3+ दिवस विलंबित गंभीर अलर्ट एवं निरीक्षण-हेतु पेंडिंग कार्य रिपोर्ट।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2"
              title="सभी मॉड्यूल में खोजें (Ctrl+K)"
            >
              <span>🔍</span>
              <span>सार्वभौमिक खोज (Universal Search)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>📄</span>
              <span>रिपोर्ट प्रिंट करें (Print / PDF)</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CRITICAL ESCALATION BANNER (IF >3 DAYS OVERDUE EXISTS)     */}
        {/* ========================================================= */}
        {criticalEscalations.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
            <div className="flex items-start gap-3">
              <span className="text-2xl sm:text-3xl flex-shrink-0">🚨</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black">
                    अति आवश्यक चेतावनी: {criticalEscalations.length} कार्य 3 दिन से अधिक विलंबित हैं!
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-black uppercase">
                    CRITICAL
                  </span>
                </div>
                <p className="text-xs sm:text-sm mt-0.5 opacity-90">
                  विभागीय स्तर पर समीक्षा या नोटिस से बचने हेतु इन कार्यों को आज ही प्राथमिकता के आधार पर पूर्ण करें।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('critical')}
              className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs whitespace-nowrap shadow transition-all self-start sm:self-center"
            >
              गंभीर कार्य सूची देखें →
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4 FAST-ACTION SAFEGUARD TILES                             */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Start of Day */}
          <div
            onClick={() => setIsStartOfDayOpen(true)}
            className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/20 dark:from-amber-950/30 dark:to-orange-950/40 border border-amber-300 dark:border-amber-800 hover:border-amber-400 cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🌅</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold">
                  सुबह
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                दिन की शुरुआत चेकलिस्ट
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                आज के सभी कार्य, ड्यूटी व बैठकें एक जगह जांचें
              </p>
            </div>
            <button
              type="button"
              className="mt-4 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1"
            >
              <span>चेकलिस्ट खोलें</span>
              <span>➔</span>
            </button>
          </div>

          {/* 2. End of Day Review */}
          <div
            onClick={() => setIsEndOfDayOpen(true)}
            className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-500/20 dark:from-purple-950/30 dark:to-indigo-950/40 border border-purple-300 dark:border-purple-800 hover:border-purple-400 cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🌇</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-100 font-bold">
                  शाम
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                दिन का समापन सांध्य समीक्षा
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                अपूर्ण कार्यों को पूर्ण करें या कल हेतु आगे बढ़ाएं
              </p>
            </div>
            <button
              type="button"
              className="mt-4 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1"
            >
              <span>समीक्षा प्रारंभ करें</span>
              <span>➔</span>
            </button>
          </div>

          {/* 3. Weekly Sunday Review */}
          <div
            onClick={() => setActiveTab('weekly')}
            className="p-5 rounded-3xl bg-gradient-to-br from-teal-500/10 to-emerald-500/20 dark:from-teal-950/30 dark:to-emerald-950/40 border border-teal-300 dark:border-teal-800 hover:border-teal-400 cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📊</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-100 font-bold">
                  साप्ताहिक
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                साप्ताहिक सारांश (Sunday)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                पूर्णता दर ({weeklySummary.completionRatePercent}%), पेंडिंग व ओवरड्यू रिपोर्ट
              </p>
            </div>
            <button
              type="button"
              className="mt-4 text-xs font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1"
            >
              <span>साप्ताहिक रिपोर्ट देखें</span>
              <span>➔</span>
            </button>
          </div>

          {/* 4. Critical Escalations */}
          <div
            onClick={() => setActiveTab('critical')}
            className="p-5 rounded-3xl bg-gradient-to-br from-rose-500/10 to-red-500/20 dark:from-rose-950/30 dark:to-red-950/40 border border-rose-300 dark:border-rose-800 hover:border-rose-400 cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🚨</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-bold">
                  {criticalEscalations.length} अलर्ट
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                3+ दिन विलंबित गंभीर कार्य
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                तत्काल ध्यान देने योग्य अति-आवश्यक पेंडिंग कार्य
              </p>
            </div>
            <button
              type="button"
              className="mt-4 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1"
            >
              <span>एस्केलेशन देखें</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TABS ROW                                                  */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
          {[
            { id: 'overview', label: '🛡️ सुरक्षा अवलोकन (Overview)' },
            { id: 'critical', label: `🚨 गंभीर विलंबित (${criticalEscalations.length})` },
            { id: 'weekly', label: '📊 साप्ताहिक सारांश (Weekly)' },
            { id: 'report', label: '📄 पेंडिंग कार्य रिपोर्ट (Print Report)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW                                           */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Safeguards Architecture Description */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>🛡️</span>
                <span>शून्य-चूक प्रणाली (Zero-Miss Safeguard Protocols)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block text-sm">
                    1. प्रातः ऑटो-चेकलिस्ट
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    विद्यालय खुलने पर आज के सभी कार्य, मध्याह्न भोजन ड्यूटी, और बैठकों की स्वतः सूची बनती है जिससे सुबह कोई कार्य न छूटे।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold text-purple-600 dark:text-purple-400 block text-sm">
                    2. सांध्य समापन समीक्षा
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    छुट्टी से पहले 1-टैप में अधूरे कार्यों को पूर्ण करें या कल (+1) अथवा अगले सप्ताह (+7) के लिए कारण सहित आगे बढ़ाएं।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold text-rose-600 dark:text-rose-400 block text-sm">
                    3. 3+ दिवस एस्केलेशन
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    समयसीमा से 3 दिन से अधिक लेट होने पर कार्य को &apos;CRITICAL&apos; मानकर लाल रंग में फ्लैग किया जाता है।
                  </p>
                </div>
              </div>
            </div>

            {/* Critical Preview if any */}
            {criticalEscalations.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base flex items-center gap-2 text-rose-700 dark:text-rose-400">
                    <span>🚨</span>
                    <span>त्वरित समाधान अपेक्षित गंभीर कार्य ({criticalEscalations.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('critical')}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold"
                  >
                    पूरा विवरण देखें →
                  </button>
                </div>

                <div className="space-y-3">
                  {criticalEscalations.slice(0, 3).map((item) => (
                    <div
                      key={item.task.id}
                      className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {item.task.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-black">
                            {item.daysOverdue} दिन विलंबित
                          </span>
                        </div>
                        <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                          👉 {item.recommendedAction}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleResolveCriticalTask(item.task.id)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm self-start sm:self-center whitespace-nowrap"
                      >
                        ✓ अभी पूर्ण करें
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CRITICAL ESCALATIONS (>3 DAYS)                     */}
        {/* ========================================================= */}
        {activeTab === 'critical' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-xs font-black">
                  CRITICAL VIEW
                </span>
                <h2 className="text-lg sm:text-xl font-bold">
                  3+ दिवस समयसीमा पार गंभीर कार्य (Escalation View)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                ये वे कार्य हैं जिनकी अंतिम तिथि 3 दिन से अधिक पहले समाप्त हो चुकी है। इन पर तत्काल ध्यान आवश्यक है।
              </p>
            </div>

            {criticalEscalations.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-slate-400">
                <span className="text-4xl block">✨</span>
                <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                  शानदार! कोई भी कार्य 3 दिन से अधिक विलंबित नहीं है।
                </p>
                <p className="text-xs">आपका समयबद्ध अनुपालन शत-प्रतिशत नियंत्रण में है।</p>
              </div>
            ) : (
              <div className="space-y-4">
                {criticalEscalations.map((item) => (
                  <div
                    key={item.task.id}
                    className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/60 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔴</span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {item.task.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-rose-600 text-white font-black animate-pulse">
                          {item.daysOverdue} दिन विलंबित
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold uppercase">
                          {item.task.priority}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <p>• मूल समयसीमा: <span className="font-bold">{item.deadlineDateStr}</span></p>
                      <p>• कार्य श्रेणी: <span className="font-semibold uppercase">{item.task.type}</span> • स्रोत: <span className="font-semibold">{item.task.source || 'विभागीय'}</span></p>
                      {item.task.description && <p>• विवरण: {item.task.description}</p>}
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-rose-700 dark:text-rose-300">
                          👉 अनुशंसित त्वरित कदम:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          {item.recommendedAction}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.task.portalUrl && (
                          <a
                            href={item.task.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
                          >
                            🔗 पोर्टल खोलें ↗
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleResolveCriticalTask(item.task.id)}
                          className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                        >
                          ✓ अभी पूर्ण करें
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WEEKLY SUMMARY (SUNDAY REVIEW)                     */}
        {/* ========================================================= */}
        {activeTab === 'weekly' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-xs font-bold">
                  साप्ताहिक कार्य सारांश
                </span>
                <h2 className="text-lg sm:text-xl font-bold mt-1">
                  सप्ताह समीक्षा: {weeklySummary.weekLabel}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  विगत सप्ताह में क्या पूर्ण हुआ, क्या अधूरा रहा, और क्या समयसीमा पार हो गया।
                </p>
              </div>

              {/* Completion Rate Pill */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">पूर्णता दर</span>
                  <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                    {weeklySummary.completionRatePercent}%
                  </span>
                </div>
                <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${weeklySummary.completionRatePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3 Metric Summary Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                  ✓ पूर्ण किए गए कार्य (Done)
                </span>
                <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                  {weeklySummary.doneTasks.length}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">सफलतापूर्वक निष्पादित</p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1">
                <span className="text-xs text-blue-700 dark:text-blue-300 font-bold">
                  ⏳ जारी / अपूर्ण कार्य (Pending)
                </span>
                <p className="text-2xl font-black text-blue-900 dark:text-blue-100">
                  {weeklySummary.pendingTasks.length}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">आगामी सप्ताह हेतु अग्रसारित</p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-1">
                <span className="text-xs text-rose-700 dark:text-rose-300 font-bold">
                  🚨 समयसीमा पार (Overdue)
                </span>
                <p className="text-2xl font-black text-rose-900 dark:text-rose-100">
                  {weeklySummary.overdueTasks.length}
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400">प्राथमिकता से निपटने योग्य</p>
              </div>
            </div>

            {/* Actionable Insights */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>💡</span>
                <span>साप्ताहिक विश्लेषण एवं शिक्षक परामर्श (Insights)</span>
              </h3>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {weeklySummary.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Category Breakdown Table */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                कार्य श्रेणी अनुसार विभाजन (Category Breakdown)
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">श्रेणी (Category)</th>
                      <th className="py-2.5 px-3 text-center">कुल कार्य</th>
                      <th className="py-2.5 px-3 text-center text-emerald-600">पूर्ण</th>
                      <th className="py-2.5 px-3 text-center text-blue-600">पेंडिंग</th>
                      <th className="py-2.5 px-3 text-center text-rose-600">ओवरड्यू</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {weeklySummary.categoryBreakdown.map((row) => (
                      <tr key={row.category} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-3 font-bold uppercase">{row.category}</td>
                        <td className="py-2.5 px-3 text-center">{row.total}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">{row.done}</td>
                        <td className="py-2.5 px-3 text-center text-blue-600">{row.pending}</td>
                        <td className="py-2.5 px-3 text-center text-rose-600 font-bold">{row.overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: INSPECTION-READY PENDING REPORT (PRINT / PDF)       */}
        {/* ========================================================= */}
        {activeTab === 'report' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs font-bold">
                  निरीक्षण व अनुपालन प्रारूप
                </span>
                <h2 className="text-lg sm:text-xl font-bold mt-1">
                  पेंडिंग कार्य निरीक्षण रिपोर्ट (Inspection-Ready Report)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  बीईओ, एआरपी अथवा जिला समन्वयकों के निरीक्षण के समय तत्काल प्रस्तुत करने हेतु मुद्रण योग्य रिपोर्ट।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>प्रिंट / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>HTML डाउनलोड</span>
                </button>
              </div>
            </div>

            {/* Embedded Live Preview */}
            <div className="rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white p-4 overflow-hidden shadow-inner">
              <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                📄 रिपोर्ट पूर्वावलोकन (Live Document Preview):
              </div>
              <iframe
                title="Pending Report Preview"
                srcDoc={reportHtml}
                className="w-full h-[500px] border border-slate-200 rounded-xl bg-white"
              />
            </div>
          </div>
        )}

        {/* Modals */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          tasks={tasks}
          orders={orders}
          meetings={meetings}
          trainings={trainings}
          portals={portals}
          classes={classes}
          onNavigate={onNavigate}
        />

        <StartOfDayModal
          isOpen={isStartOfDayOpen}
          onClose={() => setIsStartOfDayOpen(false)}
          tasks={tasks}
          duties={duties}
          meetings={meetings}
          onCompleteTask={(taskId) => {
            const updated = tasks.map((t) =>
              t.id === taskId ? { ...t, status: 'done' as const, completedAt: new Date().toISOString() } : t
            );
            onTasksUpdated(updated);
          }}
          onToast={onToast}
          onNavigate={onNavigate}
        />

        <EndOfDayModal
          isOpen={isEndOfDayOpen}
          onClose={() => setIsEndOfDayOpen(false)}
          tasks={tasks}
          onTasksUpdated={onTasksUpdated}
          onToast={onToast}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};
