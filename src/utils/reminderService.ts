/**
 * Teacher Hub - Reminder Service Layer & Pure Evaluation Logic
 * Evaluates upcoming and overdue deadlines across Tasks, Meetings, Trainings, and Govt Orders,
 * triggers multi-channel delivery (In-App, Browser Push, WhatsApp/SMS adapter),
 * handles Snooze (1 hour, Tomorrow) and Dismiss operations.
 */

import {
  ReminderRule,
  ReminderChannel,
  ReminderItemType,
  ReminderNotification,
  ReminderSettings,
} from '../types/reminder';
import { Task } from '../utils/taskStatusSystem';
import { Meeting } from '../types/meeting';
import { Training } from '../types/training';
import { GovtOrderItem } from '../data/teacherHubSampleData';
import {
  defaultMessagingAdapter,
  dispatchBrowserPushNotification,
  MessagingAdapter,
} from './messagingAdapters';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  inAppEnabled: true,
  browserPushEnabled: true,
  whatsappSmsEnabled: true,
  phoneNumber: '+91 98765 43210',
  preferredMorningHour: 8, // 08:00 AM
  rulesConfig: {
    '3_days_before': true,
    '1_day_before': true,
    'same_day_morning': true,
    'overdue_daily': true,
  },
};

/**
 * Normalizes a date to YYYY-MM-DD string
 */
export const toDateOnlyStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Calculates calendar day difference between a deadline date string and current date
 * (positive means deadline is in the future, 0 is today, negative is overdue)
 */
