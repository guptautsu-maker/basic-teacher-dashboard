import { TaskPriority, RecurrenceFrequency } from '../utils/taskStatusSystem';

export type GovtOrderPriority = TaskPriority;

export type GovtOrderFilter = 'all' | 'new' | 'action_needed' | 'acknowledged' | 'expired';

export interface GovtOrderAttachment {
  name: string;
  size?: string;
  type?: string;
  dataUrl?: string; // base64 or download link
}

export interface GovtOrder {
  id: string;
  orderNumber: string;
  title: string;
  date: string; // YYYY-MM-DD
  issuingOffice: string;
  deadline?: string | null; // YYYY-MM-DD
  priority: GovtOrderPriority;
  summary: string;
  attachment?: GovtOrderAttachment;
  acknowledgementRequired: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: string | null; // e.g. "30 Oct 2026, 10:15 AM"
  acknowledgedBy?: string | null; // Teacher name
  linkedTaskIds: string[]; // Tasks created from this order
  isRead?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConvertOrderToTaskInput {
  orderId: string;
  title: string;
  description?: string;
  deadline?: string | null;
  priority?: GovtOrderPriority;
  assignedTo?: string;
  recurrence?: RecurrenceFrequency;
}
