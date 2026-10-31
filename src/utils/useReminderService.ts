/**
 * React Hook & Service Provider for Reminders
 * Runs on app mount, checks periodically every 15 minutes,
 * synchronizes with LocalStorage, handles multi-channel alerts and snoozing.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReminderNotification,
  ReminderSettings,
} from '../types/reminder';
import {
  DEFAULT_REMINDER_SETTINGS,
  collectCandidateItems,
  scanAndGenerateReminders,
  snoozeReminder,
  dismissReminder,
  markReminderRead,
} from './reminderService';
import { getInitialTeacherHubTasks } from '../data/teacherHubSampleData';
import { getSampleMeetings } from './meetingsManager';
import { getSampleTrainings } from './trainingsAndDutiesManager';
import { getInitialTeacherHubGovtOrders } from '../data/teacherHubSampleData';
import { Task } from './taskStatusSystem';
import { Meeting } from '../types/meeting';
import { Training } from '../types/training';
import { GovtOrderItem } from '../data/teacherHubSampleData';

const STORAGE_KEY_NOTIFICATIONS = 'th-reminder-notifications';
const STORAGE_KEY_SETTINGS = 'th-reminder-settings';
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export interface UseReminderServiceReturn {
  notifications: ReminderNotification[];
  settings: ReminderSettings;
  unreadCount: number;
  lastCheckedAt: Date | null;
  isScanning: boolean;
  scanNow: () => Promise<number>;
  handleSnooze: (id: string, duration: '1_hour' | 'tomorrow') => void;
  handleDismiss: (id: string) => void;
  handleMarkRead: (id: string) => void;
  handleMarkAllRead: () => void;
  handleClearAll: () => void;
  updateSettings: (newSettings: Partial<ReminderSettings>) => void;
}

export const useReminderService = (
  onToast?: (msg: string) => void
): UseReminderServiceReturn => {
  // 1. Settings state
  const [settings, setSettings] = useState<ReminderSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (raw) return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_REMINDER_SETTINGS;
  });

  const saveSettings = (s: ReminderSettings) => {
    setSettings(s);
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s));
    } catch {
      // ignore
    }
  };

  // 2. Notifications state
  const [notifications, setNotifications] = useState<ReminderNotification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const saveNotifications = (list: ReminderNotification[]) => {
    setNotifications(list);
    try {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Read current app items from LocalStorage
  const loadDomainItems = useCallback(() => {
    let tasks: Task[] = [];
    let meetings: Meeting[] = [];
    let trainings: Training[] = [];
    let orders: GovtOrderItem[] = [];

    try {
      const rawTasks = localStorage.getItem('th-tasks');
      tasks = rawTasks ? JSON.parse(rawTasks) : getInitialTeacherHubTasks();
    } catch {
      tasks = getInitialTeacherHubTasks();
    }

    try {
      const rawMeetings = localStorage.getItem('th-meetings');
      meetings = rawMeetings ? JSON.parse(rawMeetings) : getSampleMeetings();
    } catch {
      meetings = getSampleMeetings();
    }

    try {
      const rawTrainings = localStorage.getItem('th-trainings');
      trainings = rawTrainings ? JSON.parse(rawTrainings) : getSampleTrainings();
    } catch {
      trainings = getSampleTrainings();
    }

    try {
      const rawOrders = localStorage.getItem('th-govt-orders');
      orders = rawOrders ? JSON.parse(rawOrders) : getInitialTeacherHubGovtOrders();
    } catch {
      orders = getInitialTeacherHubGovtOrders();
    }

    return collectCandidateItems(tasks, meetings, trainings, orders);
  }, []);

  // Core scan function
  const scanNow = useCallback(async (): Promise<number> => {
    setIsScanning(true);
    const now = new Date();
    const candidateItems = loadDomainItems();

    try {
      const result = await scanAndGenerateReminders(
        candidateItems,
        notifications,
        settings,
        now
      );

      const combined = [...result.newNotifications, ...result.updatedExisting];
      saveNotifications(combined);
      setLastCheckedAt(now);

      if (result.newGeneratedCount > 0 && onToast) {
        onToast(`🔔 ${result.newGeneratedCount} नए रिमाइंडर प्राप्त हुए (New Reminders)`);
      }

      return result.newGeneratedCount;
    } finally {
      setIsScanning(false);
    }
  }, [loadDomainItems, notifications, settings, onToast]);

  // Ref to prevent stale closures in timer
  const scanNowRef = useRef(scanNow);
  scanNowRef.current = scanNow;

  // Run on mount once and schedule every 15 minutes
  useEffect(() => {
    // Initial check on load
    scanNowRef.current();

    const intervalId = setInterval(() => {
      scanNowRef.current();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  // Action: Snooze
  const handleSnooze = useCallback(
    (id: string, duration: '1_hour' | 'tomorrow') => {
      const updated = notifications.map((n) => {
        if (n.id === id) {
          return snoozeReminder(n, duration, new Date(), settings.preferredMorningHour);
        }
        return n;
      });
      saveNotifications(updated);
      if (onToast) {
        onToast(
          duration === '1_hour'
            ? '⏰ रिमाइंडर 1 घंटे के लिए स्नूज़ किया गया'
            : '⏰ रिमाइंडर कल सुबह 8:00 बजे तक स्नूज़ किया गया'
        );
      }
    },
    [notifications, settings.preferredMorningHour, onToast]
  );

  // Action: Dismiss
  const handleDismiss = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => {
        if (n.id === id) {
          return dismissReminder(n);
        }
        return n;
      });
      saveNotifications(updated);
      if (onToast) onToast('✕ रिमाइंडर खारिज किया गया');
    },
    [notifications, onToast]
  );

  // Action: Mark Read
  const handleMarkRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => {
        if (n.id === id) {
          return markReminderRead(n);
        }
        return n;
      });
      saveNotifications(updated);
    },
    [notifications]
  );

  // Action: Mark All Read
  const handleMarkAllRead = useCallback(() => {
    const updated = notifications.map((n) =>
      n.status === 'unread' ? markReminderRead(n) : n
    );
    saveNotifications(updated);
    if (onToast) onToast('✓ सभी रिमाइंडर पढ़े हुए चिह्नित किए गए');
  }, [notifications, onToast]);

  // Action: Clear All
  const handleClearAll = useCallback(() => {
    saveNotifications([]);
    if (onToast) onToast('🗑️ सूचनाएं साफ की गईं');
  }, [onToast]);

  // Update Settings
  const updateSettings = useCallback(
    (partial: Partial<ReminderSettings>) => {
      const updated = { ...settings, ...partial };
      saveSettings(updated);
      if (onToast) onToast('⚙️ रिमाइंडर सेटिंग्स अपडेट की गईं');
    },
    [settings, onToast]
  );

  // Unread count (excluding dismissed and snoozed)
  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  return {
    notifications,
    settings,
    unreadCount,
    lastCheckedAt,
    isScanning,
    scanNow,
    handleSnooze,
    handleDismiss,
    handleMarkRead,
    handleMarkAllRead,
    handleClearAll,
    updateSettings,
  };
};
