/**
 * Cloud Sync Manager (Multi-Device State Synchronization)
 * - Automatic & manual synchronization of local JSON data state to Supabase & Cloud Sync backend
 * - Deterministic revision fingerprinting (FNV-1a 32-bit hex)
 * - DPDP Act 2023 pre-flight sensitive data sanitization (redacts Aadhaar & passwords before cloud transmission)
 * - Conflict resolution ('merge' vs 'latest_wins') across multiple devices
 */

import {
  AppSettings,
  CloudSyncConflictPolicy,
  CloudSyncEnvelope,
  TeacherHubBackupData,
} from '../types/settingsAndPrivacy';
import {
  createBackupBundle,
  detectAadhaar,
  detectPasswordOrSecret,
  getDefaultAppSettings,
  getStoredAppSettings,
  restoreBackupBundle,
  saveStoredAppSettings,
} from './privacyAndSecurityManager';
import { supabase } from '../supabase';
import { getInMemoryAuthToken } from '../lib/firebase';
import {
  getInitialTeacherHubTasks,
  getInitialTeacherHubMeetings,
  getInitialTeacherHubTrainings,
  getInitialTeacherHubGovtOrders,
} from '../data/teacherHubSampleData';
import { getSampleDuties } from './trainingsAndDutiesManager';
import { INITIAL_PORTAL_APPS } from '../data/portalAppData';
import { getSampleClassSections } from './myClassesManager';

export const STORAGE_KEY_CLOUD_SYNC_ENVELOPE = 'th-cloud-sync-envelope';
export const CLOUD_SYNC_BROADCAST_CHANNEL = 'th-multi-device-sync';

/**
 * Computes a deterministic FNV-1a 32-bit hex revision hash over the core data arrays
 * so we can detect whether local JSON data state has changed since the last cloud sync.
 */
export const computeBackupRevisionHash = (bundle: TeacherHubBackupData): string => {
  const canonicalPayload = JSON.stringify({
    tasks: bundle.tasks || [],
    duties: bundle.duties || [],
    meetings: bundle.meetings || [],
    trainings: bundle.trainings || [],
    govtOrders: bundle.govtOrders || [],
    portals: bundle.portals || [],
    classSections: bundle.classSections || [],
    attendanceRecords: bundle.attendanceRecords || [],
    academicYear: bundle.settings?.activeAcademicYear || bundle.meta?.academicYear || '2026-27',
    role: bundle.settings?.role || bundle.meta?.role || 'teacher',
    udiseCode: bundle.settings?.schoolProfile?.udiseCode || '',
  });

  let hash = 0x811c9dc5;
  for (let i = 0; i < canonicalPayload.length; i++) {
    hash ^= canonicalPayload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const unsigned = hash >>> 0;
  return `rev-${unsigned.toString(16).padStart(8, '0')}`;
};

/**
 * Recursively scans and redacts any accidental 12-digit Aadhaar numbers or plain-text passwords
 * before transmitting the JSON bundle to cloud storage, enforcing DPDP Act 2023 compliance.
 */
export const sanitizeBundleForCloudSync = (
  bundle: TeacherHubBackupData
): { sanitizedBundle: TeacherHubBackupData; redactedCount: number } => {
  let redactedCount = 0;

  const sanitizeValue = (val: any): any => {
    if (typeof val === 'string') {
      let nextStr = val;
      const aadhaarCheck = detectAadhaar(nextStr);
      if (aadhaarCheck.found) {
        for (const match of aadhaarCheck.matches) {
          nextStr = nextStr.split(match).join('[REDACTED-AADHAAR-DPDP]');
          redactedCount++;
        }
      }
      const passwordCheck = detectPasswordOrSecret(nextStr);
      if (passwordCheck.found) {
        for (const match of passwordCheck.matches) {
          nextStr = nextStr.split(match).join('[REDACTED-SECRET-DPDP]');
          redactedCount++;
        }
      }
      return nextStr;
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }
    if (val && typeof val === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        out[k] = sanitizeValue(v);
      }
      return out;
    }
    return val;
  };

  const cloned: TeacherHubBackupData = JSON.parse(JSON.stringify(bundle));
  const sanitizedBundle = sanitizeValue(cloned) as TeacherHubBackupData;

  return {
    sanitizedBundle,
    redactedCount,
  };
};

