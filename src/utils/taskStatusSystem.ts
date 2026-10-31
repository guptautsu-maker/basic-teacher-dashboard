/**
 * Teacher Hub - Task Status System
 * Pure functions implementing status lifecycle, overdue detection,
 * audit logging (StatusLog), and recurring task generation for Indian basic school teachers.
 */

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'waiting_on_others'
  | 'done'
  | 'overdue'
  | 'blocked';

export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskType =
  | 'portal_entry'
  | 'attendance'
  | 'mdm'
  | 'training'
  | 'meeting'
  | 'duty'
  | 'govt_order'
  | 'annual_update'
  | 'general';

export interface StatusLog {
  id: string;
  entityType: 'task';
  entityId: string;
  changedBy: string; // Teacher ID, name, or 'system'
  previousStatus: TaskStatus | null;
  newStatus: TaskStatus;
  comment?: string;
  timestamp: string; // ISO 8601 string
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  source?: string; // e.g. 'UDISE+', 'Prerna', 'Manav Sampada', 'DIKSHA', 'BSA Office'
  portalUrl?: string;
  deadline?: string | null; // ISO 8601 string
  priority: TaskPriority;
  status: TaskStatus;
  recurrence: RecurrenceFrequency;
  recurrenceParentId?: string;
  completedAt?: string;
  assignedTo?: string;
  schoolId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusMeta {
  code: TaskStatus;
  labelEn: string;
  labelHi: string;
  badgeBg: string;
  badgeText: string;
  color: string;
  icon: string;
  descriptionEn: string;
  descriptionHi: string;
}

export const STATUS_METADATA: Record<TaskStatus, StatusMeta> = {
  not_started: {
    code: 'not_started',
    labelEn: 'Not Started',
    labelHi: 'शुरू नहीं हुआ',
    badgeBg: 'bg-gray-100 dark:bg-gray-800',
    badgeText: 'text-gray-700 dark:text-gray-300',
    color: '#6B7280',
    icon: '⭕',
    descriptionEn: 'Work has not begun',
    descriptionHi: 'कार्य अभी शुरू नहीं हुआ है',
  },
  in_progress: {
    code: 'in_progress',
    labelEn: 'In Progress',
    labelHi: 'प्रगति पर',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
    color: '#3B82F6',
    icon: '⏳',
    descriptionEn: 'Currently being worked on',
    descriptionHi: 'कार्य अभी चल रहा है',
  },
  waiting_on_others: {
    code: 'waiting_on_others',
    labelEn: 'Waiting on Others',
    labelHi: 'अन्य पर निर्भर / प्रतीक्षारत',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
    badgeText: 'text-amber-800 dark:text-amber-300',
    color: '#F59E0B',
    icon: '⏸️',
    descriptionEn: 'Waiting for BSO / BSA / colleague input',
    descriptionHi: 'उच्चाधिकारी, बीआरसी या अन्य शिक्षक की जानकारी की प्रतीक्षा',
  },
  done: {
    code: 'done',
    labelEn: 'Done',
    labelHi: 'पूर्ण / संपन्न',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    color: '#10B981',
    icon: '✅',
    descriptionEn: 'Task completed successfully',
    descriptionHi: 'कार्य सफलतापूर्वक पूरा हुआ',
  },
  overdue: {
    code: 'overdue',
    labelEn: 'Overdue',
    labelHi: 'समय सीमा समाप्त (विलंबित)',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/40',
    badgeText: 'text-rose-800 dark:text-rose-300',
    color: '#EF4444',
    icon: '⚠️',
    descriptionEn: 'Deadline has passed and task is not done',
    descriptionHi: 'अंतिम तिथि बीत चुकी है और कार्य अधूरा है',
  },
  blocked: {
    code: 'blocked',
    labelEn: 'Blocked',
    labelHi: 'रुका हुआ / बाधित',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/40',
    badgeText: 'text-purple-800 dark:text-purple-300',
    color: '#8B5CF6',
    icon: '🚫',
    descriptionEn: 'Cannot proceed due to portal downtime or missing docs',
    descriptionHi: 'पोर्टल सर्वर डाउन या अभिलेख अभाव के कारण रुका हुआ',
  },
};

/**
 * Standard ID generator fallback for deterministic testing and runtime purity.
 */
let idCounter = 0;
export const defaultGenerateId = (prefix = 'item'): string => {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
};

/**
 * Normalizes input time into milliseconds since epoch.
 */
function toEpochMs(input?: Date | string | number | null): number {
  if (input === undefined || input === null) return Date.now();
  if (typeof input === 'number') return input;
  if (input instanceof Date) return input.getTime();
  const parsed = new Date(input).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Rule 1 Check:
 * Checks if a task is overdue. A task is overdue IF:
 * 1. It has a valid deadline,
 * 2. The deadline timestamp is strictly less than 'now',
 * 3. The task status is NOT 'done'.
 */
export function isTaskOverdue(
  task: { deadline?: string | null; status: TaskStatus },
  now?: Date | string | number
): boolean {
  if (!task.deadline) return false;
  if (task.status === 'done') return false;

  const deadlineMs = new Date(task.deadline).getTime();
  if (Number.isNaN(deadlineMs)) return false;

  const nowMs = toEpochMs(now);
  return nowMs > deadlineMs;
}

/**
 * Calculates the effective display/system status of a task.
 * - If status is 'done', it stays 'done' (completed tasks are never overdue).
 * - If deadline has passed and status is not 'done', it evaluates to 'overdue'.
 * - Otherwise, returns the assigned status.
 */
export function calculateEffectiveStatus(
  task: { deadline?: string | null; status: TaskStatus },
  now?: Date | string | number
): TaskStatus {
  if (task.status === 'done') return 'done';
  if (isTaskOverdue(task, now)) return 'overdue';
  return task.status;
}

/**
 * Calculates the next deadline based on recurrence interval.
 * Supports: 'daily', 'weekly', 'monthly', 'yearly'.
 *
 * Handles month-end date clamping (e.g. Jan 31 -> Feb 28/29)
 * and leap years (Feb 29 -> Feb 28 on non-leap years).
 */
export function calculateNextDeadline(
  currentDeadline: string | Date | number,
  frequency: RecurrenceFrequency
): string {
  const base = new Date(currentDeadline);
  if (Number.isNaN(base.getTime())) {
    throw new Error(`Invalid currentDeadline provided: ${currentDeadline}`);
  }

  if (frequency === 'none') {
    return base.toISOString();
  }

  const next = new Date(base.getTime());

  switch (frequency) {
    case 'daily': {
      next.setUTCDate(next.getUTCDate() + 1);
      return next.toISOString();
    }
    case 'weekly': {
      next.setUTCDate(next.getUTCDate() + 7);
      return next.toISOString();
    }
    case 'monthly': {
      const origDay = base.getUTCDate();
      // Move to 1st of next month to safely avoid month overflow
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + 1);
      // Determine how many days exist in the target month
      const daysInTargetMonth = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
      ).getUTCDate();
      // Clamp day to max days in month (e.g. Jan 31 -> Feb 28)
      next.setUTCDate(Math.min(origDay, daysInTargetMonth));
      return next.toISOString();
    }
    case 'yearly': {
      const origDay = base.getUTCDate();
      const origMonth = base.getUTCMonth();
      const nextYear = base.getUTCFullYear() + 1;
      // Set to 1st of month first to avoid leap-year overflow (e.g. Feb 29 -> March in non-leap year)
      next.setUTCDate(1);
      next.setUTCFullYear(nextYear);
      next.setUTCMonth(origMonth);
      const daysInTargetMonth = new Date(
        Date.UTC(nextYear, origMonth + 1, 0)
      ).getUTCDate();
      next.setUTCDate(Math.min(origDay, daysInTargetMonth));
      return next.toISOString();
    }
    default:
      return next.toISOString();
  }
}

