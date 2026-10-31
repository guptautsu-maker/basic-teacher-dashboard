import React, { useState, useRef, useEffect } from 'react';
import {
  AppSettings,
  AppLanguage,
  UserRole,
  BackupValidationResult,
  TeacherHubBackupData,
} from '../types/settingsAndPrivacy';
import {
  getDPDPAuditNotice,
  createBackupBundle,
  validateBackupData,
  restoreBackupBundle,
} from '../utils/privacyAndSecurityManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onToast: (msg: string) => void;
  onDataRestored?: () => void;
  initialTab?: SettingsTab;
}

type SettingsTab = 'general' | 'school' | 'notifications' | 'privacy' | 'backup';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onToast,
  onDataRestored,
  initialTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFormSettings(settings);
    }
  }, [isOpen, initialTab, settings]);

  // Backup restore state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<TeacherHubBackupData | null>(null);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');

  // Privacy notice data
  const dpdpNotice = getDPDPAuditNotice();

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    onUpdateSettings(formSettings);
    onToast('⚙️ सेटिंग्स सफलतापूर्वक सुरक्षित की गईं / Settings Saved');
    onClose();
  };

  const handleExportBackup = () => {
    try {
      const bundle = createBackupBundle(formSettings);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bundle, null, 2));
      const downloadAnchor = document.createElement('a');
      const todayStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `TeacherHub_Backup_${todayStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFormSettings((prev) => ({
        ...prev,
        lastBackupDate: new Date().toISOString(),
      }));
      onUpdateSettings({
        ...formSettings,
        lastBackupDate: new Date().toISOString(),
      });
      onToast('💾 बैकअप फाइल डाउनलोड हो गई / Local Backup Exported');
    } catch {
      onToast('❌ बैकअप बनाने में त्रुटि हुई');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const val = validateBackupData(parsed);
        setValidationResult(val);
        if (val.isValid) {
          setImportData(parsed);
        } else {
          setImportData(null);
          onToast(`⚠️ अमान्य बैकअप: ${val.error}`);
        }
      } catch {
        setValidationResult({ isValid: false, error: 'फाइल JSON प्रारूप में नहीं है।' });
        setImportData(null);
        onToast('❌ अमान्य JSON फाइल');
      }
    };
    reader.readAsText(file);
  };

  const handlePerformRestore = () => {
    if (!importData) return;

    const result = restoreBackupBundle(importData, restoreMode);
    if (result.success) {
      onToast(`✅ ${result.message}`);
      if (onDataRestored) onDataRestored();
      setImportFile(null);
      setImportData(null);
      setValidationResult(null);
      onClose();
    } else {
      onToast(`❌ रिस्टोर विफल: ${result.message}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="bg-white dark:bg-[#16251E] w-full max-w-4xl rounded-3xl shadow-2xl border border-[#0D5B49]/20 dark:border-[#00F5D4]/20 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#0D5B49] to-[#0A4739] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#00F5D4]/20 text-[#00F5D4] flex items-center justify-center text-xl font-bold">
              ⚙️
            </span>
            <div>
              <h2 id="settings-modal-title" className="text-lg sm:text-xl font-black text-white m-0">
                ऐप सेटिंग्स व डेटा सुरक्षा (Settings & Data Privacy)
              </h2>
              <p className="text-xs text-[#00F5D4]/90 m-0">
                भूमिका, भाषा, DPDP Act 2023 सुरक्षा, विद्यालय प्रोफाइल व लोकल बैकअप
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg transition-all"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-[#111C17] overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-2 px-3.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'bg-white dark:bg-[#16251E] text-[#0D5B49] dark:text-[#00F5D4] border-t-2 border-[#00F5D4]'
                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <span>🌐</span>
            <span>भाषा व सामान्य</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`py-2 px-3.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'school'
                ? 'bg-white dark:bg-[#16251E] text-[#0D5B49] dark:text-[#00F5D4] border-t-2 border-[#00F5D4]'
                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <span>🏫</span>
            <span>विद्यालय व भूमिका</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-3.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-white dark:bg-[#16251E] text-[#0D5B49] dark:text-[#00F5D4] border-t-2 border-[#00F5D4]'
                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <span>🔔</span>
            <span>रिमाइंडर प्राथमिकताएं</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`py-2 px-3.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'bg-white dark:bg-[#16251E] text-[#0D5B49] dark:text-[#00F5D4] border-t-2 border-[#00F5D4]'
                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <span>🔒</span>
            <span>DPDP Act 2023 प्राइवेसी</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-2 px-3.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-[#16251E] text-[#0D5B49] dark:text-[#00F5D4] border-t-2 border-[#00F5D4]'
                : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <span>💾</span>
            <span>बैकअप व रिस्टोर</span>
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: GENERAL & LANGUAGE */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                  इंटरफ़ेस भाषा चयन / Interface Language
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-4">
                  बेसिक शिक्षक डैशबोर्ड में लेबल व विवरण प्रदर्शित करने हेतु पसंदीदा भाषा चुनें:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'bilingual', title: 'द्विभाषी (Bilingual)', desc: 'हिंदी + अंग्रेजी दोनों साथ (अनुशंसित)' },
                    { key: 'hi', title: 'हिंदी (Hindi)', desc: 'मुख्य रूप से देवनागरी हिंदी में' },
                    { key: 'en', title: 'English', desc: 'English first with Hindi hints' },
                  ].map((lang) => (
                    <button
                      key={lang.key}
                      type="button"
                      onClick={() =>
                        setFormSettings((prev) => ({ ...prev, language: lang.key as AppLanguage }))
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        formSettings.language === lang.key
                          ? 'border-[#0D5B49] dark:border-[#00F5D4] bg-white dark:bg-[#1b2b23] shadow-md ring-2 ring-[#00F5D4]/40'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-white/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {lang.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {lang.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Academic Year */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  सक्रिय शैक्षिक सत्र / Active Academic Year
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {['2024-25', '2025-26', '2026-27', '2027-28'].map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setFormSettings((prev) => ({ ...prev, activeAcademicYear: year }))}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        formSettings.activeAcademicYear === year
                          ? 'bg-[#0D5B49] text-white border-[#0D5B49] shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  वर्तमान में सभी उपस्थिति, कार्य व अभिलेख सत्र <strong>{formSettings.activeAcademicYear}</strong> में सुरक्षित हो रहे हैं।
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SCHOOL PROFILE & ROLE */}
          {activeTab === 'school' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Role Selection Setup */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <span>👑</span>
                    <span>उपयोगकर्ता भूमिका सेटअप (Role Setup)</span>
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                    वर्तमान भूमिका: {formSettings.role === 'teacher' ? 'शिक्षक (Teacher)' : 'प्रधानाध्यापक (Head/Admin)'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  डिफ़ॉल्ट रूप से शिक्षक (Teacher) दृश्य सक्रिय रहता है। विद्यालय स्तर के निरीक्षण व समग्र स्टाफ निगरानी हेतु हेड/एडमिन (Head/Admin) दृश्य पर स्विच कर सकते हैं:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFormSettings((prev) => ({
                        ...prev,
                        role: 'teacher',
                        schoolProfile: { ...prev.schoolProfile, role: 'teacher' },
                      }))
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      formSettings.role === 'teacher'
                        ? 'border-emerald-600 dark:border-emerald-400 bg-white dark:bg-[#182a20] ring-2 ring-emerald-500/40 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-white/50'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>🧑‍🏫</span>
                      <span>शिक्षक (Teacher) - डिफ़ॉल्ट</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      व्यक्तिगत कार्य, अपनी कक्षाएं, दैनिक उपस्थिति, दीक्षा प्रशिक्षण व दायित्व।
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormSettings((prev) => ({
                        ...prev,
                        role: 'headmaster',
                        schoolProfile: { ...prev.schoolProfile, role: 'headmaster' },
                      }))
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      formSettings.role !== 'teacher'
                        ? 'border-purple-600 dark:border-purple-400 bg-white dark:bg-[#251b2e] ring-2 ring-purple-500/40 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-white/50'
                    }`}
                  >
                    <div className="font-bold text-sm text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <span>🏫</span>
                      <span>प्रधानाध्यापक / संकुल प्रशासक (Head/Admin View)</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      समग्र विद्यालय निगरानी, पूरे स्टाफ का कार्यभार, MDM सत्यापन व BEO रिपोर्टिंग।
                    </div>
                  </button>
                </div>
              </div>

              {/* School Details Form */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🏢</span>
                  <span>विद्यालय विवरण व UDISE+ प्रोफाइल (School Profile)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      विद्यालय का नाम / School Name
                    </label>
                    <input
                      type="text"
                      value={formSettings.schoolProfile.schoolName}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          schoolProfile: { ...prev.schoolProfile, schoolName: e.target.value },
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      11-अंकीय UDISE+ कोड / UDISE Code
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={formSettings.schoolProfile.udiseCode}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          schoolProfile: { ...prev.schoolProfile, udiseCode: e.target.value.replace(/\D/g, '') },
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono font-bold text-[#0D5B49] dark:text-[#00F5D4]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      विकास खंड (Block / Taluka)
                    </label>
                    <input
                      type="text"
                      value={formSettings.schoolProfile.block}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          schoolProfile: { ...prev.schoolProfile, block: e.target.value },
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      जनपद / District
                    </label>
                    <input
                      type="text"
                      value={formSettings.schoolProfile.district}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          schoolProfile: { ...prev.schoolProfile, district: e.target.value },
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      शिक्षक का नाम / Teacher Name
                    </label>
                    <input
                      type="text"
                      value={formSettings.schoolProfile.teacherName}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          schoolProfile: { ...prev.schoolProfile, teacherName: e.target.value },
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      पदनाम / Designation
                    </label>
                    <input
                      type="text"
                      value={formSettings.schoolProfile.designation}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          schoolProfile: { ...prev.schoolProfile, designation: e.target.value },
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATION PREFERENCES */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🔔</span>
                  <span>रिमाइंडर चैनल व सतर्कता (Alert Channels)</span>
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 cursor-pointer">
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        इन-ऐप बैनर व स्टेटस बैज (In-App Alerts)
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        डैशबोर्ड पर रेड कार्ड व नोटिफिकेशन बेल में अनरीड काउंट प्रदर्शित करें
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formSettings.notifications.inAppAlerts}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, inAppAlerts: e.target.checked },
                        }))
                      }
                      className="w-5 h-5 rounded text-[#0D5B49] accent-[#0D5B49]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 cursor-pointer">
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        ब्राउज़र पुश नोटिफिकेशन (Browser Push Notifications)
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        टैब बंद होने पर भी समयसीमा के पूर्व सिस्टम नोटिफिकेशन प्राप्त करें
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formSettings.notifications.browserPush}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, browserPush: e.target.checked },
                        }))
                      }
                      className="w-5 h-5 rounded text-[#0D5B49] accent-[#0D5B49]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 cursor-pointer">
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        ध्वनि अलर्ट टोन (Sound Alert Tone)
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        महत्वपूर्ण अलर्ट आने पर सुखद ऑडियो बीप ध्वनि
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formSettings.notifications.soundAlerts}
                      onChange={(e) =>
                        setFormSettings((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, soundAlerts: e.target.checked },
                        }))
                      }
                      className="w-5 h-5 rounded text-[#0D5B49] accent-[#0D5B49]"
                    />
                  </label>
                </div>
              </div>

              {/* Lead Time Rules */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>⏰</span>
                  <span>रिमाइंडर समय सीमा नियम (Lead Time Rules)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'threeDaysBefore', label: '3 दिन पूर्व चेतावनी (3 Days Before)' },
                    { key: 'oneDayBefore', label: '1 दिन पूर्व स्मरण (1 Day Before)' },
                    { key: 'sameDayMorning', label: 'कार्य दिवस की सुबह 08:00 AM (Same Day Morning)' },
                    { key: 'dailyOverdue', label: 'विलंबित कार्य का दैनिक अलर्ट (Daily Overdue)' },
                  ].map((rule) => (
                    <label
                      key={rule.key}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-xs font-semibold cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(formSettings.notifications.leadTimes as any)[rule.key]}
                        onChange={(e) =>
                          setFormSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              leadTimes: {
                                ...prev.notifications.leadTimes,
                                [rule.key]: e.target.checked,
                              },
                            },
                          }))
                        }
                        className="w-4 h-4 rounded text-[#0D5B49] accent-[#0D5B49]"
                      />
                      <span>{rule.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA PRIVACY & DPDP ACT 2023 */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  <span>📜</span>
                  <span>वैधानिक अनुपालन • Statutory Privacy Compliance</span>
                </div>
                <h3 className="text-lg font-black text-white m-0">
                  {dpdpNotice.actName}
                </h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  शिक्षक Hub पूर्णतः डेटा न्यूनीकरण (Data Minimization) एवं स्थानीय भंडारण (Local-only Storage) सिद्धांतों का अनुपालन करता है।
                </p>
              </div>

              {/* Strict Prohibitions Banner */}
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/80 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
                  <span>🚫</span>
                  <span>{dpdpNotice.prohibitions.titleHi}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300">
                  {dpdpNotice.prohibitions.items.map((item, idx) => (
                    <li key={idx} className="font-medium">
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 pt-1 font-semibold">
                  ⚠️ ऐप में स्वतः इनपुट वैलिडेशन लगा है जो आधार नंबर व पासवर्ड दर्ज करने पर तुरंत ब्लॉक कर देता है।
                </p>
              </div>

              {/* 5 Core Principles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  DPDP Act 2023 के 5 मूल सिद्धांत जिनका Teacher Hub पालन करता है:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dpdpNotice.principles.map((p) => (
                    <div
                      key={p.key}
                      className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/40 space-y-1"
                    >
                      <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        <span>{p.icon}</span>
                        <span>{p.titleHi}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {p.descriptionHi}
                      </p>
                      <span className="inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {p.sectionRef}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOCAL BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Export Box */}
              <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                    <span>📥</span>
                    <span>स्थानीय डेटा बैकअप डाउनलोड करें (Export Local Backup JSON)</span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-xl">
                    आपके सभी कार्य, बैठकें, आदेश, दीक्षा प्रशिक्षण, कक्षाएं व उपस्थिति रिकॉर्ड एक सुरक्षित JSON फाइल में डाउनलोड हो जाएंगे। इसे पेनड्राइव या सुरक्षित स्थान पर रख सकते हैं।
                  </p>
                  {formSettings.lastBackupDate && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      अंतिम बैकअप दिनांक: {new Date(formSettings.lastBackupDate).toLocaleString('hi-IN')}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="py-3 px-5 rounded-xl bg-[#0D5B49] hover:bg-[#0A4739] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <span>💾</span>
                  <span>बैकअप JSON डाउनलोड</span>
                </button>
              </div>

              {/* Import / Restore Box */}
              <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>📤</span>
                    <span>बैकअप फाइल से रिस्टोर करें (Restore from JSON Backup)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    पूर्व में डाउनलोड की गई Teacher Hub बैकअप फाइल (.json) चुनें:
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-4 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs sm:text-sm font-bold flex items-center gap-2"
                  >
                    <span>📂</span>
                    <span>{importFile ? importFile.name : 'बैकअप फाइल चुनें (.json)'}</span>
                  </button>

                  {importFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setImportFile(null);
                        setImportData(null);
                        setValidationResult(null);
                      }}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      हटाएं ✕
                    </button>
                  )}
                </div>

                {/* Validation Preview Card */}
                {validationResult && validationResult.isValid && importData && (
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue-900 dark:text-blue-200">
                        ✅ बैकअप फाइल सत्यापन सफल / Valid Teacher Hub Backup
                      </span>
                      <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300">
                        सत्र: {importData.meta.academicYear} • दिनांक: {importData.meta.exportedAt.slice(0, 10)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded bg-white dark:bg-gray-800 border">
                        <span className="text-gray-500">कार्य (Tasks):</span> <strong>{validationResult.taskCount}</strong>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-gray-800 border">
                        <span className="text-gray-500">कक्षाएं:</span> <strong>{validationResult.classCount}</strong>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-gray-800 border">
                        <span className="text-gray-500">उपस्थिति:</span> <strong>{validationResult.attendanceCount}</strong>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-gray-800 border">
                        <span className="text-gray-500">शासनादेश:</span> <strong>{validationResult.orderCount}</strong>
                      </div>
                    </div>

                    {/* Restore Mode Radio */}
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="accent-[#0D5B49]"
                        />
                        <span>पूर्ण प्रतिस्थापन (Replace Current Data)</span>
                      </label>

                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="accent-[#0D5B49]"
                        />
                        <span>सुरक्षित मर्ज (Merge New Items Only)</span>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handlePerformRestore}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <span>🔄</span>
                      <span>डेटा रिस्टोर प्रारंभ करें (Confirm & Restore)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 sm:p-5 bg-gray-50 dark:bg-[#111C17] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            🔒 समस्त डेटा केवल आपके व्यक्तिगत ब्राउज़र में सुरक्षित रहता है।
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs sm:text-sm font-semibold transition-all"
            >
              रद्द करें
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2 rounded-xl bg-[#00F5D4] text-[#0D5B49] hover:bg-white font-bold text-xs sm:text-sm shadow-md transition-all"
            >
              सेव करें (Save Settings)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
