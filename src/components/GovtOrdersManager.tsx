import React, { useState, useEffect, useMemo } from 'react';
import {
  GovtOrder,
  GovtOrderFilter,
  GovtOrderPriority,
} from '../types/govtOrder';
import {
  getSampleGovtOrders,
  filterGovtOrders,
  getGovtOrderCounts,
  acknowledgeGovtOrder,
  unacknowledgeGovtOrder,
  createGovtOrder,
  convertGovtOrderToTask,
  categorizeGovtOrder,
} from '../utils/govtOrdersManager';
import { Task, TaskPriority, RecurrenceFrequency } from '../utils/taskStatusSystem';
import { AddGovtOrderModal } from './AddGovtOrderModal';
import { ConvertOrderToTaskModal } from './ConvertOrderToTaskModal';

interface GovtOrdersManagerProps {
  onToast: (msg: string) => void;
  onNavigate?: (page: 'home' | 'dashboard' | 'portals' | 'sheets' | 'login') => void;
  currentUser?: { name: string; email: string } | null;
}

const PRIORITY_META: Record<
  GovtOrderPriority,
  { labelHi: string; labelEn: string; badge: string; icon: string }
> = {
  urgent: {
    labelHi: 'अति आवश्यक',
    labelEn: 'Urgent',
    badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: '🔴',
  },
  high: {
    labelHi: 'उच्च',
    labelEn: 'High',
    badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: '🟠',
  },
  medium: {
    labelHi: 'सामान्य',
    labelEn: 'Medium',
    badge: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: '🟡',
  },
  low: {
    labelHi: 'कम',
    labelEn: 'Low',
    badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
    icon: '🟢',
  },
};

