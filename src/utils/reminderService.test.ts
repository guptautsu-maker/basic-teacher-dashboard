import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateReminderRule,
  calculateDaysDifference,
  buildReminderCopy,
  snoozeReminder,
  dismissReminder,
  markReminderRead,
  scanAndGenerateReminders,
  CandidateItem,
  DEFAULT_REMINDER_SETTINGS,
} from './reminderService';
import { MockWhatsAppSmsAdapter } from './messagingAdapters';
import { ReminderNotification } from '../types/reminder';

describe('Reminders System - Pure Logic & Service Layer', () => {
  const baseDate = new Date('2026-10-31T09:00:00'); // 09:00 AM on 31 Oct 2026

  describe('1. Days Difference Calculation', () => {
    it('calculates 0 for same day', () => {
      assert.strictEqual(calculateDaysDifference('2026-10-31', baseDate), 0);
    });

    it('calculates 1 for tomorrow', () => {
      assert.strictEqual(calculateDaysDifference('2026-11-01', baseDate), 1);
    });

    it('calculates 3 for 3 days ahead', () => {
      assert.strictEqual(calculateDaysDifference('2026-11-03', baseDate), 3);
    });

    it('calculates negative for past overdue dates', () => {
      assert.strictEqual(calculateDaysDifference('2026-10-29', baseDate), -2);
    });
  });

  describe('2. Reminder Rules Evaluation', () => {
    const makeItem = (deadline: string, isCompleted = false): CandidateItem => ({
      id: 'task-101',
      type: 'task',
      title: 'निपुण भारत रिपोर्ट अपलोड करें',
      deadline,
      isCompleted,
      actionHash: '#dashboard',
    });

    it('evaluates rule 3_days_before when deadline is 3 days ahead', () => {
      const item = makeItem('2026-11-03'); // 3 days after 31 Oct
      const res = evaluateReminderRule(item, baseDate);
      assert.strictEqual(res.rule, '3_days_before');
      assert.strictEqual(res.daysDiff, 3);
    });

    it('evaluates rule 1_day_before when deadline is 1 day ahead', () => {
      const item = makeItem('2026-11-01'); // 1 day after 31 Oct
      const res = evaluateReminderRule(item, baseDate);
      assert.strictEqual(res.rule, '1_day_before');
      assert.strictEqual(res.daysDiff, 1);
    });

    it('evaluates rule same_day_morning when deadline is today and time is morning', () => {
      const morningTime = new Date('2026-10-31T08:30:00'); // 08:30 AM
      const item = makeItem('2026-10-31');
      const res = evaluateReminderRule(item, morningTime);
      assert.strictEqual(res.rule, 'same_day_morning');
      assert.strictEqual(res.daysDiff, 0);
    });

    it('does not trigger same_day_morning before the preferred morning hour', () => {
      const earlyMorningTime = new Date('2026-10-31T06:30:00'); // 06:30 AM (before 8 AM)
      const item = makeItem('2026-10-31');
      const res = evaluateReminderRule(item, earlyMorningTime);
      assert.strictEqual(res.rule, null);
    });

    it('evaluates rule overdue_daily when deadline is in the past', () => {
      const item = makeItem('2026-10-28'); // 3 days ago
      const res = evaluateReminderRule(item, baseDate);
      assert.strictEqual(res.rule, 'overdue_daily');
      assert.strictEqual(res.daysDiff, -3);
    });

    it('does not evaluate any rule when item is completed', () => {
      const item = makeItem('2026-10-28', true); // completed
      const res = evaluateReminderRule(item, baseDate);
      assert.strictEqual(res.rule, null);
    });
  });

  describe('3. Copy Generation (Hindi & English)', () => {
    const item: CandidateItem = {
      id: 'task-1',
      type: 'task',
      title: 'MDM मासिक रिपोर्ट',
      deadline: '2026-11-01',
      isCompleted: false,
      actionHash: '#dashboard',
    };

    it('generates 1_day_before copy with proper alert message', () => {
      const copy = buildReminderCopy(item, '1_day_before', 1);
      assert.ok(copy.title.includes('कल अंतिम तिथि है'));
      assert.ok(copy.message.includes('केवल 1 दिन शेष'));
    });

    it('generates overdue_daily copy with days overdue', () => {
      const copy = buildReminderCopy(item, 'overdue_daily', -2);
      assert.ok(copy.title.includes('अंतिम तिथि समाप्त'));
      assert.ok(copy.message.includes('2 दिन पूर्व'));
    });
  });

  describe('4. Snooze & Dismiss Operations', () => {
    const initialNotification: ReminderNotification = {
      id: 'rem-1',
      dedupeKey: 'task-1-1_day_before-2026-10-31',
      itemType: 'task',
      itemId: 'task-1',
      itemTitle: 'MDM मासिक रिपोर्ट',
      itemDeadline: '2026-11-01',
      rule: '1_day_before',
      title: 'कल अंतिम तिथि है',
      message: 'विवरण',
      status: 'unread',
      createdAt: baseDate.toISOString(),
      channelsSent: ['in_app'],
      channelDispatches: [],
    };

    it('snoozes for 1 hour correctly', () => {
      const snoozed = snoozeReminder(initialNotification, '1_hour', baseDate);
      assert.strictEqual(snoozed.status, 'snoozed');
      assert.ok(snoozed.snoozedUntil);
      const diffMs = new Date(snoozed.snoozedUntil).getTime() - baseDate.getTime();
      assert.strictEqual(diffMs, 60 * 60 * 1000); // exactly 1 hour
    });

    it('snoozes for tomorrow morning at 08:00 AM', () => {
      const snoozed = snoozeReminder(initialNotification, 'tomorrow', baseDate, 8);
      assert.strictEqual(snoozed.status, 'snoozed');
      assert.ok(snoozed.snoozedUntil);
      const wakeDate = new Date(snoozed.snoozedUntil);
      assert.strictEqual(wakeDate.getDate(), 1); // 1st Nov
      assert.strictEqual(wakeDate.getHours(), 8);
    });

    it('dismisses notification correctly', () => {
      const dismissed = dismissReminder(initialNotification);
      assert.strictEqual(dismissed.status, 'dismissed');
    });

    it('marks notification as read', () => {
      const read = markReminderRead(initialNotification);
      assert.strictEqual(read.status, 'read');
    });
  });

  describe('5. Multi-Channel Dispatch & Deduplication', () => {
    it('generates new notifications and dispatches via mock WhatsApp adapter', async () => {
      const mockAdapter = new MockWhatsAppSmsAdapter();
      const items: CandidateItem[] = [
        {
          id: 'task-a',
          type: 'task',
          title: 'कक्षा 5 प्रगति पत्रक',
          deadline: '2026-11-01', // 1 day before
          isCompleted: false,
          actionHash: '#dashboard',
        },
      ];

      const result = await scanAndGenerateReminders(
        items,
        [],
        DEFAULT_REMINDER_SETTINGS,
        baseDate,
        mockAdapter
      );

      assert.strictEqual(result.newGeneratedCount, 1);
      assert.strictEqual(result.newNotifications.length, 1);
      const notif = result.newNotifications[0];
      assert.strictEqual(notif.rule, '1_day_before');
      assert.ok(notif.channelsSent.includes('in_app'));
      assert.ok(notif.channelsSent.includes('whatsapp_sms'));
    });

    it('does NOT duplicate notifications for the same dedupeKey', async () => {
      const mockAdapter = new MockWhatsAppSmsAdapter();
      const items: CandidateItem[] = [
        {
          id: 'task-a',
          type: 'task',
          title: 'कक्षा 5 प्रगति पत्रक',
          deadline: '2026-11-01',
          isCompleted: false,
          actionHash: '#dashboard',
        },
      ];

      const existingNotif: ReminderNotification = {
        id: 'existing-1',
        dedupeKey: 'task-task-a-1_day_before-2026-10-31',
        itemType: 'task',
        itemId: 'task-a',
        itemTitle: 'कक्षा 5 प्रगति पत्रक',
        itemDeadline: '2026-11-01',
        rule: '1_day_before',
        title: 'Title',
        message: 'Message',
        status: 'read',
        createdAt: baseDate.toISOString(),
        channelsSent: ['in_app'],
        channelDispatches: [],
      };

      const result = await scanAndGenerateReminders(
        items,
        [existingNotif],
        DEFAULT_REMINDER_SETTINGS,
        baseDate,
        mockAdapter
      );

      assert.strictEqual(result.newGeneratedCount, 0);
      assert.strictEqual(result.newNotifications.length, 0);
    });
  });
});
