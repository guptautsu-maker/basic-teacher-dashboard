import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_TASK_CATEGORIES,
  getTaskAnalyticsTimestampMs,
  isTaskInLastNDays,
  filterTasksInLastNDays,
  calculateThirtyDayTaskCompletion,
} from './taskCompletionAnalytics.js';
import { Task } from './taskStatusSystem.js';

describe('30-Day Task Completion Analytics by Category (Recharts Data Layer)', () => {
  const referenceDate = new Date('2026-10-31T12:00:00.000Z');

  const sampleTasks: Task[] = [
    // Administrative: 2 done, 1 overdue, 1 in_progress within last 30 days -> 50% completion
    {
      id: 'adm-1',
      title: 'UDISE+ Student Verification',
      type: 'portal_entry',
      category: 'Administrative',
      priority: 'urgent',
      status: 'done',
      recurrence: 'none',
      deadline: '2026-10-05T10:00:00.000Z',
      completedAt: '2026-10-05T14:00:00.000Z',
      createdAt: '2026-10-02T08:00:00.000Z',
      updatedAt: '2026-10-05T14:00:00.000Z',
    },
    {
      id: 'adm-2',
      title: 'Monthly MDM Report',
      type: 'mdm',
      category: 'Administrative',
      priority: 'high',
      status: 'done',
      recurrence: 'monthly',
      deadline: '2026-10-15T10:00:00.000Z',
      completedAt: '2026-10-14T16:00:00.000Z',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-14T16:00:00.000Z',
    },
    {
      id: 'adm-3',
      title: 'Prerna DBT Photo Upload',
      type: 'portal_entry',
      category: 'Administrative',
      priority: 'high',
      status: 'overdue',
      recurrence: 'none',
      deadline: '2026-10-25T10:00:00.000Z',
      createdAt: '2026-10-20T08:00:00.000Z',
      updatedAt: '2026-10-26T08:00:00.000Z',
    },
    {
      id: 'adm-4',
      title: 'Daily Attendance Sync',
      type: 'attendance',
      category: 'Administrative',
      priority: 'urgent',
      status: 'in_progress',
      recurrence: 'daily',
      deadline: '2026-10-31T16:00:00.000Z',
      createdAt: '2026-10-31T08:00:00.000Z',
      updatedAt: '2026-10-31T08:30:00.000Z',
    },

    // Academic: 3 done, 1 in_progress within last 30 days -> 75% completion
    {
      id: 'aca-1',
      title: 'NIPUN Lakshya Spot Assessment Week 1',
      type: 'general',
      category: 'Academic',
      priority: 'high',
      status: 'done',
      recurrence: 'weekly',
      deadline: '2026-10-08T12:00:00.000Z',
      completedAt: '2026-10-08T11:30:00.000Z',
      createdAt: '2026-10-04T08:00:00.000Z',
      updatedAt: '2026-10-08T11:30:00.000Z',
    },
    {
      id: 'aca-2',
      title: 'DIKSHA FLN Module 3 Completion',
      type: 'training',
      category: 'Academic',
      priority: 'medium',
      status: 'done',
      recurrence: 'none',
      deadline: '2026-10-18T17:00:00.000Z',
      completedAt: '2026-10-17T15:00:00.000Z',
      createdAt: '2026-10-12T08:00:00.000Z',
      updatedAt: '2026-10-17T15:00:00.000Z',
    },
    {
      id: 'aca-3',
      title: 'Class 1-3 NIPUN Talika Update',
      type: 'general',
      category: 'Academic',
      priority: 'medium',
      status: 'done',
      recurrence: 'daily',
      deadline: '2026-10-31T14:00:00.000Z',
      completedAt: '2026-10-31T10:00:00.000Z',
      createdAt: '2026-10-31T08:00:00.000Z',
      updatedAt: '2026-10-31T10:00:00.000Z',
    },
    {
      id: 'aca-4',
      title: 'DIKSHA FLN Module 4 Quiz',
      type: 'training',
      category: 'Academic',
      priority: 'high',
      status: 'in_progress',
      recurrence: 'none',
      deadline: '2026-10-31T17:00:00.000Z',
      createdAt: '2026-10-29T08:00:00.000Z',
      updatedAt: '2026-10-31T09:00:00.000Z',
    },

    // Extra-curricular: 2 done, 1 not_started within last 30 days -> 67% completion
    {
      id: 'ext-1',
      title: 'Swachhata Pakhwada Rally',
      type: 'duty',
      category: 'Extra-curricular',
      priority: 'medium',
      status: 'done',
      recurrence: 'none',
      deadline: '2026-10-12T10:00:00.000Z',
      completedAt: '2026-10-12T11:00:00.000Z',
      createdAt: '2026-10-10T08:00:00.000Z',
      updatedAt: '2026-10-12T11:00:00.000Z',
    },
    {
      id: 'ext-2',
      title: 'Bal Sansad Cultural Competition',
      type: 'duty',
      category: 'Extra-curricular',
      priority: 'medium',
      status: 'done',
      recurrence: 'none',
      deadline: '2026-10-22T14:00:00.000Z',
      completedAt: '2026-10-22T15:30:00.000Z',
      createdAt: '2026-10-19T08:00:00.000Z',
      updatedAt: '2026-10-22T15:30:00.000Z',
    },
    {
      id: 'ext-3',
      title: 'Morning Assembly & Outdoor Sports',
      type: 'duty',
      category: 'Extra-curricular',
      priority: 'medium',
      status: 'not_started',
      recurrence: 'daily',
      deadline: '2026-10-31T15:30:00.000Z',
      createdAt: '2026-10-31T08:00:00.000Z',
      updatedAt: '2026-10-31T08:00:00.000Z',
    },

    // Outside 30-day window (60 days ago and 10 days in the future)
    {
      id: 'old-1',
      title: 'August Independence Day Parade',
      type: 'duty',
      category: 'Extra-curricular',
      priority: 'high',
      status: 'done',
      recurrence: 'yearly',
      deadline: '2026-08-15T09:00:00.000Z',
      completedAt: '2026-08-15T11:00:00.000Z',
      createdAt: '2026-08-10T08:00:00.000Z',
      updatedAt: '2026-08-15T11:00:00.000Z',
    },
    {
      id: 'future-1',
      title: 'Future Annual Grant Audit',
      type: 'portal_entry',
      category: 'Administrative',
      priority: 'medium',
      status: 'not_started',
      recurrence: 'none',
      deadline: '2026-11-15T15:00:00.000Z',
      createdAt: '2026-10-31T08:00:00.000Z',
      updatedAt: '2026-10-31T08:00:00.000Z',
    },
  ];

  it('defines all three canonical categories in order', () => {
    assert.deepEqual(ALL_TASK_CATEGORIES, [
      'Administrative',
      'Academic',
      'Extra-curricular',
    ]);
  });

  it('correctly filters tasks inside the 30-day window and excludes old or far-future tasks', () => {
    const filtered = filterTasksInLastNDays(sampleTasks, referenceDate, 30);
    assert.equal(filtered.length, 11);
    assert.equal(
      filtered.some((t) => t.id === 'old-1'),
      false,
      'Task from 60 days ago should be excluded'
    );
    assert.equal(
      filtered.some((t) => t.id === 'future-1'),
      false,
      'Task with deadline 15 days in the future should be excluded'
    );
  });

  it('calculates accurate completion rates per category over the last 30 days', () => {
    const summary = calculateThirtyDayTaskCompletion(sampleTasks, referenceDate, 30);

    assert.equal(summary.windowDays, 30);
    assert.equal(summary.totalTasksInWindow, 11);
    assert.equal(summary.totalCompletedInWindow, 7);
    assert.equal(summary.overallCompletionRate, 64); // 7 / 11 = 63.63% -> 64%

    const admin = summary.byCategory.find((c) => c.category === 'Administrative')!;
    assert.equal(admin.totalTasks, 4);
    assert.equal(admin.completedTasks, 2);
    assert.equal(admin.overdueTasks, 1);
    assert.equal(admin.inProgressTasks, 1);
    assert.equal(admin.completionRate, 50);

    const academic = summary.byCategory.find((c) => c.category === 'Academic')!;
    assert.equal(academic.totalTasks, 4);
    assert.equal(academic.completedTasks, 3);
    assert.equal(academic.inProgressTasks, 1);
    assert.equal(academic.completionRate, 75);

    const extra = summary.byCategory.find((c) => c.category === 'Extra-curricular')!;
    assert.equal(extra.totalTasks, 3);
    assert.equal(extra.completedTasks, 2);
    assert.equal(extra.pendingTasks, 1);
    assert.equal(extra.completionRate, 67);

    assert.equal(summary.bestPerformingCategory, 'Academic');
    assert.equal(summary.needsAttentionCategory, 'Administrative');
  });

  it('builds 6 chronological 5-day trend buckets for Recharts time-series visualization', () => {
    const summary = calculateThirtyDayTaskCompletion(sampleTasks, referenceDate, 30);
    assert.equal(summary.trendSeries.length, 6);

    const totalAcrossBuckets = summary.trendSeries.reduce(
      (sum, b) => sum + b.adminTotal + b.academicTotal + b.extraTotal,
      0
    );
    assert.equal(totalAcrossBuckets, 11);

    // Last bucket (containing Oct 31) has adm-4 (in_progress), aca-3 (done), aca-4 (in_progress), ext-3 (not_started)
    const lastBucket = summary.trendSeries[5];
    assert.ok(lastBucket.bucketLabel.length > 0);
    assert.equal(lastBucket.academicCompleted, 1);
    assert.equal(lastBucket.academicTotal, 2);
    assert.equal(lastBucket.Academic, 50);
  });

  it('handles empty task arrays gracefully with 0% completion rates', () => {
    const emptySummary = calculateThirtyDayTaskCompletion([], referenceDate, 30);
    assert.equal(emptySummary.totalTasksInWindow, 0);
    assert.equal(emptySummary.totalCompletedInWindow, 0);
    assert.equal(emptySummary.overallCompletionRate, 0);
    assert.equal(emptySummary.bestPerformingCategory, null);
    assert.equal(emptySummary.needsAttentionCategory, null);
    assert.equal(emptySummary.byCategory.length, 3);
    for (const cat of emptySummary.byCategory) {
      assert.equal(cat.totalTasks, 0);
      assert.equal(cat.completionRate, 0);
    }
  });

  it('resolves analytics timestamp prioritizing completedAt for done tasks', () => {
    const doneTask: Task = {
      id: 'done-t',
      title: 'Completed early',
      type: 'general',
      category: 'Academic',
      priority: 'low',
      status: 'done',
      recurrence: 'none',
      deadline: '2026-11-10T10:00:00.000Z', // future deadline
      completedAt: '2026-10-30T10:00:00.000Z', // completed yesterday
      createdAt: '2026-10-28T10:00:00.000Z',
      updatedAt: '2026-10-30T10:00:00.000Z',
    };
    const ms = getTaskAnalyticsTimestampMs(doneTask);
    assert.equal(ms, new Date('2026-10-30T10:00:00.000Z').getTime());
    assert.equal(isTaskInLastNDays(doneTask, referenceDate, 30), true);
  });
});