export const GovtOrdersManager: React.FC<GovtOrdersManagerProps> = ({
  onToast,
  onNavigate,
  currentUser,
}) => {
  // 1. Persistent State
  const [orders, setOrders] = useState<GovtOrder[]>(() => {
    try {
      const saved = localStorage.getItem('th-govt-orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleGovtOrders();
  });

  const saveOrders = (updated: GovtOrder[]) => {
    setOrders(updated);
    try {
      localStorage.setItem('th-govt-orders', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // 2. Active Tab & Search Query
  const [activeFilter, setActiveFilter] = useState<GovtOrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 3. Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [orderToConvert, setOrderToConvert] = useState<GovtOrder | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<GovtOrder | null>(null);

  // 4. Counts calculation
  const counts = useMemo(() => {
    return getGovtOrderCounts(orders);
  }, [orders]);

  // 5. Filtered Orders
  const displayedOrders = useMemo(() => {
    return filterGovtOrders(orders, {
      filter: activeFilter,
      query: searchQuery,
    });
  }, [orders, activeFilter, searchQuery]);

  // Handle Acknowledge
  const handleAcknowledge = (orderId: string) => {
    const teacherName = currentUser?.name || 'सुरेश कुमार (सहायक अध्यापक)';
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return acknowledgeGovtOrder(o, teacherName);
      }
      return o;
    });
    saveOrders(updated);
    onToast(`✓ शासनादेश का संज्ञान ले लिया गया (${teacherName})`);
  };

  // Handle Un-acknowledge
  const handleUnacknowledge = (orderId: string) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return unacknowledgeGovtOrder(o);
      }
      return o;
    });
    saveOrders(updated);
    onToast('संज्ञान स्थिति हटा दी गई');
  };

  // Handle Add Order
  const handleSaveNewOrder = (orderData: {
    title: string;
    orderNumber?: string;
    date: string;
    issuingOffice: string;
    deadline?: string | null;
    priority: GovtOrderPriority;
    summary: string;
    acknowledgementRequired: boolean;
    attachment?: {
      name: string;
      size?: string;
      type?: string;
      dataUrl?: string;
    };
  }) => {
    const newOrder = createGovtOrder(orderData);
    const updated = [newOrder, ...orders];
    saveOrders(updated);
    onToast('＋ नया शासनादेश सफलतापूर्वक दर्ज हो गया');
  };

  // Handle Convert to Task
  const handleConvertOrder = (params: {
    orderId: string;
    title: string;
    description: string;
    deadline?: string | null;
    priority: TaskPriority;
    assignedTo: string;
    recurrence: RecurrenceFrequency;
  }) => {
    const targetOrder = orders.find((o) => o.id === params.orderId);
    if (!targetOrder) return;

    const { task, updatedOrder } = convertGovtOrderToTask(targetOrder, params);

    // Save updated order with linkedTaskId
    const updatedOrders = orders.map((o) => (o.id === targetOrder.id ? updatedOrder : o));
    saveOrders(updatedOrders);

    // Save newly created task to 'th-tasks'
    try {
      const rawTasks = localStorage.getItem('th-tasks');
      const existingTasks: Task[] = rawTasks ? JSON.parse(rawTasks) : [];
      const updatedTasks = [task, ...existingTasks];
      localStorage.setItem('th-tasks', JSON.stringify(updatedTasks));
    } catch {
      // ignore
    }

    onToast(`⚡ कार्य बन गया: "${task.title.slice(0, 35)}..."`);
  };

  // Handle Delete Order
  const handleDeleteOrder = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस शासनादेश को हटाना चाहते हैं?')) {
      const updated = orders.filter((o) => o.id !== orderId);
      saveOrders(updated);
      onToast('🗑️ शासनादेश हटा दिया गया');
    }
  };

  // Handle File Download or View
  const handleDownloadAttachment = (order: GovtOrder) => {
    if (order.attachment?.dataUrl) {
      const link = document.createElement('a');
      link.href = order.attachment.dataUrl;
      link.download = order.attachment.name || 'Shashanadesh.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onToast(`📥 डाउनलोड शुरू: ${order.attachment.name}`);
    } else {
      onToast(`📥 शासनादेश प्रतिलिपि डाउनलोड की जा रही है: ${order.attachment?.name || 'आदेश.pdf'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F2] dark:bg-[#0A0E27] text-[#13231C] dark:text-[#E7F0EA] transition-colors py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white/80 dark:bg-[#16231D]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-[#00F5D4]/25 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#0D5B49] to-[#00F5D4] flex items-center justify-center text-3xl shadow-lg shrink-0">
                📜
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    शासनादेश व विभागीय आदेश
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#0D5B49]/15 text-[#0D5B49] dark:text-[#00F5D4] border border-[#0D5B49]/20">
                    Govt Orders Module
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5] mt-1">
                  समस्त विभागीय परिपत्र, शासनादेश, समय-सीमा व अनुपालन कार्य एक ही स्थान पर
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
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0D5B49] to-[#00F5D4] text-[#13231C] font-bold text-xs sm:text-sm shadow-md hover:shadow-[#00F5D4]/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <span>＋</span> नया शासनादेश जोड़ें
              </button>
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-[#D3DDD6] dark:border-[#2B3C34]">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeFilter === 'all'
                  ? 'bg-[#0D5B49]/15 border-[#00F5D4] shadow-sm'
                  : 'bg-[#F1F5F2] dark:bg-[#1E2E26] border-transparent hover:border-[#D3DDD6]'
              }`}
            >
              <div className="text-[11px] font-semibold text-[#52645B] dark:text-[#9DB0A5]">
                कुल शासनादेश / All
              </div>
              <div className="text-lg font-bold mt-0.5 text-[#0D5B49] dark:text-[#00F5D4]">
                {counts.all}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('new')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeFilter === 'new'
                  ? 'bg-blue-100/70 dark:bg-blue-950/60 border-blue-400 shadow-sm'
                  : 'bg-[#F1F5F2] dark:bg-[#1E2E26] border-transparent hover:border-[#D3DDD6]'
              }`}
            >
              <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                नया / New
              </div>
              <div className="text-lg font-bold mt-0.5 text-blue-700 dark:text-blue-300">
                {counts.new}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('action_needed')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeFilter === 'action_needed'
                  ? 'bg-amber-100/70 dark:bg-amber-950/60 border-amber-400 shadow-sm'
                  : 'bg-[#F1F5F2] dark:bg-[#1E2E26] border-transparent hover:border-[#D3DDD6]'
              }`}
            >
              <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <span>⚠️</span> कार्रवाई अपेक्षित
              </div>
              <div className="text-lg font-bold mt-0.5 text-amber-700 dark:text-amber-300">
                {counts.action_needed}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('acknowledged')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeFilter === 'acknowledged'
                  ? 'bg-emerald-100/70 dark:bg-emerald-950/60 border-emerald-400 shadow-sm'
                  : 'bg-[#F1F5F2] dark:bg-[#1E2E26] border-transparent hover:border-[#D3DDD6]'
              }`}
            >
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <span>✓</span> संज्ञान लिया
              </div>
              <div className="text-lg font-bold mt-0.5 text-emerald-700 dark:text-emerald-300">
                {counts.acknowledged}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('expired')}
              className={`col-span-2 sm:col-span-1 p-3 rounded-xl border text-left transition-all ${
                activeFilter === 'expired'
                  ? 'bg-rose-100/70 dark:bg-rose-950/60 border-rose-400 shadow-sm'
                  : 'bg-[#F1F5F2] dark:bg-[#1E2E26] border-transparent hover:border-[#D3DDD6]'
              }`}
            >
              <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <span>⌛</span> समय सीमा समाप्त
              </div>
              <div className="text-lg font-bold mt-0.5 text-rose-700 dark:text-rose-300">
                {counts.expired}
              </div>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Keyword Search Bar */}
        <div className="bg-white/80 dark:bg-[#16231D]/80 backdrop-blur-xl rounded-2xl p-4 border border-[#00F5D4]/20 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input (Bilingual Hindi & English) */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder="खोजें: शीर्षक, पत्रांक, कार्यालय या विषय (उदा. DBT, निपुण, BSA, 14205, समय)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Chips on Desktop */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeFilter === 'all'
                    ? 'bg-[#0D5B49] text-white shadow-sm'
                    : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                सभी ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('new')}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeFilter === 'new'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                नया ({counts.new})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('action_needed')}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeFilter === 'action_needed'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                कार्रवाई अपेक्षित ({counts.action_needed})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('acknowledged')}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeFilter === 'acknowledged'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                संज्ञान लिया ({counts.acknowledged})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('expired')}
                className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  activeFilter === 'expired'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                समाप्त ({counts.expired})
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {displayedOrders.length === 0 ? (
            <div className="bg-white/60 dark:bg-[#16231D]/60 backdrop-blur-md rounded-2xl p-12 text-center border border-dashed border-[#D3DDD6] dark:border-[#2B3C34]">
              <span className="text-4xl block mb-2">📜</span>
              <h3 className="font-bold text-base">कोई शासनादेश नहीं मिला</h3>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `"${searchQuery}" के लिए कोई परिणाम नहीं मिला। कृपया अन्य शब्द खोजें।`
                  : 'इस श्रेणी में वर्तमान में कोई शासनादेश उपलब्ध नहीं है।'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-[#0D5B49] text-white text-xs font-semibold"
                >
                  खोज फ़िल्टर हटाएं
                </button>
              )}
            </div>
          ) : (
            displayedOrders.map((order) => {
              const cats = categorizeGovtOrder(order);
              const pMeta = PRIORITY_META[order.priority] || PRIORITY_META.medium;

              return (
                <div
                  key={order.id}
                  className={`bg-white/90 dark:bg-[#16231D]/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border transition-all hover:shadow-lg ${
                    cats.isExpired
                      ? 'border-rose-300 dark:border-rose-900/60 hover:border-rose-500'
                      : cats.isActionNeeded
                      ? 'border-amber-300 dark:border-amber-900/60 hover:border-amber-500'
                      : 'border-[#00F5D4]/20 hover:border-[#00F5D4]/50'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        {order.orderNumber}
                      </span>

                      {/* Priority Tag */}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${pMeta.badge}`}
                      >
                        <span>{pMeta.icon}</span>
                        <span>{pMeta.labelHi}</span>
                      </span>

                      {/* Date */}
                      <span className="text-[11px] text-[#52645B] dark:text-[#9DB0A5] flex items-center gap-1">
                        📅 {order.date}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {cats.isExpired && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300">
                          ⌛ समय सीमा समाप्त (Expired)
                        </span>
                      )}
                      {!cats.isExpired && cats.isActionNeeded && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300">
                          ⚡ कार्रवाई अपेक्षित (Action Needed)
                        </span>
                      )}
                      {cats.isAcknowledged && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                          ✓ संज्ञान लिया
                        </span>
                      )}
                      {cats.isNew && !cats.isAcknowledged && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300">
                          ✨ नया (New)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Issuing Office */}
                  <h3 className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA] leading-snug">
                    {order.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-[#0D5B49] dark:text-[#00F5D4] font-semibold mt-1">
                    <span>🏛️</span>
                    <span>{order.issuingOffice}</span>
                  </div>

                  {/* Summary Box */}
                  <div className="mt-3 p-3.5 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6]/60 dark:border-[#2B3C34]/60">
                    <p className="text-xs leading-relaxed text-[#13231C] dark:text-[#E7F0EA]">
                      {order.summary}
                    </p>
                  </div>

                  {/* Compliance Deadline & Attachment Row */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {order.deadline ? (
                      <div
                        className={`flex items-center gap-1.5 font-semibold px-2.5 py-1.5 rounded-lg border ${
                          cats.isExpired
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300'
                        }`}
                      >
                        <span>⏳</span>
                        <span>
                          अनुपालन अंतिम तिथि: <strong>{order.deadline}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                        ℹ️ सामान्य विभागीय सूचना (कोई निश्चित अंतिम तिथि नहीं)
                      </div>
                    )}

                    {/* Attachment / Download Button */}
                    {order.attachment && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D5B49]/10 hover:bg-[#0D5B49]/20 text-[#0D5B49] dark:text-[#00F5D4] font-semibold transition-colors border border-[#0D5B49]/20"
                          title="शासनादेश प्रतिलिपि डाउनलोड करें"
                        >
                          <span>📎</span>
                          <span className="truncate max-w-[180px]">{order.attachment.name}</span>
                          {order.attachment.size && (
                            <span className="text-[10px] opacity-75">({order.attachment.size})</span>
                          )}
                          <span className="text-xs">⬇️</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Linked Tasks Info */}
                  {order.linkedTaskIds && order.linkedTaskIds.length > 0 && (
                    <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-[11px] flex items-center justify-between text-teal-900 dark:text-teal-200">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span>🔗</span>
                        <span>
                          इस शासनादेश से <strong>{order.linkedTaskIds.length}</strong> कार्य Teacher Hub में जोड़े गए हैं।
                        </span>
                      </span>
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => onNavigate('dashboard')}
                          className="text-[#0D5B49] dark:text-[#00F5D4] font-bold hover:underline"
                        >
                          कार्य देखें →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-[#D3DDD6] dark:border-[#2B3C34] flex flex-wrap items-center justify-between gap-2.5">
                    {/* Acknowledgment Action / Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {order.isAcknowledged ? (
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                            <span>✓</span>
                            <span>
                              संज्ञान लिया: <strong>{order.acknowledgedAt}</strong>
                              {order.acknowledgedBy && ` (${order.acknowledgedBy})`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnacknowledge(order.id)}
                            className="text-[11px] text-gray-500 hover:text-rose-600 underline"
                          >
                            रद्द करें
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(order.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                        >
                          <span>✓</span>
                          <span>संज्ञान लें / Acknowledge</span>
                          {order.acknowledgementRequired && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 uppercase font-semibold">
                              अनिवार्य
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Secondary Actions: Convert to Task & Details */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderToConvert(order)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0D5B49] hover:bg-[#0D5B49]/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <span>⚡</span>
                        <span>कार्य में बदलें / Convert to Task</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderDetails(order)}
                        className="px-3 py-1.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        विस्तृत देखें
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteOrder(order.id, e)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
                        title="हटाएं / Delete"
                        aria-label="Delete order"
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
      </div>

      {/* Modal: Add Govt Order */}
      <AddGovtOrderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewOrder}
      />

      {/* Modal: Convert Order to Task */}
      <ConvertOrderToTaskModal
        order={orderToConvert}
        isOpen={Boolean(orderToConvert)}
        onClose={() => setOrderToConvert(null)}
        onConvert={handleConvertOrder}
      />

      {/* Modal: View Full Order Details */}
      {selectedOrderDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && setSelectedOrderDetails(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] w-full max-w-xl rounded-2xl border border-[#00F5D4]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between bg-gradient-to-r from-[#0D5B49]/15 to-transparent">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📜</span>
                <div>
                  <span className="text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400">
                    {selectedOrderDetails.orderNumber}
                  </span>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    शासनादेश विवरण
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <h4 className="font-bold text-base text-[#0D5B49] dark:text-[#00F5D4]">
                  {selectedOrderDetails.title}
                </h4>
                <div className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1 space-y-0.5">
                  <p>🏛️ जारीकर्ता: {selectedOrderDetails.issuingOffice}</p>
                  <p>📅 आदेश दिनांक: {selectedOrderDetails.date}</p>
                  {selectedOrderDetails.deadline && (
                    <p className="font-semibold text-amber-700 dark:text-amber-400">
                      ⏳ अनुपालन अंतिम तिथि: {selectedOrderDetails.deadline}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-2">
                  शासनादेश मुख्य निर्देश व सार
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {selectedOrderDetails.summary}
                </p>
              </div>

              {selectedOrderDetails.attachment && (
                <div className="p-3 rounded-xl border border-dashed border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📎</span>
                    <div>
                      <p className="text-xs font-bold">{selectedOrderDetails.attachment.name}</p>
                      <p className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                        {selectedOrderDetails.attachment.size || 'PDF प्रपत्र'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(selectedOrderDetails)}
                    className="px-3 py-1.5 rounded-lg bg-[#0D5B49] text-white text-xs font-bold hover:bg-[#0D5B49]/90"
                  >
                    डाउनलोड ⬇️
                  </button>
                </div>
              )}

              {selectedOrderDetails.isAcknowledged ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
                  <p className="font-bold">✓ संज्ञान पावती दर्ज है</p>
                  <p className="text-[11px] mt-0.5">
                    दिनांक व समय: {selectedOrderDetails.acknowledgedAt} (शिक्षक: {selectedOrderDetails.acknowledgedBy})
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-bold">⚠️ पावती लंबित है</p>
                  <p className="text-[11px] mt-0.5">
                    कृपया आदेश का अवलोकन कर संज्ञान बटन पर क्लिक करें।
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-end gap-2 bg-[#F1F5F2]/50 dark:bg-[#1E2E26]/50">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] text-xs font-semibold"
              >
                बंद करें
              </button>
              {!selectedOrderDetails.isAcknowledged && (
                <button
                  type="button"
                  onClick={() => {
                    handleAcknowledge(selectedOrderDetails.id);
                    setSelectedOrderDetails(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  ✓ संज्ञान लें
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const target = selectedOrderDetails;
                  setSelectedOrderDetails(null);
                  setOrderToConvert(target);
                }}
                className="px-4 py-2 rounded-xl bg-[#0D5B49] text-white font-bold text-xs"
              >
                ⚡ कार्य बनाएं
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
