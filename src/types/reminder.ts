/**
 * Teacher Hub - Reminders & Notifications Types
 */

export type ReminderRule =
  | '3_days_before'
  | '1_day_before'
  | 'same_day_morning'
  | 'overdue_daily';

export type ReminderChannel = 'in_app' | 'browser_push' | 'whatsapp_sms';

export type ReminderItemType = 'task' | 'meeting' | 'training' | 'govt_order';

export type ReminderStatus = 'unread' | 'read' | 'snoozed' | 'dismissed';

export interface ChannelDispatchRecord {
  channel: ReminderChannel;
  status: 'delivered' | 'sent' | 'queued' | 'simulated' | 'failed';
  recipient?: string;
  timestamp: string;
  details?: string;
}

export interface ReminderNotification {
  id: string;
  dedupeKey: string; // e.g. "task-t1-1_day_before-2026-10-31"
  itemType: ReminderItemType;
  itemId: string;
  itemTitle: string;
  itemDeadline: string; // YYYY-MM-DD or date-time
  rule: ReminderRule;
  title: string;
  message: string;
  status: ReminderStatus;
  createdAt: string; // ISO
  snoozedUntil?: string | null; // ISO
  channelsSent: ReminderChannel[];
  channelDispatches: ChannelDispatchRecord[];
  actionHash?: string; // hash navigation target e.g. '#dashboard', '#meetings', etc.
}

export interface ReminderSettings {
  inAppEnabled: boolean;
  browserPushEnabled: boolean;
  whatsappSmsEnabled: boolean;
  phoneNumber: string; // Teacher mobile for WhatsApp/SMS reminders
  preferredMorningHour: number; // e.g. 8 for 08:00 AM
  rulesConfig: {
    '3_days_before': boolean;
    '1_day_before': boolean;
    'same_day_morning': boolean;
    'overdue_daily': boolean;
  };
}

export interface WhatsAppSmsMessage {
  to: string;
  title: string;
  body: string;
  urgency: 'normal' | 'urgent';
  itemType: ReminderItemType;
  actionUrl?: string;
}

export interface AdapterDispatchResult {
  success: boolean;
  channel: 'whatsapp' | 'sms';
  messageId: string;
  status: 'sent' | 'queued' | 'simulated' | 'failed';
  timestamp: string;
  error?: string;
}

export interface MessagingLogEntry {
  id: string;
  channel: 'whatsapp' | 'sms';
  recipient: string;
  title: string;
  body: string;
  urgency: 'normal' | 'urgent';
  status: 'sent' | 'queued' | 'simulated' | 'failed';
  timestamp: string;
  provider: string; // e.g. "MockGateway (Ready for Meta Cloud API / Gupshup / Twilio)"
}
