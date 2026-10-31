/**
 * Teacher Hub - Annual Session Rollover Pure Business Logic
 * Covers Steps 1 to 5:
 * 1. Academic Year selection & derivation
 * 2. Student Promotion & Class Section Progression
 * 3. Carry-over of pending tasks, portals, and recurring duties
 * 4. Read-only Archiving & Search
 * 5. New Year Setup Checklist
 * 6. 7-Day Reversible Rollback Engine
 */

import { ClassSection, Student, AttendanceRecord } from '../types/classSection';
import { Task } from './taskStatusSystem';
import { Duty } from '../types/duty';
import { PortalApp } from '../types/portalApp';
import { TrainingItem } from '../data/teacherHubSampleData';
import {
  StudentPromotionItem,
  CarryOverSelections,
  NewYearChecklistItem,
  RolloverArchive,
  ArchiveSearchResult,
} from '../types/sessionRollover';

export const ROLLOVER_GRACE_PERIOD_DAYS = 7;

/**
 * Step 1: Suggest next academic year from current (e.g. "2026-27" -> "2027-28")
 */
export function calculateNextAcademicYear(currentYear: string): string {
  const match = currentYear.match(/^(\d{4})-(\d{2,4})$/);
  if (!match) {
    const currentNum = parseInt(currentYear, 10);
    if (!isNaN(currentNum)) {
      return `${currentNum + 1}-${String(currentNum + 2).slice(-2)}`;
    }
    return '2027-28';
  }

  const startYear = parseInt(match[1], 10);
  const endYearPart = match[2];
  const nextStart = startYear + 1;

  if (endYearPart.length === 2) {
    const nextEnd = (parseInt(endYearPart, 10) + 1) % 100;
    return `${nextStart}-${String(nextEnd).padStart(2, '0')}`;
  } else {
    const nextEnd = parseInt(endYearPart, 10) + 1;
    return `${nextStart}-${nextEnd}`;
  }
}

/**
 * Step 2: Determine next grade for primary / upper-primary education
 * Standard Indian Basic School grades:
 * Primary: Class 1 -> 2 -> 3 -> 4 -> 5 -> Alumni (उत्तीर्ण / Graduated)
 * Upper Primary: Class 6 -> 7 -> 8 -> Alumni (उत्तीर्ण / Graduated)
 */
export function getNextGrade(
  currentGrade: string,
  maxPrimaryGrade = 5
): { nextGrade: string; isGraduated: boolean } {
  const match = currentGrade.match(/(\d+)/);
  if (!match) {
    return { nextGrade: `${currentGrade} (Promoted)`, isGraduated: false };
  }

  const gradeNum = parseInt(match[1], 10);
  if (gradeNum >= maxPrimaryGrade) {
    return {
      nextGrade: `उत्तीर्ण (Graduated / Class ${gradeNum} Passed)`,
      isGraduated: true,
    };
  }

  const nextGradeNum = gradeNum + 1;
  return {
    nextGrade: `कक्षा ${nextGradeNum} (Class ${nextGradeNum})`,
    isGraduated: false,
  };
}

/**
 * Build initial student promotion list from current class sections
 */
export function buildInitialPromotionPlan(
  classSections: ClassSection[],
  maxPrimaryGrade = 5
): StudentPromotionItem[] {
  const items: StudentPromotionItem[] = [];

  for (const cs of classSections) {
    const nextGradeInfo = getNextGrade(cs.grade, maxPrimaryGrade);

    for (const student of cs.students) {
      items.push({
        studentId: student.id,
        originalRollNumber: student.rollNumber,
        name: student.name,
        gender: student.gender,
        fromClassSectionId: cs.id,
        fromGrade: cs.grade,
        fromSection: cs.section,
        toGrade: nextGradeInfo.isGraduated ? nextGradeInfo.nextGrade : nextGradeInfo.nextGrade,
        toSection: cs.section,
        isPromoted: true,
        isGraduated: nextGradeInfo.isGraduated,
      });
    }
  }

  return items;
}

