import React, { useState, useEffect, useMemo } from 'react';
import { PortalApp, PortalCategory } from '../types/portalApp';
import { PORTAL_CATEGORIES, INITIAL_PORTAL_APPS } from '../data/portalAppData';
import {
  PASSWORD_WARNING_NOTICE,
  addPortal,
  updatePortal,
  deletePortal,
  recordPortalOpened,
  getPendingWorkForPortal,
  formatLastUsed,
} from '../utils/portalManager';
import { Task, changeTaskStatus } from '../utils/taskStatusSystem';
import { getInitialTeacherHubTasks } from '../data/teacherHubSampleData';
import { PortalModal } from './PortalModal';

interface PortalsManagerProps {
  onToast: (msg: string) => void;
  onNavigate?: (page: any) => void;
  tasksProp?: Task[];
  onTasksUpdate?: (updatedTasks: Task[]) => void;
}

export const PortalsManager: React.FC<PortalsManagerProps> = ({
  onToast,
  onNavigate,
  tasksProp,
  onTasksUpdate,
}) => {
  // -------------------------------------------------------------
  // Portals State & Persistence
  // -------------------------------------------------------------
  const [portals, setPortals] = useState<PortalApp[]>(() => {
    try {
      const saved = localStorage.getItem('th-portal-apps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_PORTAL_APPS;
  });

  const savePortals = (newList: PortalApp[]) => {
    setPortals(newList);
    try {
      localStorage.setItem('th-portal-apps', JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  // -------------------------------------------------------------
  // Tasks State for Portal Work Pending Checklist
  // -------------------------------------------------------------
  const [internalTasks, setInternalTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('th-tasks');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getInitialTeacherHubTasks();
  });

  const activeTasks = tasksProp || internalTasks;

  const handleUpdateTasks = (newTasks: Task[]) => {
    if (onTasksUpdate) {
      onTasksUpdate(newTasks);
    } else {
      setInternalTasks(newTasks);
      try {
        localStorage.setItem('th-tasks', JSON.stringify(newTasks));
      } catch {
        // ignore
      }
    }
  };

  // -------------------------------------------------------------
  // Filter & Search State
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PortalCategory | 'all'>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [portalToEdit, setPortalToEdit] = useState<PortalApp | null>(null);

  // Delete Confirm Modal State
  const [portalToDelete, setPortalToDelete] = useState<PortalApp | null>(null);

  // -------------------------------------------------------------
  // Filtered List & Counts
  // -------------------------------------------------------------
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: portals.length };
    (Object.keys(PORTAL_CATEGORIES) as PortalCategory[]).forEach((cat) => {
      counts[cat] = portals.filter((p) => p.category === cat).length;
    });
    return counts;
  }, [portals]);

  const filteredPortals = useMemo(() => {
    return portals.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q) || (p.nameHi && p.nameHi.toLowerCase().includes(q));
        const matchPurpose = p.purpose.toLowerCase().includes(q);
        const matchUrl = p.url.toLowerCase().includes(q);
        const matchTask = p.neededForTask.toLowerCase().includes(q);
        return matchName || matchPurpose || matchUrl || matchTask;
      }
      return true;
    });
  }, [portals, selectedCategory, searchQuery]);

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------
  const handleOpenAddModal = () => {
    setPortalToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (portal: PortalApp, e: React.MouseEvent) => {
    e.stopPropagation();
    setPortalToEdit(portal);
    setModalOpen(true);
  };

  const handleSavePortal = (data: Omit<PortalApp, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (portalToEdit) {
      const res = updatePortal(portals, portalToEdit.id, data);
      savePortals(res.portals);
      onToast('✏️ पोर्टल का विवरण सफलतापूर्वक अपडेट हो गया');
    } else {
      const res = addPortal(portals, data);
      savePortals(res.portals);
      onToast('＋ नया पोर्टल सफलतापूर्वक जोड़ दिया गया');
    }
  };

  const handleDeleteConfirm = () => {
    if (!portalToDelete) return;
    const res = deletePortal(portals, portalToDelete.id);
    savePortals(res.portals);
    onToast(`🗑️ "${portalToDelete.name}" पोर्टल सूची से हटा दिया गया`);
    setPortalToDelete(null);
  };

  // Open Portal in new tab and update lastUsedDate
  const handleOpenPortalLink = (portal: PortalApp) => {
    // Open in new tab
    window.open(portal.url, '_blank', 'noopener,noreferrer');

    // Record last used date as today
    const res = recordPortalOpened(portals, portal.id);
    savePortals(res.portals);
    onToast(`🚀 "${portal.name}" नई विंडो में खोला गया (अंतिम उपयोग आज अपडेट हुआ)`);
  };

  // Complete a pending task directly from portal checklist
  const handleToggleTaskStatus = (task: Task) => {
    const nextStatus = task.status === 'done' ? 'in_progress' : 'done';
    const result = changeTaskStatus({
      task,
      newStatus: nextStatus,
      changedBy: 'शिक्षक (पोर्टल चेकलिस्ट)',
      comment: `पोर्टल "${task.source || 'पोर्टल'}" से कार्य संपन्न किया गया`,
    });

    let updatedTasks = activeTasks.map((t) => (t.id === task.id ? result.updatedTask : t));
    if (result.nextRecurringTask) {
      updatedTasks = [result.nextRecurringTask, ...updatedTasks];
    }

    handleUpdateTasks(updatedTasks);
    onToast(
      nextStatus === 'done'
        ? `✅ कार्य पूर्ण हुआ: "${task.title.slice(0, 32)}..."`
        : `🔄 कार्य पुनः प्रारंभ किया गया`
    );
  };

  // Reset to default sample portals
  const handleResetPortals = () => {
    if (window.confirm('क्या आप पोर्टल सूची को डिफ़ॉल्ट सरकारी पोर्टल्स में रीसेट करना चाहते हैं?')) {
      savePortals(INITIAL_PORTAL_APPS);
      onToast('🔄 डिफ़ॉल्ट सरकारी पोर्टल रीसेट हो गए');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* ========================================================= */}
      {/* 1. Header Banner & Actions                                */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-950 text-white shadow-xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-teal-500/30 text-teal-200 border border-teal-400/30">
              विभागीय पोर्टल व ऐप केंद्र (Portals Hub)
            </span>
            <span className="text-xs text-teal-200/80">
              कुल पोर्टल: {portals.length}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>🌐</span>
            <span>पोर्टल्स एवं ऐप्स निर्देशिका</span>
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 max-w-2xl leading-relaxed">
            प्रत्येक सरकारी पोर्टल को सीधे नई विंडो में खोलें, उससे जुड़े लंबित कार्य की लाइव चेकलिस्ट देखें और सुरक्षित लॉगिन निर्देश प्राप्त करें।
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleResetPortals}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15"
            title="डिफ़ॉल्ट सरकारी पोर्टल पुनः लोड करें"
          >
            🔄 डिफ़ॉल्ट पोर्टल
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-teal-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 min-h-[46px]"
          >
            <span className="text-lg">＋</span>
            <span>नया पोर्टल जोड़ें (Add Portal)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Mandatory Password Warning Security Banner             */}
      {/* ========================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 flex items-start gap-3.5 text-xs sm:text-sm text-amber-900 dark:text-amber-100 shadow-sm">
        <span className="text-2xl flex-shrink-0 animate-pulse">🛡️</span>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide text-xs">
              अत्यंत महत्वपूर्ण सुरक्षा निर्देश (Security Warning)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-[11px] font-bold text-amber-900 dark:text-amber-200">
              पासवर्ड सुरक्षित रखें
            </span>
          </div>
          <p className="font-semibold leading-relaxed">
            {PASSWORD_WARNING_NOTICE.hi}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300/80">
            {PASSWORD_WARNING_NOTICE.en}
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Search & Category Filters                              */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="पोर्टल का नाम, उद्देश्य, वेबसाइट लिंक या कार्य खोजें..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16231D] text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
          <span className="absolute left-4 top-3.5 text-gray-400 text-base">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              ✕ साफ़ करें
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                : 'bg-white dark:bg-[#16231D] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-gray-300'
            }`}
          >
            <span>📁 सभी पोर्टल (All)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                selectedCategory === 'all' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              {categoryCounts.all}
            </span>
          </button>

          {(Object.keys(PORTAL_CATEGORIES) as PortalCategory[]).map((catKey) => {
            const cat = PORTAL_CATEGORIES[catKey];
            const isSelected = selectedCategory === catKey;
            const count = categoryCounts[catKey] || 0;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                    : 'bg-white dark:bg-[#16231D] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:border-gray-300'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.labelHi}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. Portals Cards Grid                                     */}
      {/* ========================================================= */}
      {filteredPortals.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#16231D] border border-gray-200 dark:border-gray-800 text-center space-y-3">
          <span className="text-4xl block">🔍</span>
          <p className="text-base font-bold text-gray-800 dark:text-gray-200">
            कोई पोर्टल नहीं मिला
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            खोज शब्द बदलें या एक नया सरकारी पोर्टल जोड़ें।
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
          >
            ＋ नया पोर्टल जोड़ें
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          {filteredPortals.map((portal) => {
            const cat = PORTAL_CATEGORIES[portal.category] || PORTAL_CATEGORIES.other;
            const pendingTasks = getPendingWorkForPortal(portal, activeTasks);
            const lastUsed = formatLastUsed(portal.lastUsedDate);

            return (
              <div
                key={portal.id}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16231D] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Card Top: Category Badge, Name, Action Icons */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${cat.badgeBg} ${cat.badgeText} ${cat.borderColor}`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.labelHi}</span>
                      </span>

                      {portal.isCustom && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          कस्टम पोर्टल
                        </span>
                      )}
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(portal, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
                        title="संपादित करें (Edit)"
                        aria-label={`Edit ${portal.name}`}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPortalToDelete(portal);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="हटाएँ (Delete)"
                        aria-label={`Delete ${portal.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Portal Title & URL */}
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100 leading-snug">
                      {portal.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate mt-0.5">
                      {portal.url}
                    </p>
                  </div>

                  {/* Purpose Box */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    <span className="font-bold text-gray-900 dark:text-gray-100 block mb-0.5">
                      🎯 पोर्टल का उद्देश्य (Purpose):
                    </span>
                    {portal.purpose}
                  </div>

                  {/* Needed for which task */}
                  {portal.neededForTask && (
                    <div className="flex items-center gap-1.5 text-xs text-teal-800 dark:text-teal-300 font-medium">
                      <span>📌</span>
                      <span>
                        <strong>आवश्यकता:</strong> {portal.neededForTask}
                      </span>
                    </div>
                  )}

                  {/* Last Used Date Chip */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>🕒</span>
                    <span>
                      अंतिम उपयोग: <strong>{lastUsed.textHi}</strong>
                    </span>
                    {lastUsed.isRecent && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        हाल ही में
                      </span>
                    )}
                  </div>

                  {/* ========================================================= */}
                  {/* CHECKLIST: "Portal Work Pending" linked to tasks           */}
                  {/* ========================================================= */}
                  <div className="mt-3 p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                        <span>📋</span>
                        <span>इस पोर्टल के लंबित कार्य (Portal Work Pending):</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          pendingTasks.length > 0
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {pendingTasks.length > 0 ? `${pendingTasks.length} कार्य लंबित` : 'सभी पूर्ण'}
                      </span>
                    </div>

                    {pendingTasks.length === 0 ? (
                      <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <span>✅</span>
                        <span>कोई लंबित कार्य नहीं — इस पोर्टल का सारा काम अद्यतन है!</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {pendingTasks.map((task) => {
                          const isOverdue = task.status === 'overdue';
                          return (
                            <div
                              key={task.id}
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                                isOverdue
                                  ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200'
                                  : 'bg-white dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={task.status === 'done'}
                                onChange={() => handleToggleTaskStatus(task)}
                                className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0"
                                title="कार्य को पूर्ण मार्क करें"
                                aria-label={`Mark task ${task.title} as done`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold leading-snug line-clamp-2">
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
                                  {isOverdue && (
                                    <span className="font-bold text-rose-600 dark:text-rose-400">
                                      ⚠️ विलंबित (Overdue)
                                    </span>
                                  )}
                                  {task.deadline && (
                                    <span className="text-gray-500 dark:text-gray-400">
                                      अंतिम तिथि: {task.deadline.split('T')[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ========================================================= */}
                  {/* LOGIN HELP NOTE BOX (Strictly No Passwords)                */}
                  {/* ========================================================= */}
                  {portal.loginHelpNote && (
                    <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                          <span>🔑</span>
                          <span>लॉगिन सहायता निर्देश (Login Help):</span>
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                          (पासवर्ड नहीं है)
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                        {portal.loginHelpNote}
                      </p>
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* Big "Open Portal" Button                                  */}
                {/* ========================================================= */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => handleOpenPortalLink(portal)}
                    className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm sm:text-base shadow-md shadow-teal-700/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <span>🌐</span>
                    <span>पोर्टल खोलें (Open Portal)</span>
                    <span className="text-teal-200 text-xs">↗ नई विंडो में</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. Add / Edit Modal                                       */}
      {/* ========================================================= */}
      <PortalModal
        isOpen={modalOpen}
        portalToEdit={portalToEdit}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePortal}
        onToast={onToast}
      />

      {/* ========================================================= */}
      {/* 6. Delete Confirmation Dialog                             */}
      {/* ========================================================= */}
      {portalToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#16231D] rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 flex items-center justify-center text-2xl mx-auto">
              🗑️
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">
                क्या आप यह पोर्टल हटाना चाहते हैं?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                "{portalToDelete.name}" को पोर्टल सूची से स्थायी रूप से हटा दिया जाएगा।
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPortalToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                हटाएँ (Confirm Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
