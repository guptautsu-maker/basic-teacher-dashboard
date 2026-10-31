/**
 * Types for Role Setup, App Settings, DPDP Act 2023 Privacy Notices,
 * Local JSON Backup/Restore, and Sensitive Data (Aadhaar/Password) Guards.
 */

export type UserRole = 'teacher' | 'headmaster' | 'admin';

export type AppLanguage = 'hi' | 'en' | 'bilingual';

export interface SchoolProfile {
  schoolName: string;
  udiseCode: string; // 11-digit UDISE+ code
  block: string;
  district: string;
  state: string;
  teacherName: string;
  designation: string; // e.g. सहायक अध्यापक (PRT), उच्च प्राथमिक शिक्षक (TGT), प्रधानाध्यापक
  role: UserRole;
}

export interface NotificationPreferences {
  inAppAlerts: boolean;
  browserPush: boolean;
  soundAlerts: boolean;
  leadTimes: {
    threeDaysBefore: boolean;
    oneDayBefore: boolean;
    sameDayMorning: boolean; // 08:00 AM
    dailyOverdue: boolean;
  };
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "20:00"
  quietHoursEnd: string; // "07:00"
}

export interface AppSettings {
  language: AppLanguage;
  activeAcademicYear: string; // e.g. "2026-27"
  schoolProfile: SchoolProfile;
  notifications: NotificationPreferences;
  role: UserRole;
  dataPrivacyAccepted: boolean;
  lastBackupDate?: string | null;
}

export interface DPDPPrinciple {
  key: string;
  titleHi: string;
  titleEn: string;
  sectionRef: string;
  descriptionHi: string;
  descriptionEn: string;
  icon: string;
}

export interface DPDPNoticeData {
  actName: string;
  year: number;
  lastUpdated: string;
  dataControllerRole: string; // e.g. सहायक अध्यापक (Data Fiduciary for classroom records)
  principles: DPDPPrinciple[];
  prohibitions: {
    titleHi: string;
    titleEn: string;
    items: string[];
  };
}

// Backup & Restore
export interface TeacherHubBackupMetadata {
  version: string;
  exportedAt: string;
  app: string;
  academicYear: string;
  schoolName: string;
  teacherName: string;
  role: UserRole;
  itemCounts: {
    tasks: number;
    duties: number;
    meetings: number;
    trainings: number;
    govtOrders: number;
    portals: number;
    classSections: number;
    attendanceRecords: number;
  };
}

export interface TeacherHubBackupData {
  meta: TeacherHubBackupMetadata;
  tasks: any[];
  duties: any[];
  meetings: any[];
  trainings: any[];
  govtOrders: any[];
  portals: any[];
  classSections: any[];
  attendanceRecords: any[];
  settings?: AppSettings;
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  meta?: TeacherHubBackupMetadata;
  taskCount?: number;
  classCount?: number;
  attendanceCount?: number;
  orderCount?: number;
}

// Sensitive Data Guards
export type ViolationType = 'aadhaar' | 'password' | 'secret_credential';

export interface SensitiveDataViolation {
  type: ViolationType;
  messageHi: string;
  messageEn: string;
  detectedPattern: string;
  matchedSnippet: string;
}

export interface SensitiveDataValidationResult {
  isValid: boolean;
  hasAadhaar: boolean;
  hasPassword: boolean;
  violations: SensitiveDataViolation[];
  errorSummaryHi: string;
  errorSummaryEn: string;
}
