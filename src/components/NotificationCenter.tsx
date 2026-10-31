import React, { useState } from 'react';
import { ReminderNotification, ReminderSettings } from '../types/reminder';
import { getStoredMessagingLogs } from '../utils/messagingAdapters';

interface NotificationCenterProps {
  notifications: ReminderNotification[];
  settings: ReminderSettings;
  unreadCount: number;
  lastCheckedAt: Date | null;
  isScanning: boolean;
  onScanNow: () => Promise<number>;
  onSnooze: (id: string, duration: '1_hour' | 'tomorrow') => void;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onUpdateSettings: (partial: Partial<ReminderSettings>) => void;
  onNavigate?: (page: any) => void;
  onToast: (msg: string) => void;
}

const RULE_BADGES: Record<
  string,
  { labelHi: string; labelEn: string; bg: string; text: string; icon: string }
> = {
  overdue_daily: {
    labelHi: 'अंतिम तिथि समाप्त',
    labelEn: 'Overdue Daily',
    bg: 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    icon: '🔴',
  },
  same_day_morning: {
    labelHi: 'आज अंतिम तिथि है!',
    labelEn: 'Due Today',
    bg: 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-300',
    icon: '⚡',
  },
  '1_day_before': {
    labelHi: 'कल अंतिम तिथि (1 दिन शेष)',
    labelEn: '1 Day Left',
    bg: 'bg-orange-100 dark:bg-orange-950/80 border-orange-300 dark:border-orange-800',
    text: 'text-orange-800 dark:text-orange-300',
    icon: '⏳',
  },
  '3_days_before': {
    labelHi: 'अग्रिम सूचना (3 दिन शेष)',
    labelEn: '3 Days Left',
    bg: 'bg-blue-100 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    icon: '📅',
  },
};

