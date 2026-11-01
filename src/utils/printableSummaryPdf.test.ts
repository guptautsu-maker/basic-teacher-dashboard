import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrintableSummaryReport,
  generatePrintableSummaryHtml,
} from './printableSummaryPdf';
import { Task } from './taskStatusSystem';
import { ClassSection, AttendanceRecord } from '../types/classSection';

const mockTasks: Task[] = [
  {
    id: 't-1',
    title: 'यू-डायस प्लस छात्र प्रोफ़ाइल सत्यापन',
    type: 'portal_entry',
    category: 'Administrative',
    priority: 'urgent',
    status: 'overdue',
    recurrence: 'none',
    deadline: '2026-10-20T10:00:00.000Z',
    source: 'UDISE+ पोर्टल',
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 't-2',
    title: 'कक्षा 4 गणित निपुण तालिका अद्यतन',
    type: 'general',
    category: 'Academic',
    priority: 'high',
    status: 'in_progress',
    recurrence: 'none',
    deadline: '2026-10-31T10:00:00.000Z',
    source: 'निपुण भारत मिशन',
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z',
  },
  {
    id: 't-3',
    title: 'बाल सभा एवं खेलकूद गतिविधि आयोजन',
    type: 'duty',
    category: 'Extra-curricular',
    priority: 'medium',
    status: 'done',
    recurrence: 'none',
    deadline: '2026-10-28T10:00:00.000Z',
    completedAt: '2026-10-28T15:00:00.000Z',
    source: 'विद्यालय गतिविधि',
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-28T15:00:00.000Z',
  },
];

const mockClasses: ClassSection[] = [
  {
    id: 'cs-1',
    grade: 'कक्षा 4',
    section: 'A',
    subject: 'गणित एवं पर्यावरण',
    roomNumber: 'कक्ष 2',
    academicYear: '2026-27',
    students: [
      { id: 's-1', rollNumber: 1, name: 'आरव शर्मा', gender: 'M', classSectionId: 'cs-1' },
      { id: 's-2', rollNumber: 2, name: 'अनन्या वर्मा', gender: 'F', classSectionId: 'cs-1' },
      { id: 's-3', rollNumber: 3, name: 'रोहित यादव', gender: 'M', classSectionId: 'cs-1' },
    ],
    timetableSlots: [
      {
        id: 'slot-1',
        dayLabel: 'सोमवार — शनिवार',
        period: 2,
        time: '09:40 - 10:20',
      },
    ],
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z',
  },
];

const mockAttendance: AttendanceRecord[] = [
  {
    id: 'att-1',
    classSectionId: 'cs-1',
    date: '2026-10-31',
    records: {
      's-1': 'present',
      's-2': 'present',
      's-3': 'absent',
    },
    takenAt: '2026-10-31T09:00:00.000Z',
  },
];

test('buildPrintableSummaryReport aggregates task metrics, categories, and class attendance accurately', () => {
  const refDate = new Date('2026-10-31T12:00:00.000Z');
  const report = buildPrintableSummaryReport({
    tasks: mockTasks,
    classes: mockClasses,
    attendanceRecords: mockAttendance,
    schoolName: 'प्रा० वि० कंपोजिट आदर्श नगर',
    udiseCode: '09250100202',
    teacherName: 'राजेश कुमार',
    academicYear: '2026-27',
    referenceDate: refDate,
  });

  assert.equal(report.taskMetrics.totalTasksInSystem, 3);
  assert.equal(report.taskMetrics.exportedTasksCount, 3);
  assert.equal(report.taskMetrics.overdueCount, 1);
  assert.equal(report.taskMetrics.inProgressCount, 1);
  assert.equal(report.taskMetrics.doneCount, 1);
  assert.equal(report.taskMetrics.criticalOverdueCount, 1);
  assert.equal(report.taskMetrics.completionRatePercent, 33);

  // Overdue task should be sorted first
  assert.equal(report.taskRows[0].id, 't-1');
  assert.equal(report.taskRows[0].isCriticalOverdue, true);

  // Category breakdown should have all 3 categories with 1 task each
  assert.equal(report.categoryBreakdown.length, 3);
  const adminCat = report.categoryBreakdown.find((c) => c.category === 'Administrative');
  assert.ok(adminCat);
  assert.equal(adminCat.total, 1);
  assert.equal(adminCat.overdue, 1);

  // Class metrics
  assert.equal(report.classMetrics.totalClasses, 1);
  assert.equal(report.classMetrics.totalStudents, 3);
  assert.equal(report.classMetrics.totalBoys, 2);
  assert.equal(report.classMetrics.totalGirls, 1);
  assert.equal(report.classMetrics.totalPresentLatest, 2);
  assert.equal(report.classMetrics.totalAbsentLatest, 1);
  assert.equal(report.classMetrics.overallAttendancePercentage, 67);
});

test('buildPrintableSummaryReport respects categoryFilter and includeCompletedTasks=false', () => {
  const report = buildPrintableSummaryReport({
    tasks: mockTasks,
    classes: mockClasses,
    attendanceRecords: mockAttendance,
    schoolName: 'प्रा० वि० कंपोजिट आदर्श नगर',
    teacherName: 'राजेश कुमार',
    academicYear: '2026-27',
    options: {
      categoryFilter: 'Academic',
      includeCompletedTasks: false,
    },
  });

  assert.equal(report.taskRows.length, 1);
  assert.equal(report.taskRows[0].id, 't-2');
  assert.equal(report.taskRows[0].category, 'Academic');

  const noDoneReport = buildPrintableSummaryReport({
    tasks: mockTasks,
    classes: mockClasses,
    attendanceRecords: mockAttendance,
    schoolName: 'प्रा० वि० कंपोजिट आदर्श नगर',
    teacherName: 'राजेश कुमार',
    academicYear: '2026-27',
    options: {
      categoryFilter: 'all',
      includeCompletedTasks: false,
    },
  });
  assert.equal(noDoneReport.taskRows.length, 2);
  assert.equal(
    noDoneReport.taskRows.some((r) => r.status === 'done'),
    false
  );
});

test('generatePrintableSummaryHtml outputs print and high-contrast CSS rules matching index.css', () => {
  const report = buildPrintableSummaryReport({
    tasks: mockTasks,
    classes: mockClasses,
    attendanceRecords: mockAttendance,
    schoolName: 'प्रा० वि० कंपोजिट आदर्श नगर',
    udiseCode: '09250100202',
    teacherName: 'राजेश कुमार',
    academicYear: '2026-27',
    options: {
      highContrast: true,
      includeClassData: true,
      includeStudentRollList: true,
    },
  });

  const html = generatePrintableSummaryHtml(report);
  assert.ok(html.includes('data-high-contrast="true"'));
  assert.ok(html.includes('@media print'));
  assert.ok(html.includes('.glass-card, .table-card'));
  assert.ok(html.includes('यू-डायस प्लस छात्र प्रोफ़ाइल सत्यापन'));
  assert.ok(html.includes('कक्षा 4 - सेक्शन A'));
  assert.ok(html.includes('आरव शर्मा'));
});