export const calculateDaysDifference = (
  deadlineStr: string,
  now: Date = new Date()
): number => {
  if (!deadlineStr) return 999;
  const cleanDateStr = deadlineStr.slice(0, 10);
  const deadlineDate = new Date(`${cleanDateStr}T00:00:00`);
  const nowDateOnly = new Date(`${toDateOnlyStr(now)}T00:00:00`);

  const diffMs = deadlineDate.getTime() - nowDateOnly.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

export interface CandidateItem {
  id: string;
  type: ReminderItemType;
  title: string;
  deadline: string;
  isCompleted: boolean;
  actionHash: string;
  description?: string;
}

/**
 * Determines which reminder rule applies to a candidate item on the given date/time
 */
export const evaluateReminderRule = (
  item: CandidateItem,
  now: Date = new Date(),
  settings: ReminderSettings = DEFAULT_REMINDER_SETTINGS
): {
  rule: ReminderRule | null;
  daysDiff: number;
  reason?: string;
} => {
  if (item.isCompleted) {
    return { rule: null, daysDiff: 999, reason: 'Item is completed' };
  }

  if (!item.deadline) {
    return { rule: null, daysDiff: 999, reason: 'No deadline provided' };
  }

  const daysDiff = calculateDaysDifference(item.deadline, now);
  const currentHour = now.getHours();

  // 1. Overdue daily rule
  if (daysDiff < 0) {
    if (settings.rulesConfig.overdue_daily) {
      return { rule: 'overdue_daily', daysDiff, reason: 'Deadline has passed and item is not done' };
    }
  }

  // 2. Same day morning rule (today)
  if (daysDiff === 0) {
    if (settings.rulesConfig.same_day_morning) {
      // If current hour is at or after preferred morning hour (e.g. >= 8 AM)
      if (currentHour >= settings.preferredMorningHour) {
        return { rule: 'same_day_morning', daysDiff, reason: 'Due today morning alert' };
      }
    }
  }

  // 3. 1 day before rule
  if (daysDiff === 1) {
    if (settings.rulesConfig['1_day_before']) {
      return { rule: '1_day_before', daysDiff, reason: '1 day before deadline' };
    }
  }

  // 4. 3 days before rule
  if (daysDiff === 3) {
    if (settings.rulesConfig['3_days_before']) {
      return { rule: '3_days_before', daysDiff, reason: '3 days before deadline' };
    }
  }

  return { rule: null, daysDiff, reason: 'No rule matches current timing' };
};

/**
 * Generates user-facing Hindi/English reminder notification copy
 */
export const buildReminderCopy = (
  item: CandidateItem,
  rule: ReminderRule,
  daysDiff: number
): { title: string; message: string } => {
  const typeLabels: Record<ReminderItemType, string> = {
    task: 'कार्य (Task)',
    meeting: 'बैठक (Meeting)',
    training: 'प्रशिक्षण (Training)',
    govt_order: 'शासनादेश (Govt Order)',
  };

  const typeName = typeLabels[item.type] || 'कार्य';

  switch (rule) {
    case 'overdue_daily':
      return {
        title: `🔴 अंतिम तिथि समाप्त: ${item.title}`,
        message: `यह ${typeName} ${Math.abs(daysDiff)} दिन पूर्व पूर्ण होना था। कृपया प्राथमिकता से पूर्ण करें। (Deadline passed)`,
      };
    case 'same_day_morning':
      return {
        title: `⚡ आज अंतिम तिथि है: ${item.title}`,
        message: `स्मरण: आज इस ${typeName} को पूर्ण करने की अंतिम तिथि है। कृपया समय रहते निस्तारण करें। (Due Today)`,
      };
    case '1_day_before':
      return {
        title: `⏳ कल अंतिम तिथि है: ${item.title}`,
        message: `केवल 1 दिन शेष है! इस ${typeName} का नियत समय कल है। (Due Tomorrow)`,
      };
    case '3_days_before':
      return {
        title: `📅 3 दिन शेष: ${item.title}`,
        message: `अग्रिम सूचना: इस ${typeName} के लिए 3 दिन शेष हैं। योजना बनाकर कार्य आरंभ करें। (Due in 3 Days)`,
      };
  }
};

/**
 * Snoozes a reminder for either 1 hour or until tomorrow morning (08:00 AM)
 */
export const snoozeReminder = (
  notification: ReminderNotification,
  duration: '1_hour' | 'tomorrow',
  now: Date = new Date(),
  morningHour: number = 8
): ReminderNotification => {
  let snoozedUntil: Date;

  if (duration === '1_hour') {
    snoozedUntil = new Date(now.getTime() + 60 * 60 * 1000);
  } else {
    // Tomorrow morning
    snoozedUntil = new Date(now);
    snoozedUntil.setDate(snoozedUntil.getDate() + 1);
    snoozedUntil.setHours(morningHour, 0, 0, 0);
  }

  return {
    ...notification,
    status: 'snoozed',
    snoozedUntil: snoozedUntil.toISOString(),
  };
};

/**
 * Dismisses a reminder
 */
export const dismissReminder = (
  notification: ReminderNotification
): ReminderNotification => {
  return {
    ...notification,
    status: 'dismissed',
  };
};

/**
 * Marks a reminder as read
 */
export const markReminderRead = (
  notification: ReminderNotification
): ReminderNotification => {
  return {
    ...notification,
    status: 'read',
  };
};

/**
 * Evaluates candidate items and produces new or refreshed notifications
 */
export const scanAndGenerateReminders = async (
  items: CandidateItem[],
  existingNotifications: ReminderNotification[],
  settings: ReminderSettings = DEFAULT_REMINDER_SETTINGS,
  now: Date = new Date(),
  messagingAdapter: MessagingAdapter = defaultMessagingAdapter
): Promise<{
  newNotifications: ReminderNotification[];
  updatedExisting: ReminderNotification[];
  newGeneratedCount: number;
}> => {
  const todayStr = toDateOnlyStr(now);
  const updatedExisting = [...existingNotifications];
  const newNotifications: ReminderNotification[] = [];

  // Check if any snoozed reminders should now wake up
  for (let i = 0; i < updatedExisting.length; i++) {
    const notif = updatedExisting[i];
    if (notif.status === 'snoozed' && notif.snoozedUntil) {
      const wakeTime = new Date(notif.snoozedUntil);
      if (now >= wakeTime) {
        updatedExisting[i] = {
          ...notif,
          status: 'unread',
          snoozedUntil: null,
        };
      }
    }
  }

  // Scan items
  for (const item of items) {
    const evalResult = evaluateReminderRule(item, now, settings);
    if (!evalResult.rule) continue;

    const rule = evalResult.rule;
    const dedupeKey = `${item.type}-${item.id}-${rule}-${todayStr}`;

    // Check if notification already exists for this dedupeKey
    const existingIndex = updatedExisting.findIndex((n) => n.dedupeKey === dedupeKey);
    if (existingIndex !== -1) {
      // Already generated for today's rule cycle
      continue;
    }

    const copy = buildReminderCopy(item, rule, evalResult.daysDiff);
    const channelsSent: ReminderChannel[] = [];
    const dispatches: ReminderNotification['channelDispatches'] = [];

    // 1. In-App Channel
    if (settings.inAppEnabled) {
      channelsSent.push('in_app');
      dispatches.push({
        channel: 'in_app',
        status: 'delivered',
        timestamp: now.toISOString(),
        details: 'Delivered to Teacher Hub Notification Center',
      });
    }

    // 2. Browser Push Channel
    if (settings.browserPushEnabled) {
      channelsSent.push('browser_push');
      dispatchBrowserPushNotification(copy.title, copy.message, dedupeKey);
      dispatches.push({
        channel: 'browser_push',
        status: 'sent',
        timestamp: now.toISOString(),
        details: 'Sent via HTML5 Notification API',
      });
    }

    // 3. WhatsApp / SMS Channel (via pluggable adapter)
    if (settings.whatsappSmsEnabled) {
      channelsSent.push('whatsapp_sms');
      const waResult = await messagingAdapter.sendWhatsApp({
        to: settings.phoneNumber,
        title: copy.title,
        body: copy.message,
        urgency: rule === 'overdue_daily' || rule === 'same_day_morning' ? 'urgent' : 'normal',
        itemType: item.type,
        actionUrl: `https://teacherhub.in${item.actionHash}`,
      });

      dispatches.push({
        channel: 'whatsapp_sms',
        status: waResult.status,
        recipient: settings.phoneNumber,
        timestamp: waResult.timestamp,
        details: `Dispatched via ${messagingAdapter.name} (Msg ID: ${waResult.messageId})`,
      });
    }

    const newNotification: ReminderNotification = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      dedupeKey,
      itemType: item.type,
      itemId: item.id,
      itemTitle: item.title,
      itemDeadline: item.deadline,
      rule,
      title: copy.title,
      message: copy.message,
      status: 'unread',
      createdAt: now.toISOString(),
      snoozedUntil: null,
      channelsSent,
      channelDispatches: dispatches,
      actionHash: item.actionHash,
    };

    newNotifications.push(newNotification);
  }

  return {
    newNotifications,
    updatedExisting,
    newGeneratedCount: newNotifications.length,
  };
};

