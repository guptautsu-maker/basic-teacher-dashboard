import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDemoTeacherProfileDataset,
  getQaTestChecklist,
  runAutomatedQaSuite,
  getAccessibilityAuditReport,
  getSetupReadmeMarkdown,
} from './demoAndQaManager';

describe('Demo Teacher Profile, QA Checklist & Accessibility Manager', () => {
  describe('1. Demo Teacher Profile Dataset', () => {
    it('generates exact required counts: 2 school sections, 10 tasks, 3 portals, 4 govt orders, 2 meetings, 2 trainings, 3 duties', () => {
      const refDate = new Date('2026-10-31T10:00:00.000Z');
      const demo = generateDemoTeacherProfileDataset(refDate);

      assert.equal(demo.classSections.length, 2, 'Should have exactly 2 school sections');
      assert.equal(demo.tasks.length, 10, 'Should have exactly 10 tasks');
      assert.equal(demo.portals.length, 3, 'Should have exactly 3 portals');
      assert.equal(demo.govtOrders.length, 4, 'Should have exactly 4 govt orders');
      assert.equal(demo.meetings.length, 2, 'Should have exactly 2 meetings');
      assert.equal(demo.trainings.length, 2, 'Should have exactly 2 trainings');
      assert.equal(demo.duties.length, 3, 'Should have exactly 3 duties');
      assert.equal(demo.profile.udiseCode.length, 11, 'School UDISE+ code should be 11 digits');
      assert.equal(demo.settings.role, 'teacher', 'Default role should be teacher');
    });

    it('includes diverse task statuses and recurrence frequencies across the 10 tasks', () => {
      const demo = generateDemoTeacherProfileDataset();
      const statuses = new Set(demo.tasks.map((t) => t.status));
      const recurrences = new Set(demo.tasks.map((t) => t.recurrence));

      assert.ok(statuses.has('overdue'), 'Should include overdue tasks');
      assert.ok(statuses.has('in_progress'), 'Should include in_progress tasks');
      assert.ok(statuses.has('not_started'), 'Should include not_started tasks');
      assert.ok(statuses.has('done'), 'Should include done tasks');
      assert.ok(recurrences.has('daily'), 'Should include daily recurring tasks');
      assert.ok(recurrences.has('weekly'), 'Should include weekly recurring tasks');
      assert.ok(recurrences.has('monthly'), 'Should include monthly recurring tasks');
    });
  });

  describe('2. QA Test Checklist & Automated Verification Suite', () => {
    it('covers all 6 required test categories: status_changes, overdue_logic, recurring_tasks, reminders, rollover, offline_usage', () => {
      const checklist = getQaTestChecklist();
      const categories = checklist.map((c) => c.category);

      assert.equal(checklist.length, 6);
      assert.ok(categories.includes('status_changes'));
      assert.ok(categories.includes('overdue_logic'));
      assert.ok(categories.includes('recurring_tasks'));
      assert.ok(categories.includes('reminders'));
      assert.ok(categories.includes('rollover'));
      assert.ok(categories.includes('offline_usage'));
    });

    it('passes all 6 automated QA verification checks', () => {
      const refDate = new Date('2026-10-31T08:30:00.000Z');
      const results = runAutomatedQaSuite(refDate);

      assert.equal(results.length, 6);
      for (const res of results) {
        assert.equal(
          res.automatedPass,
          true,
          `Category ${res.category} failed: ${res.automatedDetail}`
        );
      }
    });
  });

  describe('3. Accessibility Check & Setup README', () => {
    it('provides accessibility audit items covering large_fonts, color_contrast, and screen_reader', () => {
      const report = getAccessibilityAuditReport();
      const pillars = new Set(report.map((r) => r.pillar));

      assert.ok(pillars.has('large_fonts'));
      assert.ok(pillars.has('color_contrast'));
      assert.ok(pillars.has('screen_reader'));
    });

    it('generates setup README markdown with setup steps and checklist summary', () => {
      const readme = getSetupReadmeMarkdown();
      assert.ok(readme.includes('npm install'));
      assert.ok(readme.includes('npm run dev'));
      assert.ok(readme.includes('2 School Sections'));
      assert.ok(readme.includes('10 Tasks'));
    });
  });
});
