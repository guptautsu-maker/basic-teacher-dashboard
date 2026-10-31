/**
 * Teacher Hub - Abstract Messaging Adapters (WhatsApp & SMS)
 * Provides an extensible interface and mock implementation for MVP,
 * ready to plug into real enterprise SMS / WhatsApp gateways (Meta Cloud API, Gupshup, Twilio, Fast2SMS).
 */

import {
  WhatsAppSmsMessage,
  AdapterDispatchResult,
  MessagingLogEntry,
} from '../types/reminder';

/**
 * Standard interface for WhatsApp & SMS Gateway Adapters
 */
export interface MessagingAdapter {
  readonly name: string;
  readonly isMock: boolean;
  isConfigured(): boolean;
  sendWhatsApp(message: WhatsAppSmsMessage): Promise<AdapterDispatchResult>;
  sendSms(message: WhatsAppSmsMessage): Promise<AdapterDispatchResult>;
}

const STORAGE_KEY_LOGS = 'th-messaging-logs';

/**
 * Helper to retrieve stored outbound messaging audit logs
 */
export const getStoredMessagingLogs = (): MessagingLogEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
};

/**
 * Helper to persist outbound messaging audit logs
 */
export const appendMessagingLog = (entry: MessagingLogEntry): void => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredMessagingLogs();
    const updated = [entry, ...existing].slice(0, 50); // keep last 50
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

/**
 * Mock WhatsApp & SMS Adapter for MVP
 * In production, this can be swapped with:
 *  - Meta WhatsApp Business Cloud API (`POST https://graph.facebook.com/v18.0/{phone-number-id}/messages`)
 *  - Gupshup Enterprise WhatsApp & SMS API
 *  - Twilio Programmable Messaging
 *  - Fast2SMS / CDAC Gov SMS Gateway
 */
export class MockWhatsAppSmsAdapter implements MessagingAdapter {
  readonly name = 'Mock Gateway (Meta WhatsApp & CDAC SMS Ready)';
  readonly isMock = true;

  isConfigured(): boolean {
    return true; // Mock is always ready
  }

  async sendWhatsApp(message: WhatsAppSmsMessage): Promise<AdapterDispatchResult> {
    const messageId = `wa-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = new Date().toISOString();

    const logEntry: MessagingLogEntry = {
      id: messageId,
      channel: 'whatsapp',
      recipient: message.to || '+91 98765 43210',
      title: message.title,
      body: message.body,
      urgency: message.urgency,
      status: 'simulated',
      timestamp,
      provider: 'Mock WhatsApp Cloud API Adapter',
    };

    appendMessagingLog(logEntry);

    return {
      success: true,
      channel: 'whatsapp',
      messageId,
      status: 'simulated',
      timestamp,
    };
  }

  async sendSms(message: WhatsAppSmsMessage): Promise<AdapterDispatchResult> {
    const messageId = `sms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = new Date().toISOString();

    const logEntry: MessagingLogEntry = {
      id: messageId,
      channel: 'sms',
      recipient: message.to || '+91 98765 43210',
      title: message.title,
      body: message.body,
      urgency: message.urgency,
      status: 'simulated',
      timestamp,
      provider: 'Mock Gov SMS Gateway Adapter',
    };

    appendMessagingLog(logEntry);

    return {
      success: true,
      channel: 'sms',
      messageId,
      status: 'simulated',
      timestamp,
    };
  }
}

/**
 * Singleton instance of the active messaging adapter
 */
export const defaultMessagingAdapter: MessagingAdapter = new MockWhatsAppSmsAdapter();

/**
 * Browser Push Notification Dispatcher
 * Dispatches HTML5 Notification API if granted, or requests permission
 */
export const dispatchBrowserPushNotification = async (
  title: string,
  body: string,
  tag?: string
): Promise<{ success: boolean; state: 'granted' | 'denied' | 'default' | 'unsupported' }> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { success: false, state: 'unsupported' };
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: tag || 'teacher-hub-reminder',
      });
      return { success: true, state: 'granted' };
    } catch {
      return { success: false, state: 'granted' };
    }
  }

  if (Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: tag || 'teacher-hub-reminder',
        });
        return { success: true, state: 'granted' };
      }
      return { success: false, state: permission };
    } catch {
      return { success: false, state: 'default' };
    }
  }

  return { success: false, state: 'denied' };
};
