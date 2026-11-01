import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Task,
  TaskCategory,
  TaskStatus,
  TASK_CATEGORY_METADATA,
} from '../utils/taskStatusSystem';
import { ClassSection, AttendanceRecord } from '../types/classSection';
import {
  getSampleClassSections,
  getSampleAttendanceRecords,
} from '../utils/myClassesManager';
import { Duty } from '../types/duty';
import {
  buildPrintableSummaryReport,
  generatePrintableSummaryHtml,
} from '../utils/printableSummaryPdf';

interface PrintableSummaryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  classes?: ClassSection[];
  attendanceRecords?: AttendanceRecord[];
  duties?: Duty[];
  schoolName?: string;
  udiseCode?: string;
  teacherName?: string;
  academicYear?: string;
  initialCategoryFilter?: TaskCategory | 'all';
  initialStatusFilter?: TaskStatus | 'all';
  onToast?: (msg: string) => void;
}

export const PrintableSummaryPdfModal: React.FC<PrintableSummaryPdfModalProps> = ({
  isOpen,
  onClose,
  tasks,
  classes: propClasses,
  attendanceRecords: propAttendance,
  duties = [],
  schoolName = 'प्राथमिक विद्यालय (बेसिक शिक्षा परिषद)',
  udiseCode = '09250100101',
  teacherName = 'सुरेश कुमार (सहायक अध्यापक)',
  academicYear = '2026-27',
  initialCategoryFilter = 'all',
  initialStatusFilter = 'all',
  onToast,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>(
    initialCategoryFilter
  );
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>(
    initialStatusFilter
  );
  const [includeCompletedTasks, setIncludeCompletedTasks] = useState<boolean>(true);
  const [includeClassData, setIncludeClassData] = useState<boolean>(true);
  const [includeStudentRollList, setIncludeStudentRollList] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(true);

  // Sync initial filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategoryFilter(initialCategoryFilter);
      setStatusFilter(initialStatusFilter);
    }
  }, [isOpen, initialCategoryFilter, initialStatusFilter]);

  // Set data-print-summary-active on body while modal is open so @media print isolates the summary sheet
  useEffect(() => {
    if (!isOpen) return;
    document.body.setAttribute('data-print-summary-active', 'true');
    return () => {
      document.body.removeAttribute('data-print-summary-active');
    };
  }, [isOpen]);

  // Load latest classes & attendance from localStorage when modal opens (or use props)
  const resolvedClasses = useMemo<ClassSection[]>(() => {
    if (propClasses && propClasses.length > 0) return propClasses;
    try {
      const saved = localStorage.getItem('th-class-sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleClassSections();
  }, [propClasses, isOpen]);

  const resolvedAttendance = useMemo<AttendanceRecord[]>(() => {
    if (propAttendance && propAttendance.length > 0) return propAttendance;
    try {
      const saved = localStorage.getItem('th-attendance-records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleAttendanceRecords();
  }, [propAttendance, isOpen]);

  const report = useMemo(() => {
    return buildPrintableSummaryReport({
      tasks,
      classes: resolvedClasses,
      attendanceRecords: resolvedAttendance,
      duties,
      schoolName,
      udiseCode,
      teacherName,
      academicYear,
      options: {
        categoryFilter,
        statusFilter,
        includeCompletedTasks,
        includeClassData,
        includeStudentRollList,
        highContrast,
      },
    });
  }, [
    tasks,
    resolvedClasses,
    resolvedAttendance,
    duties,
    schoolName,
    udiseCode,
    teacherName,
    academicYear,
    categoryFilter,
    statusFilter,
    includeCompletedTasks,
    includeClassData,
    includeStudentRollList,
    highContrast,
  ]);

  if (!isOpen) return null;

  const handlePrintPdf = () => {
    const htmlEl = document.documentElement;
    const prevHc = htmlEl.getAttribute('data-high-contrast');
    if (highContrast) {
      htmlEl.setAttribute('data-high-contrast', 'true');
    }
    try {
      window.print();
    } finally {
      if (prevHc === null && highContrast) {
        htmlEl.removeAttribute('data-high-contrast');
      } else if (prevHc !== null) {
        htmlEl.setAttribute('data-high-contrast', prevHc);
      }
    }
    if (onToast) {
      onToast('🖨️ कार्य व कक्षा सारांश पीडीएफ प्रिंट संवाद तैयार किया गया');
    }
  };

  const handleDownloadStandaloneReport = () => {
    const htmlContent = generatePrintableSummaryHtml(report);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateSlug = report.generatedAtIso.slice(0, 10);
    link.href = url;
    link.setAttribute('download', `Teacher_Tasks_And_Classes_Summary_${dateSlug}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onToast) {
      onToast('📥 कार्य व कक्षा सारांश रिपोर्ट (Print-Ready PDF/HTML) डाउनलोड हो गई');
    }
  };

  return createPortal(
    <div
      className="printable-summary-modal-root fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="printable-summary-modal-title"
    >
      <div className="printable-summary-dialog bg-white dark:bg-[#16231D] border border-[#D3DDD6] dark:border-[#2B3C34] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* ========================================================= */}
        {/* MODAL HEADER & EXPORT TOOLBAR (HIDDEN IN @media print)    */}
        {/* ========================================================= */}
        <div className="toolbar no-print p-4 sm:p-5 border-b border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#101A15] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0D5B49] dark:text-[#00F5D4]">
                📄 उच्च-कंट्रास्ट प्रिंट एवं पीडीएफ निर्यात (Printable Summary PDF Export)
              </span>
              <h2
                id="printable-summary-modal-title"
                className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA] mt-0.5"
              >
                कार्य एवं कक्षा सारांश पीडीएफ रिपोर्ट (Tasks &amp; Class Data Summary PDF)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="py-2 px-4 rounded-xl bg-[#0D5B49] hover:bg-[#094537] text-white font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span aria-hidden="true">🖨️</span>
                <span>प्रिंट / Save as PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadStandaloneReport}
                className="py-2 px-3.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-[#13231C] dark:text-[#E7F0EA] font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5"
              >
                <span aria-hidden="true">📥</span>
                <span>रिपोर्ट डाउनलोड करें</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="पीडीएफ रिपोर्ट पूर्वावलोकन बंद करें (Close PDF Summary Modal)"
                className="py-2 px-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#52645B] dark:text-[#9DB0A5] hover:text-rose-700 dark:hover:text-rose-300 font-bold text-xs sm:text-sm transition-colors"
              >
                ✕ बंद करें
              </button>
            </div>
          </div>

          {/* Filter & Print Customization Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D3DDD6]/70 dark:border-[#2B3C34]">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#52645B] dark:text-[#9DB0A5] mr-1">
                श्रेणी (Category):
              </span>
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-[#0D5B49] text-white'
                    : 'bg-white dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] border border-[#D3DDD6] dark:border-[#2B3C34]'
                }`}
              >
                सभी ({tasks.length})
              </button>
              {(['Administrative', 'Academic', 'Extra-curricular'] as TaskCategory[]).map(
                (cat) => {
                  const meta = TASK_CATEGORY_METADATA[cat];
                  const isActive = categoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        isActive
                          ? 'bg-[#0D5B49] text-white'
                          : 'bg-white dark:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] border border-[#D3DDD6] dark:border-[#2B3C34]'
                      }`}
                    >
                      <span aria-hidden="true">{meta.icon}</span>
                      <span>{meta.labelHi}</span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Checkboxes for Report Sections & High-Contrast CSS */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#13231C] dark:text-[#E7F0EA]">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCompletedTasks}
                  onChange={(e) => setIncludeCompletedTasks(e.target.checked)}
                  className="rounded border-slate-400 text-[#0D5B49] focus:ring-[#0D5B49]"
                />
                <span>पूर्ण कार्य शामिल करें</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeClassData}
                  onChange={(e) => setIncludeClassData(e.target.checked)}
                  className="rounded border-slate-400 text-[#0D5B49] focus:ring-[#0D5B49]"
                />
                <span>कक्षा व उपस्थिति डेटा</span>
              </label>

              {includeClassData && (
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStudentRollList}
                    onChange={(e) => setIncludeStudentRollList(e.target.checked)}
                    className="rounded border-slate-400 text-[#0D5B49] focus:ring-[#0D5B49]"
                  />
                  <span>छात्र नामांकन सूची (Roll List)</span>
                </label>
              )}

              <label className="inline-flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-semibold">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="rounded border-amber-500 text-amber-700 focus:ring-amber-600"
                />
                <span>उच्च कंट्रास्ट प्रिंट मोड (High-Contrast CSS)</span>
              </label>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PRINTABLE SUMMARY SHEET (RESPECTS index.css PRINT & HC)    */}
        {/* ========================================================= */}
        <div className="printable-summary-scroll flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-[#0D1512]">
          <div
            data-testid="printable-summary-sheet"
            data-high-contrast={highContrast ? 'true' : 'false'}
            className="printable-summary-sheet max-w-4xl mx-auto p-6 sm:p-8 rounded-xl border-2 border-[#111111] shadow-md space-y-6"
          >
            {/* 1. OFFICIAL REPORT HEADER */}
            <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider">
                  बेसिक शिक्षा विभाग • TEACHER HUB OFFICIAL SUMMARY REPORT
                </div>
                <h1 className="text-lg sm:text-xl font-black mt-1">
                  विद्यालय कार्य एवं कक्षा उपस्थिति सारांश रिपोर्ट (Printable Summary PDF)
                </h1>
                <p className="text-xs font-medium mt-0.5">
                  लागू फ़िल्टर: {report.appliedFilters.categoryFilterLabel} •{' '}
                  {report.appliedFilters.statusFilterLabel}
                </p>
              </div>

              <div className="text-xs sm:text-right space-y-0.5 font-semibold shrink-0">
                <div>दिनांक: {report.generatedDateFormattedHi}</div>
                <div>शैक्षिक सत्र: {report.academicYear}</div>
                <div>
                  प्रारूप: {highContrast ? 'उच्च-कंट्रास्ट (High-Contrast Print)' : 'मानक प्रिंट'}
                </div>
              </div>
            </div>

            {/* 2. SCHOOL & TEACHER METADATA CARD (.glass-card) */}
            <div className="glass-card p-3.5 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="font-bold block">विद्यालय का नाम (School):</span>
                <span className="font-semibold">{report.schoolName}</span>
              </div>
              <div>
                <span className="font-bold block">UDISE+ कोड:</span>
                <span className="font-mono font-bold">{report.udiseCode}</span>
              </div>
              <div>
                <span className="font-bold block">शिक्षक / प्रभारी (Teacher):</span>
                <span className="font-semibold">{report.teacherName}</span>
              </div>
              <div>
                <span className="font-bold block">सक्रिय विद्यालय दायित्व (Duties):</span>
                <span className="font-semibold">{report.activeDutiesCount} सक्रिय दायित्व</span>
              </div>
            </div>

            {/* 3. SECTION 1: CURRENT TASKS & CATEGORY SUMMARY */}
            <section className="space-y-3" aria-label="कार्य निष्पादन एवं श्रेणी सारांश">
              <div className="flex items-center justify-between border-b border-black pb-1.5">
                <h3 className="text-sm sm:text-base font-extrabold">
                  1. वर्तमान कार्य एवं श्रेणी सारांश (Current Tasks &amp; Category Breakdown)
                </h3>
                <span className="text-xs font-bold">
                  पूर्णता दर (Completion): {report.taskMetrics.completionRatePercent}%
                </span>
              </div>

              {/* 4 KPI Summary Cards (.glass-card) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="glass-card p-3 rounded-lg">
                  <div className="text-[11px] font-bold">कुल निर्यातित कार्य (Tasks)</div>
                  <div className="text-xl font-black mt-0.5">
                    {report.taskMetrics.exportedTasksCount}{' '}
                    <span className="text-xs font-semibold">
                      / {report.taskMetrics.totalTasksInSystem}
                    </span>
                  </div>
                </div>

                <div className="glass-card p-3 rounded-lg">
                  <div className="text-[11px] font-bold">लंबित / प्रगति पर (Pending)</div>
                  <div className="text-xl font-black mt-0.5">
                    {report.taskMetrics.notStartedCount + report.taskMetrics.inProgressCount}
                  </div>
                </div>

                <div className="glass-card p-3 rounded-lg">
                  <div className="text-[11px] font-bold">विलंबित (Overdue / Critical)</div>
                  <div className="text-xl font-black mt-0.5">
                    {report.taskMetrics.overdueCount}{' '}
                    <span className="text-xs font-bold">
                      ({report.taskMetrics.criticalOverdueCount} गंभीर)
                    </span>
                  </div>
                </div>

                <div className="glass-card p-3 rounded-lg">
                  <div className="text-[11px] font-bold">पूर्ण कार्य (Completed)</div>
                  <div className="text-xl font-black mt-0.5">
                    {report.taskMetrics.doneCount}{' '}
                    <span className="text-xs font-bold">
                      ({report.taskMetrics.completionRatePercent}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown Table (.table-card) */}
              <div className="overflow-x-auto">
                <table className="table-card w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="p-2 text-left">कार्य श्रेणी (Task Category)</th>
                      <th className="p-2 text-center">कुल कार्य (Total)</th>
                      <th className="p-2 text-center">लंबित (Pending)</th>
                      <th className="p-2 text-center">विलंबित (Overdue)</th>
                      <th className="p-2 text-center">पूर्ण (Done)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categoryBreakdown.map((row) => (
                      <tr key={row.category}>
                        <td className="p-2 font-bold">
                          {row.icon} {row.labelHi} ({row.labelEn})
                        </td>
                        <td className="p-2 text-center font-bold">{row.total}</td>
                        <td className="p-2 text-center">{row.pending}</td>
                        <td className="p-2 text-center font-bold">{row.overdue}</td>
                        <td className="p-2 text-center">{row.done}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detailed Tasks List Table (.table-card) */}
              <div className="space-y-1.5">
                <h4 className="text-xs sm:text-sm font-extrabold">
                  विस्तृत कार्य सूची (Detailed Tasks List — {report.taskRows.length} कार्य)
                </h4>
                <div className="overflow-x-auto">
                  <table className="table-card w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold">
                        <th className="p-2 text-center w-10">क्र०</th>
                        <th className="p-2 text-left">कार्य शीर्षक (Task Title)</th>
                        <th className="p-2 text-left">श्रेणी (Category)</th>
                        <th className="p-2 text-left">स्थिति (Status)</th>
                        <th className="p-2 text-left">प्राथमिकता</th>
                        <th className="p-2 text-left">अंतिम तिथि</th>
                        <th className="p-2 text-left">स्रोत (Source)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.taskRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center font-medium">
                            चयनित फ़िल्टर में कोई कार्य उपलब्ध नहीं है।
                          </td>
                        </tr>
                      ) : (
                        report.taskRows.map((t, index) => (
                          <tr key={t.id}>
                            <td className="p-2 text-center font-bold">{index + 1}</td>
                            <td className="p-2 font-bold">
                              <span>{t.title}</span>
                              {t.isCriticalOverdue && (
                                <span className="ml-1.5 inline-block px-1.5 py-0.5 text-[10px] font-black border border-black uppercase">
                                  CRITICAL ({t.daysOverdue}d विलंबित)
                                </span>
                              )}
                            </td>
                            <td className="p-2">
                              {t.categoryLabelHi} ({t.categoryLabelEn})
                            </td>
                            <td className="p-2 font-semibold">
                              {t.statusLabelHi} ({t.statusLabelEn})
                            </td>
                            <td className="p-2">{t.priorityLabelHi}</td>
                            <td className="p-2 font-mono whitespace-nowrap">{t.deadlineStr}</td>
                            <td className="p-2">{t.source}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 4. SECTION 2: CLASS SECTIONS & ATTENDANCE DATA SUMMARY */}
            {includeClassData && (
              <section className="space-y-3 pt-2" aria-label="कक्षा एवं उपस्थिति सारांश">
                <div className="flex items-center justify-between border-b border-black pb-1.5">
                  <h3 className="text-sm sm:text-base font-extrabold">
                    2. कक्षा एवं छात्र उपस्थिति सारांश (Class Sections &amp; Attendance Summary)
                  </h3>
                  <span className="text-xs font-bold">
                    कुल उपस्थिति औसत: {report.classMetrics.overallAttendancePercentage}%
                  </span>
                </div>

                {/* Class KPI Boxes (.glass-card) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="glass-card p-3 rounded-lg">
                    <div className="text-[11px] font-bold">कुल कक्षा सेक्शन (Classes)</div>
                    <div className="text-xl font-black mt-0.5">
                      {report.classMetrics.totalClasses}
                    </div>
                  </div>

                  <div className="glass-card p-3 rounded-lg">
                    <div className="text-[11px] font-bold">कुल नामांकित छात्र (Enrolled)</div>
                    <div className="text-xl font-black mt-0.5">
                      {report.classMetrics.totalStudents}{' '}
                      <span className="text-xs font-semibold">
                        (B:{report.classMetrics.totalBoys} / G:{report.classMetrics.totalGirls})
                      </span>
                    </div>
                  </div>

                  <div className="glass-card p-3 rounded-lg">
                    <div className="text-[11px] font-bold">उपस्थित / अनुपस्थित (Latest)</div>
                    <div className="text-xl font-black mt-0.5">
                      {report.classMetrics.totalPresentLatest} P{' '}
                      <span className="text-xs font-semibold">
                        / {report.classMetrics.totalAbsentLatest} A
                      </span>
                    </div>
                  </div>

                  <div className="glass-card p-3 rounded-lg">
                    <div className="text-[11px] font-bold">उपस्थिति प्रतिशत (Attendance %)</div>
                    <div className="text-xl font-black mt-0.5">
                      {report.classMetrics.overallAttendancePercentage}%
                    </div>
                  </div>
                </div>

                {/* Class Sections Table (.table-card) */}
                <div>
                  <table className="table-card w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold">
                        <th className="p-2 text-center w-9">क्र०</th>
                        <th className="p-2 text-left">कक्षा व सेक्शन (Class)</th>
                        <th className="p-2 text-left">विषय व कक्ष (Subject)</th>
                        <th className="p-2 text-center">नामांकन (B / G)</th>
                        <th className="p-2 text-center">अंतिम तिथि</th>
                        <th className="p-2 text-center">उपस्थिति (P / A / L)</th>
                        <th className="p-2 text-center w-20">उपस्थिति %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.classRows.map((c, idx) => (
                        <tr key={c.id}>
                          <td className="p-2 text-center font-bold">{idx + 1}</td>
                          <td className="p-2 font-bold">
                            {c.grade} — सेक्शन {c.section}
                          </td>
                          <td className="p-2">
                            {c.subject} ({c.roomNumber})
                          </td>
                          <td className="p-2 text-center font-bold">
                            {c.totalStudents} (B:{c.boysCount}, G:{c.girlsCount})
                          </td>
                          <td className="p-2 text-center font-mono">{c.latestAttendanceDate}</td>
                          <td className="p-2 text-center font-semibold">
                            P: {c.presentCount} | A: {c.absentCount} | L: {c.leaveCount}
                          </td>
                          <td className="p-2 text-center font-black">{c.attendancePercentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Optional Student Roll Lists per Class */}
                {includeStudentRollList && (
                  <div className="space-y-3 pt-2">
                    {report.classRows.map((c) => (
                      <div key={c.id} className="glass-card p-3 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs font-extrabold">
                          <span>
                            छात्र नामांकन सूची: {c.grade} (सेक्शन {c.section}) — {c.subject}
                          </span>
                          <span>कुल छात्र: {c.totalStudents}</span>
                        </div>
                        <table className="table-card w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 font-bold">
                              <th className="p-1.5 text-center w-24">अनुक्रमांक (Roll No)</th>
                              <th className="p-1.5 text-left">विद्यार्थी का नाम (Student Name)</th>
                              <th className="p-1.5 text-center w-28">लिंग (Gender)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.students.map((st) => (
                              <tr key={st.id}>
                                <td className="p-1.5 text-center font-bold">{st.rollNumber}</td>
                                <td className="p-1.5 font-medium">{st.name}</td>
                                <td className="p-1.5 text-center">
                                  {st.gender === 'M'
                                    ? 'बालक (M)'
                                    : st.gender === 'F'
                                    ? 'बालिका (F)'
                                    : 'अन्य (O)'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 5. SIGNATURE & VERIFICATION FOOTER */}
            <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs font-bold">
              <div className="border-t-2 border-black pt-2">
                हस्ताक्षर संबंधित शिक्षक (Teacher Signature)
              </div>
              <div className="border-t-2 border-black pt-2">
                हस्ताक्षर प्रधानाध्यापक / प्रभारी (Headmaster)
              </div>
              <div className="border-t-2 border-black pt-2">
                निरीक्षण अधिकारी (BEO / ARP Seal &amp; Sign)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
