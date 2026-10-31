import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStudentCsv,
  exportStudentCsv,
  generateSampleCsvTemplate,
  calculateDailyAttendanceStats,
  markAllAttendance,
  calculateMonthlyAttendanceSummary,
  getSampleClassSections,
  getSampleAttendanceRecords,
  STUDENT_PRIVACY_NOTICE,
} from './myClassesManager';
import { Student, AttendanceRecord } from '../types/classSection';

describe('My Classes & Attendance Module - Pure Business Logic', () => {
  const dummyStudents: Student[] = [
    { id: 's1', rollNumber: 1, name: 'अमित कुमार', gender: 'M', classSectionId: 'cs-test' },
    { id: 's2', rollNumber: 2, name: 'प्रिया वर्मा', gender: 'F', classSectionId: 'cs-test' },
    { id: 's3', rollNumber: 3, name: 'रोहित सिंह', gender: 'M', classSectionId: 'cs-test' },
    { id: 's4', rollNumber: 4, name: 'अंजलि देवी', gender: 'F', classSectionId: 'cs-test' },
  ];

  describe('1. CSV Parsing', () => {
    it('parses valid CSV with headers correctly', () => {
      const csv = `Roll No,Student Name,Gender
1,अमित कुमार,M
2,प्रिया वर्मा,F
3,रोहित सिंह,M`;

      const result = parseStudentCsv(csv, 'cs-test');
      assert.strictEqual(result.errors.length, 0);
      assert.strictEqual(result.students.length, 3);
      assert.strictEqual(result.students[0].rollNumber, 1);
      assert.strictEqual(result.students[0].name, 'अमित कुमार');
      assert.strictEqual(result.students[0].gender, 'M');
      assert.strictEqual(result.students[1].rollNumber, 2);
      assert.strictEqual(result.students[1].name, 'प्रिया वर्मा');
      assert.strictEqual(result.students[1].gender, 'F');
    });

    it('handles quotes and semicolon delimiters in CSV', () => {
      const csv = `"Roll No";"Name";"Gender"
"10";"मनोज कुमार";"M"
"11";"स्वाति गुप्ता";"F"`;

      const result = parseStudentCsv(csv, 'cs-test');
      assert.strictEqual(result.students.length, 2);
      assert.strictEqual(result.students[0].rollNumber, 10);
      assert.strictEqual(result.students[0].name, 'मनोज कुमार');
    });

    it('returns error when CSV is empty', () => {
      const result = parseStudentCsv('', 'cs-test');
      assert.strictEqual(result.students.length, 0);
      assert.ok(result.errors.length > 0);
    });

    it('skips invalid rows and collects error messages', () => {
      const csv = `Roll,Name
1,अमित
invalid_row_only_one_col
3,रोहित`;

      const result = parseStudentCsv(csv, 'cs-test');
      assert.strictEqual(result.students.length, 2);
      assert.strictEqual(result.errors.length, 1);
    });
  });

  describe('2. CSV Export & Template', () => {
    it('generates sample CSV template with BOM and valid rows', () => {
      const template = generateSampleCsvTemplate();
      assert.ok(template.startsWith('\uFEFF'));
      assert.ok(template.includes('Roll No,Student Name,Gender'));
      assert.ok(template.includes('अमित कुमार'));
    });

    it('exports student list to CSV without attendance', () => {
      const exported = exportStudentCsv(dummyStudents);
      assert.ok(exported.startsWith('\uFEFF'));
      assert.ok(exported.includes('अनुक्रमांक (Roll No)'));
      assert.ok(exported.includes('1,"अमित कुमार"'));
    });

    it('exports student list with attendance status mapping', () => {
      const attendanceMap = {
        s1: 'present' as const,
        s2: 'absent' as const,
        s3: 'present' as const,
        s4: 'leave' as const,
      };

      const exported = exportStudentCsv(dummyStudents, attendanceMap, '2026-10-31');
      assert.ok(exported.includes('2026-10-31'));
      assert.ok(exported.includes('उपस्थित (Present)'));
      assert.ok(exported.includes('अनुपस्थित (Absent)'));
      assert.ok(exported.includes('अवकाश (Leave)'));
    });
  });

  describe('3. Daily Attendance Calculation', () => {
    it('calculates daily stats accurately', () => {
      const record: AttendanceRecord = {
        id: 'rec-1',
        classSectionId: 'cs-test',
        date: '2026-10-31',
        records: {
          s1: 'present',
          s2: 'absent',
          s3: 'present',
          s4: 'leave',
        },
        takenAt: '2026-10-31T09:00:00Z',
      };

      const stats = calculateDailyAttendanceStats(dummyStudents, record);
      assert.strictEqual(stats.totalStudents, 4);
      assert.strictEqual(stats.markedStudents, 4);
      assert.strictEqual(stats.presentCount, 2);
      assert.strictEqual(stats.absentCount, 1);
      assert.strictEqual(stats.leaveCount, 1);
      assert.strictEqual(stats.percentage, 50); // 2 out of 4 = 50%
    });

    it('handles unmarked attendance record', () => {
      const stats = calculateDailyAttendanceStats(dummyStudents, undefined);
      assert.strictEqual(stats.totalStudents, 4);
      assert.strictEqual(stats.markedStudents, 0);
      assert.strictEqual(stats.presentCount, 0);
      assert.strictEqual(stats.percentage, 0);
    });

    it('markAllAttendance marks all students with present', () => {
      const marked = markAllAttendance(dummyStudents, 'present');
      assert.strictEqual(Object.keys(marked).length, 4);
      assert.strictEqual(marked.s1, 'present');
      assert.strictEqual(marked.s2, 'present');
      assert.strictEqual(marked.s3, 'present');
      assert.strictEqual(marked.s4, 'present');
    });
  });

  describe('4. Monthly Attendance Summary', () => {
    it('calculates monthly aggregates across multiple dates', () => {
      const records: AttendanceRecord[] = [
        {
          id: 'rec-1',
          classSectionId: 'cs-test',
          date: '2026-10-01',
          records: { s1: 'present', s2: 'absent', s3: 'present', s4: 'present' },
          takenAt: '2026-10-01T09:00:00Z',
        },
        {
          id: 'rec-2',
          classSectionId: 'cs-test',
          date: '2026-10-02',
          records: { s1: 'present', s2: 'present', s3: 'absent', s4: 'leave' },
          takenAt: '2026-10-02T09:00:00Z',
        },
        {
          id: 'rec-3',
          classSectionId: 'cs-test',
          date: '2026-10-03',
          records: { s1: 'present', s2: 'present', s3: 'present', s4: 'present' },
          takenAt: '2026-10-03T09:00:00Z',
        },
      ];

      const summary = calculateMonthlyAttendanceSummary(dummyStudents, records, '2026-10');
      assert.strictEqual(summary.length, 4);

      // s1: present 3 of 3 days (100%)
      const s1Summary = summary.find((s) => s.studentId === 's1')!;
      assert.strictEqual(s1Summary.totalDays, 3);
      assert.strictEqual(s1Summary.presentDays, 3);
      assert.strictEqual(s1Summary.percentage, 100);

      // s2: present 2 of 3 days (67%)
      const s2Summary = summary.find((s) => s.studentId === 's2')!;
      assert.strictEqual(s2Summary.presentDays, 2);
      assert.strictEqual(s2Summary.absentDays, 1);
      assert.strictEqual(s2Summary.percentage, 67);

      // s4: present 2, leave 1
      const s4Summary = summary.find((s) => s.studentId === 's4')!;
      assert.strictEqual(s4Summary.presentDays, 2);
      assert.strictEqual(s4Summary.leaveDays, 1);
    });
  });

  describe('5. Sample Data & Privacy Principles', () => {
    it('verifies privacy policy note exists', () => {
      assert.ok(STUDENT_PRIVACY_NOTICE.titleHi.includes('गोपनीयता'));
      assert.ok(STUDENT_PRIVACY_NOTICE.bodyHi.includes('न्यूनतम विवरण'));
    });

    it('provides valid initial class sections and students', () => {
      const classes = getSampleClassSections();
      assert.ok(classes.length >= 3);
      assert.ok(classes[0].students.length > 0);
      assert.ok(classes[0].timetableSlots.length > 0);

      const records = getSampleAttendanceRecords(classes);
      assert.ok(records.length > 0);
    });
  });
});
