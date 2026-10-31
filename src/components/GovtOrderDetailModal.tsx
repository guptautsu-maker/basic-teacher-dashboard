import React from 'react';
import { GovtOrderItem } from '../data/teacherHubSampleData';

interface GovtOrderDetailModalProps {
  order: GovtOrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (orderId: string) => void;
  onToast: (msg: string) => void;
}

export const GovtOrderDetailModal: React.FC<GovtOrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onAcknowledge,
  onToast,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] w-full max-w-xl rounded-2xl border border-[#00F5D4]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between bg-gradient-to-r from-[#0D5B49]/10 to-transparent">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#0D5B49] text-white flex items-center justify-center text-xl shadow-md font-bold">
              📜
            </span>
            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
                {order.orderNumber}
              </span>
              <h3 className="font-bold text-base sm:text-lg leading-tight mt-1">
                शासनादेश विवरण / Govt Order
              </h3>
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div>
            <h4 className="font-bold text-base sm:text-lg text-[#0D5B49] dark:text-[#00F5D4] leading-snug">
              {order.title}
            </h4>
            <div className="flex flex-wrap gap-2 items-center mt-2 text-xs text-[#52645B] dark:text-[#9DB0A5]">
              <span>🏛️ {order.issuingAuthority}</span>
              <span>•</span>
              <span>📅 दिनांक: {order.date}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-2">
              शासनादेश सार व मुख्य निर्देश / Executive Summary
            </p>
            <p className="text-sm leading-relaxed text-[#13231C] dark:text-[#E7F0EA]">
              {order.summary}
            </p>
          </div>

          {order.deadline && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <span className="text-lg">⏳</span>
              <div>
                <span className="font-bold">अनुपालन अंतिम तिथि / Compliance Deadline: </span>
                <span>{order.deadline}</span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl border border-dashed border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-xl">📎</span>
              <div>
                <p className="font-semibold">{order.attachmentName}</p>
                <p className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">आधिकारिक हस्ताक्षर युक्त PDF प्रपत्र</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToast(`शासनादेश डाउनलोड शुरू: ${order.attachmentName}`)}
              className="px-3 py-1.5 rounded-lg bg-[#0D5B49]/10 text-[#0D5B49] dark:text-[#00F5D4] font-semibold text-xs hover:bg-[#0D5B49]/20"
            >
              डाउनलोड / Download
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between gap-3 bg-[#F1F5F2] dark:bg-[#0A0E27]">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] font-semibold text-xs sm:text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            बंद करें / Close
          </button>

          {order.acknowledgementRequired && !order.isAcknowledged ? (
            <button
              type="button"
              onClick={() => {
                onAcknowledge(order.id);
                onToast('शासनादेश प्राप्ति स्वीकार की गई / Acknowledged');
                onClose();
              }}
              className="py-2.5 px-5 rounded-xl bg-[#0D5B49] text-white font-bold text-xs sm:text-sm shadow-md hover:bg-[#00B39B] transition-all flex items-center gap-2"
            >
              <span>✍️</span>
              <span>अभिस्वीकृति दर्ज करें / Acknowledge</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>✓</span>
              <span>स्वीकृत व पठित / Acknowledged</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