/**
 * Extracts candidate items from all 4 domain entities (Tasks, Meetings, Trainings, Govt Orders)
 */
export const collectCandidateItems = (
  tasks: Task[] = [],
  meetings: Meeting[] = [],
  trainings: Training[] = [],
  govtOrders: GovtOrderItem[] = []
): CandidateItem[] => {
  const items: CandidateItem[] = [];

  // 1. Tasks
  for (const t of tasks) {
    items.push({
      id: t.id,
      type: 'task',
      title: t.title,
      deadline: t.deadline || '',
      isCompleted: t.status === 'done',
      actionHash: '#dashboard',
      description: t.description,
    });
  }

  // 2. Meetings
  for (const m of meetings) {
    items.push({
      id: m.id,
      type: 'meeting',
      title: m.title,
      deadline: m.date,
      isCompleted: m.status === 'completed' || m.status === 'cancelled',
      actionHash: '#meetings',
      description: `${m.timeDisplay || m.startTime || ''} - ${m.mode === 'online' ? 'ऑनलाइन बैठक' : 'विद्यालय सभागार'}`,
    });
  }

  // 3. Trainings
  for (const tr of trainings) {
    items.push({
      id: tr.id,
      type: 'training',
      title: tr.name,
      deadline: tr.dueDate,
      isCompleted: tr.status === 'completed',
      actionHash: '#trainings',
      description: `${tr.provider} - ${tr.completedHours}/${tr.totalHours} घंटे`,
    });
  }

  // 4. Govt Orders
  for (const o of govtOrders) {
    if (o.deadline) {
      items.push({
        id: o.id,
        type: 'govt_order',
        title: o.title,
        deadline: o.deadline,
        isCompleted: o.isAcknowledged,
        actionHash: '#govt-orders',
        description: o.issuingAuthority,
      });
    }
  }

  return items;
};
