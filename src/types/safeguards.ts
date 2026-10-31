/**
 * Teacher Hub - Safeguards System Types
 * Prevents missed deadlines with Start-of-Day, End-of-Day, Weekly Review,
 * >3 Day Escalation, Global Search, and Inspection-ready Pending Reports.
 */

import { Task, TaskPriority, TaskStatus } from '../utils/taskStatusSystem';
import { Duty } from './duty';
import { MeetingItem, TrainingItem, GovtOrderItem } from '../data/teacherHubSampleData';
import { PortalApp } from './portalApp';
import { ClassSection } from './classSection';

export interface StartOfDayItem {
  id: string;
  sourceType: 'task' | 'duty' | 'meeting';
  title: string;
  subtitle: string;
  priority: TaskPriority;
  status: 'pending' | 'completed';
  timeLabel?: string;
  portalUrl?: string;
  originalId: string;
}

export type EndOfDayAction = 'done' | 'move_tomorrow' | 'move_next_week' | 'mark_blocked';

export interface EndOfDayReviewItem {
  task: Task;
  suggestedAction: EndOfDayAction;
  selectedAction?: EndOfDayAction;
  comment?: string;
  isResolved: boolean;
}

export interface WeeklyCategoryStat {
  category: string;
  total: number;
  done: number;
  pending: number;
  overdue: number;
}

export interface WeeklySummaryReport {
  weekLabel: string; // e.g. "25 Oct - 31 Oct 2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalTasks: number;
  doneTasks: Task[];
  pendingTasks: Task[];
  overdueTasks: Task[];
  completionRatePercent: number;
  categoryBreakdown: WeeklyCategoryStat[];
  insights: string[];
}

export interface CriticalEscalationItem {
  task: Task;
  daysOverdue: number;
  deadlineDateStr: string;
  severity: 'critical' | 'severe';
  recommendedAction: string;
}

export type SearchModuleType = 'task' | 'order' | 'meeting' | 'training' | 'portal' | 'class';

export interface GlobalSearchResultItem {
  id: string;
  module: SearchModuleType;
  moduleLabelHi: string;
  moduleLabelEn: string;
  title: string;
  snippet: string;
  badgeText?: string;
  badgeColor?: string;
  dateStr?: string;
  actionUrlOrHash?: string;
}

export interface GlobalSearchAggregatedResults {
  query: string;
  totalCount: number;
  items: GlobalSearchResultItem[];
  countsByModule: Record<SearchModuleType, number>;
}

export interface PendingWorkReportData {
  generatedAt: string;
  schoolName: string;
  teacherName: string;
  academicYear: string;
  criticalTasks: CriticalEscalationItem[];
  highPriorityPendingTasks: Task[];
  allPendingTasks: Task[];
  pendingDuties: Duty[];
  trainingsNearingDeadline: TrainingItem[];
  unreadGovtOrders: GovtOrderItem[];
}
