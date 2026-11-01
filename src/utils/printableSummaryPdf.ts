/**
 * Teacher Hub - Printable Tasks & Class Data Summary PDF Generator
 * Pure functions for aggregating current tasks (with category & status filters)
 * and classroom/attendance data into a structured, high-contrast printable summary report.
 */

import {
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  TASK_CATEGORY_METADATA,
  STATUS_METADATA,
  resolveTaskCategory,
} from './taskStatusSystem';
import {
  ClassSection,
  AttendanceRecord,
  Student,
} from '../types/classSection';
import { calculateDailyAttendanceStats } from './myClassesManager';
import { Duty } from '../types/duty';
import { getCriticalEscalations } from './safeguardsManager';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_LABELS_HI: Record<TaskPriority, string> = {
  urgent: 'अति आवश्यक (Urgent)',
  high: 'उच्च (High)',
  medium: 'मध्यम (Medium)',
  low: 'सामान्य (Low)',
};

export interface PrintableSummaryFilterOptions {
  categoryFilter?: TaskCategory | 'all';
  statusFilter?: TaskStatus | 'all';
  includeCompletedTasks?: boolean;
  includeClassData?: boolean;
  includeStudentRollList?: boolean;
  highContrast?: boolean;
}

export interface PrintableSummaryInput {
  tasks: Task[];
  classes: ClassSection[];
  attendanceRecords?: AttendanceRecord[];
  duties?: Duty[];
  schoolName: string;
  udiseCode?: string;
  teacherName: string;
  academicYear: string;
  referenceDate?: Date;
  options?: PrintableSummaryFilterOptions;
}

export interface PrintableCategoryBreakdownRow {
  category: TaskCategory;
  icon: string;
  labelHi: string;
  labelEn: string;
  total: number;
  pending: number;
  overdue: number;
  done: number;
}

export interface PrintableTaskRow {
  id: string;
  title: string;
  category: TaskCategory;
  categoryLabelHi: string;
  categoryLabelEn: string;
  status: TaskStatus;
  statusLabelHi: string;
  statusLabelEn: string;
  priority: Task['priority'];
  priorityLabelHi: string;
  deadlineStr: string;
  source: string;
  isCriticalOverdue: boolean;
  daysOverdue: number;
}

export interface PrintableClassSectionRow {
  id: string;
  grade: string;
  section: string;
  subject: string;
  roomNumber: string;
  academicYear: string;
  totalStudents: number;
  boysCount: number;
  girlsCount: number;
  otherGenderCount: number;
  latestAttendanceDate: string;
  markedStudents: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  attendancePercentage: number;
  timetableSummary: string;
  students: Student[];
}

export interface PrintableSummaryReport {
  generatedAtIso: string;
  generatedDateFormattedHi: string;
  schoolName: string;
  udiseCode: string;
  teacherName: string;
  academicYear: string;
  appliedFilters: {
    categoryFilter: TaskCategory | 'all';
    categoryFilterLabel: string;
    statusFilter: TaskStatus | 'all';
    statusFilterLabel: string;
    includeCompletedTasks: boolean;
    includeClassData: boolean;
    includeStudentRollList: boolean;
    highContrast: boolean;
  };
  taskMetrics: {
    totalTasksInSystem: number;
    exportedTasksCount: number;
    notStartedCount: number;
    inProgressCount: number;
    overdueCount: number;
    doneCount: number;
    criticalOverdueCount: number;
    completionRatePercent: number;
  };
  categoryBreakdown: PrintableCategoryBreakdownRow[];
  taskRows: PrintableTaskRow[];
  classMetrics: {
    totalClasses: number;
    totalStudents: number;
    totalBoys: number;
    totalGirls: number;
    totalPresentLatest: number;
    totalAbsentLatest: number;
    totalLeaveLatest: number;
    overallAttendancePercentage: number;
  };
  classRows: PrintableClassSectionRow[];
  activeDutiesCount: number;
}

/**
 * Pure function to build a complete Printable Summary Report from current tasks & class data.
 */