const TYPE_ICONS: Record<string, string> = {
  task: '📝 कार्य',
  meeting: '🤝 बैठक',
  training: '🎓 प्रशिक्षण',
  govt_order: '📜 शासनादेश',
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  settings,
  unreadCount,
  lastCheckedAt,
  isScanning,
  onScanNow,
  onSnooze,
  onDismiss,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onUpdateSettings,
  onNavigate,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'unread' | 'task' | 'meeting' | 'training' | 'govt_order' | 'snoozed' | 'logs'
  >('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState(settings.phoneNumber);

  const messagingLogs = getStoredMessagingLogs();

  const handlePhoneSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ phoneNumber: phoneInput.trim() });
    onToast('📱 शिक्षक मोबाइल नंबर अपडेट किया गया');
  };

  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          onUpdateSettings({ browserPushEnabled: true });
          onToast('🔔 ब्राउज़र पुश नोटिफिकेशन की अनुमति प्राप्त हो गई!');
        } else {
          onToast('⚠️ ब्राउज़र नोटिफिकेशन अस्वीकृत है');
        }
      } catch {
        onToast('⚠️ नोटिफिकेशन अनुमति जांचने में असमर्थ');
      }
    } else {
      onToast('⚠️ यह ब्राउज़र पुश नोटिफिकेशन समर्थित नहीं करता');
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return n.status === 'unread';
    if (activeTab === 'snoozed') return n.status === 'snoozed';
    if (activeTab === 'task') return n.itemType === 'task';
    if (activeTab === 'meeting') return n.itemType === 'meeting';
    if (activeTab === 'training') return n.itemType === 'training';
    if (activeTab === 'govt_order') return n.itemType === 'govt_order';
    return n.status !== 'dismissed'; // 'all' view shows unread, read, and snoozed
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-orange-700 to-teal-800 text-white py-8 px-4 sm:px-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-white/20 text-xs font-semibold tracking-wide">
                  Multi-Channel Reminder Engine
                </span>
                <span className="text-amber-100 text-xs">• 3 दिन, 1 दिन, उसी दिन प्रातः व दैनिक ओवरड्यू</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                <span>🔔</span>
                <span>सूचना एवं रिमाइंडर केंद्र (Notification Center)</span>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black animate-bounce shadow-md">
                    {unreadCount} नए
                  </span>
                )}
              </h1>
              <p className="text-sm text-amber-100 mt-1 max-w-2xl">
                समय-सीमा आधारित अलर्ट, इन-ऐप नोटिफिकेशन, ब्राउज़र पुश और व्हाट्सएप/एसएमएस प्रेषण प्रणाली।
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
              <button
                type="button"
                onClick={() => onScanNow()}
                disabled={isScanning}
                className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-sm disabled:opacity-50"
                title="सभी कार्यों व बैठकों का रिमाइंडर तुरंत जांचें"
              >
                <span className={isScanning ? 'animate-spin' : ''}>🔄</span>
                <span>{isScanning ? 'जांच जारी...' : 'अभी जांचें (Scan)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                  isSettingsOpen
                    ? 'bg-white text-slate-900'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                <span>⚙️</span>
                <span>चैनल व नियम सेटिंग्स</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-amber-200">अपठित रिमाइंडर (Unread)</div>
              <div className="text-2xl font-black mt-1 text-white flex items-center gap-2">
                <span>{unreadCount}</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-rose-500 px-2 py-0.5 rounded-full text-white font-bold">
                    सक्रिय
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-amber-200">कुल सूचनाएं (Total)</div>
              <div className="text-2xl font-black mt-1 text-white">
                {notifications.filter((n) => n.status !== 'dismissed').length}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-amber-200">स्नूज़ किए गए (Snoozed)</div>
              <div className="text-2xl font-black mt-1 text-cyan-200">
                {notifications.filter((n) => n.status === 'snoozed').length}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-amber-200">अंतिम स्कैन (Last Checked)</div>
              <div className="text-xs font-bold mt-2 text-amber-100">
                {lastCheckedAt
                  ? lastCheckedAt.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })
                  : 'अभी जांचा गया'}
                <div className="text-[10px] font-normal text-amber-200 mt-0.5">स्वचालित: प्रत्येक 15 मिनट</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Settings Collapsible Panel */}
        {isSettingsOpen && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-300 dark:border-amber-800 p-6 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>⚙️</span>
                  <span>रिमाइंडर चैनल एवं नियम विन्यास (Reminder Settings)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  अपनी सुविधानुसार सूचना चैनल व स्वचालित अलर्ट नियम निर्धारित करें।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
              {/* Channel Toggles */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  1. सक्रिय चैनल (Active Notification Channels)
                </h4>

                {/* In-App Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📱</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        इन-ऐप अलर्ट (In-App Notifications)
                      </div>
                      <div className="text-[11px] text-slate-500">डैशबोर्ड व नोटिफिकेशन सेंटर में प्रदर्शित</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.inAppEnabled}
                    onChange={(e) => onUpdateSettings({ inAppEnabled: e.target.checked })}
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </div>

                {/* Browser Push Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        ब्राउज़र पुश नोटिफिकेशन (Browser Push)
                      </div>
                      <div className="text-[11px] text-slate-500">ब्राउज़र/फोन के नोटिफिकेशन बार में अलर्ट</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRequestPushPermission}
                      className="text-[10px] font-bold text-teal-600 hover:underline px-2 py-1 bg-teal-50 dark:bg-teal-950 rounded-lg"
                    >
                      अनुमति दें
                    </button>
                    <input
                      type="checkbox"
                      checked={settings.browserPushEnabled}
                      onChange={(e) => onUpdateSettings({ browserPushEnabled: e.target.checked })}
                      className="w-5 h-5 text-teal-600 rounded"
                    />
                  </div>
                </div>

                {/* WhatsApp / SMS Adapter Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        व्हाट्सएप व एसएमएस अलर्ट (WhatsApp & SMS)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        गेgateway एडॉप्टर द्वारा स्वचालित प्रेषण
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.whatsappSmsEnabled}
                    onChange={(e) => onUpdateSettings({ whatsappSmsEnabled: e.target.checked })}
                    className="w-5 h-5 text-teal-600 rounded"
                  />
                </div>

                {/* Phone number form */}
                <form onSubmit={handlePhoneSave} className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="शिक्षक मोबाइल नंबर (उदा. +91 98765 43210)"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    सहेजें
                  </button>
                </form>
              </div>

              {/* Rules Configuration */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  2. सक्रिय रिमाइंडर नियम (Active Reminder Rules)
                </h4>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span>📅</span>
                      <span>3 दिन पूर्व अग्रिम रिमाइंडर (3 Days Before)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.rulesConfig['3_days_before']}
                      onChange={(e) =>
                        onUpdateSettings({
                          rulesConfig: {
                            ...settings.rulesConfig,
                            '3_days_before': e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span>⏳</span>
                      <span>1 दिन पूर्व चेतावनी रिमाइंडर (1 Day Before)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.rulesConfig['1_day_before']}
                      onChange={(e) =>
                        onUpdateSettings({
                          rulesConfig: {
                            ...settings.rulesConfig,
                            '1_day_before': e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>उसी दिन प्रातः 8 बजे अर्जेंट अलर्ट (Same Day Morning)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.rulesConfig['same_day_morning']}
                      onChange={(e) =>
                        onUpdateSettings({
                          rulesConfig: {
                            ...settings.rulesConfig,
                            same_day_morning: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span>🔴</span>
                      <span>अंतिम तिथि समाप्ति पर दैनिक ओवरड्यू (Overdue Daily)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.rulesConfig['overdue_daily']}
                      onChange={(e) =>
                        onUpdateSettings({
                          rulesConfig: {
                            ...settings.rulesConfig,
                            overdue_daily: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Controls Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              सभी ({notifications.filter((n) => n.status !== 'dismissed').length})
            </button>

            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                activeTab === 'unread'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              <span>अपठित</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('task')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'task'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              📝 कार्य
            </button>

            <button
              onClick={() => setActiveTab('meeting')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'meeting'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              🤝 बैठकें
            </button>

            <button
              onClick={() => setActiveTab('training')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'training'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              🎓 प्रशिक्षण
            </button>

            <button
              onClick={() => setActiveTab('govt_order')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'govt_order'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              📜 शासनादेश
            </button>

            <button
              onClick={() => setActiveTab('snoozed')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'snoozed'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              ⏰ स्नूज़
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                activeTab === 'logs'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
              }`}
            >
              <span>💬 संदेश प्रेषण लॉग</span>
              <span className="text-[10px] font-bold">({messagingLogs.length})</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
              >
                ✓ सभी पढ़ा चिह्नित करें
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('क्या आप सभी सूचनाएं हटाना चाहते हैं?')) onClearAll();
                }}
                className="px-2.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-medium transition"
                title="सभी सूचनाएं साफ करें"
              >
                🗑️ साफ करें
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: NOTIFICATIONS LIST                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab !== 'logs' && (
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  कोई लंबित रिमाइंडर नहीं है!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  शानदार! आपके सभी कार्य, बैठकें व प्रशिक्षण समय-सीमा के भीतर हैं। नया कार्य या अंतिम तिथि जोड़ने पर स्वतः रिमाइंडर सक्रिय होगा।
                </p>
                <button
                  type="button"
                  onClick={() => onScanNow()}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition shadow-md"
                >
                  <span>🔄</span>
                  <span>पुनः रिमाइंडर स्कैन करें</span>
                </button>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const ruleMeta = RULE_BADGES[n.rule] || RULE_BADGES.same_day_morning;
                const isUnread = n.status === 'unread';
                const isSnoozed = n.status === 'snoozed';

                return (
                  <div
                    key={n.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isUnread
                        ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/20'
                        : isSnoozed
                        ? 'bg-slate-50 dark:bg-slate-900/40 border-cyan-300 dark:border-cyan-800 opacity-80'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Status indicator dot / Icon */}
                      <div className="mt-1 flex-shrink-0 text-2xl">
                        {n.itemType === 'task'
                          ? '📝'
                          : n.itemType === 'meeting'
                          ? '🤝'
                          : n.itemType === 'training'
                          ? '🎓'
                          : '📜'}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Badges bar */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Rule badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${ruleMeta.bg} ${ruleMeta.text}`}
                          >
                            <span>{ruleMeta.icon}</span>
                            <span>{ruleMeta.labelHi}</span>
                          </span>

                          {/* Item type badge */}
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                            {TYPE_ICONS[n.itemType] || n.itemType}
                          </span>

                          {/* Snooze indicator if snoozed */}
                          {isSnoozed && n.snoozedUntil && (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 text-[10px] font-bold flex items-center gap-1">
                              <span>⏰ स्नूज़ सक्रिय: </span>
                              <span>
                                {new Date(n.snoozedUntil).toLocaleTimeString('hi-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </span>
                          )}

                          {isUnread && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider">
                              नया
                            </span>
                          )}
                        </div>

                        {/* Title & Message */}
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                          {n.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {n.message}
                        </p>

                        {/* Dispatches & Channels */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400">
                          <span>नियत तिथि: {n.itemDeadline?.slice(0, 10)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span>प्रेषित चैनल:</span>
                            {n.channelsSent.map((c) => (
                              <span
                                key={c}
                                className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
                              >
                                {c === 'in_app'
                                  ? '📱 ऐप'
                                  : c === 'browser_push'
                                  ? '🔔 पुश'
                                  : '💬 व्हाट्सएप'}
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions toolbar */}
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Snooze 1 hour */}
                      <button
                        type="button"
                        onClick={() => onSnooze(n.id, '1_hour')}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1"
                        title="1 घंटे के लिए स्नूज़ करें"
                      >
                        <span>⏰</span>
                        <span>1 घंटा</span>
                      </button>

                      {/* Snooze tomorrow */}
                      <button
                        type="button"
                        onClick={() => onSnooze(n.id, 'tomorrow')}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center gap-1"
                        title="कल सुबह 8:00 बजे तक स्नूज़ करें"
                      >
                        <span>☀️</span>
                        <span>कल तक</span>
                      </button>

                      {/* Go to item */}
                      {onNavigate && n.actionHash && (
                        <button
                          type="button"
                          onClick={() => {
                            onMarkRead(n.id);
                            const page = (n.actionHash || '').replace('#', '').replace('-', '_');
                            onNavigate(
                              page === 'govt_orders'
                                ? 'govt_orders'
                                : page === 'meetings'
                                ? 'meetings'
                                : page === 'trainings'
                                ? 'trainings'
                                : 'dashboard'
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1"
                        >
                          <span>🔗</span>
                          <span>देखें</span>
                        </button>
                      )}

                      {/* Dismiss */}
                      <button
                        type="button"
                        onClick={() => onDismiss(n.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition"
                        title="रिमाइंडर खारिज करें"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: OUTBOUND MESSAGING AUDIT LOG (WHATSAPP & SMS)         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>💬</span>
                  <span>व्हाट्सएप एवं एसएमएस प्रेषण ऑडिट लॉग (Outbox Audit Trail)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  प्लग-एंड-प्ले एडॉप्टर द्वारा शिक्षक के पंजीकृत नंबर पर भेजे गए स्वचालित अलर्ट्स का विवरण।
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                Mock Gateway (Ready for Twilio / Meta Cloud API)
              </span>
            </div>

            {messagingLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                संदेश लॉग अभी खाली है। नए रिमाइंडर जनरेट होने पर यहाँ विवरण प्रदर्शित होगा।
              </div>
            ) : (
              <div className="space-y-3">
                {messagingLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] uppercase">
                          {log.channel === 'whatsapp' ? '💬 WhatsApp' : '✉️ SMS'}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          To: {log.recipient}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('hi-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-100">{log.title}</div>
                      <div className="text-slate-600 dark:text-slate-300">{log.body}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                        ✓ {log.status} (सिम्युलेटेड)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
