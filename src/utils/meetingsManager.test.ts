import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  isTimeOverlapping,
  detectMeetingClashes,
  convertActionItemToTask,
  convertAllActionItemsToTasks,
  filterMeetings,
  getMonthCalendarGrid,
  getWeekCalendarDays,
  getSampleMeetings,
  DEFAULT_CLASS_SCHEDULE,
} from './meetingsManager';
import { Meeting } from '../types/meeting';

describe('Meetings Manager - Pure Business Logic', () => {
  describe('Time Parsing & Formatting', () => {
    it('parses 24h format strings accurately into minutes', () => {
      assert.equal(parseTimeToMinutes('00:00'), 0);
      assert.equal(parseTimeToMinutes('09:30'), 570);
      assert.equal(parseTimeToMinutes('14:15'), 855);
      assert.equal(parseTimeToMinutes('23:59'), 1439);
    });

    it('parses 12h AM/PM strings accurately', () => {
      assert.equal(parseTimeToMinutes('09:30 AM'), 570);
      assert.equal(parseTimeToMinutes('12:00 PM'), 720);
      assert.equal(parseTimeToMinutes('02:30 PM'), 870);
      assert.equal(parseTimeToMinutes('12:00 AM'), 0);
    });

    it('formats minutes to human readable 12h time strings', () => {
      assert.equal(formatMinutesToTime(570), '09:30 AM');
      assert.equal(formatMinutesToTime(720), '12:00 PM');
      assert.equal(formatMinutesToTime(870), '02:30 PM');
      assert.equal(formatMinutesToTime(0), '12:00 AM');
    });

    it('detects time interval overlaps', () => {
      // 10:00 - 11:30 (600 to 690) and 11:00 - 12:00 (660 to 720) -> OVERLAP
      assert.equal(isTimeOverlapping(600, 690, 660, 720), true);

      // 10:00 - 11:00 (600 to 660) and 11:00 - 12:00 (660 to 720) -> TOUCHING, NO OVERLAP
      assert.equal(isTimeOverlapping(600, 660, 660, 720), false);

      // 10:00 - 11:00 (600 to 660) and 14:00 - 15:00 (840 to 900) -> NO OVERLAP
      assert.equal(isTimeOverlapping(600, 660, 840, 900), false);
    });
  });

  describe('Clash Detection', () => {
    const existingMeetings: Meeting[] = [
      {
        id: 'meet-1',
        title: 'SMC मासिक बैठक',
        date: '2026-11-02', // Monday
        startTime: '14:00',
        endTime: '15:30',
        mode: 'offline',
        linkOrLocation: 'सभागार',
        agenda: 'कायाकल्प',
        attendees: ['अभिभावक'],
        organizedBy: 'प्रधानाध्यापक',
        status: 'scheduled',
        actionItems: [],
        createdAt: '2026-10-30',
        updatedAt: '2026-10-30',
      },
    ];

    it('warns when candidate end time is before or equal to start time', () => {
      const warnings = detectMeetingClashes(
        { date: '2026-11-02', startTime: '15:00', endTime: '14:00' },
        existingMeetings
      );
      assert.ok(warnings.length > 0);
      assert.equal(warnings[0].severity, 'high');
      assert.ok(warnings[0].message.includes('समाप्ति समय'));
    });

    it('detects overlap clash between two meetings on the same day', () => {
      // Candidate: 14:30 - 16:00 on 2026-11-02 (overlaps with meet-1 14:00 - 15:30)
      const warnings = detectMeetingClashes(
        {
          date: '2026-11-02',
          startTime: '14:30',
          endTime: '16:00',
          title: 'संकुल आकस्मिक बैठक',
        },
        existingMeetings
      );

      const meetingClashes = warnings.filter((w) => w.type === 'meeting_overlap');
      assert.ok(meetingClashes.length > 0);
      assert.ok(meetingClashes[0].message.includes('SMC मासिक बैठक'));
    });

    it('does NOT clash when meetings are on the same day but different non-overlapping hours', () => {
      // Candidate: 16:00 - 17:00 on 2026-11-02
      const warnings = detectMeetingClashes(
        {
          date: '2026-11-02',
          startTime: '16:00',
          endTime: '17:00',
          title: 'शाम की ऑनलाइन चर्चा',
        },
        existingMeetings
      );

      const meetingClashes = warnings.filter((w) => w.type === 'meeting_overlap');
      assert.equal(meetingClashes.length, 0);
    });

    it('does NOT clash when meeting has same hours but on a different date', () => {
      // Candidate: 14:00 - 15:30 on 2026-11-03 (Tuesday)
      const warnings = detectMeetingClashes(
        {
          date: '2026-11-03',
          startTime: '14:00',
          endTime: '15:30',
          title: 'मंगलवार बैठक',
        },
        existingMeetings
      );

      const meetingClashes = warnings.filter((w) => w.type === 'meeting_overlap');
      assert.equal(meetingClashes.length, 0);
    });

    it('detects clash with scheduled school teaching periods (Class Overlap)', () => {
      // 2026-11-02 is a Monday (dayOfWeek = 1)
      // DEFAULT_CLASS_SCHEDULE has Monday: 09:30 - 10:15 (Class 4 Math)
      const warnings = detectMeetingClashes(
        {
          date: '2026-11-02',
          startTime: '09:45',
          endTime: '10:45',
          title: 'अभिभावक परामर्श',
        },
        existingMeetings,
        DEFAULT_CLASS_SCHEDULE
      );

      const classClashes = warnings.filter((w) => w.type === 'class_overlap');
      assert.ok(classClashes.length > 0);
      assert.ok(classClashes.some((c) => c.message.includes('कक्षा 4: गणित') || c.conflictingItemTitle.includes('कक्षा')));
    });
  });

  describe('Action Items to Tasks Conversion', () => {
    const createDummyMeeting = (): Meeting => ({
      id: 'meet-test',
      title: 'वार्षिक कार्ययोजना बैठक',
      date: '2026-11-05',
      startTime: '14:00',
      endTime: '15:00',
      mode: 'offline',
      linkOrLocation: 'कक्ष 1',
      agenda: 'निपुण लक्ष्य',
      attendees: ['समस्त शिक्षक'],
      organizedBy: 'प्रधानाध्यापक',
      status: 'scheduled',
      actionItems: [
        {
          id: 'ai-1',
          text: 'छात्र उपस्थिति पंजिका का अद्यतनीकरण व अभिभावक संपर्क',
          assignedTo: 'अनिल कुमार',
          deadline: '2026-11-10',
          isConvertedToTask: false,
        },
        {
          id: 'ai-2',
          text: 'दीक्षा FLN सामग्री वितरण',
          assignedTo: 'सुनीता देवी',
          deadline: '2026-11-12',
          isConvertedToTask: false,
        },
      ],
      createdAt: '2026-10-30',
      updatedAt: '2026-10-30',
    });

    it('converts an action item into a Teacher Hub Task and updates meeting status', () => {
      const meeting = createDummyMeeting();
      const fakeIdGen = () => 'task-gen-123';

      const { task, updatedMeeting } = convertActionItemToTask(meeting, 'ai-1', fakeIdGen);

      assert.equal(task.id, 'task-gen-123');
      assert.equal(task.title, 'छात्र उपस्थिति पंजिका का अद्यतनीकरण व अभिभावक संपर्क');
      assert.equal(task.type, 'meeting');
      assert.ok(task.source?.includes('वार्षिक कार्ययोजना बैठक'));
      assert.equal(task.assignedTo, 'अनिल कुमार');
      assert.equal(task.status, 'not_started');

      const convertedAi = updatedMeeting.actionItems.find((a) => a.id === 'ai-1');
      assert.equal(convertedAi?.isConvertedToTask, true);
      assert.equal(convertedAi?.taskId, 'task-gen-123');

      // The other action item remains uncoverted
      const otherAi = updatedMeeting.actionItems.find((a) => a.id === 'ai-2');
      assert.equal(otherAi?.isConvertedToTask, false);
    });

    it('converts all pending action items at once', () => {
      const meeting = createDummyMeeting();
      let counter = 0;
      const fakeIdGen = () => `batch-task-${++counter}`;

      const { tasks, updatedMeeting } = convertAllActionItemsToTasks(meeting, fakeIdGen);

      assert.equal(tasks.length, 2);
      assert.ok(updatedMeeting.actionItems.every((a) => a.isConvertedToTask));
    });
  });

  describe('Calendar Grid Calculations', () => {
    const sampleMeetings = getSampleMeetings(new Date('2026-10-30'));

    it('generates a full month grid where cells count is a multiple of 7', () => {
      const grid = getMonthCalendarGrid(2026, 9, sampleMeetings); // October 2026
      assert.ok(grid.length % 7 === 0);
      assert.ok(grid.some((c) => c.isCurrentMonth));
    });

    it('generates 7 week days for week view with mapped meetings', () => {
      const week = getWeekCalendarDays(new Date('2026-10-30'), sampleMeetings);
      assert.equal(week.length, 7);
      assert.ok(week.some((d) => d.dayNameHi === 'सोम'));
      assert.ok(week.some((d) => d.dayNameHi === 'शनि'));
    });
  });

  describe('Filter & Search', () => {
    const sampleMeetings = getSampleMeetings(new Date('2026-10-30'));

    it('filters by status and mode', () => {
      const online = filterMeetings(sampleMeetings, { mode: 'online' });
      assert.ok(online.every((m) => m.mode === 'online'));

      const completed = filterMeetings(sampleMeetings, { status: 'completed' });
      assert.ok(completed.every((m) => m.status === 'completed'));
    });

    it('searches meetings by Hindi and English keywords', () => {
      const smcRes = filterMeetings(sampleMeetings, { query: 'SMC' });
      assert.ok(smcRes.length >= 1);

      const nipunRes = filterMeetings(sampleMeetings, { query: 'निपुण' });
      assert.ok(nipunRes.length >= 1);
    });
  });
});
