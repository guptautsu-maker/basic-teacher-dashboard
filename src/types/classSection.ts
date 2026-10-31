/**
 * Teacher Hub - My Classes & Attendance Management Types
 * Minimal student data schema designed for student data privacy.
 */

export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface Student {
  id: string;
  rollNumber: number;
  name: string;
  gender?: 'M' | 'F' | 'O';
  classSectionId: string;
}

export interface AttendanceRecord {
  id: string;
  classSectionId: string;
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>; // studentId -> status
  takenAt: string; // ISO
  takenBy?: string;
  notes?: string;
}

export interface TimetableSlot {
  id: string;
  dayLabel: string; // e.g. "सोमवार - शनिवार (Mon-Sat)" or "सोम, बुध, शुक्र"
  period: number; // e.g. 1, 2, 3...
  time: string; // e.g. "09:30 AM - 10:15 AM"
  room?: string;
}

export interface ClassSection {
  id: string;
  grade: string; // e.g. "कक्षा 4" or "Class 4"
  section: string; // e.g. "A" / "अ"
  subject: string; // e.g. "गणित (Mathematics)"
  academicYear: string; // e.g. "2026-27"
  timetableSlots: TimetableSlot[];
  roomNumber?: string;
  classTeacher?: string;
  students: Student[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyAttendanceStats {
  totalStudents: number;
  markedStudents: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  percentage: number;
}

export interface StudentMonthlySummary {
  studentId: string;
  rollNumber: number;
  name: string;
  gender?: 'M' | 'F' | 'O';
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  percentage: number;
}
