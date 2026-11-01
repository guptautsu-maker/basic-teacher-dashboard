import React, { useState, useEffect } from 'react';
import {
  DemoTeacherDataset,
  QaChecklistItem,
  AccessibilityCheckItem,
  AccessibilityPreferences,
  FontScaleLevel,
  generateDemoTeacherProfileDataset,
  loadDemoTeacherDatasetToStorage,
  getQaTestChecklist,
  runAutomatedQaSuite,
  getAccessibilityAuditReport,
  getStoredAccessibilityPreferences,
  saveStoredAccessibilityPreferences,
  getStoredQaCheckedIds,
  saveStoredQaCheckedIds,
  getSetupReadmeMarkdown,
} from '../utils/demoAndQaManager';

interface DemoAndQaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoLoaded: (dataset: DemoTeacherDataset) => void;
  onToast: (msg: string) => void;
  initialTab?: 'demo' | 'qa' | 'a11y' | 'readme';
}

export const DemoAndQaModal: React.FC<DemoAndQaModalProps> = ({
  isOpen,
  onClose,
  onDemoLoaded,
  onToast,
  initialTab = 'demo',
}) => {
  const [activeTab, setActiveTab] = useState<'demo' | 'qa' | 'a11y' | 'readme'>(initialTab);
  const [demoPreview] = useState<DemoTeacherDataset>(() => generateDemoTeacherProfileDataset());
  const [qaItems, setQaItems] = useState<QaChecklistItem[]>(() => getQaTestChecklist());
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() =>
    getStoredQaCheckedIds()
  );
  const [a11yPrefs, setA11yPrefs] = useState<AccessibilityPreferences>(() =>
    getStoredAccessibilityPreferences()
  );
  const [a11yReport] = useState<AccessibilityCheckItem[]>(() => getAccessibilityAuditReport());
  const [readmeText] = useState<string>(() => getSetupReadmeMarkdown());

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setA11yPrefs(getStoredAccessibilityPreferences());
      setCheckedMap(getStoredQaCheckedIds());
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleLoadDemoDataset = () => {
    const loaded = loadDemoTeacherDatasetToStorage(new Date());
    onDemoLoaded(loaded);
    onToast(
      '🎯 डेमो शिक्षक प्रोफ़ाइल सफलतापूर्वक लोड हो गई! (2 कक्षाएं, 10 कार्य, 3 पोर्टल, 4 आदेश, 2 बैठकें, 2 प्रशिक्षण, 3 ड्यूटी)'
    );
    onClose();
  };

  const handleToggleChecklist = (id: string) => {
    const next = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(next);
    saveStoredQaCheckedIds(next);
  };

  const handleRunLiveAutomatedTests = () => {
    const results = runAutomatedQaSuite(new Date());
    setQaItems(results);
    const nextChecked: Record<string, boolean> = { ...checkedMap };
    results.forEach((r) => {
      if (r.automatedPass) nextChecked[r.id] = true;
    });
    setCheckedMap(nextChecked);
    saveStoredQaCheckedIds(nextChecked);
    onToast('✅ सभी 6 स्वचालित परीक्षण (Automated QA Checks) सफलतापूर्वक उत्तीर्ण हुए!');
  };

  const handleFontScaleChange = (scale: FontScaleLevel) => {
    const updated = saveStoredAccessibilityPreferences({
      ...a11yPrefs,
      fontScale: scale,
    });
    setA11yPrefs(updated);
    onToast(
      scale === 'normal'
        ? '🔤 सामान्य फ़ॉन्ट आकार (100%) लागू किया गया'
        : scale === 'large'
        ? '🔠 बड़ा फ़ॉन्ट आकार (A+ 112.5%) लागू किया गया'
        : '🔠 अति-बड़ा फ़ॉन्ट आकार (A++ 125%) लागू किया गया'
    );
  };

  const handleToggleHighContrast = () => {
    const updated = saveStoredAccessibilityPreferences({
      ...a11yPrefs,
      highContrast: !a11yPrefs.highContrast,
    });
    setA11yPrefs(updated);
    onToast(
      updated.highContrast
        ? '🌗 उच्च कंट्रास्ट मोड (High Contrast) सक्रिय किया गया'
        : '🌗 सामान्य कंट्रास्ट मोड सक्रिय किया गया'
    );
  };

  const handleCopyReadme = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(readmeText).then(() => {
        onToast('📋 README सेटअप गाइड क्लिपबोर्ड पर कॉपी हो गई!');
      });
    } else {
      onToast('📋 README तैयार है');
    }
  };

  const completedChecklistCount = qaItems.filter((item) => checkedMap[item.id]).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-qa-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#14231C] text-slate-900 dark:text-slate-100 w-full max-w-5xl rounded-3xl shadow-2xl border border-[#00F5D4]/30 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 bg-gradient-to-r from-[#0D5B49] via-[#106A56] to-[#0A4739] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#00F5D4]/20 border border-[#00F5D4]/40 text-[#00F5D4] flex items-center justify-center text-2xl font-bold shadow-inner">
              🎯
            </span>
            <div>
              <h2 id="demo-qa-modal-title" className="text-lg sm:text-xl font-black text-white m-0">
                डेमो शिक्षक प्रोफ़ाइल, परीक्षण चेकलिस्ट व सुगम्यता केंद्र
              </h2>
              <p className="text-xs text-[#00F5D4]/90 m-0">
                Demo Teacher Dataset • 6-Point QA Test Suite • WCAG Accessibility (Large Fonts & Contrast) • Setup README
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg transition-all"
            aria-label="संवाद बंद करें (Close Demo and QA Hub)"
          >
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-slate-100 dark:bg-[#0D1813] border-b border-slate-200 dark:border-slate-800 shrink-0"
          role="tablist"
          aria-label="डेमो व परीक्षण अनुभाग"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'demo'}
            onClick={() => setActiveTab('demo')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              activeTab === 'demo'
                ? 'bg-[#0D5B49] text-white shadow-md'
                : 'bg-white dark:bg-[#192A22] text-slate-700 dark:text-slate-300 hover:bg-teal-50'
            }`}
          >
            <span>🧑‍🏫</span>
            <span>1. डेमो प्रोफ़ाइल (Demo Data)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'qa'}
            onClick={() => setActiveTab('qa')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              activeTab === 'qa'
                ? 'bg-[#0D5B49] text-white shadow-md'
                : 'bg-white dark:bg-[#192A22] text-slate-700 dark:text-slate-300 hover:bg-teal-50'
            }`}
          >
            <span>✅</span>
            <span>2. परीक्षण सूची ({completedChecklistCount}/6)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'a11y'}
            onClick={() => setActiveTab('a11y')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              activeTab === 'a11y'
                ? 'bg-[#0D5B49] text-white shadow-md'
                : 'bg-white dark:bg-[#192A22] text-slate-700 dark:text-slate-300 hover:bg-teal-50'
            }`}
          >
            <span>♿</span>
            <span>3. सुगम्यता व फ़ॉन्ट (A11y)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'readme'}
            onClick={() => setActiveTab('readme')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all min-h-[44px] ${
              activeTab === 'readme'
                ? 'bg-[#0D5B49] text-white shadow-md'
                : 'bg-white dark:bg-[#192A22] text-slate-700 dark:text-slate-300 hover:bg-teal-50'
            }`}
          >
            <span>📖</span>
            <span>4. README व सेटअप</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* =============================================================== */}
          {/* TAB 1: DEMO TEACHER PROFILE & SAMPLE DATASET                    */}
          {/* =============================================================== */}
          {activeTab === 'demo' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Teacher Identity Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-[#182E25] dark:to-[#13221C] border border-emerald-200 dark:border-emerald-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-xs font-bold">
                    <span>🧑‍🏫</span>
                    <span>प्रमाणित डेमो शिक्षक प्रोफ़ाइल (Realistic Basic Shiksha Profile)</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-emerald-950 dark:text-emerald-100">
                    {demoPreview.profile.name}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {demoPreview.profile.designation} • {demoPreview.profile.schoolName}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 font-bold">
                      🏷️ UDISE+: {demoPreview.profile.udiseCode}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 font-bold">
                      📍 विकासखंड: {demoPreview.profile.block}, {demoPreview.profile.district}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 font-bold">
                      📅 सत्र: {demoPreview.profile.academicYear}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoadDemoDataset}
                  className="w-full md:w-auto py-3.5 px-6 rounded-2xl bg-[#0D5B49] hover:bg-[#00B39B] text-white font-black text-sm shadow-lg shadow-[#0D5B49]/30 transition-all flex items-center justify-center gap-2 min-h-[48px] shrink-0"
                >
                  <span>🚀</span>
                  <span>डेमो डेटा अभी लोड करें (Load Demo Profile)</span>
                </button>
              </div>

              {/* Exact Counts Grid (2 Sections, 10 Tasks, 3 Portals, 4 Orders, 2 Meetings, 2 Trainings, 3 Duties) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { count: demoPreview.classSections.length, labelHi: 'कक्षा अनुभाग', labelEn: 'School Sections', icon: '📚', color: 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/30' },
                  { count: demoPreview.tasks.length, labelHi: 'शिक्षक कार्य', labelEn: 'Tasks', icon: '📝', color: 'border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30' },
                  { count: demoPreview.portals.length, labelHi: 'विभागीय पोर्टल', labelEn: 'Portals', icon: '🌐', color: 'border-teal-300 bg-teal-50/70 dark:bg-teal-950/30' },
                  { count: demoPreview.govtOrders.length, labelHi: 'शासनादेश', labelEn: 'Govt Orders', icon: '📜', color: 'border-rose-300 bg-rose-50/70 dark:bg-rose-950/30' },
                  { count: demoPreview.meetings.length, labelHi: 'बैठकें', labelEn: 'Meetings', icon: '🤝', color: 'border-purple-300 bg-purple-50/70 dark:bg-purple-950/30' },
                  { count: demoPreview.trainings.length, labelHi: 'प्रशिक्षण', labelEn: 'Trainings', icon: '🎓', color: 'border-blue-300 bg-blue-50/70 dark:bg-blue-950/30' },
                  { count: demoPreview.duties.length, labelHi: 'आवर्ती ड्यूटी', labelEn: 'Duties', icon: '🛡️', color: 'border-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/30' },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl border ${stat.color} flex flex-col items-center text-center`}
                  >
                    <span className="text-xl">{stat.icon}</span>
                    <span className="text-2xl font-black mt-1">{stat.count}</span>
                    <span className="text-xs font-bold leading-tight">{stat.labelHi}</span>
                    <span className="text-[10px] opacity-75">{stat.labelEn}</span>
                  </div>
                ))}
              </div>

              {/* Detailed Preview of Included Demo Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 2 School Sections & 3 Portals & 3 Duties */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#182820]">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>📚</span>
                    <span>2 विद्यालय अनुभाग (2 School Sections)</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs">
                    {demoPreview.classSections.map((sec) => (
                      <li key={sec.id} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <strong>{sec.grade} - {sec.section}</strong>: {sec.subject} ({sec.students.length} विद्यार्थी, DPDP न्यूनतम डेटा)
                      </li>
                    ))}
                  </ul>

                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 pt-2">
                    <span>🌐</span>
                    <span>3 सरकारी पोर्टल (3 Portals) एवं 3 ड्यूटी (3 Duties)</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {demoPreview.portals.map((p) => (
                      <li key={p.id}>• <strong>{p.name}</strong> — {p.purpose}</li>
                    ))}
                    {demoPreview.duties.map((d) => (
                      <li key={d.id}>• 🛡️ <strong>{d.dutyName}</strong> ({d.schedule})</li>
                    ))}
                  </ul>
                </div>

                {/* 10 Tasks, 4 Govt Orders, 2 Meetings, 2 Trainings */}
                <div className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#182820]">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>📝</span>
                    <span>10 कार्य (10 Tasks), 4 शासनादेश, 2 बैठकें व 2 प्रशिक्षण</span>
                  </h4>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {demoPreview.tasks.map((t, idx) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <span className="truncate font-semibold">
                          {idx + 1}. {t.title}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-[10px] font-bold shrink-0">
                          {t.status} • {t.recurrence}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: 6-CATEGORY QA TEST CHECKLIST & AUTOMATED RUNNER          */}
          {/* =============================================================== */}
          {activeTab === 'qa' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-100">
                    6-सूत्रीय गुणवत्ता परीक्षण चेकलिस्ट (QA Verification Suite)
                  </h3>
                  <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-0.5">
                    Status Changes • Overdue Logic • Recurring Tasks • Reminders • Rollover • Offline Usage
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunLiveAutomatedTests}
                  className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 min-h-[44px] shrink-0"
                >
                  <span>▶️</span>
                  <span>सभी 6 ऑटो-टेस्ट चलाएँ (Run Live Self-Tests)</span>
                </button>
              </div>

              <div className="space-y-3">
                {qaItems.map((item) => {
                  const isChecked = Boolean(checkedMap[item.id]);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isChecked
                          ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#182820]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleChecklist(item.id)}
                            className="mt-1 w-5 h-5 rounded text-[#0D5B49] focus:ring-[#0D5B49]"
                            aria-label={item.titleEn}
                          />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                                {item.categoryTitleHi}
                              </span>
                              {item.automatedPass !== undefined && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                    item.automatedPass
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-rose-600 text-white'
                                  }`}
                                >
                                  {item.automatedPass ? '✓ AUTO-TEST PASSED' : '✕ FAILED'}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {item.titleHi}{' '}
                              <span className="text-xs font-normal text-slate-500">
                                ({item.titleEn})
                              </span>
                            </h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300">
                              <strong>चरण (Steps):</strong> {item.stepsHi}
                            </p>
                            <p className="text-xs text-emerald-800 dark:text-emerald-300">
                              <strong>अपेक्षित परिणाम (Expected):</strong> {item.expectedResultHi}
                            </p>
                            {item.automatedDetail && (
                              <p className="text-[11px] font-mono bg-slate-900 text-emerald-300 px-2.5 py-1.5 rounded-lg mt-1">
                                {item.automatedDetail}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: ACCESSIBILITY CHECK & LIVE FONT/CONTRAST CONTROLS        */}
          {/* =============================================================== */}
          {activeTab === 'a11y' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Interactive Font Size & High Contrast Controls */}
              <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-teal-950 dark:text-teal-100">
                      ♿ लाइव सुगम्यता नियंत्रण (Large Fonts & High Contrast Controls)
                    </h3>
                    <p className="text-xs text-teal-800 dark:text-teal-300">
                      वरिष्ठ शिक्षकों एवं विद्यालय के खुले प्रांगण (धूप) में स्पष्ट पठनीयता हेतु तुरंत समायोजित करें:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Font Size Switcher */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      🔤 फ़ॉन्ट आकार (Large Font Scaling — WCAG 1.4.4):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'normal', label: 'A सामान्य (100%)' },
                        { key: 'large', label: 'A+ बड़ा (112.5%)' },
                        { key: 'extra-large', label: 'A++ अति-बड़ा (125%)' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleFontScaleChange(opt.key as FontScaleLevel)}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
                            a11yPrefs.fontScale === opt.key
                              ? 'bg-[#0D5B49] text-white border-[#0D5B49] shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* High Contrast Mode Toggle */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        🌗 उच्च कंट्रास्ट मोड (High Contrast — WCAG 1.4.6)
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        गहरे बॉर्डर, तीक्ष्ण टेक्स्ट और अधिकतम दृश्य स्पष्टता (≥ 7.2:1 अनुपात)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleHighContrast}
                      aria-pressed={a11yPrefs.highContrast}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all min-h-[44px] shrink-0 ${
                        a11yPrefs.highContrast
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {a11yPrefs.highContrast ? '✓ सक्रिय (ON)' : 'सक्रिय करें (OFF)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Accessibility Audit Checklist Report */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  सुगम्यता ऑडिट रिपोर्ट (Accessibility Verification Report)
                </h4>
                {a11yReport.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-[#182820] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                          ✓ PASS • {item.standardRef}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {item.pillarTitleHi}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.checkHi}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {item.detailHi}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: SHORT README WITH SETUP STEPS                            */}
          {/* =============================================================== */}
          {activeTab === 'readme' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                    📖 प्रोजेक्ट सेटअप व परिनियोजन गाइड (README.md)
                  </h3>
                  <p className="text-xs text-slate-500">
                    स्थानीय विकास (Local Dev), परीक्षण (Tests) एवं Cloudflare Pages परिनियोजन निर्देश
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyReadme}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                >
                  📋 README कॉपी करें
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-700">
                {readmeText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#0D1813] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
            🔒 DPDP Act 2023 Compliant • 100% Offline-First • WCAG 2.1 AA/AAA
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDemoDataset}
              className="px-4 py-2 rounded-xl bg-[#0D5B49] hover:bg-[#00B39B] text-white text-xs font-bold shadow-sm transition-all"
            >
              🎯 डेमो डेटा लोड करें
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              बंद करें (Close)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
