import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAadhaar,
  detectPasswordOrSecret,
  validateSensitiveData,
  getDPDPAuditNotice,
  getDefaultAppSettings,
  createBackupBundle,
  validateBackupData,
  restoreBackupBundle,
} from './privacyAndSecurityManager';

describe('Privacy & Security Manager - Pure Functions & Unit Tests', () => {
  describe('1. Aadhaar Number Detection & Blocking', () => {
    it('detects 12-digit formatted Aadhaar numbers with spaces', () => {
      const res = detectAadhaar('छात्र का आधार कार्ड नंबर 5432 1234 5678 है');
      assert.equal(res.found, true);
      assert.equal(res.matches.length, 1);
      assert.equal(res.matches[0], '5432 1234 5678');
    });

    it('detects 12-digit formatted Aadhaar numbers with hyphens', () => {
      const res = detectAadhaar('Student Aadhaar: 9876-5432-1098');
      assert.equal(res.found, true);
      assert.equal(res.matches.length, 1);
      assert.equal(res.matches[0], '9876-5432-1098');
    });

    it('detects raw 12-digit contiguous Aadhaar numbers', () => {
      const res = detectAadhaar('कृपया सत्यापन हेतु 456712348901 नोट करें');
      assert.equal(res.found, true);
      assert.equal(res.matches[0], '456712348901');
    });

    it('ignores benign numbers that are not 12-digits', () => {
      const res1 = detectAadhaar('रोल नंबर 1234 और मोबाइल 9876543210');
      assert.equal(res1.found, false);

      const res2 = detectAadhaar('UDISE कोड 09120104501 (11 अंक)');
      assert.equal(res2.found, false);
    });
  });

  describe('2. Password & Secret Detection', () => {
    it('detects password labeled with colon', () => {
      const res = detectPasswordOrSecret('प्रेरणा पोर्टल पासवर्ड: SchoolSecret123');
      assert.equal(res.found, true);
      assert.equal(res.matches.length >= 1, true);
    });

    it('detects english "password is" and "pwd:" patterns', () => {
      const res1 = detectPasswordOrSecret('login password is mySecurePass!');
      assert.equal(res1.found, true);

      const res2 = detectPasswordOrSecret('portal pwd: Pass@2026');
      assert.equal(res2.found, true);
    });

    it('detects PIN numbers or passcodes', () => {
      const res = detectPasswordOrSecret('खाता pin: 4321');
      assert.equal(res.found, true);
    });

    it('does not flag ordinary text without secret identifiers', () => {
      const res = detectPasswordOrSecret('आज विद्यालय में सामान्य पठन-पाठन कार्य संपन्न हुआ।');
      assert.equal(res.found, false);
    });
  });

  describe('3. Combined Sensitive Data Validation & DPDP Blocking', () => {
    it('returns isValid: true when text is safe and clean', () => {
      const res = validateSensitiveData('गणित शिक्षण कार्य व मध्याह्न भोजन वितरण');
      assert.equal(res.isValid, true);
      assert.equal(res.violations.length, 0);
      assert.equal(res.hasAadhaar, false);
      assert.equal(res.hasPassword, false);
    });

    it('blocks text containing Aadhaar and returns DPDP Act 2023 violation message', () => {
      const res = validateSensitiveData('अमित का आधार 6543 9876 1234 सत्यापित करना है');
      assert.equal(res.isValid, false);
      assert.equal(res.hasAadhaar, true);
      assert.equal(res.violations.length, 1);
      assert.match(res.errorSummaryHi, /आधार नंबर दर्ज करना प्रतिबंधित है/);
      assert.match(res.errorSummaryHi, /DPDP/);
    });

    it('blocks text containing password and returns security notice', () => {
      const res = validateSensitiveData('पोर्टल पासवर्ड: AdminPass@123');
      assert.equal(res.isValid, false);
      assert.equal(res.hasPassword, true);
      assert.match(res.errorSummaryHi, /पासवर्ड या सुरक्षा क्रेडेंशियल दर्ज करना प्रतिबंधित है/);
    });

    it('blocks text containing both Aadhaar and password with multiple violations', () => {
      const res = validateSensitiveData('आधार 5432 1234 5678 और पासवर्ड: SuperSecret');
      assert.equal(res.isValid, false);
      assert.equal(res.hasAadhaar, true);
      assert.equal(res.hasPassword, true);
      assert.equal(res.violations.length, 2);
    });
  });

  describe('4. DPDP Act 2023 Notice & Principles', () => {
    it('provides comprehensive DPDP Act 2023 principles and prohibitions', () => {
      const notice = getDPDPAuditNotice();
      assert.equal(notice.year, 2023);
      assert.equal(notice.principles.length >= 5, true);

      const keys = notice.principles.map((p) => p.key);
      assert.equal(keys.includes('data_minimization'), true);
      assert.equal(keys.includes('purpose_limitation'), true);
      assert.equal(keys.includes('storage_limitation'), true);
      assert.equal(keys.includes('children_protection'), true);

      assert.equal(notice.prohibitions.items.length >= 3, true);
    });
  });

  describe('5. App Settings & Default Configuration', () => {
    it('initializes default settings with Teacher role and bilingual language', () => {
      const settings = getDefaultAppSettings();
      assert.equal(settings.role, 'teacher');
      assert.equal(settings.language, 'bilingual');
      assert.equal(settings.activeAcademicYear, '2026-27');
      assert.equal(settings.schoolProfile.role, 'teacher');
      assert.equal(settings.notifications.inAppAlerts, true);
      assert.equal(settings.notifications.leadTimes.threeDaysBefore, true);
    });
  });

  describe('6. Local JSON Backup & Validation', () => {
    it('creates a valid structured backup bundle with metadata', () => {
      const bundle = createBackupBundle();
      assert.equal(bundle.meta.app.includes('Teacher Hub'), true);
      assert.equal(bundle.meta.version, '1.0.0');
      assert.equal(typeof bundle.meta.exportedAt, 'string');
      assert.equal(Array.isArray(bundle.tasks), true);
      assert.equal(Array.isArray(bundle.meetings), true);
    });

    it('validates a valid backup structure successfully', () => {
      const bundle = createBackupBundle();
      bundle.tasks = [{ id: 't1', title: 'Task 1' }];
      const val = validateBackupData(bundle);
      assert.equal(val.isValid, true);
      assert.equal(val.taskCount, 1);
    });

    it('rejects corrupt or foreign JSON objects', () => {
      const res1 = validateBackupData(null);
      assert.equal(res1.isValid, false);

      const res2 = validateBackupData({ meta: { app: 'Other App' } });
      assert.equal(res2.isValid, false);
      assert.match(res2.error!, /Teacher Hub/);

      const res3 = validateBackupData({ meta: { app: 'Teacher Hub' }, tasks: 'not-an-array' });
      assert.equal(res3.isValid, false);
    });
  });
});
