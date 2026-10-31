import React, { useState } from 'react';
import { GovtOrder } from '../types/govtOrder';
import { TaskPriority, RecurrenceFrequency } from '../utils/taskStatusSystem';

interface ConvertOrderToTaskModalProps {
  order: GovtOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (params: {
    orderId: string;
    title: string;
    description: string;
    deadline?: string | null;
    priority: TaskPriority;
    assignedTo: string;
    recurrence: RecurrenceFrequency;
  }) => void;
}

export const ConvertOrderToTaskModal: React.FC<ConvertOrderToTaskModalProps> = ({
  order,
  isOpen,
  onClose,
  onConvert,
}) => {
  if (!isOpen || !order) return null;

  const [title, setTitle] = useState(
    order.title.startsWith('अनुपालन:') ? order.title : `अनुपालन: ${order.title}`
  );
  const [description, setDescription] = useState(
    `शासनादेश पत्रांक: ${order.orderNumber} के अनुपालन में:\n${order.summary}`
  );
  const [deadline, setDeadline] = useState(order.deadline || '');
  const [priority, setPriority] = useState<TaskPriority>(order.priority || 'high');
  const [assignedTo, setAssignedTo] = useState('शिक्षक जी');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>('none');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onConvert({
      orderId: order.id,
      title: title.trim(),
      description: description.trim(),
      deadline: deadline || null,
      priority,
      assignedTo: assignedTo.trim() || 'शिक्षक जी',
      recurrence,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] w-full max-w-xl rounded-2xl border border-[#00F5D4]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between bg-gradient-to-r from-[#0D5B49]/15 to-transparent">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#0D5B49] text-white flex items-center justify-center text-xl shadow-md font-bold">
              ⚡
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                शासनादेश को कार्य में बदलें / Convert to Task
              </h3>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                Teacher Hub में नया अनुपालन कार्य बनाएं
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

        {/* Source Order Info Banner */}
        <div className="px-5 py-3 bg-[#F1F5F2] dark:bg-[#1E2E26] border-b border-[#D3DDD6] dark:border-[#2B3C34] text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#52645B] dark:text-[#9DB0A5] font-semibold">
              {order.orderNumber}
            </span>
            <span className="font-semibold text-[#0D5B49] dark:text-[#00F5D4]">
              {order.issuingOffice}
            </span>
          </div>
          <p className="font-bold text-[#13231C] dark:text-[#E7F0EA] mt-1 line-clamp-1">
            {order.title}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              कार्य का शीर्षक / Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
            />
          </div>

          {/* Grid: Deadline & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                कार्य अंतिम तिथि / Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                प्राथमिकता / Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              >
                <option value="urgent">🔴 अति आवश्यक / Urgent</option>
                <option value="high">🟠 उच्च / High</option>
                <option value="medium">🟡 सामान्य / Medium</option>
                <option value="low">🟢 कम / Low</option>
              </select>
            </div>
          </div>

          {/* Grid: Assigned To & Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                प्रभारी / Assigned To
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="उदा. सहायक अध्यापक / कक्षाध्यापक"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                पुनरावृत्ति / Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              >
                <option value="none">एक बार (None)</option>
                <option value="daily">प्रतिदिन (Daily)</option>
                <option value="weekly">साप्ताहिक (Weekly)</option>
                <option value="monthly">मासिक (Monthly)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              कार्य विवरण व निर्देश / Task Steps & Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#D3DDD6] dark:border-[#2B3C34]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
            >
              रद्द करें / Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0D5B49] to-[#00F5D4] text-[#13231C] font-bold text-xs shadow-lg hover:shadow-[#00F5D4]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              ⚡ कार्य बनाएं / Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
