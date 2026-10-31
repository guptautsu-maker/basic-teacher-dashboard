import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTrainingProgress,
  getTrainingDeadlineInfo,
  updateTrainingProgress,
  attachTrainingCertificate,
  filterTrainings,
  isDutyActiveOnDate,
  getWeeklyDutyRoster,
  filterDuties,
  getSampleTrainings,
  getSampleDuties,
} from './trainingsAndDutiesManager';
import { Training } from '../types/training';
import { Duty } from '../types/duty';

describe('Trainings & Duties Manager - Pure Business Logic', () => {
  const baseNow = new Date('2026-10-31T10:00:00.000Z');

  describe('Trainings Progress & Deadline Calculation', () => {
    it('calculates progress percentage clamped between 0 and 100', () => {
      assert.equal(calculateTrainingProgress(0, 10), 0);
      assert.equal(calculateTrainingProgress(6, 12), 50);
      assert.equal(calculateTrainingProgress(10, 10), 100);
      assert.equal(calculateTrainingProgress(15, 10), 100); // capped at 100
      assert.equal(calculateTrainingProgress(-2, 10), 0); // floor at 0
      assert.equal(calculateTrainingProgress(5, 0), 0); // division by zero safe
    });

    it('identifies trainings nearing deadline (within 3 days)', () => {
      // Due in 2 days
      const dueIn2Days = '2026-11-02';
      const info = getTrainingDeadlineInfo(dueIn2Days, baseNow, 3);
      assert.equal(info.isNearingDeadline, true);
      assert.equal(info.isOverdue, false);
      assert.equal(info.daysRemaining, 2);
      assert.ok(info.badgeLabelHi.includes('2 दिन शेष'));
    });

    it('identifies trainings due today', () => {
      const dueToday = '2026-10-31';
      const info = getTrainingDeadlineInfo(dueToday, baseNow, 3);
      assert.equal(info.isNearingDeadline, true);
      assert.equal(info.daysRemaining, 0);
      assert.ok(info.badgeLabelHi.includes('आज'));
    });

    it('identifies overdue trainings', () => {
      const overdueDate = '2026-10-28';
      const info = getTrainingDeadlineInfo(overdueDate, baseNow, 3);
      assert.equal(info.isOverdue, true);
      assert.equal(info.isNearingDeadline, false);
      assert.ok(info.daysRemaining < 0);
      assert.ok(info.badgeLabelHi.includes('समाप्त'));
    });

    it('identifies comfortably scheduled trainings (more than 3 days left)', () => {
      const futureDate = '2026-11-15';
      const info = getTrainingDeadlineInfo(futureDate, baseNow, 3);
      assert.equal(info.isNearingDeadline, false);
      assert.equal(info.isOverdue, false);
      assert.equal(info.daysRemaining, 15);
    });

    it('auto-transitions training status based on completed hours', () => {
      const dummyTraining: Training = {
        id: 'tr-1',
        name: 'FLN 3.0',
        provider: 'DIKSHA',
        totalHours: 10,
        completedHours: 0,
        dueDate: '2026-11-10',
        status: 'not_started',
        certificateRequired: true,
        createdAt: '2026-10-31',
        updatedAt: '2026-10-31',
      };

      // In progress
      const inProg = updateTrainingProgress(dummyTraining, 4);
      assert.equal(inProg.completedHours, 4);
      assert.equal(inProg.status, 'in_progress');

      // Fully completed
      const done = updateTrainingProgress(dummyTraining, 10);
      assert.equal(done.completedHours, 10);
      assert.equal(done.status, 'completed');
    });

    it('attaches certificate and marks training completed', () => {
      const dummyTraining: Training = {
        id: 'tr-1',
        name: 'NISHTHA 4.0',
        provider: 'SCERT',
        totalHours: 8,
        completedHours: 4,
        dueDate: '2026-11-10',
        status: 'in_progress',
        certificateRequired: true,
        createdAt: '2026-10-31',
        updatedAt: '2026-10-31',
      };

      const updated = attachTrainingCertificate(
        dummyTraining,
        {
          name: 'Nishtha_Certificate.pdf',
          size: '850 KB',
          uploadedAt: '31 Oct 2026',
        },
        true
      );

      assert.equal(updated.status, 'completed');
      assert.equal(updated.completedHours, 8);
      assert.equal(updated.certificate?.name, 'Nishtha_Certificate.pdf');
    });

    it('filters trainings by status and nearing deadline', () => {
      const samples = getSampleTrainings(baseNow);

      const nearing = filterTrainings(samples, { status: 'nearing_deadline', now: baseNow });
      assert.ok(nearing.length > 0);

      const completed = filterTrainings(samples, { status: 'completed', now: baseNow });
      assert.ok(completed.every((t) => t.status === 'completed'));
    });
  });

  describe('Duties Module & Weekly Roster', () => {
    const dummyDuty: Duty = {
      id: 'duty-test-1',
      dutyName: 'मध्याह्न भोजन (MDM) पर्यवेक्षण',
      category: 'mdm',
      schedule: 'प्रतिदिन 12:30 PM - 01:15 PM',
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
      startDate: '2026-10-01',
      endDate: '2026-11-30',
      assignedBy: 'प्रधानाध्यापक',
      status: 'active',
      assignedTeacher: 'सुरेश कुमार',
      createdAt: '2026-10-31',
      updatedAt: '2026-10-31',
    };

    it('checks if a duty is active on a specific date', () => {
      // 2026-11-02 is a Monday (day 1)
      const monday = new Date('2026-11-02T10:00:00Z');
      assert.equal(isDutyActiveOnDate(dummyDuty, monday), true);

      // 2026-11-08 is a Sunday (day 0)
      const sunday = new Date('2026-11-08T10:00:00Z');
      assert.equal(isDutyActiveOnDate(dummyDuty, sunday), false);

      // Past end date
      const afterEndDate = new Date('2026-12-05T10:00:00Z');
      assert.equal(isDutyActiveOnDate(dummyDuty, afterEndDate), false);
    });

    it('generates a 6-day weekly roster (Monday to Saturday)', () => {
      const sampleDuties = getSampleDuties(baseNow);
      const roster = getWeeklyDutyRoster(sampleDuties, baseNow);

      assert.equal(roster.length, 6);
      assert.equal(roster[0].dayNameHi, 'सोमवार');
      assert.equal(roster[5].dayNameHi, 'शनिवार');

      // MDM duty should appear on all 6 school days
      roster.forEach((day) => {
        assert.ok(day.duties.some((d) => d.category === 'mdm'));
      });

      // Library duty (Wed & Fri) should be present on Wed and Fri
      const wednesday = roster.find((d) => d.dayOfWeek === 3);
      const friday = roster.find((d) => d.dayOfWeek === 5);
      const monday = roster.find((d) => d.dayOfWeek === 1);

      assert.ok(wednesday?.duties.some((d) => d.category === 'library'));
      assert.ok(friday?.duties.some((d) => d.category === 'library'));
      assert.equal(monday?.duties.some((d) => d.category === 'library'), false);
    });

    it('filters duties by category and status', () => {
      const sampleDuties = getSampleDuties(baseNow);

      const mdmDuties = filterDuties(sampleDuties, { category: 'mdm' });
      assert.ok(mdmDuties.every((d) => d.category === 'mdm'));

      const electionDuties = filterDuties(sampleDuties, { category: 'election' });
      assert.ok(electionDuties.every((d) => d.category === 'election'));
    });
  });
});