/**
 * Bulk modify student promotions (e.g. promote all, retain all, change section)
 */
export function bulkUpdatePromotionPlan(
  items: StudentPromotionItem[],
  options: {
    fromClassSectionId?: string | 'all';
    isPromoted?: boolean;
    toSection?: string;
  }
): StudentPromotionItem[] {
  return items.map((item) => {
    if (
      options.fromClassSectionId &&
      options.fromClassSectionId !== 'all' &&
      item.fromClassSectionId !== options.fromClassSectionId
    ) {
      return item;
    }

    const updated = { ...item };

    if (options.isPromoted !== undefined) {
      updated.isPromoted = options.isPromoted;
      if (!options.isPromoted) {
        // Retained: keep in current grade
        updated.toGrade = item.fromGrade;
        updated.isGraduated = false;
      } else {
        // Promoted
        const nextGradeInfo = getNextGrade(item.fromGrade);
        updated.toGrade = nextGradeInfo.nextGrade;
        updated.isGraduated = nextGradeInfo.isGraduated;
      }
    }

    if (options.toSection !== undefined) {
      updated.toSection = options.toSection;
    }

    return updated;
  });
}

/**
 * Step 3: Filter carry-over candidates
 */
export function getCarryOverCandidates(
  tasks: Task[],
  portals: PortalApp[],
  duties: Duty[]
): {
  pendingTasks: Task[];
  activePortals: PortalApp[];
  recurringDuties: Duty[];
} {
  const pendingTasks = tasks.filter((t) => t.status !== 'done');
  const activePortals = portals;
  const recurringDuties = duties.filter(
    (d) => d.status === 'active' && Array.isArray(d.daysOfWeek) && d.daysOfWeek.length > 0
  );

  return {
    pendingTasks,
    activePortals,
    recurringDuties,
  };
}

/**
 * Step 4 & Execution: Execute Annual Session Rollover
 */
export interface ExecuteRolloverParams {
  currentAcademicYear: string;
  targetAcademicYear: string;
  promotionItems: StudentPromotionItem[];
  currentClassSections: ClassSection[];
  currentAttendanceRecords: AttendanceRecord[];
  currentTasks: Task[];
  currentDuties: Duty[];
  currentPortals: PortalApp[];
  currentTrainings: TrainingItem[];
  carryOver: CarryOverSelections;
  now?: Date;
  notes?: string;
}

export interface ExecuteRolloverResult {
  newClassSections: ClassSection[];
  newAttendanceRecords: AttendanceRecord[];
  newTasks: Task[];
  newDuties: Duty[];
  newPortals: PortalApp[];
  archive: RolloverArchive;
  graduatedStudentsCount: number;
  promotedStudentsCount: number;
  retainedStudentsCount: number;
}