export interface ChangeTaskStatusParams {
  task: Task;
  newStatus: TaskStatus;
  changedBy: string;
  comment?: string;
  now?: Date | string | number;
  generateId?: (prefix?: string) => string;
}

export interface ChangeTaskStatusResult {
  updatedTask: Task;
  statusLog: StatusLog;
  nextRecurringTask?: Task;
}

/**
 * Rule 2 & Rule 3:
 * Changes a task's status:
 * 1. Records a StatusLog entry capturing actor, previous and new status, comment, timestamp.
 * 2. If newStatus === 'done', sets completedAt.
 * 3. If newStatus === 'done' and task has recurrence ('daily' | 'weekly' | 'monthly' | 'yearly'),
 *    auto-generates the next task instance with status 'not_started' and incremented deadline.
 */
export function changeTaskStatus({
  task,
  newStatus,
  changedBy,
  comment,
  now,
  generateId = defaultGenerateId,
}: ChangeTaskStatusParams): ChangeTaskStatusResult {
  const nowMs = toEpochMs(now);
  const nowIso = new Date(nowMs).toISOString();

  // Create immutable updated copy
  const updatedTask: Task = {
    ...task,
    status: newStatus,
    updatedAt: nowIso,
  };

  if (newStatus === 'done') {
    updatedTask.completedAt = nowIso;
  } else {
    // If reopened from done, clear completedAt
    if (task.status === 'done') {
      delete updatedTask.completedAt;
    }
  }

  // Rule 2: Every status change creates a StatusLog entry
  const statusLog: StatusLog = {
    id: generateId('log'),
    entityType: 'task',
    entityId: task.id,
    changedBy,
    previousStatus: task.status,
    newStatus,
    comment: comment || undefined,
    timestamp: nowIso,
  };

  // Rule 3: Recurring tasks auto-generate the next instance when marked Done
  let nextRecurringTask: Task | undefined;
  if (newStatus === 'done' && task.recurrence && task.recurrence !== 'none') {
    const baseDeadline = task.deadline || nowIso;
    const nextDeadline = calculateNextDeadline(baseDeadline, task.recurrence);

    nextRecurringTask = {
      ...task,
      id: generateId('task'),
      status: 'not_started',
      deadline: nextDeadline,
      completedAt: undefined,
      recurrenceParentId: task.recurrenceParentId || task.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  return {
    updatedTask,
    statusLog,
    nextRecurringTask,
  };
}

export interface SyncOverdueOptions {
  changedBy?: string;
  now?: Date | string | number;
  generateId?: (prefix?: string) => string;
}

export interface SyncOverdueResult {
  tasks: Task[];
  statusLogs: StatusLog[];
  overdueCount: number;
}

/**
 * Batch synchronization function to auto-mark overdue tasks across a list.
 * Any task whose deadline has passed and is not 'done' or already 'overdue'
 * is marked 'overdue' and generates a StatusLog.
 */
export function syncOverdueTasks(
  tasks: Task[],
  options: SyncOverdueOptions = {}
): SyncOverdueResult {
  const {
    changedBy = 'system',
    now,
    generateId = defaultGenerateId,
  } = options;

  const nowMs = toEpochMs(now);
  const nowIso = new Date(nowMs).toISOString();
  const statusLogs: StatusLog[] = [];
  let overdueCount = 0;

  const updatedTasks = tasks.map((t) => {
    // If already done or already marked overdue, keep as-is
    if (t.status === 'done' || t.status === 'overdue') {
      return t;
    }

    if (isTaskOverdue(t, nowMs)) {
      overdueCount += 1;
      const log: StatusLog = {
        id: generateId('log'),
        entityType: 'task',
        entityId: t.id,
        changedBy,
        previousStatus: t.status,
        newStatus: 'overdue',
        comment: 'Auto-marked as Overdue: deadline has passed',
        timestamp: nowIso,
      };
      statusLogs.push(log);

      return {
        ...t,
        status: 'overdue' as TaskStatus,
        updatedAt: nowIso,
      };
    }

    return t;
  });

  return {
    tasks: updatedTasks,
    statusLogs,
    overdueCount,
  };
}

/**
 * Pure factory helper to create a well-formed Task with defaults and initial StatusLog.
 */
export function createNewTask(
  params: Omit<Partial<Task>, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
    title: string;
    type: TaskType;
    priority?: TaskPriority;
    status?: TaskStatus;
    recurrence?: RecurrenceFrequency;
    createdBy?: string;
    now?: Date | string | number;
    generateId?: (prefix?: string) => string;
  }
): { task: Task; initialLog: StatusLog } {
  const generateId = params.generateId || defaultGenerateId;
  const nowMs = toEpochMs(params.now);
  const nowIso = new Date(nowMs).toISOString();
  const taskId = generateId('task');
  const initialStatus = params.status || 'not_started';

  const task: Task = {
    id: taskId,
    title: params.title,
    description: params.description,
    type: params.type,
    source: params.source,
    portalUrl: params.portalUrl,
    deadline: params.deadline || null,
    priority: params.priority || 'medium',
    status: initialStatus,
    recurrence: params.recurrence || 'none',
    assignedTo: params.assignedTo,
    schoolId: params.schoolId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const initialLog: StatusLog = {
    id: generateId('log'),
    entityType: 'task',
    entityId: taskId,
    changedBy: params.createdBy || 'teacher',
    previousStatus: null,
    newStatus: initialStatus,
    comment: 'Task created',
    timestamp: nowIso,
  };

  return { task, initialLog };
}
