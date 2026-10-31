import React, { useState } from 'react';
import { GovtOrderPriority } from '../types/govtOrder';

interface AddGovtOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: {
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
  }) => void;
}

const COMMON_OFFICES = [
  'महानिदेशक, स्कूल शिक्षा एवं राज्य परियोजना निदेशक, लखनऊ',
  'सचिव, उत्तर प्रदेश बेसिक शिक्षा परिषद, प्रयागराज',
  'जिला बेसिक शिक्षा अधिकारी (BSA Office)',
  'खंड शिक्षा अधिकारी (BEO Office)',
  'SCERT उत्तर प्रदेश, लखनऊ',
  'DIET (जिला शिक्षा एवं प्रशिक्षण संस्थान)',
  'शिक्षा निदेशक (बेसिक), उत्तर प्रदेश',
];

export const AddGovtOrderModal: React.FC<AddGovtOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [date, setDate] = useState(todayStr);
  const [issuingOffice, setIssuingOffice] = useState(COMMON_OFFICES[2]); // Default BSA
  const [customOffice, setCustomOffice] = useState('');
  const [isCustomOffice, setIsCustomOffice] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<GovtOrderPriority>('high');
  const [summary, setSummary] = useState('');
  const [acknowledgementRequired, setAcknowledgementRequired] = useState(true);

  // File upload state
  const [attachment, setAttachment] = useState<{
    name: string;
    size?: string;
    type?: string;
    dataUrl?: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const sizeInKb = Math.round(file.size / 1024);
    const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        size: sizeStr,
        type: file.type || 'application/pdf',
        dataUrl: reader.result as string,
      });
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;

    const finalOffice = isCustomOffice && customOffice.trim() ? customOffice.trim() : issuingOffice;

    onSave({
      title: title.trim(),
      orderNumber: orderNumber.trim() || undefined,
      date: date || todayStr,
      issuingOffice: finalOffice,
      deadline: deadline ? deadline.trim() : null,
      priority,
      summary: summary.trim(),
      acknowledgementRequired,
      attachment: attachment || undefined,
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
      <div className="bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] w-full max-w-2xl rounded-2xl border border-[#00F5D4]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between bg-gradient-to-r from-[#0D5B49]/15 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#0D5B49] text-white flex items-center justify-center text-xl shadow-md font-bold">
              📜
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                नया शासनादेश जोड़ें / Add Government Order
              </h3>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                विभागीय आदेश, परिपत्र या सूचना दर्ज करें
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              शासनादेश का शीर्षक / Order Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="उदा. शीतकालीन यूनिफॉर्म डीबीटी सत्यापन निर्देश"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
            />
          </div>

          {/* Grid: Order Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                पत्रांक संख्या / Order Number
              </label>
              <input
                type="text"
                placeholder="उदा. पत्रांक: बे०शि०प० / 14205 / 2026"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                आदेश दिनांक / Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            </div>
          </div>

          {/* Issuing Office */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5]">
                जारीकर्ता कार्यालय / Issuing Office <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomOffice(!isCustomOffice)}
                className="text-xs text-[#0D5B49] dark:text-[#00F5D4] font-semibold hover:underline"
              >
                {isCustomOffice ? 'सुझाव सूची चुनें' : 'अन्य कार्यालय लिखें'}
              </button>
            </div>

            {isCustomOffice ? (
              <input
                type="text"
                placeholder="कार्यालय का नाम लिखें (उदा. नगर शिक्षा अधिकारी कार्यालय)"
                value={customOffice}
                onChange={(e) => setCustomOffice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            ) : (
              <select
                value={issuingOffice}
                onChange={(e) => setIssuingOffice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              >
                {COMMON_OFFICES.map((off) => (
                  <option key={off} value={off}>
                    {off}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Grid: Deadline & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                अनुपालन अंतिम तिथि / Deadline (वैकल्पिक)
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
                onChange={(e) => setPriority(e.target.value as GovtOrderPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              >
                <option value="urgent">🔴 अति आवश्यक / Urgent</option>
                <option value="high">🟠 उच्च / High Priority</option>
                <option value="medium">🟡 सामान्य / Medium</option>
                <option value="low">🟢 सामान्य सूचना / Low</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              शासनादेश सार व मुख्य बिंदु / Summary & Action Points <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="आदेश के मुख्य निर्देश, समय-सारणी अथवा कार्रवाई का विवरण..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
            />
          </div>

          {/* File Upload Attachment */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              फाइल संलग्न करें / File Upload (PDF, Image, Doc)
            </label>

            {attachment ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D5B49]/10 border border-[#0D5B49]/30">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-xl">📎</span>
                  <div className="truncate">
                    <p className="text-xs font-bold truncate">{attachment.name}</p>
                    <p className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                      {attachment.size || 'संलग्न'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg font-semibold"
                >
                  हटाएं (Remove)
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#D3DDD6] dark:border-[#2B3C34] rounded-xl hover:border-[#00F5D4] cursor-pointer bg-[#F1F5F2]/60 dark:bg-[#1E2E26]/60 transition-colors">
                <span className="text-2xl mb-1">📁</span>
                <span className="text-xs font-semibold text-[#0D5B49] dark:text-[#00F5D4]">
                  {isUploading ? 'अपलोड हो रहा है...' : 'PDF या इमेज फाइल चुनें'}
                </span>
                <span className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                  (शासनादेश की प्रति, परिपत्र या आदेश पत्र)
                </span>
                <input
                  type="file"
                  accept=".pdf,image/*,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Acknowledgement Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34]">
            <input
              type="checkbox"
              id="ackRequired"
              checked={acknowledgementRequired}
              onChange={(e) => setAcknowledgementRequired(e.target.checked)}
              className="w-4 h-4 text-[#0D5B49] rounded accent-[#0D5B49] cursor-pointer"
            />
            <label htmlFor="ackRequired" className="text-xs font-semibold cursor-pointer">
              संज्ञान / पावती (Acknowledgement) अनिवार्य है
              <span className="block text-[11px] font-normal text-[#52645B] dark:text-[#9DB0A5]">
                शिक्षकों को इस आदेश पर पावती दर्ज करनी होगी
              </span>
            </label>
          </div>

          {/* Actions */}
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
              ✓ शासनादेश जोड़ें / Save Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
