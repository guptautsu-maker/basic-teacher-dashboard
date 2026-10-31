import React, { useState, useMemo } from 'react';
import { Duty, DutyCategory, DutyStatus } from '../types/duty';
import {
  getSampleDuties,
  getWeeklyDutyRoster,
  filterDuties,
  isDutyActiveOnDate,
  formatDateYmd,
} from '../utils/trainingsAndDutiesManager';
import { AddDutyModal } from './AddDutyModal';

interface DutiesManagerProps {
  onToast: (msg: string) => void;
  onNavigate?: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'login') => void;
  currentUser?: { name: string; email: string } | null;
}

const CATEGORY_META: Record<
  DutyCategory,
  { labelHi: string; labelEn: string; icon: string; bg: string; text: string; border: string }
> = {
  mdm: {
    labelHi: 'मध्याह्न भोजन (MDM)',
    labelEn: 'Mid-Day Meal',
    icon: '🍲',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-300 dark:border-amber-800',
  },
  election: {
    labelHi: 'बीएलओ / निर्वाचन',
    labelEn: 'Election Duty',
    icon: '🗳️',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-300 dark:border-purple-800',
  },
  exam: {
    labelHi: 'परीक्षा / कक्ष निरीक्षक',
    labelEn: 'Exam Duty',
    icon: '📝',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-blue-800 dark:text-blue-200',
    border: 'border-blue-300 dark:border-blue-800',
  },
  library: {
    labelHi: 'पुस्तकालय (Library)',
    labelEn: 'Library Duty',
    icon: '📚',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  assembly: {
    labelHi: 'प्रार्थना सभा व चेतना सत्र',
    labelEn: 'Assembly',
    icon: '🔔',
    bg: 'bg-teal-50 dark:bg-teal-950/50',
    text: 'text-teal-800 dark:text-teal-200',
    border: 'border-teal-300 dark:border-teal-800',
  },
  discipline: {
    labelHi: 'अनुशासन व सुरक्षा',
    labelEn: 'Discipline',
    icon: '🛡️',
    bg: 'bg-orange-50 dark:bg-orange-950/50',
    text: 'text-orange-800 dark:text-orange-200',
    border: 'border-orange-300 dark:border-orange-800',
  },
  other: {
    labelHi: 'अन्य दायित्व',
    labelEn: 'Other',
    icon: '📌',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
  },
};

const DAY_LABELS: Record<number, string> = {
  1: 'सोमवार (Mon)',
  2: 'मंगलवार (Tue)',
  3: 'बुधवार (Wed)',
  4: 'गुरुवार (Thu)',
  5: 'शुक्रवार (Fri)',
  6: 'शनिवार (Sat)',
  0: 'रविवार (Sun)',
};

export const DutiesManager: React.FC<DutiesManagerProps> = ({
  onToast,
  onNavigate,
  currentUser,
}) => {
  // 1. Persistent Duties State
  const [duties, setDuties] = useState<Duty[]>(() => {
    try {
      const saved = localStorage.getItem('th-duties');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleDuties();
  });

  const saveDuties = (updated: Duty[]) => {
    setDuties(updated);
    try {
      localStorage.setItem('th-duties', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // 2. View Mode (Roster vs List)
  const [viewMode, setViewMode] = useState<'roster' | 'list'>('roster');

  // 3. Current Week Reference Date
  const [rosterDate, setRosterDate] = useState<Date>(new Date());

  // 4. Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<DutyStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 5. Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<Duty | null>(null);

  // 6. Metrics
  const metrics = useMemo(() => {
    const today = new Date();
    const activeDuties = duties.filter((d) => d.status === 'active');
    const todaysDuties = duties.filter((d) => isDutyActiveOnDate(d, today));
    const mdmDuties = duties.filter((d) => d.category === 'mdm');
    const electionDuties = duties.filter((d) => d.category === 'election');

    return {
      total: duties.length,
      active: activeDuties.length,
      today: todaysDuties.length,
      mdm: mdmDuties.length,
      election: electionDuties.length,
    };
  }, [duties]);

  // 7. Weekly Roster calculation
  const weeklyRoster = useMemo(() => {
    return getWeeklyDutyRoster(duties, rosterDate);
  }, [duties, rosterDate]);

  // 8. Filtered List for List View
  const filteredDutiesList = useMemo(() => {
    return filterDuties(duties, {
      category: categoryFilter,
      status: statusFilter,
      query: searchQuery,
    });
  }, [duties, categoryFilter, statusFilter, searchQuery]);

  // 9. Actions
  const handleSaveDuty = (data: Omit<Duty, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nowIso = new Date().toISOString();
    if (editingDuty) {
      const updated = duties.map((d) =>
        d.id === editingDuty.id
          ? {
              ...d,
              ...data,
              updatedAt: nowIso,
            }
          : d
      );
      saveDuties(updated);
      onToast('✅ दायित्व विवरण अपडेट किया गया (Duty updated)');
    } else {
      const newDuty: Duty = {
        ...data,
        id: `duty-${Date.now()}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      saveDuties([newDuty, ...duties]);
      onToast('🎉 नया दायित्व सफलतापूर्वक जोड़ा गया (Duty added)');
    }
    setEditingDuty(null);
  };

  const handleDeleteDuty = (id: string, name: string) => {
    if (confirm(`क्या आप दायित्व "${name}" को हटाना चाहते हैं?`)) {
      const updated = duties.filter((d) => d.id !== id);
      saveDuties(updated);
      onToast('🗑️ दायित्व हटा दिया गया');
    }
  };

  const handleToggleStatus = (duty: Duty) => {
    const newStatus: DutyStatus = duty.status === 'active' ? 'completed' : 'active';
    const updated = duties.map((d) =>
      d.id === duty.id
        ? {
            ...d,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }
        : d
    );
    saveDuties(updated);
    onToast(
      newStatus === 'completed'
        ? `✅ "${duty.dutyName}" पूर्ण चिह्नित किया गया`
        : `🟢 "${duty.dutyName}" पुनः सक्रिय किया गया`
    );
  };

  const handlePrevWeek = () => {
    const d = new Date(rosterDate);
    d.setDate(d.getDate() - 7);
    setRosterDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(rosterDate);
    d.setDate(d.getDate() + 7);
    setRosterDate(d);
  };

  const handleCurrentWeek = () => {
    setRosterDate(new Date());
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white py-8 px-4 sm:px-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-emerald-600/60 text-xs font-medium tracking-wide">
                  School Operations & Duties
                </span>
                <span className="text-emerald-200 text-xs">• साप्ताहिक रोस्टर व विशेष दायित्व</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                <span>🛡️</span>
                <span>विशेष दायित्व व ड्यूटियां (Duties & Roster)</span>
              </h1>
              <p className="text-sm text-emerald-100 mt-1 max-w-2xl">
                मध्याह्न भोजन (MDM) पर्यवेक्षण, बीएलओ निर्वाचन ड्यूटी, परीक्षा कक्ष निरीक्षक व प्रार्थना सभा का साप्ताहिक रोस्टर प्रबंधन।
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition backdrop-blur-sm"
                >
                  ⚡ मुख्य डैशबोर्ड
                </button>
              )}
              <button
                onClick={() => {
                  setEditingDuty(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/30 transition flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>नया दायित्व जोड़ें</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-emerald-200">सक्रिय दायित्व (Active)</div>
              <div className="text-2xl font-black mt-1">{metrics.active}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-emerald-200">आज का दायित्व (Today)</div>
              <div className="text-2xl font-black mt-1 text-amber-300 flex items-center gap-2">
                <span>{metrics.today}</span>
                {metrics.today > 0 && (
                  <span className="text-[10px] bg-amber-500/80 px-2 py-0.5 rounded-full text-slate-900 font-bold">
                    आज सक्रिय
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-emerald-200">एमडीएम पर्यवेक्षण (MDM)</div>
              <div className="text-2xl font-black mt-1 text-cyan-300">{metrics.mdm}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-emerald-200">बीएलओ / निर्वाचन (Election)</div>
              <div className="text-2xl font-black mt-1 text-purple-300">{metrics.election}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Navigation & Controls Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* View Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setViewMode('roster')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'roster'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🗓️</span>
              <span>साप्ताहिक रोस्टर (Weekly Roster)</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📋</span>
              <span>समस्त सूची (All Duties List)</span>
            </button>
          </div>

          {/* Roster Week Navigation (when in roster view) */}
          {viewMode === 'roster' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium hover:bg-slate-100"
                title="पिछला सप्ताह"
              >
                ◀ पिछला सप्ताह
              </button>
              <button
                onClick={handleCurrentWeek}
                className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold"
              >
                चालू सप्ताह (This Week)
              </button>
              <button
                onClick={handleNextWeek}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium hover:bg-slate-100"
                title="अगला सप्ताह"
              >
                अगला सप्ताह ▶
              </button>
            </div>
          )}

          {/* Search bar for List View */}
          {viewMode === 'list' && (
            <div className="relative min-w-[240px]">
              <input
                type="text"
                placeholder="दायित्व या शिक्षक खोजें..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: WEEKLY ROSTER VIEW (सोमवार से शनिवार ग्रिड)               */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'roster' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                साप्ताहिक चक्र: <strong>{weeklyRoster[0]?.dateStr}</strong> से{' '}
                <strong>{weeklyRoster[weeklyRoster.length - 1]?.dateStr}</strong> (सोमवार से शनिवार)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                <span>आज (Today) विशेष रूप से हाइलाइटेड है</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyRoster.map((day) => {
                return (
                  <div
                    key={day.dateStr}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                      day.isToday
                        ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    {/* Day Header */}
                    <div
                      className={`px-4 py-3 border-b flex items-center justify-between ${
                        day.isToday
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold flex items-center gap-1.5">
                          <span>{day.dayNameHi}</span>
                          <span className="text-[11px] opacity-80 font-normal">({day.dayNameEn})</span>
                        </div>
                        <div className={`text-[11px] ${day.isToday ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          📅 {day.dateStr}
                        </div>
                      </div>

                      {day.isToday ? (
                        <span className="px-2.5 py-1 rounded-full bg-white text-teal-800 text-[10px] font-black uppercase tracking-wider shadow-xs animate-pulse">
                          🌟 आज (Today)
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                          {day.duties.length} दायित्व
                        </span>
                      )}
                    </div>

                    {/* Day Duties List */}
                    <div className="p-3.5 space-y-2.5 flex-1">
                      {day.duties.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                          ☕ इस दिन कोई विशेष ड्यूटी निर्धारित नहीं
                        </div>
                      ) : (
                        day.duties.map((duty) => {
                          const meta = CATEGORY_META[duty.category] || CATEGORY_META.other;
                          return (
                            <div
                              key={duty.id}
                              className={`p-3 rounded-xl border ${meta.bg} ${meta.border} transition hover:shadow-xs`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                  {meta.icon} {duty.dutyName}
                                </span>
                              </div>

                              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                <span>⏰</span>
                                <span>{duty.schedule}</span>
                              </div>

                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                                <span>👤 {duty.assignedTeacher}</span>
                                {duty.location && <span>📍 {duty.location}</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: FULL DUTIES LIST (समस्त दायित्व सूची व संपादन)             */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">श्रेणी फ़िल्टर:</span>
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  categoryFilter === 'all'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                सभी श्रेणी
              </button>
              {(Object.keys(CATEGORY_META) as DutyCategory[]).map((catKey) => {
                const meta = CATEGORY_META[catKey];
                return (
                  <button
                    key={catKey}
                    onClick={() => setCategoryFilter(catKey)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                      categoryFilter === catKey
                        ? 'bg-teal-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.labelHi}</span>
                  </button>
                );
              })}
            </div>

            {/* List Cards */}
            {filteredDutiesList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <div className="text-4xl mb-3">🛡️</div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                  कोई दायित्व उपलब्ध नहीं मिला
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  नया दायित्व दर्ज करने के लिए ऊपर दिए गए "नया दायित्व जोड़ें" बटन का उपयोग करें।
                </p>
                <button
                  onClick={() => {
                    setEditingDuty(null);
                    setIsAddModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
                >
                  <span>➕</span>
                  <span>नया दायित्व जोड़ें</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDutiesList.map((duty) => {
                  const meta = CATEGORY_META[duty.category] || CATEGORY_META.other;
                  const isDutyActive = duty.status === 'active';

                  return (
                    <div
                      key={duty.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Category Badge & Status Pill */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${meta.bg} ${meta.border} ${meta.text}`}
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.labelHi}</span>
                          </span>

                          <button
                            onClick={() => handleToggleStatus(duty)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              duty.status === 'active'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                            }`}
                            title="स्थिति बदलने हेतु क्लिक करें"
                          >
                            <span>{duty.status === 'active' ? '🟢 सक्रिय' : '✅ पूर्ण / अवमुक्त'}</span>
                          </button>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
                          {duty.dutyName}
                        </h3>

                        {/* Schedule & Days */}
                        <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>⏰ समय:</span>
                            <span>{duty.schedule}</span>
                          </div>

                          {/* Days chips */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mr-1">
                              दिन:
                            </span>
                            {duty.daysOfWeek.map((d) => (
                              <span
                                key={d}
                                className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-[10px] font-bold"
                              >
                                {DAY_LABELS[d] || `Day ${d}`}
                              </span>
                            ))}
                          </div>

                          {/* Date Range */}
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                            <span>अवधि: </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {duty.startDate} से {duty.endDate || 'सतत (Ongoing)'}
                            </span>
                          </div>
                        </div>

                        {/* Assignment Details */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <div>
                            <span className="text-slate-400 block text-[10px]">आदेशकर्ता / स्रोत:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              🏛️ {duty.assignedBy}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">प्रभारी शिक्षक:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              👤 {duty.assignedTeacher}
                            </span>
                          </div>
                        </div>

                        {duty.location && (
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                            <span>📍 स्थान: </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {duty.location}
                            </span>
                          </div>
                        )}

                        {duty.notes && (
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/50">
                            📝 <em>{duty.notes}</em>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {isDutyActive ? 'सक्रिय ड्यूटी' : 'दायित्व समाप्त'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDuty(duty);
                              setIsAddModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition"
                          >
                            ✏️ संपादन
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDuty(duty.id, duty.dutyName)}
                            className="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs transition"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Duty Modal */}
      <AddDutyModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDuty(null);
        }}
        onSave={handleSaveDuty}
        initialData={editingDuty}
        defaultTeacherName={currentUser?.name || 'सुरेश कुमार (सहायक अध्यापक)'}
      />
    </div>
  );
};