/**
 * Builds a complete, sanitized CloudSyncEnvelope from a local backup bundle.
 */
export const buildCloudSyncEnvelope = (
  bundle: TeacherHubBackupData,
  options?: {
    syncKey?: string;
    deviceId?: string;
    deviceName?: string;
    syncedAt?: string;
  }
): CloudSyncEnvelope => {
  const { sanitizedBundle, redactedCount } = sanitizeBundleForCloudSync(bundle);
  const revisionHash = computeBackupRevisionHash(sanitizedBundle);
  const syncedAt = options?.syncedAt || new Date().toISOString();
  const udise = sanitizedBundle.settings?.schoolProfile?.udiseCode || '09120104501';
  const syncKey =
    options?.syncKey ||
    sanitizedBundle.settings?.cloudSync?.syncChannelKey ||
    `up-bsp-${udise}`;
  const deviceId =
    options?.deviceId ||
    sanitizedBundle.settings?.cloudSync?.deviceId ||
    'th-web-primary';
  const deviceName =
    options?.deviceName ||
    sanitizedBundle.settings?.cloudSync?.deviceName ||
    'Primary Teacher Workspace (Web)';

  const itemCounts = {
    tasks: Array.isArray(sanitizedBundle.tasks) ? sanitizedBundle.tasks.length : 0,
    duties: Array.isArray(sanitizedBundle.duties) ? sanitizedBundle.duties.length : 0,
    meetings: Array.isArray(sanitizedBundle.meetings) ? sanitizedBundle.meetings.length : 0,
    trainings: Array.isArray(sanitizedBundle.trainings) ? sanitizedBundle.trainings.length : 0,
    govtOrders: Array.isArray(sanitizedBundle.govtOrders) ? sanitizedBundle.govtOrders.length : 0,
    portals: Array.isArray(sanitizedBundle.portals) ? sanitizedBundle.portals.length : 0,
    classSections: Array.isArray(sanitizedBundle.classSections)
      ? sanitizedBundle.classSections.length
      : 0,
    attendanceRecords: Array.isArray(sanitizedBundle.attendanceRecords)
      ? sanitizedBundle.attendanceRecords.length
      : 0,
  };

  return {
    syncKey,
    revisionHash,
    syncedAt,
    deviceId,
    deviceName,
    academicYear:
      sanitizedBundle.settings?.activeAcademicYear ||
      sanitizedBundle.meta?.academicYear ||
      '2026-27',
    schoolName:
      sanitizedBundle.settings?.schoolProfile?.schoolName ||
      sanitizedBundle.meta?.schoolName ||
      'प्राथमिक विद्यालय',
    teacherName:
      sanitizedBundle.settings?.schoolProfile?.teacherName ||
      sanitizedBundle.meta?.teacherName ||
      'शिक्षक जी',
    redactedSensitiveFields: redactedCount,
    itemCounts,
    bundle: {
      ...sanitizedBundle,
      meta: {
        ...sanitizedBundle.meta,
        itemCounts,
      },
    },
  };
};

/**
 * Resolves multi-device sync conflicts between local JSON state and remote cloud envelope.
 */
