import React, { useState, useEffect } from 'react';
import { Task } from '../utils/taskStatusSystem';
import { Duty } from '../types/duty';
import { MeetingItem } from '../data/teacherHubSampleData';
import { generateStartOfDayChecklist } from '../utils/safeguardsManager';
import { StartOfDayItem } from '../types/safeguards';

interface StartOfDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  duties: Duty[];
  meetings: MeetingItem[];
  onCompleteTask?: (taskId: string) => void;
  onToast: (msg: string) => void;
  onNavigate?: (page: any) => void;
}

const STORAGE_KEY_CHECKED = 'th-start-of-day-checked';

export const StartOfDayModal: React.FC<StartOfDayModalProps> = ({
  isOpen,
  onClose,
  tasks,
  duties,
  meetings,
  onCompleteTask,
  onToast,
  onNavigate,
}) => {
  const [checklistItems, setChecklistItems] = useState<StartOfDayItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`${STORAGE_KEY_CHECKED}-${todayStr}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    if (isOpen) {
      const items = generateStartOfDayChecklist(tasks, duties, meetings, new Date());
      setChecklistItems(items);
    }
  }, [isOpen, tasks, duties, meetings]);

  const toggleCheck = (item: StartOfDayItem) => {
    const isChecked = checkedIds.includes(item.id);
    let nextChecked: string[];
    if (isChecked) {
      nextChecked = checkedIds.filter((id) => id !== item.id);
    } else {
      nextChecked = [...checkedIds, item.id];
      // If linked to a task, optionally mark task done
      if (item.sourceType === 'task' && onCompleteTask) {
        onCompleteTask(item.originalId);
      }
      onToast(`✓ "${item.title}" पूर्ण चिह्नित किया गया`);
    }

    setCheckedIds(nextChecked);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`${STORAGE_KEY_CHECKED}-${todayStr}`, JSON.stringify(nextChecked));
    } catch {
      // ignore
    }
  };

  const handleMarkAllDone = () => {
    const allIds = checklistItems.map((i) => i.id);
    setCheckedIds(allIds);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem(`${STORAGE_KEY_CHECKED}-${todayStr}`, JSON.stringify(allIds));
    } catch {
      // ignore
    }

    // Complete all linked tasks
    if (onCompleteTask) {
      checklistItems
        .filter((i) => i.sourceType === 'task')
        .forEach((i) => onCompleteTask(i.originalId));
    }
    onToast('🎉 आज के सभी प्रभात कार्य पूर्ण चिह्नित कर दिए गए!');
  };

  if (!isOpen) return null;

  const total = checklistItems.length;
  const completed = checkedIds.filter((id) => checklistItems.some((i) => i.id === id)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Morning Glow */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-100">
              <span>🌅 दैनिक प्रभात चेकलिस्ट (Daily Morning Checklist)</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-black mt-1 flex items-center gap-2">
            <span>शुभ प्रभात शिक्षक जी!</span>
          </h2>
          <p className="text-xs sm:text-sm text-amber-50 mt-1 opacity-90">
            आज के लिए आपके कुल <strong>{total}</strong> कार्य, दायित्व व बैठकें स्वतः तैयार की गई हैं। दिन की शुरुआत में इनकी जांच कर लें।
          </p>

          {/* Morning Progress */}
          <div className="mt-4 bg-black/20 p-3 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-amber-100 font-semibold">आज की कार्य पूर्णता:</span>
              <p className="text-base font-black">
                {completed}/{total} कार्य पूर्ण ({percent}%)
              </p>
            </div>
            <div className="w-28 h-3 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 px-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={handleMarkAllDone}
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
          >
            ✓ सभी कार्य पूर्ण करें (Mark All Done)
          </button>
        </div>

        {/* Checklist List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {checklistItems.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-slate-400">
              <span className="text-4xl block">✨</span>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                आज कोई पेंडिंग कार्य या बैठक निर्धारित नहीं है!
              </p>
              <p className="text-xs">आपका आज का शेड्यूल बिल्कुल हल्का और तनावमुक्त है।</p>
            </div>
          ) : (
            checklistItems.map((item) => {
              const isChecked = checkedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item)}
                  className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    isChecked
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 opacity-80'
                      : item.priority === 'urgent'
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Handled by container onClick
                    className="mt-1 w-5 h-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`text-sm sm:text-base font-bold ${
                          isChecked
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {item.title}
                      </span>

                      {item.timeLabel && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                          ⏰ {item.timeLabel}
                        </span>
                      )}

                      {item.priority === 'urgent' && !isChecked && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                          अति आवश्यक
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.subtitle}
                    </p>

                    {item.portalUrl && !isChecked && (
                      <div className="mt-2">
                        <a
                          href={item.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          <span>🔗 पोर्टल / लिंक खोलें</span>
                          <span>↗</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onNavigate) onNavigate('dashboard');
              else window.location.hash = '#dashboard';
            }}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline"
          >
            डैशबोर्ड पर कार्य विवरण देखें →
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            ठीक है, दिन प्रारंभ करें
          </button>
        </div>
      </div>
    </div>
  );
};
