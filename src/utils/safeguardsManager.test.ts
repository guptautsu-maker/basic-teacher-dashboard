import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateStartOfDayChecklist,
  getEndOfDayReviewItems,
  applyEndOfDayAction,
  generateWeeklySummary,
  getCriticalEscalations,
  searchAllModules,
  generatePendingWorkReportHtml,
} from './safeguardsManager';
import { Task } from './taskStatusSystem';
import { Duty } from '../types/duty';
import { MeetingItem, TrainingItem, GovtOrderItem } from '../data/teacherHubSampleData';
import { PortalApp } from '../types/portalApp';
import { ClassSection } from '../types/classSection';

describe('Safeguards System - Pure Business Logic', () => {
  const refDate = new Date('2026-10-31T10:00:00.000Z'); // Saturday

  const mockTasks: Task[] = [
    {
      id: 't-today',
      title: 'आज का कार्य (Due Today)',
      type: 'portal_entry',
      priority: 'high',
      status: 'in_progress',
      deadline: '2026-10-31T17:00:00.000Z',
      recurrence: 'none',
      createdAt: '2026-10-30',
      updatedAt: '2026-10-30',
    },
    {
      id: 't-critical-overdue',
      title: 'गंभीर विलंबित कार्य (5 Days Overdue)',
      type: 'mdm',
      priority: 'urgent',
      status: 'overdue',
      deadline: '2026-10-26T08:00:00.000Z',
      recurrence: 'none',
      createdAt: '2026-10-20',
      updatedAt: '2026-10-20',
    },
    {
      id: 't-future',
      title: 'भविष्य का कार्य (Due Next Week)',
      type: 'general',
      priority: 'low',
      status: 'not_started',
      deadline: '2026-11-05T12:00:00.000Z',
      recurrence: 'none',
      createdAt: '2026-10-30',
      updatedAt: '2026-10-30',
    },
    {
      id: 't-done',
      title: 'पूर्ण कार्य',
      type: 'training',
      priority: 'medium',
      status: 'done',
      deadline: '2026-10-31T12:00:00.000Z',
      recurrence: 'none',
      createdAt: '2026-10-25',
      updatedAt: '2026-10-31',
    },
  ];

  const mockDuties: Duty[] = [
    {
      id: 'd-sat',
      dutyName: 'शनिवार मध्याह्न भोजन व स्वच्छता',
      category: 'mdm',
      schedule: 'दोपहर 12:30',
      daysOfWeek: [6], // Saturday
      startDate: '2026-04-01',
      status: 'active',
      assignedTeacher: 'सुरेश कुमार',
      assignedBy: 'प्रधानाध्यापक',
      createdAt: '2026-04-01',
      updatedAt: '2026-04-01',
    },
    {
      id: 'd-mon',
      dutyName: 'सोमवार प्रार्थना सभा',
      category: 'assembly',
      schedule: 'प्रातः 09:00',
      daysOfWeek: [1], // Monday only
      startDate: '2026-04-01',
      status: 'active',
      assignedTeacher: 'सुरेश कुमार',
      assignedBy: 'प्रधानाध्यापक',
      createdAt: '2026-04-01',
      updatedAt: '2026-04-01',
    },
  ];

  const mockMeetings: MeetingItem[] = [
    {
      id: 'm-today',
      title: 'संकुल शिक्षक मासिक समीक्षा बैठक',
      date: '2026-10-31',
      time: '03:00 PM',
      mode: 'online',
      locationOrLink: 'https://meet.google.com/abc-def',
      agenda: 'निपुण लक्ष्य प्रगति समीक्षा',
      organizedBy: 'एआरपी गणित',
      status: 'scheduled',
    },
    {
      id: 'm-other',
      title: 'एसएमसी बैठक',
      date: '2026-11-04',
      time: '11:00 AM',
      mode: 'offline',
      locationOrLink: 'कक्ष 1',
      agenda: 'अभिभावक चर्चा',
      organizedBy: 'प्रधानाध्यापक',
      status: 'scheduled',
    },
  ];

  // -------------------------------------------------------------
  // 1. Start-of-Day Checklist Tests
  // -------------------------------------------------------------
  describe('1. Start-of-Day Checklist', () => {
    it('aggregates tasks due today, critical overdue tasks, today duties, and today meetings', () => {
      const checklist = generateStartOfDayChecklist(mockTasks, mockDuties, mockMeetings, refDate);

      // Should include:
      // 1. t-today (task)
      // 2. t-critical-overdue (task)
      // 3. d-sat (duty, dayOfWeek = 6)
      // 4. m-today (meeting, date = 2026-10-31)
      assert.equal(checklist.length, 4);

      // Verify urgent item sorted first
      assert.equal(checklist[0].priority, 'urgent');

      const sourceTypes = checklist.map((i) => i.sourceType);
      assert.ok(sourceTypes.includes('task'));
      assert.ok(sourceTypes.includes('duty'));
      assert.ok(sourceTypes.includes('meeting'));
    });
  });

  // -------------------------------------------------------------
  // 2. End-of-Day Review Tests
  // -------------------------------------------------------------
  describe('2. End-of-Day Review & Task Postponement', () => {
    it('finds all incomplete tasks due today or earlier', () => {
      const reviewItems = getEndOfDayReviewItems(mockTasks, refDate);
      // Includes t-today and t-critical-overdue (excludes future task t-future and completed t-done)
      assert.equal(reviewItems.length, 2);
      assert.equal(reviewItems.some((r) => r.task.id === 't-today'), true);
      assert.equal(reviewItems.some((r) => r.task.id === 't-critical-overdue'), true);
    });

    it('resolves task by marking Done', () => {
      const targetTask = mockTasks[0];
      const result = applyEndOfDayAction(targetTask, 'done', {
        now: refDate,
      });

      assert.equal(result.updatedTask.status, 'done');
      assert.ok(result.updatedTask.completedAt);
    });

    it('defers task to tomorrow (+1 day)', () => {
      const targetTask = mockTasks[0];
      const result = applyEndOfDayAction(targetTask, 'move_tomorrow', {
        now: refDate,
      });

      const nextDayStr = new Date(result.updatedTask.deadline!).toISOString().split('T')[0];
      assert.equal(nextDayStr, '2026-11-01');
    });

    it('defers task to next week (+7 days)', () => {
      const targetTask = mockTasks[0];
      const result = applyEndOfDayAction(targetTask, 'move_next_week', {
        now: refDate,
      });

      const nextWeekStr = new Date(result.updatedTask.deadline!).toISOString().split('T')[0];
      assert.equal(nextWeekStr, '2026-11-07');
    });

    it('marks task as blocked with comment', () => {
      const targetTask = mockTasks[0];
      const result = applyEndOfDayAction(targetTask, 'mark_blocked', {
        comment: 'सर्वर डाउन होने के कारण',
        now: refDate,
      });

      assert.equal(result.updatedTask.status, 'blocked');
    });
  });

  // -------------------------------------------------------------
  // 3. Weekly Summary Report Tests
  // -------------------------------------------------------------
  describe('3. Weekly Summary Report (Sunday Review)', () => {
    it('computes weekly completion rate and category breakdown', () => {
      const report = generateWeeklySummary(mockTasks, refDate);

      assert.equal(report.totalTasks, 4);
      assert.equal(report.doneTasks.length, 1);
      assert.equal(report.overdueTasks.length, 1);
      assert.equal(report.pendingTasks.length, 2);
      assert.equal(report.completionRatePercent, 25); // 1 out of 4 = 25%

      assert.ok(report.categoryBreakdown.length > 0);
      assert.ok(report.insights.length >= 2);
    });
  });

  // -------------------------------------------------------------
  // 4. Critical Overdue Escalations Tests (>3 Days)
  // -------------------------------------------------------------
  describe('4. Critical Overdue Escalations (>3 Days)', () => {
    it('identifies tasks overdue by more than 3 days with recommended actions', () => {
      const escalations = getCriticalEscalations(mockTasks, refDate, 3);

      assert.equal(escalations.length, 1);
      assert.equal(escalations[0].task.id, 't-critical-overdue');
      assert.equal(escalations[0].daysOverdue, 5); // 26 Oct to 31 Oct = 5 days
      assert.equal(escalations[0].severity, 'critical');
      assert.match(escalations[0].recommendedAction, /एमडीएम/);
    });

    it('does NOT flag tasks overdue by less than threshold', () => {
      const task2DaysOverdue: Task = {
        id: 't-2days',
        title: '2 दिन विलंबित',
        type: 'general',
        priority: 'high',
        status: 'overdue',
        deadline: '2026-10-29T12:00:00.000Z',
        recurrence: 'none',
        createdAt: '2026-10-20',
        updatedAt: '2026-10-20',
      };

      const escalations = getCriticalEscalations([task2DaysOverdue], refDate, 3);
      assert.equal(escalations.length, 0);
    });
  });

  // -------------------------------------------------------------
  // 5. Universal Search Across All Modules Tests
  // -------------------------------------------------------------
  describe('5. Universal Search Across All Modules', () => {
    const mockOrders: GovtOrderItem[] = [
      {
        id: 'go-1',
        orderNumber: '5421/बेसिक-शिक्षा/2026',
        title: 'शीतकालीन विद्यालय समय परिवर्तन आदेश',
        date: '2026-10-28',
        issuingAuthority: 'सचिव basic shiksha',
        summary: 'प्रातः 09:00 से 03:00 बजे तक संचालन',
        attachmentName: 'order.pdf',
        attachmentUrl: '#',
        acknowledgementRequired: true,
        isAcknowledged: false,
        isRead: false,
      },
    ];

    const mockTrainings: TrainingItem[] = [
      {
        id: 'tr-1',
        name: 'FLN बुनियादी संख्या ज्ञान दीक्षा प्रशिक्षण',
        provider: 'DIKSHA',
        hours: 6,
        dueDate: '2026-11-15',
        status: 'in_progress',
        progressPercent: 60,
        certificateRequired: true,
      },
    ];

    const mockPortals: PortalApp[] = [
      {
        id: 'p-1',
        name: 'यू-डायस प्लस (UDISE+)',
        url: 'https://udiseplus.gov.in',
        category: 'student_data',
        purpose: 'छात्र व विद्यालय प्रोफाइल प्रविष्टि',
        neededForTask: 'वार्षिक यू-डायस सत्यापन',
      },
    ];

    it('searches simultaneously across tasks, orders, meetings, and trainings', () => {
      const searchRes = searchAllModules('दीक्षा', {
        tasks: mockTasks,
        orders: mockOrders,
        meetings: mockMeetings,
        trainings: mockTrainings,
        portals: mockPortals,
      });

      assert.equal(searchRes.totalCount, 1);
      assert.equal(searchRes.items[0].module, 'training');
      assert.equal(searchRes.countsByModule.training, 1);
    });

    it('finds meetings by agenda keyword', () => {
      const searchRes = searchAllModules('निपुण', {
        tasks: mockTasks,
        orders: mockOrders,
        meetings: mockMeetings,
        trainings: mockTrainings,
      });

      assert.ok(searchRes.totalCount >= 1);
      assert.equal(searchRes.items[0].module, 'meeting');
    });

    it('returns empty result gracefully for empty query', () => {
      const searchRes = searchAllModules('', {
        tasks: mockTasks,
        orders: mockOrders,
        meetings: mockMeetings,
        trainings: mockTrainings,
      });

      assert.equal(searchRes.totalCount, 0);
      assert.equal(searchRes.items.length, 0);
    });
  });

  // -------------------------------------------------------------
  // 6. Inspection-ready Pending Work Report HTML Tests
  // -------------------------------------------------------------
  describe('6. Pending Work Report HTML Generator', () => {
    it('generates well-structured HTML with school meta, critical items, and signature blocks', () => {
      const html = generatePendingWorkReportHtml({
        generatedAt: '2026-10-31T10:00:00.000Z',
        schoolName: 'प्राथमिक विद्यालय रामपुर',
        teacherName: 'सुरेश कुमार (सहायक अध्यापक)',
        academicYear: '2026-27',
        criticalTasks: [
          {
            task: mockTasks[1],
            daysOverdue: 5,
            deadlineDateStr: '2026-10-26',
            severity: 'critical',
            recommendedAction: 'तत्काल प्रविष्टि करें',
          },
        ],
        highPriorityPendingTasks: [mockTasks[0]],
        allPendingTasks: [mockTasks[0], mockTasks[1]],
        pendingDuties: [mockDuties[0]],
        trainingsNearingDeadline: [],
        unreadGovtOrders: [],
      });

      assert.match(html, /प्राथमिक विद्यालय रामपुर/);
      assert.match(html, /5 दिन विलंबित \(CRITICAL\)/);
      assert.match(html, /window\.print\(\)/);
      assert.match(html, /हस्ताक्षर प्रधानाध्यापक/);
      assert.match(html, /निरीक्षण अधिकारी/);
    });
  });
});