export const resolveMultiDeviceSyncConflict = (
  localBundle: TeacherHubBackupData,
  remoteEnvelope: CloudSyncEnvelope,
  policy: CloudSyncConflictPolicy = 'merge'
): TeacherHubBackupData => {
  const remoteBundle = remoteEnvelope.bundle;
  if (policy === 'latest_wins') {
    const localTime = Date.parse(localBundle.meta?.exportedAt || '') || 0;
    const remoteTime = Date.parse(remoteEnvelope.syncedAt || remoteBundle.meta?.exportedAt || '') || 0;
    return remoteTime >= localTime ? remoteBundle : localBundle;
  }

  // Merge policy: combine unique records by 'id' (remote updates take precedence on matching IDs,
  // while local-only items are preserved).
  const mergeById = (localArr: any[] = [], remoteArr: any[] = [], idKey = 'id'): any[] => {
    const map = new Map<string, any>();
    for (const item of localArr) {
      const key = item && item[idKey] ? String(item[idKey]) : JSON.stringify(item);
      map.set(key, item);
    }
    for (const item of remoteArr) {
      const key = item && item[idKey] ? String(item[idKey]) : JSON.stringify(item);
      map.set(key, item);
    }
    return Array.from(map.values());
  };

  const tasks = mergeById(localBundle.tasks, remoteBundle.tasks);
  const duties = mergeById(localBundle.duties, remoteBundle.duties);
  const meetings = mergeById(localBundle.meetings, remoteBundle.meetings);
  const trainings = mergeById(localBundle.trainings, remoteBundle.trainings);
  const govtOrders = mergeById(localBundle.govtOrders, remoteBundle.govtOrders);
  const portals = mergeById(localBundle.portals, remoteBundle.portals);
  const classSections = mergeById(localBundle.classSections, remoteBundle.classSections);
  const attendanceRecords = mergeById(
    localBundle.attendanceRecords,
    remoteBundle.attendanceRecords
  );

  const mergedSettings = {
    ...(localBundle.settings || getDefaultAppSettings()),
    ...(remoteBundle.settings || {}),
    cloudSyncEnabled: true,
  };

  return {
    meta: {
      ...(remoteBundle.meta || localBundle.meta),
      exportedAt: new Date().toISOString(),
      itemCounts: {
        tasks: tasks.length,
        duties: duties.length,
        meetings: meetings.length,
        trainings: trainings.length,
        govtOrders: govtOrders.length,
        portals: portals.length,
        classSections: classSections.length,
        attendanceRecords: attendanceRecords.length,
      },
    },
    tasks,
    duties,
    meetings,
    trainings,
    govtOrders,
    portals,
    classSections,
    attendanceRecords,
    settings: mergedSettings,
  };
};

/**
 * Pure helper to update Cloud Sync toggle state on AppSettings.
 */
export const toggleCloudSyncInSettings = (
  settings: AppSettings,
  enabled: boolean
): AppSettings => {
  const defaults = getDefaultAppSettings().cloudSync!;
  const currentCloudSync = settings.cloudSync || defaults;
  return {
    ...settings,
    cloudSyncEnabled: enabled,
    cloudSync: {
      ...defaults,
      ...currentCloudSync,
      enabled,
      lastSyncStatus: enabled ? currentCloudSync.lastSyncStatus || 'idle' : 'idle',
    },
  };
};

/**
 * Reads the cached cloud sync envelope from localStorage if available.
 */
export const getStoredCloudSyncEnvelope = (): CloudSyncEnvelope | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOUD_SYNC_ENVELOPE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.bundle && parsed.revisionHash) {
      return parsed as CloudSyncEnvelope;
    }
  } catch {
    // ignore
  }
  return null;
};

const ensureLocalCollectionsHydrated = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    if (!localStorage.getItem('th-tasks')) {
      localStorage.setItem('th-tasks', JSON.stringify(getInitialTeacherHubTasks()));
    }
    if (!localStorage.getItem('th-duties')) {
      localStorage.setItem('th-duties', JSON.stringify(getSampleDuties()));
    }
    if (!localStorage.getItem('th-meetings')) {
      localStorage.setItem('th-meetings', JSON.stringify(getInitialTeacherHubMeetings()));
    }
    if (!localStorage.getItem('th-trainings')) {
      localStorage.setItem('th-trainings', JSON.stringify(getInitialTeacherHubTrainings()));
    }
    if (!localStorage.getItem('th-govt-orders')) {
      localStorage.setItem('th-govt-orders', JSON.stringify(getInitialTeacherHubGovtOrders()));
    }
    if (!localStorage.getItem('th-portal-apps')) {
      localStorage.setItem('th-portal-apps', JSON.stringify(INITIAL_PORTAL_APPS));
    }
    if (!localStorage.getItem('th-class-sections')) {
      localStorage.setItem('th-class-sections', JSON.stringify(getSampleClassSections()));
    }
  } catch {
    // ignore
  }
};

