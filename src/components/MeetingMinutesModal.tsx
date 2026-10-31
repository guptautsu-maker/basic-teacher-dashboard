import React, { useState } from 'react';
import { Meeting, ActionItem } from '../types/meeting';
import { convertActionItemToTask, convertAllActionItemsToTasks } from '../utils/meetingsManager';
import { Task } from '../utils/taskStatusSystem';

interface MeetingMinutesModalProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMeeting: (updatedMeeting: Meeting) => void;
  onToast: (msg: string) => void;
  onNavigate?: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'login') => void;
}

export const MeetingMinutesModal: React.FC<MeetingMinutesModalProps> = ({
  meeting,
  isOpen,
  onClose,
  onUpdateMeeting,
  onToast,
  onNavigate,
}) => {
  if (!isOpen || !meeting) return null;

  const [minutes, setMinutes] = useState(meeting.minutesOfMeeting || '');
  const [actionItems, setActionItems] = useState<ActionItem[]>(meeting.actionItems || []);

  // New action item form state
  const [newText, setNewText] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('शिक्षक जी');
  const [newDeadline, setNewDeadline] = useState('');

  const handleSaveMinutes = () => {
    const updated: Meeting = {
      ...meeting,
      minutesOfMeeting: minutes.trim(),
      actionItems,
      updatedAt: new Date().toISOString(),
    };
    onUpdateMeeting(updated);
    onToast('📝 कार्यवृत्त (Minutes) सुरक्षित हो गया');
  };

  const handleAddActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newItem: ActionItem = {
      id: `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: newText.trim(),
      assignedTo: newAssignedTo.trim() || 'शिक्षक जी',
      deadline: newDeadline || undefined,
      isConvertedToTask: false,
    };

    const nextItems = [...actionItems, newItem];
    setActionItems(nextItems);

    const updated: Meeting = {
      ...meeting,
      minutesOfMeeting: minutes.trim(),
      actionItems: nextItems,
      updatedAt: new Date().toISOString(),
    };
    onUpdateMeeting(updated);

    setNewText('');
    setNewDeadline('');
    onToast('＋ कार्य बिंदु (Action Item) जुड़ गया');
  };

  const handleRemoveActionItem = (id: string) => {
    const nextItems = actionItems.filter((a) => a.id !== id);
    setActionItems(nextItems);

    const updated: Meeting = {
      ...meeting,
      minutesOfMeeting: minutes.trim(),
      actionItems: nextItems,
      updatedAt: new Date().toISOString(),
    };
    onUpdateMeeting(updated);
    onToast('🗑️ कार्य बिंदु हटा दिया गया');
  };

  const handleConvertToTask = (actionItemId: string) => {
    try {
      const { task, updatedMeeting } = convertActionItemToTask(
        { ...meeting, minutesOfMeeting: minutes, actionItems },
        actionItemId
      );

      // Save to localStorage 'th-tasks'
      const rawTasks = localStorage.getItem('th-tasks');
      const existingTasks: Task[] = rawTasks ? JSON.parse(rawTasks) : [];
      const updatedTasks = [task, ...existingTasks];
      localStorage.setItem('th-tasks', JSON.stringify(updatedTasks));

      // Update local state and meeting state
      setActionItems(updatedMeeting.actionItems);
      onUpdateMeeting(updatedMeeting);

      onToast(`⚡ टास्क बन गया: "${task.title.slice(0, 30)}..."`);
    } catch {
      onToast('⚠️ कार्य में बदलने में त्रुटि हुई');
    }
  };

  const handleConvertAllToTasks = () => {
    const { tasks, updatedMeeting } = convertAllActionItemsToTasks({
      ...meeting,
      minutesOfMeeting: minutes,
      actionItems,
    });

    if (tasks.length === 0) {
      onToast('सभी कार्य बिंदु पहले से टास्क में बदले जा चुके हैं');
      return;
    }

    // Save tasks to localStorage
    const rawTasks = localStorage.getItem('th-tasks');
    const existingTasks: Task[] = rawTasks ? JSON.parse(rawTasks) : [];
    const updatedTasks = [...tasks, ...existingTasks];
    localStorage.setItem('th-tasks', JSON.stringify(updatedTasks));

    // Update meeting state
    setActionItems(updatedMeeting.actionItems);
    onUpdateMeeting(updatedMeeting);

    onToast(`⚡ ${tasks.length} नए टास्क Teacher Hub में जोड़ दिए गए!`);
  };

  const pendingCount = actionItems.filter((a) => !a.isConvertedToTask).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] w-full max-w-3xl rounded-2xl border border-[#00F5D4]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between bg-gradient-to-r from-[#0D5B49]/15 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#0D5B49] text-white flex items-center justify-center text-xl shadow-md font-bold">
              📝
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                कार्यवृत्त व कार्य बिंदु / Minutes of Meeting & Action Items
              </h3>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                बैठक की कार्यवाही, लिए गए निर्णय एवं टास्क सृजन
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Meeting Details Summary Bar */}
        <div className="px-5 py-3 bg-[#F1F5F2] dark:bg-[#1E2E26] border-b border-[#D3DDD6] dark:border-[#2B3C34] text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-sm text-[#0D5B49] dark:text-[#00F5D4]">
              {meeting.title}
            </h4>
            <div className="flex items-center gap-2 text-[#52645B] dark:text-[#9DB0A5]">
              <span>📅 {meeting.date}</span>
              <span>•</span>
              <span>🕒 {meeting.timeDisplay || `${meeting.startTime} - ${meeting.endTime}`}</span>
              <span>•</span>
              <span>{meeting.mode === 'online' ? '💻 ऑनलाइन' : '🏫 ऑफलाइन'}</span>
            </div>
          </div>

          <p className="text-xs text-[#13231C] dark:text-[#E7F0EA] mt-1">
            <strong>एजेंडा: </strong>
            {meeting.agenda || 'सामान्य समीक्षा एवं प्रगति चर्चा'}
          </p>

          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 items-center">
              <span className="text-[11px] font-semibold text-[#52645B] dark:text-[#9DB0A5]">
                उपस्थित:
              </span>
              {meeting.attendees.map((att, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-white dark:bg-black/20 text-[11px] text-[#52645B] dark:text-[#9DB0A5] border border-gray-200 dark:border-gray-700"
                >
                  {att}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Minutes of Meeting (कार्यवृत्त) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5]">
                बैठक कार्यवृत्त व सारांश / Minutes of Meeting (MoM)
              </label>
              <button
                type="button"
                onClick={handleSaveMinutes}
                className="px-3 py-1 rounded-lg bg-[#0D5B49]/15 hover:bg-[#0D5B49]/25 text-[#0D5B49] dark:text-[#00F5D4] text-xs font-bold transition-colors"
              >
                💾 सुरक्षित करें
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="बैठक में हुई चर्चा, महत्वपूर्ण सहमति एवं लिए गए निर्णयों का विस्तृत विवरण लिखें..."
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
            />
          </div>

          {/* Section 2: Action Items (कार्य बिंदु) */}
          <div className="space-y-3 pt-2 border-t border-[#D3DDD6] dark:border-[#2B3C34]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>तय किए गए कार्य बिंदु / Action Items ({actionItems.length})</span>
                </h5>
                <p className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                  इन्हें एक क्लिक में Teacher Hub टास्क में बदला जा सकता है
                </p>
              </div>

              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleConvertAllToTasks}
                  className="px-3 py-1.5 rounded-xl bg-[#0D5B49] hover:bg-[#00B39B] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>⚡ सभी {pendingCount} को टास्क में बदलें</span>
                </button>
              )}
            </div>

            {/* Add Action Item Mini-form */}
            <form
              onSubmit={handleAddActionItem}
              className="p-3.5 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] space-y-2.5"
            >
              <div className="text-xs font-bold text-[#0D5B49] dark:text-[#00F5D4]">
                ＋ नया कार्य बिंदु जोड़ें
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  required
                  placeholder="दायित्व / कार्य का विवरण (उदा. छात्र अनुपस्थिति पंजिका सत्यापन)"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="sm:col-span-6 px-3 py-2 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] text-xs focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
                />
                <input
                  type="text"
                  placeholder="प्रभारी / Assignee"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="sm:col-span-3 px-3 py-2 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] text-xs focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
                />
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="sm:col-span-3 px-3 py-2 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] text-xs focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0D5B49] text-white text-xs font-bold hover:bg-[#00B39B] transition-colors"
                >
                  ＋ कार्य बिंदु जोड़ें
                </button>
              </div>
            </form>

            {/* Action Items List */}
            {actionItems.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#52645B] dark:text-[#9DB0A5] border border-dashed border-[#D3DDD6] dark:border-[#2B3C34] rounded-xl">
                <span>📋 अभी कोई कार्य बिंदु नहीं जोड़ा गया है।</span>
              </div>
            ) : (
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-bold text-[#13231C] dark:text-[#E7F0EA]">
                        {item.text}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                        {item.assignedTo && <span>👤 प्रभारी: {item.assignedTo}</span>}
                        {item.deadline && <span>⏳ अंतिम तिथि: {item.deadline}</span>}
                        {item.isConvertedToTask ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300">
                            ✓ Teacher Hub टास्क सक्रिय
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-300">
                            ⏳ टास्क बनाना शेष
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {!item.isConvertedToTask ? (
                        <button
                          type="button"
                          onClick={() => handleConvertToTask(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0D5B49] to-[#00F5D4] text-[#13231C] font-bold text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1"
                        >
                          <span>⚡</span>
                          <span>टास्क बनाएं</span>
                        </button>
                      ) : (
                        onNavigate && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigate('dashboard');
                            }}
                            className="px-2.5 py-1 text-xs text-[#0D5B49] dark:text-[#00F5D4] font-semibold hover:underline"
                          >
                            टास्क देखें →
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveActionItem(item.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                        title="हटाएं"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between bg-[#F1F5F2]/50 dark:bg-[#1E2E26]/50">
          <div className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
            कार्यवृत्त व कार्य बिंदु स्वतः सुरक्षित रहते हैं
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveMinutes}
              className="px-4 py-2 rounded-xl bg-[#0D5B49] text-white text-xs font-bold hover:bg-[#00B39B]"
            >
              ✓ सुरक्षित कर बंद करें
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] text-xs font-semibold"
            >
              बंद करें
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
