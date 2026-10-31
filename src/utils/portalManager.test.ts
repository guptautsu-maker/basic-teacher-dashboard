import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLoginHelpNote,
  addPortal,
  updatePortal,
  deletePortal,
  recordPortalOpened,
  getPendingWorkForPortal,
  formatLastUsed,
  PASSWORD_WARNING_NOTICE,
} from './portalManager.js';
import { PortalApp } from '../types/portalApp.js';
import { Task } from './taskStatusSystem.js';

describe('Portals and Apps Manager Module', () => {
  const samplePortal: PortalApp = {
    id: 'portal-test-1',
    name: 'प्रेरणा उपस्थिति पोर्टल (Prerna Attendance)',
    url: 'https://prerna.up.gov.in/attendance',
    category: 'attendance',
    purpose: 'छात्र व शिक्षक उपस्थिति दर्ज करना',
    neededForTask: 'दैनिक छात्र व शिक्षक उपस्थिति',
    lastUsedDate: '2026-11-04',
    loginHelpNote: 'यूजरनेम: विद्यालय प्रधानाध्यापक मोबाइल नंबर।',
  };

  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      title: 'दैनिक छात्र व शिक्षक उपस्थिति (Prerna Daily Attendance)',
      description: 'डिजिटल उपस्थिति दर्ज करें',
      type: 'attendance',
      source: 'Prerna App',
      portalUrl: 'https://prerna.up.gov.in/attendance',
      deadline: '2026-11-05T09:15:00.000Z',
      priority: 'urgent',
      status: 'in_progress',
      recurrence: 'daily',
      createdAt: '2026-11-05T08:00:00.000Z',
      updatedAt: '2026-11-05T08:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'प्रेरणा उपस्थिति फोटो अपलोड',
      description: 'प्रार्थना सभा की फोटो',
      type: 'attendance',
      source: 'Prerna App',
      portalUrl: 'https://prerna.up.gov.in/attendance',
      deadline: '2026-11-05T09:30:00.000Z',
      priority: 'high',
      status: 'done', // COMPLETED
      recurrence: 'daily',
      createdAt: '2026-11-05T08:00:00.000Z',
      updatedAt: '2026-11-05T09:00:00.000Z',
    },
    {
      id: 'task-3',
      title: 'UDISE+ छात्र प्रोफ़ाइल व आधार प्रमाणीकरण',
      description: 'आधार प्रमाणीकरण',
      type: 'portal_entry',
      source: 'UDISE+ Portal',
      portalUrl: 'https://udiseplus.gov.in',
      deadline: '2026-11-03T17:00:00.000Z',
      priority: 'urgent',
      status: 'overdue',
      recurrence: 'none',
      createdAt: '2026-11-01T08:00:00.000Z',
      updatedAt: '2026-11-03T17:00:00.000Z',
    },
  ];

  describe('1. CRUD Operations', () => {
    it('adds a new portal with custom flag and unique ID', () => {
      const list: PortalApp[] = [samplePortal];
      const res = addPortal(
        list,
        {
          name: 'छात्रवृत्ति पोर्टल',
          url: 'https://scholarship.up.gov.in',
          category: 'scholarship',
          purpose: 'छात्रवृत्ति फॉर्म सत्यापन',
          neededForTask: 'छात्रवृत्ति सत्यापन',
          loginHelpNote: 'यूजरनेम: संस्था कोड',
        },
        () => 'custom-id-999'
      );

      assert.equal(res.portals.length, 2);
      assert.equal(res.created.id, 'custom-id-999');
      assert.equal(res.created.isCustom, true);
      assert.equal(res.portals[0].id, 'custom-id-999');
    });

    it('updates an existing portal', () => {
      const list: PortalApp[] = [samplePortal];
      const res = updatePortal(list, 'portal-test-1', {
        purpose: 'नया अद्यतन उद्देश्य',
        neededForTask: 'अद्यतन कार्य',
      });

      assert.equal(res.portals.length, 1);
      assert.equal(res.updated?.purpose, 'नया अद्यतन उद्देश्य');
      assert.equal(res.updated?.neededForTask, 'अद्यतन कार्य');
      assert.equal(res.portals[0].purpose, 'नया अद्यतन उद्देश्य');
    });

    it('deletes a portal by ID', () => {
      const list: PortalApp[] = [samplePortal];
      const res = deletePortal(list, 'portal-test-1');

      assert.equal(res.portals.length, 0);
      assert.equal(res.deleted?.id, 'portal-test-1');
    });

    it('records portal opened and updates lastUsedDate', () => {
      const list: PortalApp[] = [samplePortal];
      const testDate = '2026-11-05';
      const res = recordPortalOpened(list, 'portal-test-1', testDate);

      assert.equal(res.portal?.lastUsedDate, testDate);
      assert.equal(res.portals[0].lastUsedDate, testDate);
    });
  });

  describe('2. Security & Password Leaks Protection', () => {
    it('allows clean login help notes with usernames and helpline numbers', () => {
      const cleanNote = 'यूजरनेम: 09123456789 (UDISE कोड)। BRC हेल्पलाइन: 0522-223344';
      const validation = validateLoginHelpNote(cleanNote);
      assert.equal(validation.isValid, true);
      assert.equal(validation.hasPasswordWarning, false);
    });

    it('rejects notes with direct password assignments', () => {
      const badNotes = [
        'password: mySecretPassword123',
        'pwd=Admin@2025',
        'पासवर्ड : School#999',
        'pass: prerna@pass',
      ];

      for (const bad of badNotes) {
        const val = validateLoginHelpNote(bad);
        assert.equal(
          val.isValid,
          false,
          `Should flag password pattern in: "${bad}"`
        );
        assert.equal(val.hasPasswordWarning, true);
      }
    });

    it('provides clear security warning texts in Hindi and English', () => {
      assert.ok(PASSWORD_WARNING_NOTICE.hi.includes('पासवर्ड'));
      assert.ok(PASSWORD_WARNING_NOTICE.en.includes('NEVER store passwords'));
    });
  });

  describe('3. Linked Pending Work Checklist', () => {
    it('returns only active pending tasks matching the portal', () => {
      const pendingWork = getPendingWorkForPortal(samplePortal, sampleTasks);

      // task-1 is in_progress (pending) and matches portal URL/Prerna -> included
      // task-2 is done -> EXCLUDED even though it matches URL
      // task-3 is UDISE -> EXCLUDED from prerna portal
      assert.equal(pendingWork.length, 1);
      assert.equal(pendingWork[0].id, 'task-1');
    });

    it('associates UDISE portal with UDISE overdue task', () => {
      const udisePortal: PortalApp = {
        id: 'portal-udise',
        name: 'UDISE+ Portal',
        url: 'https://udiseplus.gov.in',
        category: 'student_data',
        purpose: 'छात्र डाटा',
        neededForTask: 'UDISE+ छात्र प्रोफ़ाइल व आधार प्रमाणीकरण',
      };

      const pending = getPendingWorkForPortal(udisePortal, sampleTasks);
      assert.equal(pending.length, 1);
      assert.equal(pending[0].id, 'task-3');
    });
  });

  describe('4. Last Used Relative Date Formatting', () => {
    const refDate = new Date('2026-11-05T12:00:00Z');

    it('formats today correctly', () => {
      const res = formatLastUsed('2026-11-05', refDate);
      assert.equal(res.textHi, 'आज (Today)');
      assert.equal(res.isRecent, true);
    });

    it('formats yesterday correctly', () => {
      const res = formatLastUsed('2026-11-04', refDate);
      assert.equal(res.textHi, 'कल (Yesterday)');
      assert.equal(res.isRecent, true);
    });

    it('formats days ago', () => {
      const res = formatLastUsed('2026-11-02', refDate);
      assert.equal(res.textHi, '3 दिन पहले');
    });

    it('handles never opened', () => {
      const res = formatLastUsed(undefined, refDate);
      assert.equal(res.textHi, 'अभी तक उपयोग नहीं हुआ');
      assert.equal(res.isRecent, false);
    });
  });
});
