/**
 * Teacher Hub - 30-Day Task Completion Analytics by Category
 * Pure, deterministic calculations for Recharts dashboard visualization across
 * 'Administrative', 'Academic', and 'Extra-curricular' task categories.
 */

import {
  Task,
  TaskCategory,
  TASK_CATEGORY_METADATA,
  resolveTaskCategory,
  calculateEffectiveStatus,
} from './taskStatusSystem.js';

export const ALL_TASK_CATEGORIES: readonly TaskCategory[] = [
  'Administrative',
  'Academic',
  'Extra-curricular',
] as const;

export const CATEGORY_CHART_COLORS: Record<TaskCategory, string> = {
  Administrative: '#0D5B49', // Sarkari Mitra Deep Emerald
  Academic: '#2563EB', // Royal Academic Blue
  'Extra-curricular': '#D97706', // Warm Cultural Amber
};

export interface CategoryCompletionMetric {
  category: TaskCategory;
  labelHi: string;
  labelEn: string;
  displayName: string;
  shortName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  completionRate: number; // 0 - 100
  incompleteRate: number; // 0 - 100
  fillColor: string;
}

export interface ThirtyDayTrendPoint {
  bucketIndex: number;
  bucketLabel: string;
  rangeLabelHi: string;
  startDateIso: string;
  endDateIso: string;
  Administrative: number;
  Academic: number;
  'Extra-curricular': number;
  adminCompleted: number;
  adminTotal: number;
  academicCompleted: number;
  academicTotal: number;
  extraCompleted: number;
  extraTotal: number;
  overallRate: number;
}