export function buildPrintableSummaryReport(
  input: PrintableSummaryInput
): PrintableSummaryReport {
  const refDate = input.referenceDate || new Date();
  const options: Required<PrintableSummaryFilterOptions> = {
    categoryFilter: input.options?.categoryFilter ?? 'all',
    statusFilter: input.options?.statusFilter ?? 'all',
    includeCompletedTasks: input.options?.includeCompletedTasks ?? true,
    includeClassData: input.options?.includeClassData ?? true,
    includeStudentRollList: input.options?.includeStudentRollList ?? false,
    highContrast: input.options?.highContrast ?? true,
  };

  const allTasks = Array.isArray(input.tasks) ? input.tasks : [];
  const allClasses = Array.isArray(input.classes) ? input.classes : [];
  const allAttendance = Array.isArray(input.attendanceRecords)
    ? input.attendanceRecords
    : [];
  const allDuties = Array.isArray(input.duties) ? input.duties : [];

  // Critical escalations (>3 days overdue)
  const criticalEscalations = getCriticalEscalations(allTasks, refDate, 3);
  const criticalMap = new Map<string, number>();
  for (const item of criticalEscalations) {
    criticalMap.set(item.task.id, item.daysOverdue);
  }

  // 1. Category breakdown across tasks matching categoryFilter (or all categories for overview)
  const categories: TaskCategory[] = ['Administrative', 'Academic', 'Extra-curricular'];
  const categoryBreakdown: PrintableCategoryBreakdownRow[] = categories.map((cat) => {
    const meta = TASK_CATEGORY_METADATA[cat];
    const matching = allTasks.filter((t) => resolveTaskCategory(t) === cat);
    let done = 0;
    let overdue = 0;
    let pending = 0;
    for (const t of matching) {
      if (t.status === 'done') done++;
      else if (t.status === 'overdue') overdue++;
      else pending++;
    }
    return {
      category: cat,
      icon: meta.icon,
      labelHi: meta.labelHi,
      labelEn: meta.labelEn,
      total: matching.length,
      pending,
      overdue,
      done,
    };
  });

  // 2. Filter tasks according to options
  const filteredTasks = allTasks.filter((task) => {
    const resolvedCat = resolveTaskCategory(task);
    if (options.categoryFilter !== 'all' && resolvedCat !== options.categoryFilter) {
      return false;
    }
    if (options.statusFilter !== 'all' && task.status !== options.statusFilter) {
      return false;
    }
    if (!options.includeCompletedTasks && task.status === 'done') {
      return false;
    }
    return true;
  });

  // Sort tasks: overdue first, then priority weight descending, then deadline ascending
  const sortedTasks = filteredTasks.slice().sort((a, b) => {
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (a.status !== 'overdue' && b.status === 'overdue') return 1;
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    const pw = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
    if (pw !== 0) return pw;
    const da = a.deadline || '9999-12-31';
    const db = b.deadline || '9999-12-31';
    return da.localeCompare(db);
  });

  // Compute task metrics on category-filtered base (before hiding done if includeCompletedTasks is false, or on exported set)
  const metricBaseTasks = allTasks.filter((t) =>
    options.categoryFilter === 'all'
      ? true
      : resolveTaskCategory(t) === options.categoryFilter
  );

  let notStartedCount = 0;
  let inProgressCount = 0;
  let overdueCount = 0;
  let doneCount = 0;

  for (const t of metricBaseTasks) {
    if (t.status === 'not_started') notStartedCount++;
    else if (
      t.status === 'in_progress' ||
      t.status === 'waiting_on_others' ||
      t.status === 'blocked'
    )
      inProgressCount++;
    else if (t.status === 'overdue') overdueCount++;
    else if (t.status === 'done') doneCount++;
  }

  const completionRatePercent =
    metricBaseTasks.length > 0
      ? Math.round((doneCount / metricBaseTasks.length) * 100)
      : 0;

  const taskRows: PrintableTaskRow[] = sortedTasks.map((t) => {
    const cat = resolveTaskCategory(t);
    const catMeta = TASK_CATEGORY_METADATA[cat];
    const stMeta = STATUS_METADATA[t.status] || STATUS_METADATA.not_started;
    const priorityLabelHi = PRIORITY_LABELS_HI[t.priority] || PRIORITY_LABELS_HI.medium;
    const daysOverdue = criticalMap.get(t.id) || 0;

    return {
      id: t.id,
      title: t.title,
      category: cat,
      categoryLabelHi: catMeta.labelHi,
      categoryLabelEn: catMeta.labelEn,
      status: t.status,
      statusLabelHi: stMeta.labelHi,
      statusLabelEn: stMeta.labelEn,
      priority: t.priority,
      priorityLabelHi,
      deadlineStr: t.deadline ? t.deadline.slice(0, 10) : '—',
      source: t.source || 'विभागीय / विद्यालय',
      isCriticalOverdue: criticalMap.has(t.id),
      daysOverdue,
    };
  });

  // 3. Class & Attendance Summary
  let totalStudents = 0;
  let totalBoys = 0;
  let totalGirls = 0;
  let totalPresentLatest = 0;
  let totalAbsentLatest = 0;
  let totalLeaveLatest = 0;

  const classRows: PrintableClassSectionRow[] = allClasses.map((cs) => {
    const students = Array.isArray(cs.students) ? cs.students : [];
    const boysCount = students.filter((s) => s.gender === 'M').length;
    const girlsCount = students.filter((s) => s.gender === 'F').length;
    const otherGenderCount = students.length - boysCount - girlsCount;

    // Find most recent attendance record for this class
    const classAttRecords = allAttendance
      .filter((r) => r.classSectionId === cs.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    const latestRecord = classAttRecords[0];
    const stats = calculateDailyAttendanceStats(students, latestRecord);

    totalStudents += students.length;
    totalBoys += boysCount;
    totalGirls += girlsCount;
    totalPresentLatest += stats.presentCount;
    totalAbsentLatest += stats.absentCount;
    totalLeaveLatest += stats.leaveCount;

    const timetableSummary =
      Array.isArray(cs.timetableSlots) && cs.timetableSlots.length > 0
        ? cs.timetableSlots
            .map((slot) => `${slot.dayLabel} (कालांश ${slot.period}: ${slot.time})`)
            .join(', ')
        : 'निर्धारित समय-सारिणी';

    return {
      id: cs.id,
      grade: cs.grade,
      section: cs.section,
      subject: cs.subject,
      roomNumber: cs.roomNumber || '—',
      academicYear: cs.academicYear || input.academicYear,
      totalStudents: students.length,
      boysCount,
      girlsCount,
      otherGenderCount,
      latestAttendanceDate: latestRecord ? latestRecord.date : 'अंकित नहीं',
      markedStudents: stats.markedStudents,
      presentCount: stats.presentCount,
      absentCount: stats.absentCount,
      leaveCount: stats.leaveCount,
      attendancePercentage: stats.percentage,
      timetableSummary,
      students: students.slice().sort((a, b) => a.rollNumber - b.rollNumber),
    };
  });

  const overallAttendancePercentage =
    totalStudents > 0 ? Math.round((totalPresentLatest / totalStudents) * 100) : 0;

  const categoryFilterLabel =
    options.categoryFilter === 'all'
      ? 'सभी श्रेणियाँ (All Categories)'
      : `${TASK_CATEGORY_METADATA[options.categoryFilter].labelHi} (${TASK_CATEGORY_METADATA[options.categoryFilter].labelEn})`;

  const statusFilterLabel =
    options.statusFilter === 'all'
      ? 'सभी स्थितियाँ (All Statuses)'
      : `${STATUS_METADATA[options.statusFilter].labelHi} (${STATUS_METADATA[options.statusFilter].labelEn})`;

  return {
    generatedAtIso: refDate.toISOString(),
    generatedDateFormattedHi: refDate.toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    schoolName: input.schoolName || 'प्राथमिक विद्यालय (बेसिक शिक्षा परिषद)',
    udiseCode: input.udiseCode || '09250100101',
    teacherName: input.teacherName || 'शिक्षक (Primary Teacher)',
    academicYear: input.academicYear || '2026-27',
    appliedFilters: {
      categoryFilter: options.categoryFilter,
      categoryFilterLabel,
      statusFilter: options.statusFilter,
      statusFilterLabel,
      includeCompletedTasks: options.includeCompletedTasks,
      includeClassData: options.includeClassData,
      includeStudentRollList: options.includeStudentRollList,
      highContrast: options.highContrast,
    },
    taskMetrics: {
      totalTasksInSystem: allTasks.length,
      exportedTasksCount: taskRows.length,
      notStartedCount,
      inProgressCount,
      overdueCount,
      doneCount,
      criticalOverdueCount: criticalEscalations.length,
      completionRatePercent,
    },
    categoryBreakdown,
    taskRows,
    classMetrics: {
      totalClasses: classRows.length,
      totalStudents,
      totalBoys,
      totalGirls,
      totalPresentLatest,
      totalAbsentLatest,
      totalLeaveLatest,
      overallAttendancePercentage,
    },
    classRows,
    activeDutiesCount: allDuties.filter((d) => d.status === 'active').length,
  };
}

/**
 * Escapes HTML special characters safely for standalone report output.
 */
function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a standalone, print-ready HTML document that strictly adheres to
 * the high-contrast (`html[data-high-contrast="true"]`) and `@media print`
 * CSS rules defined in `src/index.css`.
 */
export function generatePrintableSummaryHtml(report: PrintableSummaryReport): string {
  const highContrastAttr = report.appliedFilters.highContrast
    ? ' data-high-contrast="true"'
    : '';

  const categoryRowsHtml = report.categoryBreakdown
    .map(
      (c) => `
      <tr>
        <td><strong>${escapeHtml(c.labelHi)}</strong> (${escapeHtml(c.labelEn)})</td>
        <td style="text-align: center; font-weight: 700;">${c.total}</td>
        <td style="text-align: center;">${c.pending}</td>
        <td style="text-align: center; font-weight: 700;">${c.overdue}</td>
        <td style="text-align: center;">${c.done}</td>
      </tr>`
    )
    .join('');

  const taskRowsHtml =
    report.taskRows.length > 0
      ? report.taskRows
          .map(
            (t, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
        <td>
          <strong>${escapeHtml(t.title)}</strong>
          ${
            t.isCriticalOverdue
              ? ` <span class="hc-badge">[CRITICAL: ${t.daysOverdue}d विलंबित]</span>`
              : ''
          }
        </td>
        <td>${escapeHtml(t.categoryLabelHi)} (${escapeHtml(t.categoryLabelEn)})</td>
        <td>${escapeHtml(t.statusLabelHi)} (${escapeHtml(t.statusLabelEn)})</td>
        <td>${escapeHtml(t.priorityLabelHi)}</td>
        <td style="white-space: nowrap;">${escapeHtml(t.deadlineStr)}</td>
        <td>${escapeHtml(t.source)}</td>
      </tr>`
          )
          .join('')
      : `<tr><td colspan="7" style="text-align: center; padding: 12px;">कोई कार्य चयनित फ़िल्टर में उपलब्ध नहीं है (No matching tasks)</td></tr>`;

  const classRowsHtml =
    report.classRows.length > 0
      ? report.classRows
          .map(
            (c, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
        <td><strong>${escapeHtml(c.grade)} - सेक्शन ${escapeHtml(c.section)}</strong></td>
        <td>${escapeHtml(c.subject)}</td>
        <td style="text-align: center; font-weight: 700;">${c.totalStudents} (बालक: ${c.boysCount}, बालिका: ${c.girlsCount})</td>
        <td style="text-align: center;">${escapeHtml(c.latestAttendanceDate)}</td>
        <td style="text-align: center; font-weight: 700;">उपस्थित: ${c.presentCount} | अनुपस्थित: ${c.absentCount} | अवकाश: ${c.leaveCount}</td>
        <td style="text-align: center; font-weight: 800;">${c.attendancePercentage}%</td>
      </tr>`
          )
          .join('')
      : `<tr><td colspan="7" style="text-align: center; padding: 12px;">कोई कक्षा डेटा उपलब्ध नहीं है (No class sections found)</td></tr>`;

  const studentRollTablesHtml =
    report.appliedFilters.includeClassData && report.appliedFilters.includeStudentRollList
      ? report.classRows
          .map(
            (c) => `
      <div class="glass-card" style="margin-top: 12px; padding: 12px;">
        <h4 style="margin: 0 0 8px 0; font-size: 13px;">
          विद्यार्थी नामांकन सूची: ${escapeHtml(c.grade)} (${escapeHtml(c.section)}) — विषय: ${escapeHtml(c.subject)} (कुल: ${c.totalStudents})
        </h4>
        <table class="table-card">
          <thead>
            <tr>
              <th style="width: 80px; text-align: center;">अनुक्रमांक (Roll No)</th>
              <th>विद्यार्थी का नाम (Student Name)</th>
              <th style="width: 120px; text-align: center;">लिंग (Gender)</th>
            </tr>
          </thead>
          <tbody>
            ${c.students
              .map(
                (s) => `
              <tr>
                <td style="text-align: center; font-weight: 700;">${s.rollNumber}</td>
                <td>${escapeHtml(s.name)}</td>
                <td style="text-align: center;">${s.gender === 'M' ? 'बालक (M)' : s.gender === 'F' ? 'बालिका (F)' : 'अन्य (O)'}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
          )
          .join('')
      : '';

  return `<!DOCTYPE html>
<html lang="hi"${highContrastAttr}>
<head>
  <meta charset="utf-8" />
  <title>कार्य एवं कक्षा सारांश पीडीएफ रिपोर्ट - ${escapeHtml(report.schoolName)}</title>
  <style>
    :root {
      --ink: #000000;
      --ink2: #111111;
      --line: #222222;
      --glass-border: #111111;
    }
    html[data-high-contrast="true"] {
      --ink: #000000 !important;
      --ink2: #111111 !important;
      --line: #222222 !important;
      --glass-border: #111111 !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif;
      background: #fff;
      color: #000;
      margin: 16px;
      line-height: 1.45;
    }
    .glass-card, .table-card {
      box-shadow: none;
      border: 1px solid #bbb;
      background: #fff;
      border-radius: 6px;
      margin-bottom: 14px;
    }
    html[data-high-contrast="true"] .glass-card,
    html[data-high-contrast="true"] .table-card {
      border: 1.5px solid #000;
    }
    .report-header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      padding: 10px;
      font-size: 12px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-box {
      padding: 8px 10px;
      border: 1px solid #000;
      background: #fff;
      border-radius: 4px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 700;
      color: #111;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 800;
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    th, td {
      border: 1px solid #222;
      padding: 6px 8px;
      text-align: left;
      color: #000;
      background: #fff;
    }
    th {
      font-weight: 800;
      background: #f1f5f9;
      border-bottom: 2px solid #000;
    }
    .hc-badge {
      display: inline-block;
      border: 1px solid #000;
      padding: 1px 5px;
      font-size: 10px;
      font-weight: 800;
      background: #fff;
      color: #000;
    }
    .sign-grid {
      margin-top: 32px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      page-break-inside: avoid;
    }
    .sign-box {
      width: 210px;
      border-top: 1.5px solid #000;
      padding-top: 6px;
      text-align: center;
      font-weight: 700;
    }
    @media print {
      .site-header, .mobile-drawer, .toolbar, .summary, .tabs-row, .slim-footer, .site-footer, .toast, .row-del, .page-head .btn, .page-head .hint, .header-actions, .no-print {
        display: none !important;
      }
      body { background: #fff; color: #000; margin: 8mm; }
      .glass-card, .table-card { box-shadow: none; border: 1px solid #bbb; background: #fff; }
      html[data-high-contrast="true"] .glass-card,
      html[data-high-contrast="true"] .table-card {
        border: 1.5px solid #000;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print" style="display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px;">
    <button onclick="window.print()" style="padding: 8px 14px; border: 2px solid #000; background: #000; color: #fff; font-weight: 700; border-radius: 6px; cursor: pointer;">
      🖨️ प्रिंट करें / Save as PDF
    </button>
  </div>

  <div class="report-header">
    <div>
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">
        बेसिक शिक्षा परिषद • TEACHER HUB OFFICIAL SUMMARY REPORT
      </div>
      <h1 style="margin: 4px 0 2px 0; font-size: 19px; font-weight: 900;">
        कार्य एवं कक्षा उपस्थिति सारांश रिपोर्ट (Printable Tasks &amp; Class Data Summary PDF)
      </h1>
      <div style="font-size: 11.5px;">
        फ़िल्टर: ${escapeHtml(report.appliedFilters.categoryFilterLabel)} • ${escapeHtml(report.appliedFilters.statusFilterLabel)}
      </div>
    </div>
    <div style="text-align: right; font-size: 11.5px;">
      <div><strong>दिनांक:</strong> ${escapeHtml(report.generatedDateFormattedHi)}</div>
      <div><strong>शैक्षिक सत्र:</strong> ${escapeHtml(report.academicYear)}</div>
    </div>
  </div>

  <div class="glass-card meta-grid">
    <div><strong>विद्यालय:</strong> ${escapeHtml(report.schoolName)}</div>
    <div><strong>UDISE+ कोड:</strong> ${escapeHtml(report.udiseCode)}</div>
    <div><strong>शिक्षक / प्रभारी:</strong> ${escapeHtml(report.teacherName)}</div>
    <div><strong>सक्रिय विद्यालय दायित्व:</strong> ${report.activeDutiesCount}</div>
  </div>

  <h2 style="font-size: 14px; margin: 14px 0 8px 0; font-weight: 800;">
    1. कार्य निष्पादन एवं श्रेणी सारांश (Tasks &amp; Category Summary)
  </h2>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">कुल कार्य (Total Tasks)</div>
      <div class="kpi-val">${report.taskMetrics.exportedTasksCount} / ${report.taskMetrics.totalTasksInSystem}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">प्रगति पर / शुरू नहीं (Pending)</div>
      <div class="kpi-val">${report.taskMetrics.notStartedCount + report.taskMetrics.inProgressCount}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">विलंबित (Overdue / Critical)</div>
      <div class="kpi-val">${report.taskMetrics.overdueCount} (${report.taskMetrics.criticalOverdueCount} गंभीर)</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">पूर्ण कार्य (Completed)</div>
      <div class="kpi-val">${report.taskMetrics.doneCount} (${report.taskMetrics.completionRatePercent}%)</div>
    </div>
  </div>

  <table class="table-card" style="margin-bottom: 14px;">
    <thead>
      <tr>
        <th>कार्य श्रेणी (Task Category)</th>
        <th style="width: 90px; text-align: center;">कुल (Total)</th>
        <th style="width: 110px; text-align: center;">लंबित (Pending)</th>
        <th style="width: 110px; text-align: center;">विलंबित (Overdue)</th>
        <th style="width: 90px; text-align: center;">पूर्ण (Done)</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRowsHtml}
    </tbody>
  </table>

  <h3 style="font-size: 13px; margin: 12px 0 6px 0; font-weight: 800;">
    विस्तृत कार्य सूची (Detailed Tasks List — ${report.taskRows.length} Tasks)
  </h3>
  <table class="table-card">
    <thead>
      <tr>
        <th style="width: 36px; text-align: center;">क्र०</th>
        <th>कार्य शीर्षक (Task Title)</th>
        <th style="width: 145px;">श्रेणी (Category)</th>
        <th style="width: 130px;">स्थिति (Status)</th>
        <th style="width: 85px;">प्राथमिकता</th>
        <th style="width: 88px;">अंतिम तिथि</th>
        <th style="width: 110px;">स्रोत (Source)</th>
      </tr>
    </thead>
    <tbody>
      ${taskRowsHtml}
    </tbody>
  </table>

  ${
    report.appliedFilters.includeClassData
      ? `
  <h2 style="font-size: 14px; margin: 18px 0 8px 0; font-weight: 800;">
    2. कक्षा एवं उपस्थिति सारांश (Class Sections &amp; Attendance Data Summary)
  </h2>
  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">कुल कक्षा सेक्शन (Classes)</div>
      <div class="kpi-val">${report.classMetrics.totalClasses}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">कुल नामांकित छात्र (Students)</div>
      <div class="kpi-val">${report.classMetrics.totalStudents} (B:${report.classMetrics.totalBoys} / G:${report.classMetrics.totalGirls})</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">नवीनतम उपस्थिति (Present/Absent)</div>
      <div class="kpi-val">${report.classMetrics.totalPresentLatest} P / ${report.classMetrics.totalAbsentLatest} A</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">कुल उपस्थिति दर (Attendance %)</div>
      <div class="kpi-val">${report.classMetrics.overallAttendancePercentage}%</div>
    </div>
  </div>

  <table class="table-card">
    <thead>
      <tr>
        <th style="width: 36px; text-align: center;">क्र०</th>
        <th>कक्षा व सेक्शन (Class &amp; Section)</th>
        <th>विषय (Subject)</th>
        <th style="text-align: center;">नामांकन (Roll Strength)</th>
        <th style="text-align: center;">अंतिम उपस्थिति तिथि</th>
        <th style="text-align: center;">उपस्थिति विवरण (P / A / L)</th>
        <th style="width: 85px; text-align: center;">उपस्थिति %</th>
      </tr>
    </thead>
    <tbody>
      ${classRowsHtml}
    </tbody>
  </table>
  ${studentRollTablesHtml}
  `
      : ''
  }

  <div class="sign-grid">
    <div class="sign-box">हस्ताक्षर संबंधित शिक्षक (Teacher)</div>
    <div class="sign-box">हस्ताक्षर प्रधानाध्यापक (Headmaster)</div>
    <div class="sign-box">निरीक्षण अधिकारी (BEO / ARP)</div>
  </div>
</body>
</html>`;
}