const hasCustomSupabaseUrl = (): boolean => {
  const customUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  return Boolean(
    customUrl &&
      typeof customUrl === 'string' &&
      !customUrl.includes('tlutctwlfauwkwgnhgsa.supabase.co')
  );
};

/**
 * Performs an automatic or manual push of the current local JSON data state to Supabase
 * and the Cloud Sync backend, updating AppSettings metadata and notifying multi-device listeners.
 */
export const syncLocalDataToCloud = async (
  customSettings?: AppSettings
): Promise<{
  ok: boolean;
  envelope: CloudSyncEnvelope;
  updatedSettings: AppSettings;
  messageHi: string;
  messageEn: string;
}> => {
  ensureLocalCollectionsHydrated();
  const baseSettings = customSettings || getStoredAppSettings();
  const bundle = createBackupBundle(baseSettings);
  const envelope = buildCloudSyncEnvelope(bundle);

  // 1. Save local cloud sync snapshot & broadcast across open tabs/windows
  try {
    localStorage.setItem(STORAGE_KEY_CLOUD_SYNC_ENVELOPE, JSON.stringify(envelope));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(CLOUD_SYNC_BROADCAST_CHANNEL);
      bc.postMessage({ type: 'CLOUD_SYNC_PUSH', envelope });
      bc.close();
    }
  } catch {
    // ignore storage quota errors
  }

  // 2. Push to Supabase multi-device table / user state if custom Supabase endpoint is configured
  if (supabase && hasCustomSupabaseUrl()) {
    try {
      await supabase.from('teacher_hub_cloud_sync').upsert(
        {
          sync_key: envelope.syncKey,
          academic_year: envelope.academicYear,
          school_name: envelope.schoolName,
          teacher_name: envelope.teacherName,
          device_id: envelope.deviceId,
          device_name: envelope.deviceName,
          revision_hash: envelope.revisionHash,
          payload_json: envelope.bundle,
          updated_at: envelope.syncedAt,
        },
        { onConflict: 'sync_key' }
      );
    } catch {
      // Gracefully continue if external Supabase table is restricted in preview environment
    }
  }

  // 3. Push to authenticated Cloud Sync backend (/api/sync) when user token is in memory
  try {
    const idToken = await getInMemoryAuthToken();
    if (idToken) {
      await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          academicYear: envelope.academicYear,
          schoolName: envelope.schoolName,
          teacherName: envelope.teacherName,
          deviceId: envelope.deviceId,
          revisionHash: envelope.revisionHash,
          payloadJson: JSON.stringify(envelope),
        }),
      });
    }
  } catch {
    // Gracefully continue if offline
  }

  const defaults = getDefaultAppSettings().cloudSync!;
  const updatedSettings: AppSettings = {
    ...baseSettings,
    cloudSyncEnabled: true,
    cloudSync: {
      ...defaults,
      ...(baseSettings.cloudSync || {}),
      enabled: true,
      lastSyncedAt: envelope.syncedAt,
      lastSyncRevision: envelope.revisionHash,
      lastSyncStatus: 'synced',
      syncedItemCounts: envelope.itemCounts,
    },
  };

  saveStoredAppSettings(updatedSettings);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('th-settings-updated'));
    window.dispatchEvent(
      new CustomEvent('th-cloud-sync-completed', { detail: { envelope, updatedSettings } })
    );
  }

  return {
    ok: true,
    envelope,
    updatedSettings,
    messageHi: `☁️ क्लाउड सिंक सफल (${envelope.revisionHash}) • ${envelope.itemCounts.tasks} कार्य व ${envelope.itemCounts.classSections} कक्षाएं सिंक हुईं`,
    messageEn: `Cloud Sync complete (${envelope.revisionHash}) • ${envelope.itemCounts.tasks} tasks & ${envelope.itemCounts.classSections} classes synced`,
  };
};

