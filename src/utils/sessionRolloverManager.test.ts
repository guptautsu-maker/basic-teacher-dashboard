import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateNextAcademicYear,
  getNextGrade,
  buildInitialPromotionPlan,
  bulkUpdatePromotionPlan,
  getCarryOverCandidates,
  executeAnnualRollover,
  checkRolloverReversibility,
  rollbackAnnualRollover,
  searchArchive,
  getDefaultNewYearChecklist,
  ROLLOVER_GRACE_PERIOD_DAYS,
} from './sessionRolloverManager';
import { ClassSection } from '../types/classSection';
import { Task } from './taskStatusSystem';
import { Duty } from '../types/duty';
import { PortalApp } from '../types/portalApp';
import { TrainingItem } from '../data/teacherHubSampleData';
import { RolloverArchive } from '../types/sessionRollover';

describe('Annual Session Rollover - Pure Business Logic', () => {
  // -------------------------------------------------------------
  // Step 1: Academic Year Calculation
  // -------------------------------------------------------------
  describe('1. Academic Year Calculation (Step 1)', () => {
    it('calculates next academic year for standard Indian formats', () => {
      assert.equal(calculateNextAcademicYear('2026-27'), '2027-28');
      assert.equal(calculateNextAcademicYear('2027-28'), '2028-29');
      assert.equal(calculateNextAcademicYear('2029-30'), '2030-31');
    });

    it('handles 4-digit end year format gracefully', () => {
      assert.equal(calculateNextAcademicYear('2026-2027'), '2027-2028');
    });

    it('falls back safely for unparseable input', () => {
      assert.equal(calculateNextAcademicYear('InvalidYear'), '2027-28');
    });
  });

  // -------------------------------------------------------------
  // Step 2: Student Promotion & Grade Progression
  // -------------------------------------------------------------
  describe('2. Student Promotion & Grade Progression (Step 2)', () => {
    it('increments primary school grades correctly', () => {
      const g1 = getNextGrade('कक्षा 1 (Class 1)', 5);
      assert.equal(g1.nextGrade, 'कक्षा 2 (Class 2)');
      assert.equal(g1.isGraduated, false);

      const g4 = getNextGrade('कक्षा 4 (Class 4)', 5);
      assert.equal(g4.nextGrade, 'कक्षा 5 (Class 5)');
      assert.equal(g4.isGraduated, false);
    });

    it('marks highest grade students as graduated/alumni', () => {
      const g5 = getNextGrade('कक्षा 5 (Class 5)', 5);
      assert.equal(g5.isGraduated, true);
      assert.match(g5.nextGrade, /उत्तीर्ण|Graduated/);

      const g8 = getNextGrade('Class 8', 8);
      assert.equal(g8.isGraduated, true);
    });

    it('builds initial student promotion list from class sections', () => {
      const mockClasses: ClassSection[] = [
        {
          id: 'cs-4a',
          grade: 'कक्षा 4 (Class 4)',
          section: 'A',
          subject: 'गणित',
          academicYear: '2026-27',
          timetableSlots: [],
          students: [
            { id: 'st-1', rollNumber: 1, name: 'अमित कुमार', gender: 'M', classSectionId: 'cs-4a' },
            { id: 'st-2', rollNumber: 2, name: 'प्रिया वर्मा', gender: 'F', classSectionId: 'cs-4a' },
          ],
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
        {
          id: 'cs-5a',
          grade: 'कक्षा 5 (Class 5)',
          section: 'A',
          subject: 'हिंदी',
          academicYear: '2026-27',
          timetableSlots: [],
          students: [
            { id: 'st-3', rollNumber: 1, name: 'विकास यादव', gender: 'M', classSectionId: 'cs-5a' },
          ],
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
      ];

      const plan = buildInitialPromotionPlan(mockClasses, 5);
      assert.equal(plan.length, 3);

      // Class 4 students promote to Class 5
      assert.equal(plan[0].toGrade, 'कक्षा 5 (Class 5)');
      assert.equal(plan[0].isPromoted, true);
      assert.equal(plan[0].isGraduated, false);

      // Class 5 student graduates
      assert.equal(plan[2].isGraduated, true);
      assert.equal(plan[2].isPromoted, true);
    });

    it('allows bulk modification to retain students or change section', () => {
      const plan = [
        {
          studentId: 'st-1',
          originalRollNumber: 1,
          name: 'अमित कुमार',
          fromClassSectionId: 'cs-4a',
          fromGrade: 'कक्षा 4 (Class 4)',
          fromSection: 'A',
          toGrade: 'कक्षा 5 (Class 5)',
          toSection: 'A',
          isPromoted: true,
          isGraduated: false,
        },
        {
          studentId: 'st-2',
          originalRollNumber: 2,
          name: 'प्रिया वर्मा',
          fromClassSectionId: 'cs-4a',
          fromGrade: 'कक्षा 4 (Class 4)',
          fromSection: 'A',
          toGrade: 'कक्षा 5 (Class 5)',
          toSection: 'A',
          isPromoted: true,
          isGraduated: false,
        },
      ];

      // Mark st-2 as retained in same class
      const updated = bulkUpdatePromotionPlan(plan, {
        fromClassSectionId: 'cs-4a',
        isPromoted: false,
      });

      assert.equal(updated[0].isPromoted, false);
      assert.equal(updated[0].toGrade, 'कक्षा 4 (Class 4)');
      assert.equal(updated[1].isPromoted, false);
      assert.equal(updated[1].toGrade, 'कक्षा 4 (Class 4)');
    });
  });

  // -------------------------------------------------------------
  // Step 3: Carry Over Candidates
  // -------------------------------------------------------------
  describe('3. Carry Over Candidates (Step 3)', () => {
    it('filters pending tasks excluding done, and filters recurring duties', () => {
      const mockTasks: Task[] = [
        {
          id: 't-1',
          title: 'डीबीटी सत्यापन',
          type: 'general',
          priority: 'urgent',
          status: 'in_progress',
          recurrence: 'none',
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
        {
          id: 't-2',
          title: 'यू-डायस डेटा प्रविष्टि',
          type: 'portal_entry',
          priority: 'high',
          status: 'done',
          recurrence: 'none',
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
      ];

      const mockDuties: Duty[] = [
        {
          id: 'd-1',
          dutyName: 'मध्याह्न भोजन पर्यवेक्षण',
          category: 'mdm',
          schedule: 'प्रतिदिन दोपहर',
          daysOfWeek: [1, 2],
          startDate: '2026-04-01',
          status: 'active',
          assignedTeacher: 'सुरेश कुमार',
          assignedBy: 'प्रधानाध्यापक',
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
        {
          id: 'd-2',
          dutyName: 'बीएलओ विशेष शिविर',
          category: 'election',
          schedule: 'विशेष दिवस',
          daysOfWeek: [],
          startDate: '2026-05-10',
          status: 'completed',
          assignedTeacher: 'सुरेश कुमार',
          assignedBy: 'एसडीएम',
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
      ];

      const mockPortals: PortalApp[] = [
        {
          id: 'p-1',
          name: 'प्रेरणा पोर्टल',
          url: 'https://prernaup.in',
          category: 'attendance',
          purpose: 'छात्र व शिक्षक उपस्थिति',
          neededForTask: 'दैनिक उपस्थिति अंकन',
        },
      ];

      const carryOver = getCarryOverCandidates(mockTasks, mockPortals, mockDuties);
      assert.equal(carryOver.pendingTasks.length, 1);
      assert.equal(carryOver.pendingTasks[0].id, 't-1');
      assert.equal(carryOver.recurringDuties.length, 1);
      assert.equal(carryOver.recurringDuties[0].id, 'd-1');
      assert.equal(carryOver.activePortals.length, 1);
    });
  });

  // -------------------------------------------------------------
  // Step 4: Rollover Execution & Archive Snapshot
  // -------------------------------------------------------------
  describe('4. Rollover Execution & Archive Snapshot (Step 4)', () => {
    it('executes rollover, forms new class sections, excludes graduated students, and builds archive', () => {
      const now = new Date('2026-04-01T10:00:00.000Z');

      const mockClasses: ClassSection[] = [
        {
          id: 'cs-4a',
          grade: 'कक्षा 4 (Class 4)',
          section: 'A',
          subject: 'गणित (Math)',
          academicYear: '2026-27',
          timetableSlots: [],
          students: [
            { id: 'st-1', rollNumber: 1, name: 'अमित कुमार', gender: 'M', classSectionId: 'cs-4a' },
          ],
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
        {
          id: 'cs-5a',
          grade: 'कक्षा 5 (Class 5)',
          section: 'A',
          subject: 'हिंदी (Hindi)',
          academicYear: '2026-27',
          timetableSlots: [],
          students: [
            { id: 'st-grad', rollNumber: 1, name: 'राहुल यादव', gender: 'M', classSectionId: 'cs-5a' },
          ],
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
      ];

      const plan = buildInitialPromotionPlan(mockClasses, 5);

      const mockTasks: Task[] = [
        {
          id: 't-1',
          title: 'पेंडिंग कार्य',
          type: 'general',
          priority: 'high',
          status: 'in_progress',
          recurrence: 'none',
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
      ];

      const mockDuties: Duty[] = [
        {
          id: 'd-1',
          dutyName: 'एमडीएम ड्यूटी',
          category: 'mdm',
          schedule: 'सोमवार',
          daysOfWeek: [1],
          startDate: '2026-04-01',
          status: 'active',
          assignedTeacher: 'शिक्षक',
          assignedBy: 'एचएम',
          createdAt: '2026-04-01',
          updatedAt: '2026-04-01',
        },
      ];

      const mockPortals: PortalApp[] = [
        {
          id: 'p-1',
          name: 'दीक्षा',
          url: 'https://diksha.gov.in',
          category: 'training',
          purpose: 'प्रशिक्षण',
          neededForTask: 'शिक्षक प्रशिक्षण',
        },
      ];

      const res = executeAnnualRollover({
        currentAcademicYear: '2026-27',
        targetAcademicYear: '2027-28',
        promotionItems: plan,
        currentClassSections: mockClasses,
        currentAttendanceRecords: [],
        currentTasks: mockTasks,
        currentDuties: mockDuties,
        currentPortals: mockPortals,
        currentTrainings: [],
        carryOver: {
          taskIds: ['t-1'],
          dutyIds: ['d-1'],
          portalIds: ['p-1'],
        },
        now,
      });

      // Verification
      assert.equal(res.promotedStudentsCount, 1);
      assert.equal(res.graduatedStudentsCount, 1);
      assert.equal(res.retainedStudentsCount, 0);

      // New classes should contain Amit Kumar in Class 5, and Rahul is graduated (not in active class)
      assert.equal(res.newClassSections.length, 1);
      assert.equal(res.newClassSections[0].grade, 'कक्षा 5 (Class 5)');
      assert.equal(res.newClassSections[0].students.length, 1);
      assert.equal(res.newClassSections[0].students[0].name, 'अमित कुमार');
      assert.equal(res.newClassSections[0].students[0].rollNumber, 1); // Re-indexed

      // Carried tasks and duties
      assert.equal(res.newTasks.length, 1);
      assert.match(res.newTasks[0].source || '', /Carried from 2026-27/);
      assert.equal(res.newDuties.length, 1);
      assert.equal(res.newPortals.length, 1);

      // Archive checks
      assert.equal(res.archive.fromAcademicYear, '2026-27');
      assert.equal(res.archive.toAcademicYear, '2027-28');
      assert.equal(res.archive.archivedClassSections.length, 2);
      assert.equal(res.archive.isManuallyLocked, false);

      // Lock date must be exactly 7 days later
      const lockTime = new Date(res.archive.lockDate).getTime();
      const expectedLock = now.getTime() + ROLLOVER_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
      assert.equal(lockTime, expectedLock);
    });
  });

  // -------------------------------------------------------------
  // Step 4 (cont): 7-Day Reversibility & Rollback
  // -------------------------------------------------------------
  describe('5. 7-Day Reversibility & Rollback Engine', () => {
    it('allows rollback within 7 days', () => {
      const rolloverTime = new Date('2026-04-01T10:00:00.000Z');
      const lockDate = new Date(rolloverTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const archive = {
        id: 'arch-1',
        fromAcademicYear: '2026-27',
        toAcademicYear: '2027-28',
        rolloverDate: rolloverTime.toISOString(),
        lockDate,
        isManuallyLocked: false,
        archivedClassSections: [],
        archivedAttendanceRecords: [],
        archivedTasks: [],
        archivedDuties: [],
        archivedPortals: [],
        archivedTrainings: [],
        promotedStudentsCount: 10,
        retainedStudentsCount: 0,
        graduatedStudentsCount: 5,
        carriedTasksCount: 2,
        carriedDutiesCount: 1,
        carriedPortalsCount: 3,
      };

      // Check on Day 3 (still within 7 days)
      const day3 = new Date('2026-04-04T10:00:00.000Z');
      const statusDay3 = checkRolloverReversibility(archive, day3);
      assert.equal(statusDay3.canRollback, true);
      assert.equal(statusDay3.isLocked, false);
      assert.equal(statusDay3.daysRemaining, 4);

      const rollbackRes = rollbackAnnualRollover(archive, day3);
      assert.equal(rollbackRes.success, true);
      assert.equal(rollbackRes.restoredAcademicYear, '2026-27');
    });

    it('denies rollback after 7 days have elapsed', () => {
      const rolloverTime = new Date('2026-04-01T10:00:00.000Z');
      const lockDate = new Date(rolloverTime.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const archive = {
        id: 'arch-1',
        fromAcademicYear: '2026-27',
        toAcademicYear: '2027-28',
        rolloverDate: rolloverTime.toISOString(),
        lockDate,
        isManuallyLocked: false,
        archivedClassSections: [],
        archivedAttendanceRecords: [],
        archivedTasks: [],
        archivedDuties: [],
        archivedPortals: [],
        archivedTrainings: [],
        promotedStudentsCount: 10,
        retainedStudentsCount: 0,
        graduatedStudentsCount: 5,
        carriedTasksCount: 2,
        carriedDutiesCount: 1,
        carriedPortalsCount: 3,
      };

      // Check on Day 8 (expired)
      const day8 = new Date('2026-04-09T10:00:00.000Z');
      const statusDay8 = checkRolloverReversibility(archive, day8);
      assert.equal(statusDay8.canRollback, false);
      assert.equal(statusDay8.isExpired, true);

      const rollbackRes = rollbackAnnualRollover(archive, day8);
      assert.equal(rollbackRes.success, false);
      assert.match(rollbackRes.error || '', /समाप्त/);
    });

    it('denies rollback if manually locked by teacher', () => {
      const archive = {
        id: 'arch-1',
        fromAcademicYear: '2026-27',
        toAcademicYear: '2027-28',
        rolloverDate: new Date().toISOString(),
        lockDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        isManuallyLocked: true, // Teacher clicked final lock
        archivedClassSections: [],
        archivedAttendanceRecords: [],
        archivedTasks: [],
        archivedDuties: [],
        archivedPortals: [],
        archivedTrainings: [],
        promotedStudentsCount: 10,
        retainedStudentsCount: 0,
        graduatedStudentsCount: 5,
        carriedTasksCount: 2,
        carriedDutiesCount: 1,
        carriedPortalsCount: 3,
      };

      const status = checkRolloverReversibility(archive, new Date());
      assert.equal(status.canRollback, false);
      assert.equal(status.isLocked, true);
    });
  });

  // -------------------------------------------------------------
  // Step 4 (cont): Search in Archive
  // -------------------------------------------------------------
  describe('6. Archive Search (Step 4)', () => {
    it('searches students by name and roll number in archived session', () => {
      const archive: RolloverArchive = {
        id: 'arch-1',
        fromAcademicYear: '2025-26',
        toAcademicYear: '2026-27',
        rolloverDate: '2026-04-01T10:00:00.000Z',
        lockDate: '2026-04-08T10:00:00.000Z',
        isManuallyLocked: true,
        archivedClassSections: [
          {
            id: 'cs-4a',
            grade: 'कक्षा 4',
            section: 'A',
            subject: 'गणित',
            academicYear: '2025-26',
            timetableSlots: [],
            students: [
              { id: 'st-1', rollNumber: 1, name: 'अमित कुमार', gender: 'M' as const, classSectionId: 'cs-4a' },
              { id: 'st-2', rollNumber: 2, name: 'प्रिया वर्मा', gender: 'F' as const, classSectionId: 'cs-4a' },
            ],
            createdAt: '2025-04-01',
            updatedAt: '2025-04-01',
          },
        ],
        archivedAttendanceRecords: [],
        archivedTasks: [
          {
            id: 't-1',
            title: 'यू-डायस प्लस डेटा वेरिफिकेशन',
            type: 'portal_entry',
            priority: 'urgent',
            status: 'done',
            recurrence: 'none',
            createdAt: '2025-04-01',
            updatedAt: '2025-04-01',
          },
        ],
        archivedDuties: [],
        archivedPortals: [],
        archivedTrainings: [],
        promotedStudentsCount: 2,
        retainedStudentsCount: 0,
        graduatedStudentsCount: 0,
        carriedTasksCount: 0,
        carriedDutiesCount: 0,
        carriedPortalsCount: 0,
      };

      // Search student name
      const searchRes1 = searchArchive(archive, 'प्रिया');
      assert.equal(searchRes1.matchedStudents.length, 1);
      assert.equal(searchRes1.matchedStudents[0].student.name, 'प्रिया वर्मा');

      // Search roll number
      const searchRes2 = searchArchive(archive, '1');
      assert.equal(searchRes2.matchedStudents.length, 1);
      assert.equal(searchRes2.matchedStudents[0].student.name, 'अमित कुमार');

      // Search task title
      const searchRes3 = searchArchive(archive, 'यू-डायस');
      assert.equal(searchRes3.matchedTasks.length, 1);
    });
  });

  // -------------------------------------------------------------
  // Step 5: New Year Checklist
  // -------------------------------------------------------------
  describe('7. New Year Checklist (Step 5)', () => {
    it('provides comprehensive default checklist items for primary teachers', () => {
      const checklist = getDefaultNewYearChecklist();
      assert.ok(checklist.length >= 6);

      const categories = new Set(checklist.map((c) => c.category));
      assert.ok(categories.has('students'));
      assert.ok(categories.has('academic'));
      assert.ok(categories.has('mdm'));
      assert.ok(categories.has('dbt'));
      assert.ok(categories.has('training'));
      assert.ok(categories.has('smc'));
    });
  });
});
