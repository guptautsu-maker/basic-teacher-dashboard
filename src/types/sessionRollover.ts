/**
 * Teacher Hub - Annual Session Rollover Types
 * Designed for primary & upper-primary school teachers in India.
 */

import { ClassSection, Student, AttendanceRecord } from './classSection';
import { Task } from '../utils/taskStatusSystem';
import { Duty } from './duty';
import { PortalApp } from './portalApp';
import { TrainingItem } from '../data/teacherHubSampleData';

export interface StudentPromotionItem {
  studentId: string;
  originalRollNumber: number;
  name: string;
  gender?: 'M' | 'F' | 'O';
  fromClassSectionId: string;
  fromGrade: string;
  fromSection: string;
  toGrade: string;
  toSection: string;
  isPromoted: boolean; // true = promoted to next class; false = retained in same class
  isGraduated: boolean; // true if passing highest grade in school (e.g. Class 5 or Class 8)
  newRollNumber?: number;
}

export interface CarryOverSelections {
  taskIds: string[];
  portalIds: string[];
  dutyIds: string[];
}

export interface NewYearChecklistItem {
  id: string;
  titleHi: string;
  titleEn: string;
  category: 'students' | 'academic' | 'dbt' | 'training' | 'mdm' | 'smc' | 'other';
  isCompleted: boolean;
  priority: 'high' | 'medium' | 'low';
  note?: string;
  completedAt?: string;
}

export interface RolloverArchive {
  id: string;
  fromAcademicYear: string;
  toAcademicYear: string;
  rolloverDate: string; // ISO string
  lockDate: string; // ISO string (rolloverDate + 7 days)
  isManuallyLocked: boolean;
  archivedClassSections: ClassSection[];
  archivedAttendanceRecords: AttendanceRecord[];
  archivedTasks: Task[];
  archivedDuties: Duty[];
  archivedPortals: PortalApp[];
  archivedTrainings: TrainingItem[];
  promotedStudentsCount: number;
  retainedStudentsCount: number;
  graduatedStudentsCount: number;
  carriedTasksCount: number;
  carriedDutiesCount: number;
  carriedPortalsCount: number;
  notes?: string;
}

export interface RolloverState {
  currentAcademicYear: string;
  targetAcademicYear: string;
  lastRolloverArchive: RolloverArchive | null;
  archivesList: RolloverArchive[];
  newYearChecklist: NewYearChecklistItem[];
  activeStep: 1 | 2 | 3 | 4 | 5;
}

export interface ArchiveSearchResult {
  query: string;
  matchedStudents: Array<{
    student: Student;
    classGrade: string;
    section: string;
    academicYear: string;
  }>;
  matchedClasses: ClassSection[];
  matchedTasks: Task[];
}