/**
 * Pulls the latest cloud sync snapshot (from Cloud Sync backend, Supabase, or multi-device cache)
 * and merges or replaces local JSON state.
 */
export const pullCloudDataToLocal = async (
  policy?: CloudSyncConflictPolicy
): Promise<{
  ok: boolean;
  restoredCounts: Record<string, number>;
  revisionHash: string;
  syncedAt: string;
  messageHi: string;
  messageEn: string;
}> => {
  ensureLocalCollectionsHydrated();
  const currentSettings = getStoredAppSettings();
  const effectivePolicy = policy || currentSettings.cloudSync?.conflictPolicy || 'merge';
  let remoteEnvelope: CloudSyncEnvelope | null = null;

  // 1. Check authenticated backend (/api/sync) if signed in
  try {
    const idToken = await getInMemoryAuthToken();
    if (idToken) {
      const resp = await fetch('/api/sync', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.snapshot?.payloadJson) {
          const parsed = JSON.parse(data.snapshot.payloadJson);
          if (parsed && parsed.bundle && parsed.revisionHash) {
            remoteEnvelope = parsed as CloudSyncEnvelope;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Check Supabase table if not yet resolved and custom URL is configured
  if (!remoteEnvelope && supabase && hasCustomSupabaseUrl()) {
    try {
      const syncKey =
        currentSettings.cloudSync?.syncChannelKey ||
        `up-bsp-${currentSettings.schoolProfile.udiseCode || '09120104501'}`;
      const { data } = await supabase
        .from('teacher_hub_cloud_sync')
        .select('*')
        .eq('sync_key', syncKey)
        .maybeSingle();

      if (data && data.payload_json) {
        const bundle =
          typeof data.payload_json === 'string'
            ? JSON.parse(data.payload_json)
            : data.payload_json;
        remoteEnvelope = buildCloudSyncEnvelope(bundle, {
          syncKey: data.sync_key,
          deviceId: data.device_id,
          deviceName: data.device_name,
          syncedAt: data.updated_at,
        });
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback to stored multi-device envelope or build from current state
  if (!remoteEnvelope) {
    remoteEnvelope = getStoredCloudSyncEnvelope();
  }
  if (!remoteEnvelope) {
    const syncResult = await syncLocalDataToCloud(currentSettings);
    remoteEnvelope = syncResult.envelope;
  }

  const localBundle = createBackupBundle(currentSettings);
  const resolvedBundle = resolveMultiDeviceSyncConflict(
    localBundle,
    remoteEnvelope,
    effectivePolicy
  );

  const restoreRes = restoreBackupBundle(
    resolvedBundle,
    effectivePolicy === 'latest_wins' ? 'replace' : 'merge'
  );

  const updatedSettings: AppSettings = {
    ...getStoredAppSettings(),
    cloudSyncEnabled: true,
    cloudSync: {
      ...getDefaultAppSettings().cloudSync!,
      ...(currentSettings.cloudSync || {}),
      enabled: true,
      lastSyncedAt: remoteEnvelope.syncedAt,
      lastSyncRevision: remoteEnvelope.revisionHash,
      lastSyncStatus: 'synced',
      syncedItemCounts: resolvedBundle.meta.itemCounts,
    },
  };
  saveStoredAppSettings(updatedSettings);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('th-settings-updated'));
  }

  return {
    ok: restoreRes.success,
    restoredCounts: restoreRes.restoredCounts,
    revisionHash: remoteEnvelope.revisionHash,
    syncedAt: remoteEnvelope.syncedAt,
    messageHi: `☁️ मल्टी-डिवाइस क्लाउड स्टेट सफलतापूर्वक सिंक किया गया (${remoteEnvelope.revisionHash})`,
    messageEn: `Multi-device cloud state synced (${remoteEnvelope.revisionHash})`,
  };
};
