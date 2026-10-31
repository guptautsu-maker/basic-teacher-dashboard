import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Task,
  TaskStatus,
  RecurrenceFrequency,
  STATUS_METADATA,
  isTaskOverdue,
  calculateEffectiveStatus,
  calculateNextDeadline,
  changeTaskStatus,
  syncOverdueTasks,
  createNewTask,
} from './taskStatusSystem.js';

describe('Teacher Hub Task Status System', () => {
  const fixedNow = new Date('2026-11-05T10:00:00.000Z');
  let mockCounter = 0;
  const mockIdGen = (prefix = 'item') => `${prefix}_test_${++mockCounter}`;

  const sampleTask: Task = {
    id: 'task_001',
    title: 'UDISE+ Student Profile Updation',
    type: 'portal_entry',
    source: 'UDISE+',
    portalUrl: 'https://udiseplus.gov.in',
    deadline: '2026-11-05T09:00:00.000Z', // 1 hour past fixedNow
    priority: 'high',
    status: 'not_started',
    recurrence: 'none',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  };

  describe('1. Status Values & Metadata', () => {
    it('supports all 6 required statuses with English and Hindi labels', () => {
      const requiredStatuses: TaskStatus[] = [
        'not_started',
        'in_progress',
        'waiting_on_others',
        'done',
        'overdue',
        'blocked',
      ];

      for (const status of requiredStatuses) {
        const meta = STATUS_METADATA[status];
        assert.ok(meta, `Metadata should exist for status: ${status}`);
        assert.ok(meta.labelEn.length > 0, `English label missing for ${status}`);
        assert.ok(meta.labelHi.length > 0, `Hindi label missing for ${status}`);
        assert.ok(meta.icon.length > 0, `Icon missing for ${status}`);
      }
    });
  });

  describe('2. Rule 1: Auto Overdue Detection', () => {
    it('marks task overdue when deadline is in the past and status is not done', () => {
      const pastDeadline = '2026-11-05T09:59:59.000Z'; // 1 second before fixedNow
      const nonDoneStatuses: TaskStatus[] = [
        'not_started',
        'in_progress',
        'waiting_on_others',
        'blocked',
      ];

      for (const status of nonDoneStatuses) {
        const overdue = isTaskOverdue(
          { deadline: pastDeadline, status },
          fixedNow
        );
        assert.equal(
          overdue,
          true,
          `Status ${status} with past deadline should be overdue`
        );

        const effective = calculateEffectiveStatus(
          { deadline: pastDeadline, status },
          fixedNow
        );
        assert.equal(effective, 'overdue');
      }
    });

    it('does NOT mark task overdue if status is done, even when deadline has passed', () => {
      const longPastDeadline = '2025-01-01T00:00:00.000Z';
      const overdue = isTaskOverdue(
        { deadline: longPastDeadline, status: 'done' },
        fixedNow
      );
      assert.equal(overdue, false, 'Completed task must never be overdue');

      const effective = calculateEffectiveStatus(
        { deadline: longPastDeadline, status: 'done' },
        fixedNow
      );
      assert.equal(effective, 'done', 'Effective status of completed task must be done');
    });

    it('does NOT mark task overdue when deadline is in the future or absent', () => {
      const futureDeadline = '2026-11-05T10:00:01.000Z';
      assert.equal(
        isTaskOverdue({ deadline: futureDeadline, status: 'not_started' }, fixedNow),
        false
      );

      assert.equal(
        isTaskOverdue({ deadline: null, status: 'not_started' }, fixedNow),
        false
      );

      assert.equal(
        isTaskOverdue({ deadline: undefined, status: 'in_progress' }, fixedNow),
        false
      );
    });

    it('syncOverdueTasks batch updates non-done tasks with past deadlines', () => {
      const tasks: Task[] = [
        {
          ...sampleTask,
          id: 't1',
          status: 'not_started',
          deadline: '2026-11-04T00:00:00.000Z', // Past
        },
        {
          ...sampleTask,
          id: 't2',
          status: 'in_progress',
          deadline: '2026-11-06T00:00:00.000Z', // Future
        },
        {
          ...sampleTask,
          id: 't3',
          status: 'done',
          deadline: '2026-11-04T00:00:00.000Z', // Past but Done
        },
        {
          ...sampleTask,
          id: 't4',
          status: 'blocked',
          deadline: '2026-11-04T00:00:00.000Z', // Past
        },
      ];

      const result = syncOverdueTasks(tasks, {
        now: fixedNow,
        changedBy: 'system_cron',
        generateId: mockIdGen,
      });

      assert.equal(result.overdueCount, 2, 'Should mark exactly 2 tasks overdue');
      assert.equal(result.tasks[0].status, 'overdue');
      assert.equal(result.tasks[1].status, 'in_progress');
      assert.equal(result.tasks[2].status, 'done');
      assert.equal(result.tasks[3].status, 'overdue');

      assert.equal(result.statusLogs.length, 2);
      assert.equal(result.statusLogs[0].entityId, 't1');
      assert.equal(result.statusLogs[0].newStatus, 'overdue');
      assert.equal(result.statusLogs[0].changedBy, 'system_cron');
      assert.equal(result.statusLogs[1].entityId, 't4');
    });
  });

  describe('3. Rule 2: StatusLog Audit Trail', () => {
    it('creates a StatusLog entry on every status transition', () => {
      const initialTask: Task = {
        ...sampleTask,
        status: 'not_started',
      };

      // Transition 1: not_started -> in_progress
      const step1 = changeTaskStatus({
        task: initialTask,
        newStatus: 'in_progress',
        changedBy: 'teacher_sharma',
        comment: 'Started verifying student Aadhaar cards',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.equal(step1.updatedTask.status, 'in_progress');
      assert.equal(step1.statusLog.entityType, 'task');
      assert.equal(step1.statusLog.entityId, initialTask.id);
      assert.equal(step1.statusLog.previousStatus, 'not_started');
      assert.equal(step1.statusLog.newStatus, 'in_progress');
      assert.equal(step1.statusLog.changedBy, 'teacher_sharma');
      assert.equal(step1.statusLog.comment, 'Started verifying student Aadhaar cards');
      assert.equal(step1.statusLog.timestamp, fixedNow.toISOString());

      // Transition 2: in_progress -> waiting_on_others
      const step2 = changeTaskStatus({
        task: step1.updatedTask,
        newStatus: 'waiting_on_others',
        changedBy: 'teacher_sharma',
        comment: 'Waiting for BRC coordinator OTP',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.equal(step2.statusLog.previousStatus, 'in_progress');
      assert.equal(step2.statusLog.newStatus, 'waiting_on_others');

      // Transition 3: waiting_on_others -> blocked
      const step3 = changeTaskStatus({
        task: step2.updatedTask,
        newStatus: 'blocked',
        changedBy: 'teacher_sharma',
        comment: 'Prerna portal server throwing 502 error',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.equal(step3.statusLog.previousStatus, 'waiting_on_others');
      assert.equal(step3.statusLog.newStatus, 'blocked');
    });

    it('createNewTask helper logs the initial status creation', () => {
      const { task, initialLog } = createNewTask({
        title: 'Monthly MDM Report Submission',
        type: 'mdm',
        createdBy: 'headmaster_singh',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.equal(task.title, 'Monthly MDM Report Submission');
      assert.equal(task.status, 'not_started');
      assert.equal(initialLog.previousStatus, null);
      assert.equal(initialLog.newStatus, 'not_started');
      assert.equal(initialLog.changedBy, 'headmaster_singh');
    });
  });

  describe('4. Rule 3: Recurring Tasks Auto-Generation on Done', () => {
    it('does NOT generate a recurring task when recurrence is none', () => {
      const oneTimeTask: Task = {
        ...sampleTask,
        recurrence: 'none',
      };

      const result = changeTaskStatus({
        task: oneTimeTask,
        newStatus: 'done',
        changedBy: 'teacher_gupta',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.equal(result.updatedTask.status, 'done');
      assert.equal(result.updatedTask.completedAt, fixedNow.toISOString());
      assert.equal(result.nextRecurringTask, undefined);
    });

    it('auto-generates next instance for daily recurrence (+1 day)', () => {
      const dailyTask: Task = {
        ...sampleTask,
        id: 'daily_att_01',
        title: 'Daily Student Attendance in Prerna App',
        recurrence: 'daily',
        deadline: '2026-11-05T04:30:00.000Z',
      };

      const result = changeTaskStatus({
        task: dailyTask,
        newStatus: 'done',
        changedBy: 'teacher_gupta',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.equal(result.updatedTask.status, 'done');
      assert.ok(result.nextRecurringTask, 'Next task must be generated');
      const nextTask = result.nextRecurringTask!;
      assert.notEqual(nextTask.id, dailyTask.id);
      assert.equal(nextTask.status, 'not_started');
      assert.equal(nextTask.recurrenceParentId, dailyTask.id);
      assert.equal(nextTask.completedAt, undefined);

      // Verify deadline advanced exactly by 1 day
      assert.equal(
        nextTask.deadline,
        '2026-11-06T04:30:00.000Z'
      );
    });

    it('auto-generates next instance for weekly recurrence (+7 days)', () => {
      const weeklyTask: Task = {
        ...sampleTask,
        id: 'weekly_test_01',
        title: 'Weekly NIPUN Bharat Assessment',
        recurrence: 'weekly',
        deadline: '2026-11-05T12:00:00.000Z',
      };

      const result = changeTaskStatus({
        task: weeklyTask,
        newStatus: 'done',
        changedBy: 'teacher_gupta',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.ok(result.nextRecurringTask);
      assert.equal(
        result.nextRecurringTask!.deadline,
        '2026-11-12T12:00:00.000Z'
      );
    });

    it('auto-generates next instance for monthly recurrence (+1 month with day clamping)', () => {
      // Standard month advance: 15th Nov -> 15th Dec
      const monthlyDeadline1 = calculateNextDeadline(
        '2026-11-15T10:00:00.000Z',
        'monthly'
      );
      assert.equal(monthlyDeadline1, '2026-12-15T10:00:00.000Z');

      // Edge case: Jan 31 -> Feb 28 (non-leap year 2027)
      const jan31 = '2027-01-31T05:00:00.000Z';
      const febResult = calculateNextDeadline(jan31, 'monthly');
      assert.equal(febResult, '2027-02-28T05:00:00.000Z');

      // Edge case: Jan 31 -> Feb 29 (leap year 2028)
      const jan31Leap = '2028-01-31T05:00:00.000Z';
      const febLeapResult = calculateNextDeadline(jan31Leap, 'monthly');
      assert.equal(febLeapResult, '2028-02-29T05:00:00.000Z');

      // Edge case: Aug 31 -> Sep 30
      const aug31 = '2026-08-31T00:00:00.000Z';
      const sepResult = calculateNextDeadline(aug31, 'monthly');
      assert.equal(sepResult, '2026-09-30T00:00:00.000Z');
    });

    it('auto-generates next instance for yearly recurrence (+1 year with leap year handling)', () => {
      // Standard year advance: 2026-07-01 -> 2027-07-01
      const yearlyDeadline = calculateNextDeadline(
        '2026-07-01T09:00:00.000Z',
        'yearly'
      );
      assert.equal(yearlyDeadline, '2027-07-01T09:00:00.000Z');

      // Leap year edge case: Feb 29 2028 -> Feb 28 2029
      const leapDay = '2028-02-29T12:00:00.000Z';
      const nextYear = calculateNextDeadline(leapDay, 'yearly');
      assert.equal(nextYear, '2029-02-28T12:00:00.000Z');
    });

    it('preserves existing recurrenceParentId on chained recurring instances', () => {
      const rootTaskId = 'root_mdm_monthly';
      const secondInstance: Task = {
        ...sampleTask,
        id: 'instance_02',
        recurrence: 'monthly',
        recurrenceParentId: rootTaskId,
        deadline: '2026-11-30T17:00:00.000Z',
      };

      const result = changeTaskStatus({
        task: secondInstance,
        newStatus: 'done',
        changedBy: 'teacher_gupta',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.ok(result.nextRecurringTask);
      assert.equal(
        result.nextRecurringTask!.recurrenceParentId,
        rootTaskId,
        'Chained recurring task must keep original parent ID'
      );
    });

    it('handles reopening a completed task (clears completedAt and logs reopen)', () => {
      const completedTask: Task = {
        ...sampleTask,
        status: 'done',
        completedAt: '2026-11-04T12:00:00.000Z',
      };

      const reopened = changeTaskStatus({
        task: completedTask,
        newStatus: 'in_progress',
        changedBy: 'teacher_gupta',
        comment: 'Reopened to correct Mid-Day Meal ration figures',
        now: fixedNow,
        generateId: mockIdGen,
      });

      assert.equal(reopened.updatedTask.status, 'in_progress');
      assert.equal(reopened.updatedTask.completedAt, undefined);
      assert.equal(reopened.statusLog.previousStatus, 'done');
      assert.equal(reopened.statusLog.newStatus, 'in_progress');
    });
  });
});