export interface ThirtyDayCompletionSummary {
  windowDays: number;
  windowStartIso: string;
  windowEndIso: string;
  totalTasksInWindow: number;
  totalCompletedInWindow: number;
  totalInProgressInWindow: number;
  totalOverdueInWindow: number;
  overallCompletionRate: number;
  bestPerformingCategory: TaskCategory | null;
  needsAttentionCategory: TaskCategory | null;
  byCategory: CategoryCompletionMetric[];
  trendSeries: ThirtyDayTrendPoint[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toEpochMs(input?: Date | string | number | null): number {
  if (input === undefined || input === null) return Date.now();
  if (typeof input === 'number') return input;
  if (input instanceof Date) return input.getTime();
  const parsed = new Date(input).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Resolves the primary timestamp (in ms) used to place a task inside the 30-day window.
 * - If the task is done and has a valid `completedAt`, uses `completedAt`.
 * - Else if the task has a valid `deadline`, uses `deadline`.
 * - Else falls back to `updatedAt` or `createdAt`.
 */
export function getTaskAnalyticsTimestampMs(task: Task): number | null {
  if (task.status === 'done' && task.completedAt) {
    const completedMs = new Date(task.completedAt).getTime();
    if (!Number.isNaN(completedMs)) return completedMs;
  }

  if (task.deadline) {
    const deadlineMs = new Date(task.deadline).getTime();
    if (!Number.isNaN(deadlineMs)) return deadlineMs;
  }

  if (task.updatedAt) {
    const updatedMs = new Date(task.updatedAt).getTime();
    if (!Number.isNaN(updatedMs)) return updatedMs;
  }

  if (task.createdAt) {
    const createdMs = new Date(task.createdAt).getTime();
    if (!Number.isNaN(createdMs)) return createdMs;
  }

  return null;
}

/**
 * Determines whether a task falls within the last N days (default 30 days)
 * relative to `referenceDate`. Includes all of the reference calendar day.
 */
export function isTaskInLastNDays(
  task: Task,
  referenceDate?: Date | string | number,
  windowDays = 30
): boolean {
  const refMs = toEpochMs(referenceDate);
  const refDateObj = new Date(refMs);

  // Include through the end of the reference day (23:59:59.999)
  const endOfDay = new Date(refDateObj);
  endOfDay.setHours(23, 59, 59, 999);
  const windowEndMs = endOfDay.getTime();

  // Start of window N days prior (00:00:00.000)
  const startOfDay = new Date(endOfDay.getTime() - windowDays * DAY_MS);
  startOfDay.setHours(0, 0, 0, 0);
  const windowStartMs = startOfDay.getTime();

  const taskMs = getTaskAnalyticsTimestampMs(task);
  if (taskMs === null) return false;

  return taskMs >= windowStartMs && taskMs <= windowEndMs;
}

/**
 * Filters a list of tasks to those falling within the last N days (default 30).
 */
export function filterTasksInLastNDays(
  tasks: Task[],
  referenceDate?: Date | string | number,
  windowDays = 30
): Task[] {
  return tasks.filter((task) => isTaskInLastNDays(task, referenceDate, windowDays));
}

function formatShortDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Computes complete 30-day task completion rates by category ('Administrative',
 * 'Academic', 'Extra-curricular') along with a 6-period (5-day bucket) trend series
 * suitable for Recharts visualization.
 */
export function calculateThirtyDayTaskCompletion(
  tasks: Task[],
  referenceDate?: Date | string | number,
  windowDays = 30
): ThirtyDayCompletionSummary {
  const safeDays = Math.max(1, windowDays);
  const refMs = toEpochMs(referenceDate);
  const refDateObj = new Date(refMs);

  const endOfDay = new Date(refDateObj);
  endOfDay.setHours(23, 59, 59, 999);
  const windowEndMs = endOfDay.getTime();

  const startOfDay = new Date(endOfDay.getTime() - safeDays * DAY_MS);
  startOfDay.setHours(0, 0, 0, 0);
  const windowStartMs = startOfDay.getTime();

  const windowTasks = tasks.filter((task) => {
    const tMs = getTaskAnalyticsTimestampMs(task);
    return tMs !== null && tMs >= windowStartMs && tMs <= windowEndMs;
  });

  const byCategoryMap: Record<
    TaskCategory,
    {
      total: number;
      completed: number;
      inProgress: number;
      overdue: number;
      pending: number;
    }
  > = {
    Administrative: { total: 0, completed: 0, inProgress: 0, overdue: 0, pending: 0 },
    Academic: { total: 0, completed: 0, inProgress: 0, overdue: 0, pending: 0 },
    'Extra-curricular': { total: 0, completed: 0, inProgress: 0, overdue: 0, pending: 0 },
  };

  for (const task of windowTasks) {
    const category = resolveTaskCategory(task);
    const effectiveStatus = calculateEffectiveStatus(task, refMs);
    const bucket = byCategoryMap[category];
    bucket.total += 1;

    if (effectiveStatus === 'done') {
      bucket.completed += 1;
    } else if (effectiveStatus === 'in_progress') {
      bucket.inProgress += 1;
    } else if (effectiveStatus === 'overdue') {
      bucket.overdue += 1;
    } else {
      bucket.pending += 1;
    }
  }

  const byCategory: CategoryCompletionMetric[] = ALL_TASK_CATEGORIES.map((category) => {
    const meta = TASK_CATEGORY_METADATA[category];
    const counts = byCategoryMap[category];
    const completionRate =
      counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

    return {
      category,
      labelHi: meta.labelHi,
      labelEn: meta.labelEn,
      displayName: `${meta.labelHi} (${meta.labelEn})`,
      shortName: `${meta.labelHi} / ${meta.labelEn === 'Extra-curricular' ? 'Extra' : meta.labelEn}`,
      totalTasks: counts.total,
      completedTasks: counts.completed,
      inProgressTasks: counts.inProgress,
      overdueTasks: counts.overdue,
      pendingTasks: counts.pending,
      completionRate,
      incompleteRate: counts.total > 0 ? 100 - completionRate : 0,
      fillColor: CATEGORY_CHART_COLORS[category],
    };
  });

  const totalTasksInWindow = windowTasks.length;
  const totalCompletedInWindow = byCategory.reduce((acc, c) => acc + c.completedTasks, 0);
  const totalInProgressInWindow = byCategory.reduce((acc, c) => acc + c.inProgressTasks, 0);
  const totalOverdueInWindow = byCategory.reduce((acc, c) => acc + c.overdueTasks, 0);
  const overallCompletionRate =
    totalTasksInWindow > 0
      ? Math.round((totalCompletedInWindow / totalTasksInWindow) * 100)
      : 0;

  const populatedCategories = byCategory.filter((c) => c.totalTasks > 0);
  let bestPerformingCategory: TaskCategory | null = null;
  let needsAttentionCategory: TaskCategory | null = null;

  if (populatedCategories.length > 0) {
    const sortedDesc = [...populatedCategories].sort(
      (a, b) => b.completionRate - a.completionRate || b.completedTasks - a.completedTasks
    );
    bestPerformingCategory = sortedDesc[0].category;

    const sortedAsc = [...populatedCategories].sort(
      (a, b) => a.completionRate - b.completionRate || b.overdueTasks - a.overdueTasks
    );
    needsAttentionCategory = sortedAsc[0].category;
  }

  // Build 6 chronological buckets across the window (e.g., 6 x 5-day intervals for 30 days)
  const bucketCount = 6;
  const totalWindowSpanMs = windowEndMs - windowStartMs;
  const bucketSpanMs = totalWindowSpanMs / bucketCount;

  const trendSeries: ThirtyDayTrendPoint[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const bStart = windowStartMs + i * bucketSpanMs;
    const bEnd = i === bucketCount - 1 ? windowEndMs : windowStartMs + (i + 1) * bucketSpanMs - 1;

    const bucketTasks = windowTasks.filter((t) => {
      const ms = getTaskAnalyticsTimestampMs(t);
      return ms !== null && ms >= bStart && ms <= bEnd;
    });

    const catStats: Record<TaskCategory, { done: number; total: number }> = {
      Administrative: { done: 0, total: 0 },
      Academic: { done: 0, total: 0 },
      'Extra-curricular': { done: 0, total: 0 },
    };

    for (const t of bucketTasks) {
      const cat = resolveTaskCategory(t);
      const eff = calculateEffectiveStatus(t, refMs);
      catStats[cat].total += 1;
      if (eff === 'done') {
        catStats[cat].done += 1;
      }
    }

    const adminRate =
      catStats.Administrative.total > 0
        ? Math.round((catStats.Administrative.done / catStats.Administrative.total) * 100)
        : 0;
    const academicRate =
      catStats.Academic.total > 0
        ? Math.round((catStats.Academic.done / catStats.Academic.total) * 100)
        : 0;
    const extraRate =
      catStats['Extra-curricular'].total > 0
        ? Math.round(
            (catStats['Extra-curricular'].done / catStats['Extra-curricular'].total) * 100
          )
        : 0;

    const totalBucket =
      catStats.Administrative.total +
      catStats.Academic.total +
      catStats['Extra-curricular'].total;
    const doneBucket =
      catStats.Administrative.done +
      catStats.Academic.done +
      catStats['Extra-curricular'].done;

    const overallBucketRate =
      totalBucket > 0 ? Math.round((doneBucket / totalBucket) * 100) : 0;

    const startLabel = formatShortDate(bStart);
    const endLabel = formatShortDate(bEnd);

    trendSeries.push({
      bucketIndex: i + 1,
      bucketLabel: `${startLabel}–${endLabel}`,
      rangeLabelHi: `अवधि ${i + 1} (${startLabel} – ${endLabel})`,
      startDateIso: new Date(bStart).toISOString(),
      endDateIso: new Date(bEnd).toISOString(),
      Administrative: adminRate,
      Academic: academicRate,
      'Extra-curricular': extraRate,
      adminCompleted: catStats.Administrative.done,
      adminTotal: catStats.Administrative.total,
      academicCompleted: catStats.Academic.done,
      academicTotal: catStats.Academic.total,
      extraCompleted: catStats['Extra-curricular'].done,
      extraTotal: catStats['Extra-curricular'].total,
      overallRate: overallBucketRate,
    });
  }

  return {
    windowDays: safeDays,
    windowStartIso: new Date(windowStartMs).toISOString(),
    windowEndIso: new Date(windowEndMs).toISOString(),
    totalTasksInWindow,
    totalCompletedInWindow,
    totalInProgressInWindow,
    totalOverdueInWindow,
    overallCompletionRate,
    bestPerformingCategory,
    needsAttentionCategory,
    byCategory,
    trendSeries,
  };
}
