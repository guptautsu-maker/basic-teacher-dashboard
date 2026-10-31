import React, { useState, useEffect, useMemo } from 'react';
import { PortalApp, PortalCategory } from '../types/portalApp';
import { PORTAL_CATEGORIES } from '../data/portalAppData';
import {
  PASSWORD_WARNING_NOTICE,
  validateLoginHelpNote,
} from '../utils/portalManager';
import { validateSensitiveData } from '../utils/privacyAndSecurityManager';
import { SensitiveDataAlert } from './SensitiveDataGuardNotice';

interface PortalModalProps {
  isOpen: boolean;
  portalToEdit: PortalApp | null;
  onClose: () => void;
  onSave: (portalData: Omit<PortalApp, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onToast: (msg: string) => void;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  isOpen,
  portalToEdit,
  onClose,
  onSave,
  onToast,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState<PortalCategory>('attendance');
  const [neededForTask, setNeededForTask] = useState('');
  const [lastUsedDate, setLastUsedDate] = useState('');
  const [loginHelpNote, setLoginHelpNote] = useState('');
  const [passwordWarning, setPasswordWarning] = useState<string | null>(null);

  const sensitiveValidation = useMemo(() => {
    return validateSensitiveData(`${name} ${purpose} ${neededForTask} ${loginHelpNote}`);
  }, [name, purpose, neededForTask, loginHelpNote]);

  useEffect(() => {
    if (portalToEdit) {
      setName(portalToEdit.name || '');
      setUrl(portalToEdit.url || '');
      setPurpose(portalToEdit.purpose || '');
      setCategory(portalToEdit.category || 'attendance');
      setNeededForTask(portalToEdit.neededForTask || '');
      setLastUsedDate(portalToEdit.lastUsedDate || '');
      setLoginHelpNote(portalToEdit.loginHelpNote || '');
      setPasswordWarning(null);
    } else {
      setName('');
      setUrl('https://');
      setPurpose('');
      setCategory('attendance');
      setNeededForTask('');
      setLastUsedDate(new Date().toISOString().split('T')[0]);
      setLoginHelpNote('');
      setPasswordWarning(null);
    }
  }, [portalToEdit, isOpen]);

  // Real-time password safety validation as user types in loginHelpNote
  const handleNoteChange = (val: string) => {
    setLoginHelpNote(val);
    const validation = validateLoginHelpNote(val);
    if (!validation.isValid || validation.hasPasswordWarning) {
      setPasswordWarning(
        validation.warningMessage ||
          '⚠️ सुरक्षा चेतावनी: कभी भी अपना या विभाग का पासवर्ड यहाँ न लिखें!'
      );
    } else {
      setPasswordWarning(null);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    const trimmedPurpose = purpose.trim();

    if (!trimmedName) {
      onToast('⚠️ कृपया पोर्टल का नाम दर्ज करें');
      return;
    }

    if (!trimmedUrl || !trimmedUrl.startsWith('http')) {
      onToast('⚠️ कृपया वैध URL (https://...) दर्ज करें');
      return;
    }

    if (!trimmedPurpose) {
      onToast('⚠️ कृपया पोर्टल का उद्देश्य दर्ज करें');
      return;
    }

    // Explicit Aadhaar & password security block (DPDP Act 2023)
    if (!sensitiveValidation.isValid) {
      onToast('🚨 आधार संख्या या पासवर्ड सहेजना पूर्णतः वर्जित है (DPDP Act 2023)!');
      return;
    }

    const securityCheck = validateLoginHelpNote(loginHelpNote);
    if (!securityCheck.isValid) {
      onToast('❌ पासवर्ड सहेजना वर्जित है! कृपया पासवर्ड हटाएँ।');
      setPasswordWarning(securityCheck.warningMessage || null);
      return;
    }

    onSave({
      name: trimmedName,
      url: trimmedUrl,
      purpose: trimmedPurpose,
      category,
      neededForTask: neededForTask.trim(),
      lastUsedDate: lastUsedDate.trim() || undefined,
      loginHelpNote: loginHelpNote.trim() || undefined,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-[#16231D] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-7 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xl">
              {portalToEdit ? '✏️' : '＋'}
            </span>
            <div>
              <h3
                id="portal-modal-title"
                className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 leading-snug"
              >
                {portalToEdit ? 'पोर्टल संपादित करें (Edit Portal)' : 'नया पोर्टल / ऐप जोड़ें (Add Portal)'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                सरकारी वेबसाइट या विभागीय ऐप का विवरण दर्ज करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-lg transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Security Alert Banner */}
        <div className="my-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <span className="text-base flex-shrink-0">🛡️</span>
          <div>
            <p className="font-bold">सुरक्षा नियम (Security Rule):</p>
            <p className="mt-0.5 leading-relaxed">
              {PASSWORD_WARNING_NOTICE.hi}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <SensitiveDataAlert validation={sensitiveValidation} />
          {/* Portal Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              पोर्टल या ऐप का नाम (Portal Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="उदा. प्रेरणा उपस्थिति पोर्टल / UDISE+ Portal"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Portal URL */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              वेबसाइट लिंक / पोर्टल URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://prerna.up.gov.in"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              पोर्टल की श्रेणी (Category) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PORTAL_CATEGORIES) as PortalCategory[]).map((catKey) => {
                const cat = PORTAL_CATEGORIES[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.labelHi}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              पोर्टल का उद्देश्य (Purpose / किस काम आता है) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="उदा. छात्र व शिक्षक दैनिक उपस्थिति अंकन, आकस्मिक अवकाश आवेदन"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
          </div>

          {/* Which Task Needs This Portal */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              इस पोर्टल की आवश्यकता किस कार्य में है? (Which task needs this portal)
            </label>
            <input
              type="text"
              value={neededForTask}
              onChange={(e) => setNeededForTask(e.target.value)}
              placeholder="उदा. दैनिक छात्र व शिक्षक उपस्थिति / UDISE+ छात्र प्रोफ़ाइल सत्यापन"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Last Used Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              अंतिम उपयोग की तिथि (Last Used Date)
            </label>
            <input
              type="date"
              value={lastUsedDate}
              onChange={(e) => setLastUsedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              जब भी आप "पोर्टल खोलें" बटन दबाएंगे, यह तिथि अपने-आप अपडेट हो जाएगी।
            </p>
          </div>

          {/* Login Help Note (Never Store Passwords) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span>🔑 लॉगिन सहायता निर्देश (Login Help Note)</span>
              </label>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                ⚠️ कभी पासवर्ड न लिखें
              </span>
            </div>
            <textarea
              rows={3}
              value={loginHelpNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="केवल यूजरनेम प्रारूप, नोडल अधिकारी हेल्पलाइन या लॉगिन के चरण लिखें। उदा. यूजरनेम: विद्यालय 11-अंक UDISE कोड, BRC हेल्पलाइन 0522-XXXXXX"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none resize-none ${
                passwordWarning
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500'
              }`}
            />

            {/* Real-time warning alert if password keywords are detected */}
            {passwordWarning && (
              <div className="mt-1.5 p-2 rounded-lg bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5">
                <span>🚨</span>
                <span>{passwordWarning}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shadow-md shadow-teal-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {portalToEdit ? '💾 अपडेट सहेजें' : '＋ पोर्टल जोड़ें'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
