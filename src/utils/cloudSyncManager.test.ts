import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBackupRevisionHash,
  sanitizeBundleForCloudSync,
  buildCloudSyncEnvelope,
  resolveMultiDeviceSyncConflict,
  toggleCloudSyncInSettings,
} from './cloudSyncManager';
import { getDefaultAppSettings } from './privacyAndSecurityManager';
import { TeacherHubBackupData } from '../types/settingsAndPrivacy';

const createSampleBundle = (overrides?: Partial<TeacherHubBackupData>): TeacherHubBackupData => {
  const settings = getDefaultAppSettings();
  return {
    meta: {
      version: '1.0.0',
      exportedAt: '2026-10-31T10:00:00.000Z',
      app: 'Teacher Hub - Basic Shiksha Parishad',
      academicYear: '2026-27',
      schoolName: settings.schoolProfile.schoolName,
      teacherName: settings.schoolProfile.teacherName,
      role: 'teacher',
      itemCounts: {
        tasks: 2,
        duties: 1,
        meetings: 1,
        trainings: 1,
        govtOrders: 1,
        portals: 1,
        classSections: 2,
        attendanceRecords: 1,
      },
    },
    tasks: [
      { id: 't-1', title: 'UDISE+ Student Verification', status: 'pending', category: 'Administrative' },
      { id: 't-2', title: 'NIPUN Lakshya Assessment Class 3', status: 'in_progress', category: 'Academic' },
    ],
    duties: [{ id: 'd-1', title: 'MDM Tasting Duty' }],
    meetings: [{ id: 'm-1', title: 'SMC Monthly Meeting' }],
    trainings: [{ id: 'tr-1', title: 'DIKSHA FLN Module 4' }],
    govtOrders: [{ id: 'go-1', title: 'BSA Lucknow Circular' }],
    portals: [{ id: 'p-1', name: 'Prerna UP' }],
    classSections: [
      { id: 'c-1', className: 'Class 3A' },
      { id: 'c-2', className: 'Class 5B' },
    ],
    attendanceRecords: [{ id: 'att-1', date: '2026-10-31', presentCount: 38 }],
    settings,
    ...overrides,
  };
};

test('computeBackupRevisionHash generates deterministic hash and changes when local JSON state mutates', () => {
  const bundle1 = createSampleBundle();
  const bundle2 = createSampleBundle();
  assert.equal(computeBackupRevisionHash(bundle1), computeBackupRevisionHash(bundle2));
  assert.match(computeBackupRevisionHash(bundle1), /^rev-[0-9a-f]{8}$/);

  const mutatedBundle = createSampleBundle({
    tasks: [
      ...bundle1.tasks,
      { id: 't-3', title: 'Sports Day Preparation', status: 'pending', category: 'Extra-curricular' },
    ],
  });
  assert.notEqual(computeBackupRevisionHash(bundle1), computeBackupRevisionHash(mutatedBundle));
});

test('sanitizeBundleForCloudSync redacts accidental Aadhaar numbers and passwords before cloud sync', () => {
  const unsafeBundle = createSampleBundle({
    tasks: [
      {
        id: 't-unsafe',
        title: 'Verify student record 5432 1234 5678 and portal password: secret99',
        status: 'pending',
      },
    ],
  });

  const { sanitizedBundle, redactedCount } = sanitizeBundleForCloudSync(unsafeBundle);
  assert.equal(redactedCount, 2);
  const sanitizedTitle = sanitizedBundle.tasks[0].title as string;
  assert.equal(sanitizedTitle.includes('5432 1234 5678'), false);
  assert.equal(sanitizedTitle.includes('secret99'), false);
  assert.equal(sanitizedTitle.includes('[REDACTED-AADHAAR-DPDP]'), true);
  assert.equal(sanitizedTitle.includes('[REDACTED-SECRET-DPDP]'), true);
});

test('buildCloudSyncEnvelope constructs valid multi-device sync envelope with accurate item counts', () => {
  const bundle = createSampleBundle();
  const envelope = buildCloudSyncEnvelope(bundle, {
    syncKey: 'up-bsp-09120104501',
    deviceId: 'device-laptop-1',
    deviceName: 'School Laptop',
    syncedAt: '2026-10-31T12:00:00.000Z',
  });

  assert.equal(envelope.syncKey, 'up-bsp-09120104501');
  assert.equal(envelope.deviceId, 'device-laptop-1');
  assert.equal(envelope.itemCounts.tasks, 2);
  assert.equal(envelope.itemCounts.classSections, 2);
  assert.equal(envelope.redactedSensitiveFields, 0);
});

test('resolveMultiDeviceSyncConflict merges records across devices without data loss under merge policy', () => {
  const localBundle = createSampleBundle({
    tasks: [
      { id: 't-1', title: 'Local Task 1', status: 'pending' },
      { id: 't-local-only', title: 'Offline Task Added on Phone', status: 'pending' },
    ],
  });

  const remoteBundle = createSampleBundle({
    tasks: [
      { id: 't-1', title: 'Remote Updated Task 1', status: 'completed' },
      { id: 't-remote-only', title: 'Task Added on School Desktop', status: 'in_progress' },
    ],
  });

  const remoteEnvelope = buildCloudSyncEnvelope(remoteBundle, {
    syncedAt: '2026-10-31T15:00:00.000Z',
  });

  const merged = resolveMultiDeviceSyncConflict(localBundle, remoteEnvelope, 'merge');
  assert.equal(merged.tasks.length, 3);
  const task1 = merged.tasks.find((t: any) => t.id === 't-1');
  assert.equal(task1.status, 'completed');
  assert.equal(merged.tasks.some((t: any) => t.id === 't-local-only'), true);
  assert.equal(merged.tasks.some((t: any) => t.id === 't-remote-only'), true);
});

test('toggleCloudSyncInSettings updates both top-level cloudSyncEnabled and nested cloudSync preferences', () => {
  const initial = getDefaultAppSettings();
  assert.equal(initial.cloudSyncEnabled, false);
  assert.equal(initial.cloudSync?.enabled, false);

  const enabledState = toggleCloudSyncInSettings(initial, true);
  assert.equal(enabledState.cloudSyncEnabled, true);
  assert.equal(enabledState.cloudSync?.enabled, true);

  const disabledState = toggleCloudSyncInSettings(enabledState, false);
  assert.equal(disabledState.cloudSyncEnabled, false);
  assert.equal(disabledState.cloudSync?.enabled, false);
});
