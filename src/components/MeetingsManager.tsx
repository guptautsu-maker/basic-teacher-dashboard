import React, { useState, useEffect, useMemo } from 'react';
import {
  Meeting,
  MeetingMode,
  MeetingStatus,
  CalendarViewType,
  ClashWarning,
} from '../types/meeting';
import {
  getSampleMeetings,
  filterMeetings,
  getMonthCalendarGrid,
  getWeekCalendarDays,
  detectMeetingClashes,
  formatTimeDisplay,
  DEFAULT_CLASS_SCHEDULE,
} from '../utils/meetingsManager';
import { AddMeetingModal } from './AddMeetingModal';
import { MeetingMinutesModal } from './MeetingMinutesModal';

interface MeetingsManagerProps {
  onToast: (msg: string) => void;
  onNavigate?: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'login') => void;
  currentUser?: { name: string; email: string } | null;
}

export const MeetingsManager: React.FC<MeetingsManagerProps> = ({
  onToast,
  onNavigate,
  currentUser,
}) => {
  // 1. Persistent Meetings State
  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    try {
      const saved = localStorage.getItem('th-meetings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleMeetings();
  });

  const saveMeetings = (updated: Meeting[]) => {
    setMeetings(updated);
    try {
      localStorage.setItem('th-meetings', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // 2. View Mode & Filters
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MeetingStatus | 'all'>('all');
  const [modeFilter, setModeFilter] = useState<MeetingMode | 'all'>('all');

  // 3. Calendar Date State
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // 4. Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [meetingToEdit, setMeetingToEdit] = useState<Meeting | null>(null);
  const [selectedMeetingMinutes, setSelectedMeetingMinutes] = useState<Meeting | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filtered meetings for List View
  const displayedMeetings = useMemo(() => {
    return filterMeetings(meetings, {
      status: statusFilter,
      mode: modeFilter,
      query: searchQuery,
    });
  }, [meetings, statusFilter, modeFilter, searchQuery]);

  // Meeting clash map (pre-calculated for all meetings)
  const clashesMap = useMemo(() => {
    const map: Record<string, ClashWarning[]> = {};
    for (const m of meetings) {
      const warnings = detectMeetingClashes(
        {
          id: m.id,
          date: m.date,
          startTime: m.startTime,
          endTime: m.endTime,
          title: m.title,
        },
        meetings,
        DEFAULT_CLASS_SCHEDULE
      );
      if (warnings.length > 0) {
        map[m.id] = warnings;
      }
    }
    return map;
  }, [meetings]);

  // Overall metrics
  const metrics = useMemo(() => {
    const total = meetings.length;
    const todayCount = meetings.filter((m) => m.date === todayStr && m.status !== 'cancelled').length;
    const upcomingCount = meetings.filter((m) => m.date > todayStr && m.status === 'scheduled').length;
    const completedCount = meetings.filter((m) => m.status === 'completed').length;
    const clashCount = Object.keys(clashesMap).length;
    return { total, todayCount, upcomingCount, completedCount, clashCount };
  }, [meetings, todayStr, clashesMap]);

  // Handlers
  const handleSaveMeeting = (data: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    mode: MeetingMode;
    linkOrLocation: string;
    agenda: string;
    attendees: string[];
    organizedBy: string;
  }) => {
    if (meetingToEdit) {
      const updated = meetings.map((m) =>
        m.id === meetingToEdit.id
          ? {
              ...m,
              ...data,
              timeDisplay: formatTimeDisplay(data.startTime, data.endTime),
              updatedAt: new Date().toISOString(),
            }
          : m
      );
      saveMeetings(updated);
      onToast('✏️ बैठक विवरण अपडेट हो गया');
      setMeetingToEdit(null);
    } else {
      const newMeeting: Meeting = {
        id: `meet-${Date.now()}`,
        ...data,
        timeDisplay: formatTimeDisplay(data.startTime, data.endTime),
        status: 'scheduled',
        actionItems: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveMeetings([newMeeting, ...meetings]);
      onToast('＋ नई बैठक सफलतापूर्वक जुड़ गई');
    }
  };

  const handleDeleteMeeting = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस बैठक को हटाना चाहते हैं?')) {
      const updated = meetings.filter((m) => m.id !== id);
      saveMeetings(updated);
      onToast('🗑️ बैठक हटा दी गई');
    }
  };

  const handleToggleCompleted = (meeting: Meeting, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: MeetingStatus = meeting.status === 'completed' ? 'scheduled' : 'completed';
    const updated = meetings.map((m) =>
      m.id === meeting.id
        ? { ...m, status: nextStatus, updatedAt: new Date().toISOString() }
        : m
    );
    saveMeetings(updated);
    onToast(nextStatus === 'completed' ? '✓ बैठक संपन्न चिह्नित की गई' : 'बैठक पुनः निर्धारित की गई');
  };

  const handleUpdateMeetingFromModal = (updated: Meeting) => {
    const list = meetings.map((m) => (m.id === updated.id ? updated : m));
    saveMeetings(list);
    setSelectedMeetingMinutes(updated);
  };

  // Calendar month data
  const monthGrid = useMemo(() => {
    return getMonthCalendarGrid(currentDate.getFullYear(), currentDate.getMonth(), meetings);
  }, [currentDate, meetings]);

  // Calendar week data
  const weekDays = useMemo(() => {
    return getWeekCalendarDays(currentDate, meetings, DEFAULT_CLASS_SCHEDULE);
  }, [currentDate, meetings]);

  const monthYearLabel = currentDate.toLocaleDateString('hi-IN', {
    month: 'long',
    year: 'numeric',
  });

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const resetToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="min-h-screen bg-[#F1F5F2] dark:bg-[#0A0E27] text-[#13231C] dark:text-[#E7F0EA] transition-colors py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Banner */}
        <div className="bg-white/80 dark:bg-[#16231D]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-[#00F5D4]/25 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0D5B49] to-[#00F5D4] flex items-center justify-center text-3xl shadow-lg shrink-0">
                🤝
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    बैठक व गुरु-गोष्ठी प्रबंधन
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#0D5B49]/15 text-[#0D5B49] dark:text-[#00F5D4] border border-[#0D5B49]/20">
                    Meetings Module
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5] mt-1">
                  SMC, संकुल, बीआरसी बैठकें, कैलेंडर व्यू, कार्यवृत्त (MoM) एवं समय टकराव (Clash) जांच
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="px-3.5 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5"
                >
                  ⚡ Teacher Hub डैशबोर्ड
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMeetingToEdit(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0D5B49] to-[#00F5D4] text-[#13231C] font-bold text-xs sm:text-sm shadow-md hover:shadow-[#00F5D4]/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <span>＋</span> नई बैठक जोड़ें
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-[#D3DDD6] dark:border-[#2B3C34]">
            <div className="p-3 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-transparent">
              <div className="text-[11px] font-semibold text-[#52645B] dark:text-[#9DB0A5]">
                कुल बैठकें / All
              </div>
              <div className="text-lg font-bold text-[#0D5B49] dark:text-[#00F5D4]">
                {metrics.total}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
              <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <span>⏰</span> आज की बैठकें
              </div>
              <div className="text-lg font-bold text-amber-800 dark:text-amber-200">
                {metrics.todayCount}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
              <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <span>🗓️</span> आगामी (Upcoming)
              </div>
              <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
                {metrics.upcomingCount}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <span>✓</span> संपन्न (Done)
              </div>
              <div className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                {metrics.completedCount}
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                metrics.clashCount > 0
                  ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
                  : 'bg-[#F1F5F2] dark:bg-[#1E2E26] border-transparent'
              }`}
            >
              <div className="text-[11px] font-semibold flex items-center gap-1">
                <span>⚠️</span> समय टकराव (Clashes)
              </div>
              <div className="text-lg font-bold">
                {metrics.clashCount}
              </div>
            </div>
          </div>
        </div>

        {/* View Switcher, Search & Filters Bar */}
        <div className="bg-white/80 dark:bg-[#16231D]/80 backdrop-blur-xl rounded-2xl p-4 border border-[#00F5D4]/20 shadow-md space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* View Mode Switcher: Month, Week, Day, List */}
            <div className="flex items-center gap-1 bg-[#F1F5F2] dark:bg-[#1E2E26] p-1 rounded-xl self-start sm:self-auto border border-[#D3DDD6] dark:border-[#2B3C34]">
              <button
                type="button"
                onClick={() => setViewType('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewType === 'month'
                    ? 'bg-[#0D5B49] text-white shadow-sm'
                    : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C]'
                }`}
              >
                <span>📅</span> माह (Month)
              </button>
              <button
                type="button"
                onClick={() => setViewType('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewType === 'week'
                    ? 'bg-[#0D5B49] text-white shadow-sm'
                    : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C]'
                }`}
              >
                <span>🗓️</span> सप्ताह (Week)
              </button>
              <button
                type="button"
                onClick={() => setViewType('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewType === 'day'
                    ? 'bg-[#0D5B49] text-white shadow-sm'
                    : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C]'
                }`}
              >
                <span>⏰</span> दिन (Day)
              </button>
              <button
                type="button"
                onClick={() => setViewType('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewType === 'list'
                    ? 'bg-[#0D5B49] text-white shadow-sm'
                    : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C]'
                }`}
              >
                <span>📋</span> सूची (List)
              </button>
            </div>

            {/* Keyword Search */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder="खोजें: SMC, संकुल, एजेंडा, सदस्य, स्थल..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Mode & Status Filters for List View */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-xs font-semibold focus:outline-none"
              >
                <option value="all">सभी स्थितियां</option>
                <option value="scheduled">निर्धारित (Scheduled)</option>
                <option value="completed">संपन्न (Completed)</option>
              </select>

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-xs font-semibold focus:outline-none"
              >
                <option value="all">सभी मोड</option>
                <option value="offline">🏫 ऑफलाइन</option>
                <option value="online">💻 ऑनलाइन</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CALENDAR VIEW 1: MONTH VIEW                               */}
        {/* ========================================================= */}
        {viewType === 'month' && (
          <div className="bg-white/90 dark:bg-[#16231D]/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-[#00F5D4]/20 shadow-lg space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold capitalize text-[#0D5B49] dark:text-[#00F5D4]">
                  {monthYearLabel}
                </h2>
                <button
                  type="button"
                  onClick={resetToday}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] font-bold hover:bg-gray-200"
                >
                  आज (Today)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-8 h-8 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-8 h-8 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Day Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#52645B] dark:text-[#9DB0A5] pb-1">
              <div>रवि (Sun)</div>
              <div>सोम (Mon)</div>
              <div>मंगल (Tue)</div>
              <div>बुध (Wed)</div>
              <div>गुरु (Thu)</div>
              <div>शुक्र (Fri)</div>
              <div>शनि (Sat)</div>
            </div>

            {/* Month Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {monthGrid.map((cell, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentDate(new Date(`${cell.dateStr}T00:00:00`));
                    setViewType('day');
                  }}
                  className={`min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    cell.isToday
                      ? 'border-[#00F5D4] bg-[#00F5D4]/10 dark:bg-[#00F5D4]/10 shadow-sm'
                      : cell.isCurrentMonth
                      ? 'bg-white dark:bg-[#1E2E26] border-[#D3DDD6]/60 dark:border-[#2B3C34] hover:border-[#00F5D4]/50'
                      : 'bg-gray-50/50 dark:bg-black/20 border-transparent opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-[#0D5B49] text-white shadow-sm'
                          : 'text-[#13231C] dark:text-[#E7F0EA]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.meetings.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#0D5B49]/15 text-[#0D5B49] dark:text-[#00F5D4]">
                        {cell.meetings.length}
                      </span>
                    )}
                  </div>

                  {/* Meetings pills in cell */}
                  <div className="space-y-1 mt-1">
                    {cell.meetings.slice(0, 2).map((m) => {
                      const hasClash = Boolean(clashesMap[m.id]);
                      return (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMeetingMinutes(m);
                          }}
                          className={`text-[10px] p-1 rounded font-semibold truncate border ${
                            hasClash
                              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-300'
                              : m.mode === 'online'
                              ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border-blue-200'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-200'
                          }`}
                          title={`${m.title} (${m.timeDisplay || m.startTime})`}
                        >
                          {hasClash && <span className="mr-0.5">⚠️</span>}
                          {m.title}
                        </div>
                      );
                    })}
                    {cell.meetings.length > 2 && (
                      <div className="text-[9px] text-gray-500 font-bold pl-1">
                        +{cell.meetings.length - 2} और
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CALENDAR VIEW 2: WEEK VIEW                                */}
        {/* ========================================================= */}
        {viewType === 'week' && (
          <div className="bg-white/90 dark:bg-[#16231D]/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-[#00F5D4]/20 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-[#0D5B49] dark:text-[#00F5D4]">
                  साप्ताहिक समय-सारणी / Weekly Schedule
                </h2>
                <button
                  type="button"
                  onClick={resetToday}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] font-bold hover:bg-gray-200"
                >
                  आज (Today)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevWeek}
                  className="w-8 h-8 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Previous week"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextWeek}
                  className="w-8 h-8 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Next week"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Week Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
              {weekDays.map((day) => (
                <div
                  key={day.dateStr}
                  className={`p-3 rounded-xl border flex flex-col justify-between min-h-[140px] ${
                    day.isToday
                      ? 'border-[#00F5D4] bg-[#00F5D4]/5 dark:bg-[#00F5D4]/10 shadow-sm'
                      : 'border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2]/50 dark:bg-[#1E2E26]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[#D3DDD6]/60 dark:border-[#2B3C34]">
                      <div>
                        <div className="text-xs font-bold text-[#0D5B49] dark:text-[#00F5D4]">
                          {day.dayNameHi} ({day.dayNameEn})
                        </div>
                        <div className="text-sm font-extrabold">{day.dayNumber}</div>
                      </div>
                      {day.isToday && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0D5B49] text-white font-bold">
                          आज
                        </span>
                      )}
                    </div>

                    {/* Classes on that day */}
                    {day.classPeriods.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          📚 शिक्षण कक्षाएं:
                        </div>
                        {day.classPeriods.map((c) => (
                          <div
                            key={c.id}
                            className="p-1 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[10px] text-indigo-900 dark:text-indigo-200 truncate"
                            title={`${c.className} (${c.startTime} - ${c.endTime})`}
                          >
                            🕒 {c.startTime}-{c.endTime}: {c.className}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Meetings on that day */}
                    <div className="mt-2.5 space-y-1.5">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        🤝 बैठकें ({day.meetings.length}):
                      </div>
                      {day.meetings.length === 0 ? (
                        <div className="text-[10px] text-gray-400 italic">कोई बैठक नहीं</div>
                      ) : (
                        day.meetings.map((m) => {
                          const hasClash = Boolean(clashesMap[m.id]);
                          return (
                            <div
                              key={m.id}
                              onClick={() => setSelectedMeetingMinutes(m)}
                              className={`p-2 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-sm ${
                                hasClash
                                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-900 dark:text-rose-200'
                                  : m.mode === 'online'
                                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 text-blue-900 dark:text-blue-200'
                                  : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                              }`}
                            >
                              <div className="font-bold line-clamp-1">{m.title}</div>
                              <div className="text-[10px] mt-0.5 opacity-80">
                                🕒 {m.timeDisplay || `${m.startTime}-${m.endTime}`}
                              </div>
                              {hasClash && (
                                <div className="text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-0.5">
                                  <span>⚠️</span>
                                  <span>समय टकराव (Clash)</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMeetingToEdit(null);
                      setIsAddModalOpen(true);
                    }}
                    className="mt-3 w-full py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 text-[10px] font-semibold text-center"
                  >
                    + बैठक जोड़ें
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CALENDAR VIEW 3: DAY VIEW                                 */}
        {/* ========================================================= */}
        {viewType === 'day' && (
          <div className="bg-white/90 dark:bg-[#16231D]/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-[#00F5D4]/20 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-[#0D5B49] dark:text-[#00F5D4]">
                  दैनिक समय-चक्र (Day Hourly Schedule): {currentDate.toISOString().slice(0, 10)}
                </h2>
                <button
                  type="button"
                  onClick={resetToday}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] font-bold hover:bg-gray-200"
                >
                  आज (Today)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevDay}
                  className="w-8 h-8 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Previous day"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextDay}
                  className="w-8 h-8 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-center font-bold hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Next day"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Day Schedule Timeline */}
            <div className="space-y-2">
              {(() => {
                const dayDateStr = currentDate.toISOString().slice(0, 10);
                const dayOfWeek = currentDate.getDay();
                const dayMeetings = meetings.filter((m) => m.date === dayDateStr);
                const dayClasses = DEFAULT_CLASS_SCHEDULE.filter((c) => c.dayOfWeek === dayOfWeek);

                const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

                return hours.map((hour) => {
                  const hourLabel = `${hour < 10 ? '0' : ''}${hour}:00`;
                  const matchingMeetings = dayMeetings.filter((m) => {
                    const startH = parseInt(m.startTime.split(':')[0], 10);
                    return startH === hour;
                  });
                  const matchingClasses = dayClasses.filter((c) => {
                    const startH = parseInt(c.startTime.split(':')[0], 10);
                    return startH === hour;
                  });

                  return (
                    <div
                      key={hour}
                      className="grid grid-cols-12 gap-2 p-2.5 rounded-xl border border-[#D3DDD6]/60 dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] items-start"
                    >
                      <div className="col-span-2 sm:col-span-1 text-xs font-bold text-gray-500">
                        {hourLabel}
                      </div>

                      <div className="col-span-10 sm:col-span-11 space-y-2">
                        {matchingClasses.map((cls) => (
                          <div
                            key={cls.id}
                            className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200"
                          >
                            📚 <strong>कक्षा पीरियड: </strong> {cls.className} ({cls.startTime} - {cls.endTime})
                          </div>
                        ))}

                        {matchingMeetings.map((m) => {
                          const hasClash = Boolean(clashesMap[m.id]);
                          return (
                            <div
                              key={m.id}
                              onClick={() => setSelectedMeetingMinutes(m)}
                              className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                                hasClash
                                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-900 dark:text-rose-200'
                                  : m.mode === 'online'
                                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 text-blue-900 dark:text-blue-200'
                                  : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm">{m.title}</h4>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-black/30">
                                  {m.mode === 'online' ? '💻 ऑनलाइन' : '🏫 ऑफलाइन'}
                                </span>
                              </div>
                              <p className="text-xs mt-1 text-[#52645B] dark:text-[#9DB0A5]">
                                {m.agenda}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs">
                                <span>🕒 {m.timeDisplay || `${m.startTime} - ${m.endTime}`}</span>
                                <span>•</span>
                                <span>📍 {m.linkOrLocation}</span>
                              </div>
                              {hasClash && (
                                <div className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/70 p-1.5 rounded-lg border border-rose-300">
                                  ⚠️ {clashesMap[m.id][0].message}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {matchingClasses.length === 0 && matchingMeetings.length === 0 && (
                          <div className="text-[11px] text-gray-400 italic">रिक्त समय (Free slot)</div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* LIST VIEW                                                 */}
        {/* ========================================================= */}
        {viewType === 'list' && (
          <div className="space-y-4">
            {displayedMeetings.length === 0 ? (
              <div className="bg-white/60 dark:bg-[#16231D]/60 backdrop-blur-md rounded-2xl p-12 text-center border border-dashed border-[#D3DDD6] dark:border-[#2B3C34]">
                <span className="text-4xl block mb-2">🤝</span>
                <h3 className="font-bold text-base">कोई बैठक नहीं मिली</h3>
                <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1 max-w-sm mx-auto">
                  {searchQuery
                    ? `"${searchQuery}" के लिए कोई परिणाम नहीं मिला।`
                    : 'वर्तमान में इस फ़िल्टर के अंतर्गत कोई बैठक निर्धारित नहीं है।'}
                </p>
              </div>
            ) : (
              displayedMeetings.map((meeting) => {
                const hasClash = Boolean(clashesMap[meeting.id]);
                const clashList = clashesMap[meeting.id] || [];
                const pendingAi = meeting.actionItems.filter((a) => !a.isConvertedToTask).length;

                return (
                  <div
                    key={meeting.id}
                    className={`bg-white/90 dark:bg-[#16231D]/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border transition-all hover:shadow-lg ${
                      hasClash
                        ? 'border-rose-400 dark:border-rose-800'
                        : meeting.status === 'completed'
                        ? 'border-gray-200 dark:border-gray-800 opacity-90'
                        : 'border-[#00F5D4]/25 hover:border-[#00F5D4]/50'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            meeting.mode === 'online'
                              ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                          }`}
                        >
                          {meeting.mode === 'online' ? '💻 ऑनलाइन / Virtual' : '🏫 ऑफलाइन / Physical'}
                        </span>

                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          📅 {meeting.date}
                        </span>

                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          🕒 {meeting.timeDisplay || `${meeting.startTime} - ${meeting.endTime}`}
                        </span>

                        {meeting.status === 'completed' && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ संपन्न (Completed)
                          </span>
                        )}
                      </div>

                      {hasClash && (
                        <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 flex items-center gap-1 animate-pulse">
                          <span>⚠️</span>
                          <span>समय टकराव (Clash Warning)</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA]">
                      {meeting.title}
                    </h3>

                    {/* Clash warning box */}
                    {hasClash && (
                      <div className="mt-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs space-y-1">
                        <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>टकराव विवरण (Clash Details):</span>
                        </div>
                        {clashList.map((c, i) => (
                          <p key={i} className="text-rose-900 dark:text-rose-200">
                            • {c.message} ({c.conflictingTime})
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Agenda */}
                    <div className="mt-3 p-3 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6]/60 dark:border-[#2B3C34]/60 text-xs space-y-1">
                      <p className="font-bold text-[#52645B] dark:text-[#9DB0A5] uppercase tracking-wider text-[10px]">
                        एजेंडा / AGENDA:
                      </p>
                      <p className="leading-relaxed text-[#13231C] dark:text-[#E7F0EA]">
                        {meeting.agenda || 'सामान्य विभागीय समीक्षा'}
                      </p>
                    </div>

                    {/* Location or Link */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                        <span>{meeting.mode === 'online' ? '🔗' : '📍'}</span>
                        <span>{meeting.linkOrLocation}</span>
                      </div>

                      {meeting.mode === 'online' && meeting.linkOrLocation.includes('http') && (
                        <a
                          href={meeting.linkOrLocation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                        >
                          <span>📹</span>
                          <span>मीट लिंक खोलें / Open Link</span>
                        </a>
                      )}
                    </div>

                    {/* Attendees */}
                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[#52645B] dark:text-[#9DB0A5] font-semibold text-[11px]">
                          सदस्य:
                        </span>
                        {meeting.attendees.map((att, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-[#0D5B49]/10 text-[#0D5B49] dark:text-[#00F5D4] text-[11px] font-semibold"
                          >
                            👤 {att}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Items & MoM Banner */}
                    <div className="mt-3.5 pt-3 border-t border-[#D3DDD6] dark:border-[#2B3C34] flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedMeetingMinutes(meeting)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0D5B49]/15 hover:bg-[#0D5B49]/25 text-[#0D5B49] dark:text-[#00F5D4] font-bold text-xs flex items-center gap-1.5 transition-colors border border-[#0D5B49]/20"
                        >
                          <span>📝</span>
                          <span>कार्यवृत्त व कार्य बिंदु (MoM & Action Items)</span>
                          {pendingAi > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                              {pendingAi} लंबित
                            </span>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleToggleCompleted(meeting, e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            meeting.status === 'completed'
                              ? 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {meeting.status === 'completed' ? 'पुनः निर्धारित करें' : '✓ संपन्न करें'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMeetingToEdit(meeting);
                            setIsAddModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          संपादित करें
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteMeeting(meeting.id, e)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                          title="हटाएं / Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal: Add or Edit Meeting */}
      <AddMeetingModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setMeetingToEdit(null);
        }}
        onSave={handleSaveMeeting}
        existingMeetings={meetings}
        meetingToEdit={meetingToEdit}
      />

      {/* Modal: Minutes of Meeting & Action Items */}
      <MeetingMinutesModal
        meeting={selectedMeetingMinutes}
        isOpen={Boolean(selectedMeetingMinutes)}
        onClose={() => setSelectedMeetingMinutes(null)}
        onUpdateMeeting={handleUpdateMeetingFromModal}
        onToast={onToast}
        onNavigate={onNavigate}
      />
    </div>
  );
};