export function executeAnnualRollover(params: ExecuteRolloverParams): ExecuteRolloverResult {
  const now = params.now || new Date();
  const rolloverDate = now.toISOString();
  const lockDate = new Date(now.getTime() + ROLLOVER_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 1. Group promoted/retained students into new class sections
  let promotedCount = 0;
  let retainedCount = 0;
  let graduatedCount = 0;

  // Map of `${toGrade}_${toSection}` -> students
  const classBuckets = new Map<
    string,
    {
      grade: string;
      section: string;
      students: Student[];
    }
  >();

  // Helper to get or create class bucket
  for (const item of params.promotionItems) {
    if (item.isGraduated && item.isPromoted) {
      graduatedCount++;
      continue; // Graduated students are archived and not placed into active enrolled classes
    }

    if (item.isPromoted) {
      promotedCount++;
    } else {
      retainedCount++;
    }

    const targetGrade = item.toGrade;
    const targetSection = item.toSection || 'A';
    const key = `${targetGrade}__${targetSection}`;

    if (!classBuckets.has(key)) {
      classBuckets.set(key, {
        grade: targetGrade,
        section: targetSection,
        students: [],
      });
    }

    const bucket = classBuckets.get(key)!;
    bucket.students.push({
      id: item.studentId,
      rollNumber: bucket.students.length + 1, // Fresh roll numbers for new year (1, 2, 3...)
      name: item.name,
      gender: item.gender,
      classSectionId: '', // populated below
    });
  }

  // 2. Build new ClassSection array
  const newClassSections: ClassSection[] = [];
  let index = 1;

  for (const [key, bucket] of classBuckets.entries()) {
    const classId = `cs-${params.targetAcademicYear}-${index++}`;

    // Look for previous timetable slots or subject template if matching
    const matchingOld = params.currentClassSections.find(
      (c) => c.grade === bucket.grade && c.section === bucket.section
    ) || params.currentClassSections[0];

    const studentsWithId = bucket.students.map((st) => ({
      ...st,
      classSectionId: classId,
    }));

    newClassSections.push({
      id: classId,
      grade: bucket.grade,
      section: bucket.section,
      subject: matchingOld ? matchingOld.subject : 'सामान्य (General)',
      academicYear: params.targetAcademicYear,
      timetableSlots: matchingOld ? matchingOld.timetableSlots : [],
      roomNumber: matchingOld ? matchingOld.roomNumber : `कक्ष ${index}`,
      classTeacher: matchingOld ? matchingOld.classTeacher : 'कक्षाध्यापक',
      students: studentsWithId,
      createdAt: rolloverDate,
      updatedAt: rolloverDate,
    });
  }

  // If no students left (e.g. all graduated), preserve structure with empty classes
  if (newClassSections.length === 0 && params.currentClassSections.length > 0) {
    for (const oldCs of params.currentClassSections) {
      newClassSections.push({
        ...oldCs,
        id: `cs-${params.targetAcademicYear}-${oldCs.id}`,
        academicYear: params.targetAcademicYear,
        students: [],
        createdAt: rolloverDate,
        updatedAt: rolloverDate,
      });
    }
  }

  // 3. New Attendance Records are clean for new year
  const newAttendanceRecords: AttendanceRecord[] = [];

  // 4. Carry over selected pending tasks
  const carriedTaskIds = new Set(params.carryOver.taskIds);
  const newTasks: Task[] = params.currentTasks
    .filter((t) => carriedTaskIds.has(t.id))
    .map((t) => ({
      ...t,
      id: `task-carried-${t.id}`,
      createdAt: rolloverDate,
      updatedAt: rolloverDate,
      source: `${t.source || 'General'} (Carried from ${params.currentAcademicYear})`,
    }));

  // 5. Carry over selected portals
  const carriedPortalIds = new Set(params.carryOver.portalIds);
  const newPortals: PortalApp[] = params.currentPortals.filter((p) =>
    carriedPortalIds.has(p.id)
  );

  // 6. Carry over selected recurring duties
  const carriedDutyIds = new Set(params.carryOver.dutyIds);
  const newDuties: Duty[] = params.currentDuties
    .filter((d) => carriedDutyIds.has(d.id))
    .map((d) => ({
      ...d,
      id: `duty-carried-${d.id}`,
      startDate: rolloverDate.split('T')[0],
      updatedAt: rolloverDate,
    }));

  // 7. Assemble Archive snapshot
  const archive: RolloverArchive = {
    id: `archive-${params.currentAcademicYear}-${Date.now()}`,
    fromAcademicYear: params.currentAcademicYear,
    toAcademicYear: params.targetAcademicYear,
    rolloverDate,
    lockDate,
    isManuallyLocked: false,
    archivedClassSections: params.currentClassSections,
    archivedAttendanceRecords: params.currentAttendanceRecords,
    archivedTasks: params.currentTasks,
    archivedDuties: params.currentDuties,
    archivedPortals: params.currentPortals,
    archivedTrainings: params.currentTrainings,
    promotedStudentsCount: promotedCount,
    retainedStudentsCount: retainedCount,
    graduatedStudentsCount: graduatedCount,
    carriedTasksCount: newTasks.length,
    carriedDutiesCount: newDuties.length,
    carriedPortalsCount: newPortals.length,
    notes: params.notes,
  };

  return {
    newClassSections,
    newAttendanceRecords,
    newTasks,
    newDuties,
    newPortals,
    archive,
    graduatedStudentsCount: graduatedCount,
    promotedStudentsCount: promotedCount,
    retainedStudentsCount: retainedCount,
  };
}

/**
 * 7-Day Reversibility Checker
 */
export function checkRolloverReversibility(
  archive: RolloverArchive | null,
  now = new Date()
): {
  canRollback: boolean;
  isExpired: boolean;
  isLocked: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  formattedRemaining: string;
} {
  if (!archive) {
    return {
      canRollback: false,
      isExpired: false,
      isLocked: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedRemaining: 'कोई रोलओवर सक्रिय नहीं है',
    };
  }

  if (archive.isManuallyLocked) {
    return {
      canRollback: false,
      isExpired: false,
      isLocked: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedRemaining: 'अंतिम लॉक कर दिया गया है (Permanently Locked)',
    };
  }

  const lockTime = new Date(archive.lockDate).getTime();
  const currentTime = now.getTime();
  const diffMs = lockTime - currentTime;

  if (diffMs <= 0) {
    return {
      canRollback: false,
      isExpired: true,
      isLocked: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      formattedRemaining: '7-दिवसीय समय सीमा समाप्त (Expired)',
    };
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return {
    canRollback: true,
    isExpired: false,
    isLocked: false,
    daysRemaining: days,
    hoursRemaining: hours,
    formattedRemaining: `${days} दिन ${hours} घंटे शेष (पूर्ववत करने योग्य)`,
  };
}

/**
 * Rollback Session Rollover (Revert back to archived year)
 */
export function rollbackAnnualRollover(
  archive: RolloverArchive,
  now = new Date()
): {
  success: boolean;
  error?: string;
  restoredClassSections?: ClassSection[];
  restoredAttendanceRecords?: AttendanceRecord[];
  restoredTasks?: Task[];
  restoredDuties?: Duty[];
  restoredPortals?: PortalApp[];
  restoredTrainings?: TrainingItem[];
  restoredAcademicYear?: string;
} {
  const reversibility = checkRolloverReversibility(archive, now);
  if (!reversibility.canRollback) {
    return {
      success: false,
      error: archive.isManuallyLocked
        ? 'यह सत्र स्थायी रूप से लॉक कर दिया गया है और इसे पूर्ववत नहीं किया जा सकता।'
        : '7 दिनों की पूर्ववत (Rollback) अनुमेय अवधि समाप्त हो चुकी है।',
    };
  }

  return {
    success: true,
    restoredClassSections: archive.archivedClassSections,
    restoredAttendanceRecords: archive.archivedAttendanceRecords,
    restoredTasks: archive.archivedTasks,
    restoredDuties: archive.archivedDuties,
    restoredPortals: archive.archivedPortals,
    restoredTrainings: archive.archivedTrainings,
    restoredAcademicYear: archive.fromAcademicYear,
  };
}

/**
 * Step 4: Search archived session (read-only search)
 */
export function searchArchive(
  archive: RolloverArchive,
  rawQuery: string
): ArchiveSearchResult {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return {
      query: '',
      matchedStudents: [],
      matchedClasses: archive.archivedClassSections,
      matchedTasks: archive.archivedTasks,
    };
  }

  const matchedStudents: ArchiveSearchResult['matchedStudents'] = [];

  for (const cs of archive.archivedClassSections) {
    for (const student of cs.students) {
      if (
        student.name.toLowerCase().includes(query) ||
        String(student.rollNumber) === query ||
        cs.grade.toLowerCase().includes(query)
      ) {
        matchedStudents.push({
          student,
          classGrade: cs.grade,
          section: cs.section,
          academicYear: archive.fromAcademicYear,
        });
      }
    }
  }

  const matchedClasses = archive.archivedClassSections.filter(
    (cs) =>
      cs.grade.toLowerCase().includes(query) ||
      cs.subject.toLowerCase().includes(query) ||
      cs.section.toLowerCase().includes(query)
  );

  const matchedTasks = archive.archivedTasks.filter(
    (t) =>
      t.title.toLowerCase().includes(query) ||
      (t.source && t.source.toLowerCase().includes(query))
  );

  return {
    query: rawQuery,
    matchedStudents,
    matchedClasses,
    matchedTasks,
  };
}

/**
 * Step 5: Default Checklist items for the new academic year
 */
export function getDefaultNewYearChecklist(): NewYearChecklistItem[] {
  return [
    {
      id: 'chk-enrollment',
      titleHi: 'नवीन छात्र नामांकन व प्रेरणा पोर्टल प्रविष्टि',
      titleEn: 'New Student Enrollment & Portal Entry (Prerna/UDISE+)',
      category: 'students',
      isCompleted: false,
      priority: 'high',
      note: 'कक्षा 1 के नए दाखिले व अन्य कक्षाओं की टीसी प्रविष्टि',
    },
    {
      id: 'chk-timetable',
      titleHi: 'नए सत्र की विषय व कालांश समय-सारिणी निर्धारण',
      titleEn: 'Create New Academic Timetable & Teacher Periods',
      category: 'academic',
      isCompleted: false,
      priority: 'high',
      note: 'कालांश 1 से 8 तक का नया रोस्टर व अध्यापक आवंटन',
    },
    {
      id: 'chk-textbooks',
      titleHi: 'निःशुल्क पाठ्यपुस्तक व कार्यपुस्तिका वितरण एवं रजिस्टर',
      titleEn: 'Free Textbook & Workbook Distribution Register',
      category: 'academic',
      isCompleted: false,
      priority: 'high',
      note: 'छात्र-वार पुस्तक प्राप्ति व वितरण पंजी का अद्यतनीकरण',
    },
    {
      id: 'chk-mdm-register',
      titleHi: 'मध्याह्न भोजन (MDM) नवीन सत्र पंजिका आरंभ',
      titleEn: 'Start New Mid-Day Meal Register & Stock Entry',
      category: 'mdm',
      isCompleted: false,
      priority: 'high',
      note: 'छात्र संख्या, मीनू चार्ट व खाद्यान्न स्टॉक का नया रजिस्टर',
    },
    {
      id: 'chk-dbt-verification',
      titleHi: 'डीबीटी (DBT) छात्र आधार व अभिभावक बैंक खाता सत्यापन',
      titleEn: 'DBT Student Aadhaar & Guardian Bank Account Verification',
      category: 'dbt',
      isCompleted: false,
      priority: 'high',
      note: 'यूनिफॉर्म, स्वेटर, बैग, जूता-मोजा डीबीटी सत्यापन',
    },
    {
      id: 'chk-smc-meeting',
      titleHi: 'विद्यालय प्रबंध समिति (SMC) प्रथम बैठक व कार्ययोजना',
      titleEn: 'School Management Committee (SMC) 1st Meeting',
      category: 'smc',
      isCompleted: false,
      priority: 'medium',
      note: 'नवीन सत्र विद्यालय विकास योजना (SDP) अनुमोदन',
    },
    {
      id: 'chk-training-plan',
      titleHi: 'दीक्षा/निष्ठा 50 घंटे अनिवार्य सतत प्रशिक्षण (CPD) योजना',
      titleEn: 'Annual 50-Hour Teacher Training CPD Plan (DIKSHA)',
      category: 'training',
      isCompleted: false,
      priority: 'medium',
      note: 'वार्षिक प्रशिक्षण कैलेंडर व मासिक मॉड्यूल लक्ष्य',
    },
  ];
}
