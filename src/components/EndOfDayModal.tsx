import React, { useState, useEffect } from 'react';
import { Task } from '../utils/taskStatusSystem';
import { getEndOfDayReviewItems, applyEndOfDayAction } from '../utils/safeguardsManager';
import { EndOfDayAction, EndOfDayReviewItem } from '../types/safeguards';

interface EndOfDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onTasksUpdated: (updated: Task[]) => void;
  onToast: (msg: string) => void;
  currentUser?: { name: string; email: string } | null;
}

export const EndOfDayModal: React.FC<EndOfDayModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onTasksUpdated,
  onToast,
  currentUser,
}) => {
  const [reviewItems, setReviewItems] = useState<EndOfDayReviewItem[]>([]);
  const [taskStateMap, setTaskStateMap] = useState<Record<string, { action: EndOfDayAction; comment: string; resolved: boolean }>>({});

  useEffect(() => {
    if (isOpen) {
      const items = getEndOfDayReviewItems(tasks, new Date());
      setReviewItems(items);
      const initialMap: Record<string, { action: EndOfDayAction; comment: string; resolved: boolean }> = {};
      items.forEach((item) => {
        initialMap[item.task.id] = { action: 'done', comment: '', resolved: false };
      });
      setTaskStateMap(initialMap);
    }
  }, [isOpen, tasks]);

  if (!isOpen) return null;

  const handleApplyAction = (taskId: string, action: EndOfDayAction) => {
    const item = reviewItems.find((r) => r.task.id === taskId);
    if (!item) return;

    const currentSettings = taskStateMap[taskId] || { action, comment: '', resolved: false };

    const res = applyEndOfDayAction(item.task, action, {
      comment: currentSettings.comment,
      changedBy: currentUser?.name || 'शिक्षक (सांध्य समीक्षा)',
      now: new Date(),
    });

    // Update global task list
    let updatedTasks = tasks.map((t) => (t.id === taskId ? res.updatedTask : t));
    if (res.nextInstance) {
      updatedTasks = [res.nextInstance, ...updatedTasks];
    }
    onTasksUpdated(updatedTasks);

    setTaskStateMap((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], action, resolved: true },
    }));

    const labelMap: Record<EndOfDayAction, string> = {
      done: '✓ कार्य पूर्ण चिह्नित किया गया',
      move_tomorrow: '➡️ कार्य कल (+1 दिन) के लिए आगे बढ़ाया गया',
      move_next_week: '📅 कार्य अगले सप्ताह (+7 दिन) के लिए स्थगित किया गया',
      mark_blocked: '⚠️ कार्य में रुकावट दर्ज की गई',
    };

    onToast(labelMap[action]);
  };

  const handleCommentChange = (taskId: string, comment: string) => {
    setTaskStateMap((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], comment },
    }));
  };

  const remainingCount = reviewItems.filter((i) => !taskStateMap[i.task.id]?.resolved).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-200">
              <span>🌇 दिन का समापन (End of Day Wrap-Up)</span>
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
            <span>सांध्य कार्य समीक्षा व समापन</span>
          </h2>
          <p className="text-xs sm:text-sm text-purple-200 mt-1 opacity-90">
            विद्यालय छोड़ने से पूर्व आज के अपूर्ण कार्यों की समीक्षा करें। पूर्ण हुए कार्यों को टिक करें या आगामी दिवस हेतु रीशेड्यूल करें।
          </p>

          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-white/20 font-bold">
              {remainingCount === 0 ? '✓ सभी कार्य समीक्षित' : `समीक्षा हेतु शेष: ${remainingCount}`}
            </span>
          </div>
        </div>

        {/* Task Review List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {reviewItems.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <span className="text-4xl block">🎉</span>
              <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                शानदार! आज का कोई भी कार्य अधूरा नहीं है।
              </p>
              <p className="text-xs">आप निश्चिंत होकर विद्यालय दिवस समाप्त कर सकते हैं। शुभ संध्या!</p>
            </div>
          ) : (
            reviewItems.map(({ task }) => {
              const state = taskStateMap[task.id] || { action: 'done', comment: '', resolved: false };
              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    state.resolved
                      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        प्रकार: {task.type.toUpperCase()} • प्राथमिकता: {task.priority.toUpperCase()} • अंतिम तिथि: {task.deadline ? task.deadline.split('T')[0] : 'आज'}
                      </p>
                    </div>

                    {state.resolved ? (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold whitespace-nowrap">
                        ✓ समीक्षित
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold whitespace-nowrap">
                        कार्रवाई चुनें
                      </span>
                    )}
                  </div>

                  {/* 4 Action Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplyAction(task.id, 'done')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        state.resolved && state.action === 'done'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <span>✓</span>
                      <span>पूर्ण (Done)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyAction(task.id, 'move_tomorrow')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        state.resolved && state.action === 'move_tomorrow'
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800 hover:bg-blue-100'
                      }`}
                    >
                      <span>➡️</span>
                      <span>कल (+1 दिन)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyAction(task.id, 'move_next_week')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        state.resolved && state.action === 'move_next_week'
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800 hover:bg-purple-100'
                      }`}
                    >
                      <span>📅</span>
                      <span>अगला हफ़्ता (+7)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyAction(task.id, 'mark_blocked')}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        state.resolved && state.action === 'mark_blocked'
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      <span>⚠️</span>
                      <span>रुकावट (Blocked)</span>
                    </button>
                  </div>

                  {/* Optional Note input */}
                  <input
                    type="text"
                    value={state.comment}
                    onChange={(e) => handleCommentChange(task.id, e.target.value)}
                    placeholder="वैकल्पिक टिप्पणी या कारण लिखें (e.g. पोर्टल सर्वर डाउन, आगामी कार्य)..."
                    className="w-full text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            🔒 सभी परिवर्तन ऑडिट लॉग में सुरक्षित होते हैं
          </span>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            समीक्षा समाप्त करें (Finish Wrap-Up)
          </button>
        </div>
      </div>
    </div>
  );
};
