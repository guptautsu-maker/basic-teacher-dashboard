/**
 * Teacher Hub - Meetings Module Logic
 * Pure functions for meeting clash detection, time parsing, calendar generation,
 * Minutes of Meeting (MoM), and Action Items to Task conversion.
 */

import { Task } from './taskStatusSystem';
import {
  Meeting,
  MeetingMode,
  MeetingStatus,
  ActionItem,
  SchoolClassPeriod,
  ClashWarning,
} from '../types/meeting';

/**
 * Standard basic school class periods for clash detection
 * Covers Monday to Saturday school teaching periods
 */
export const DEFAULT_CLASS_SCHEDULE: SchoolClassPeriod[] = [
  { id: 'cls-1', className: 'कक्षा 4: गणित (Class 4 Math)', dayOfWeek: 1, startTime: '09:30', endTime: '10:15', teacherName: 'शिक्षक जी' },
  { id: 'cls-2', className: 'कक्षा 5: भाषा / हिन्दी (Class 5 Hindi)', dayOfWeek: 1, startTime: '10:15', endTime: '11:00', teacherName: 'शिक्षक जी' },
  { id: 'cls-3', className: 'कक्षा 3: पर्यावरण अध्ययन (EVS)', dayOfWeek: 2, startTime: '10:00', endTime: '10:45', teacherName: 'शिक्षक जी' },
  { id: 'cls-4', className: 'कक्षा 4: गणित अभ्यास (Class 4 Math)', dayOfWeek: 3, startTime: '09:30', endTime: '10:15', teacherName: 'शिक्षक जी' },
  { id: 'cls-5', className: 'कक्षा 5: अंग्रेजी (Class 5 English)', dayOfWeek: 4, startTime: '11:00', endTime: '11:45', teacherName: 'शिक्षक जी' },
  { id: 'cls-6', className: 'कक्षा 4-5: उपचारात्मक शिक्षण (FLN Remedial)', dayOfWeek: 5, startTime: '13:30', endTime: '14:30', teacherName: 'शिक्षक जी' },
  { id: 'cls-7', className: 'कक्षा 1-5: बाल सभा एवं गतिविधि', dayOfWeek: 6, startTime: '11:00', endTime: '12:00', teacherName: 'समस्त शिक्षक' },
];

/**
 * Parse time string (supports 24h "14:30" or 12h "02:30 PM") into minutes from midnight
 */
export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.trim()) return 0;
  const clean = timeStr.trim().toUpperCase();

  // 12-hour format with AM/PM
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3];

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  // 24-hour format
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  return 0;
};

/**
 * Format minutes from midnight into 12-hour readable format (e.g. "02:30 PM")
 */
export const formatMinutesToTime = (minutes: number): string => {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mStr = String(m).padStart(2, '0');
  const hStr = String(h12).padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
};

/**
 * Format a 24h time input "14:00" to "02:00 PM"
 */
export const formatTimeDisplay = (startTime: string, endTime: string): string => {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  return `${formatMinutesToTime(startMin)} - ${formatMinutesToTime(endMin)}`;
};

/**
 * Check if two time intervals overlap
 * Overlap exists if max(start1, start2) < min(end1, end2)
 */
export const isTimeOverlapping = (
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean => {
  return Math.max(startA, startB) < Math.min(endA, endB);
};

/**
 * Detect clashes for a candidate meeting:
 * 1. Checks for overlap with existing scheduled meetings on the same date
 * 2. Checks for overlap with scheduled teaching classes on that day of week
 */
export const detectMeetingClashes = (
  candidate: {
    id?: string;
    date: string; // YYYY-MM-DD
    startTime: string; // "14:00"
    endTime: string; // "15:30"
    title?: string;
  },
  existingMeetings: Meeting[],
  classSchedule: SchoolClassPeriod[] = DEFAULT_CLASS_SCHEDULE
): ClashWarning[] => {
  const warnings: ClashWarning[] = [];
  if (!candidate.date || !candidate.startTime || !candidate.endTime) return warnings;

  const candidateStart = parseTimeToMinutes(candidate.startTime);
  const candidateEnd = parseTimeToMinutes(candidate.endTime);

  if (candidateEnd <= candidateStart) {
    warnings.push({
      type: 'meeting_overlap',
      severity: 'high',
      message: 'बैठक समाप्ति समय प्रारंभ समय के बाद होना चाहिए (End time must be after start time)',
      conflictingItemTitle: candidate.title || 'अमान्य समय',
      conflictingTime: `${candidate.startTime} - ${candidate.endTime}`,
    });
    return warnings;
  }

  // 1. Check clash with existing scheduled meetings on the same date
  const sameDateMeetings = existingMeetings.filter(
    (m) => m.date === candidate.date && m.id !== candidate.id && m.status !== 'cancelled'
  );

  for (const m of sameDateMeetings) {
    const mStart = parseTimeToMinutes(m.startTime);
    const mEnd = parseTimeToMinutes(m.endTime);

    if (isTimeOverlapping(candidateStart, candidateEnd, mStart, mEnd)) {
      warnings.push({
        type: 'meeting_overlap',
        severity: 'high',
        message: `⚠️ बैठक टकराव (Meeting Clash): इस समय पहले से बैठक निर्धारित है — "${m.title}"`,
        conflictingItemTitle: m.title,
        conflictingTime: `${formatMinutesToTime(mStart)} - ${formatMinutesToTime(mEnd)}`,
      });
    }
  }

  // 2. Check clash with regular school class teaching periods on that day of week
  const dateObj = new Date(`${candidate.date}T00:00:00`);
  const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 1 is Monday ...

  const matchingClasses = classSchedule.filter((c) => c.dayOfWeek === dayOfWeek);

  for (const cls of matchingClasses) {
    const clsStart = parseTimeToMinutes(cls.startTime);
    const clsEnd = parseTimeToMinutes(cls.endTime);

    if (isTimeOverlapping(candidateStart, candidateEnd, clsStart, clsEnd)) {
      warnings.push({
        type: 'class_overlap',
        severity: 'medium',
        message: `📚 कक्षा शिक्षण टकराव (Class Conflict): इस समय आपकी कक्षा निर्धारित है — "${cls.className}"`,
        conflictingItemTitle: cls.className,
        conflictingTime: `${formatMinutesToTime(clsStart)} - ${formatMinutesToTime(clsEnd)}`,
      });
    }
  }

  return warnings;
};

/**
 * Convert an Action Item from Meeting Minutes into an actionable Task in Teacher Hub
 */
export const convertActionItemToTask = (
  meeting: Meeting,
  actionItemId: string,
  idGenerator: () => string = () => `th-task-ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`
): { task: Task; updatedMeeting: Meeting } => {
  const item = meeting.actionItems.find((a) => a.id === actionItemId);
  if (!item) {
    throw new Error(`Action item with ID "${actionItemId}" not found in meeting`);
  }

  const taskId = idGenerator();
  const nowIso = new Date().toISOString();

  let taskDeadline: string | null = null;
  if (item.deadline) {
    taskDeadline = item.deadline.includes('T') ? item.deadline : `${item.deadline}T17:00:00.000Z`;
  } else if (meeting.date) {
    // Default deadline: 3 days after meeting
    const d = new Date(`${meeting.date}T17:00:00`);
    d.setDate(d.getDate() + 3);
    taskDeadline = d.toISOString();
  }

  const task: Task = {
    id: taskId,
    title: item.text.trim(),
    description: `बैठक: "${meeting.title}" (${meeting.date})\nकार्यवृत्त दायित्व (Action Item): ${item.text}`,
    type: 'meeting',
    source: `बैठक: ${meeting.title}`,
    portalUrl: meeting.mode === 'online' ? meeting.linkOrLocation : undefined,
    deadline: taskDeadline,
    priority: 'high',
    status: 'not_started',
    recurrence: 'none',
    assignedTo: item.assignedTo?.trim() || 'शिक्षक जी',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const updatedMeeting: Meeting = {
    ...meeting,
    actionItems: meeting.actionItems.map((a) =>
      a.id === actionItemId
        ? { ...a, isConvertedToTask: true, taskId }
        : a
    ),
    updatedAt: nowIso,
  };

  return { task, updatedMeeting };
};

/**
 * Convert all uncompleted action items of a meeting to tasks
 */
export const convertAllActionItemsToTasks = (
  meeting: Meeting,
  idGenerator?: () => string
): { tasks: Task[]; updatedMeeting: Meeting } => {
  const pendingItems = meeting.actionItems.filter((a) => !a.isConvertedToTask);
  let currentMeeting = { ...meeting };
  const createdTasks: Task[] = [];

  for (const item of pendingItems) {
    const res = convertActionItemToTask(currentMeeting, item.id, idGenerator);
    createdTasks.push(res.task);
    currentMeeting = res.updatedMeeting;
  }

  return { tasks: createdTasks, updatedMeeting: currentMeeting };
};

/**
 * Filter meetings by keyword search and status
 */
export const filterMeetings = (
  meetings: Meeting[],
  options: {
    status?: MeetingStatus | 'all';
    mode?: MeetingMode | 'all';
    query?: string;
    selectedDate?: string; // YYYY-MM-DD
  }
): Meeting[] => {
  const { status = 'all', mode = 'all', query = '', selectedDate } = options;
  const q = query.toLowerCase().trim();

  return meetings.filter((m) => {
    // Status filter
    if (status !== 'all' && m.status !== status) return false;

    // Mode filter
    if (mode !== 'all' && m.mode !== mode) return false;

    // Date filter
    if (selectedDate && m.date !== selectedDate) return false;

    // Keyword search (Hindi + English)
    if (q) {
      const matchText = [
        m.title,
        m.agenda,
        m.linkOrLocation,
        m.organizedBy,
        m.minutesOfMeeting || '',
        ...m.attendees,
        ...m.actionItems.map((a) => a.text),
      ]
        .join(' ')
        .toLowerCase();

      if (!matchText.includes(q)) return false;
    }

    return true;
  });
};

/**
 * Calendar helpers for Month View
 */
export interface MonthCalendarCell {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  meetings: Meeting[];
}

export const getMonthCalendarGrid = (
  year: number,
  month: number, // 0 = Jan, 11 = Dec
  meetings: Meeting[]
): MonthCalendarCell[] => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Sunday = 0, Monday = 1
  const startDayOfWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const cells: MonthCalendarCell[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateObj = new Date(year, month - 1, d);
    const dateStr = dateObj.toISOString().slice(0, 10);
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      meetings: meetings.filter((m) => m.date === dateStr),
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = dateObj.toISOString().slice(0, 10);
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      meetings: meetings.filter((m) => m.date === dateStr),
    });
  }

  // Next month leading days to complete full grid (multiple of 7)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(year, month + 1, d);
    const dateStr = dateObj.toISOString().slice(0, 10);
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      meetings: meetings.filter((m) => m.date === dateStr),
    });
  }

  return cells;
};

/**
 * Calendar helpers for Week View (7 days starting Monday)
 */
export interface WeekCalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNameHi: string;
  dayNameEn: string;
  dayNumber: number;
  isToday: boolean;
  meetings: Meeting[];
  classPeriods: SchoolClassPeriod[];
}

const HINDI_DAY_NAMES = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const EN_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getWeekCalendarDays = (
  baseDate: Date,
  meetings: Meeting[],
  classSchedule: SchoolClassPeriod[] = DEFAULT_CLASS_SCHEDULE
): WeekCalendarDay[] => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const curr = new Date(baseDate);
  const day = curr.getDay();
  // Set to Monday of the week
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));

  const weekDays: WeekCalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay();

    weekDays.push({
      dateStr,
      dayNameHi: HINDI_DAY_NAMES[dayOfWeek],
      dayNameEn: EN_DAY_NAMES[dayOfWeek],
      dayNumber: d.getDate(),
      isToday: dateStr === todayStr,
      meetings: meetings.filter((m) => m.date === dateStr),
      classPeriods: classSchedule.filter((c) => c.dayOfWeek === dayOfWeek),
    });
  }

  return weekDays;
};

/**
 * Sample meetings data for Indian Basic School Teachers
 */
export const getSampleMeetings = (baseDate: Date = new Date()): Meeting[] => {
  const toDateStr = (offsetDays: number): string => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  return [
    {
      id: 'th-meet-1',
      title: 'विद्यालय प्रबंध समिति (SMC) मासिक बैठक',
      date: toDateStr(0), // Today
      startTime: '14:00',
      endTime: '15:30',
      timeDisplay: '02:00 PM - 03:30 PM',
      mode: 'offline',
      linkOrLocation: 'विद्यालय सभागार / Primary School Hall',
      agenda: 'निपुण भारत लक्ष्य प्रगति, विद्यालय कायाकल्प 19 पैरामीटर, एवं 100% छात्र उपस्थिति सुनिश्चित करना।',
      attendees: ['प्रधानाध्यापक', 'एसएमसी अध्यक्ष', 'वार्ड सभासद', 'सहायक अध्यापकगण', 'अभिभावक प्रतिनिधि'],
      organizedBy: 'प्रधानाध्यापक एवं एसएमसी अध्यक्ष',
      status: 'scheduled',
      minutesOfMeeting:
        'बैठक में छात्र उपस्थिति 85% से ऊपर ले जाने पर सहमति बनी। कायाकल्प के अंतर्गत शुद्ध पेयजल नल टोटी की मरम्मत आगामी सप्ताह में कराने का निर्णय लिया गया।',
      actionItems: [
        {
          id: 'ai-1',
          text: 'अभिभावकों के साथ घर-घर संपर्क अभियान चलाकर अनुपस्थित छात्रों का नामांकन व उपस्थिति बढ़ाना',
          assignedTo: 'समस्त सहायक अध्यापक',
          deadline: toDateStr(5),
          isConvertedToTask: false,
        },
        {
          id: 'ai-2',
          text: 'ग्राम प्रधान से संपर्क कर हैंडपंप समर्सिबल व पेयजल टोटी की मरम्मत पूर्ण कराना',
          assignedTo: 'प्रधानाध्यापक',
          deadline: toDateStr(7),
          isConvertedToTask: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'th-meet-2',
      title: 'संकुल शिक्षक (CRC) आकस्मिक समीक्षा ऑनलाइन बैठक',
      date: toDateStr(0), // Today
      startTime: '16:30',
      endTime: '17:15',
      timeDisplay: '04:30 PM - 05:15 PM',
      mode: 'online',
      linkOrLocation: 'https://meet.google.com/btd-basic-teach',
      agenda: 'NAT परीक्षा की तैयारी, ओएमआर शीट वितरण स्थिति, एवं दीक्षा प्रशिक्षण प्रगति समीक्षा।',
      attendees: ['संकुल नोडल शिक्षक', 'संकुल के समस्त प्राथमिक शिक्षक'],
      organizedBy: 'संकुल नोडल शिक्षक',
      status: 'scheduled',
      minutesOfMeeting:
        'समस्त विद्यालयों में सरल ऐप डाउनलोड व यूजर आईडी टेस्ट करने के निर्देश। ओएमआर शीट का वितरण 15 नवंबर तक सुनिश्चित करने का निर्देश दिया गया।',
      actionItems: [
        {
          id: 'ai-3',
          text: 'सरल ऐप पर शिक्षक लॉगिन टेस्ट करना और डमी ओएमआर स्कैन का अभ्यास करना',
          assignedTo: 'कक्षा 1 से 3 अध्यापक',
          deadline: toDateStr(2),
          isConvertedToTask: true,
          taskId: 'th-task-today-3',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'th-meet-3',
      title: 'बीआरसी (BRC) मासिक गुरु-गोष्ठी / समीक्षा बैठक',
      date: toDateStr(1), // Tomorrow
      startTime: '11:00',
      endTime: '13:30',
      timeDisplay: '11:00 AM - 01:30 PM',
      mode: 'offline',
      linkOrLocation: 'खंड शिक्षा अधिकारी कार्यालय (BRC Hall)',
      agenda: 'डीबीटी अवशेष छात्र, एमडीएम खाद्यान्न आवंटन एवं उपचारात्मक शिक्षण (Remedial Teaching)।',
      attendees: ['खंड शिक्षा अधिकारी (BEO)', 'एआरपी (ARP)', 'नोडल शिक्षक'],
      organizedBy: 'खंड शिक्षा अधिकारी (BEO Office)',
      status: 'scheduled',
      minutesOfMeeting: '',
      actionItems: [
        {
          id: 'ai-4',
          text: 'डीबीटी अनसीडेड खातों की सूची बैंक शाखा में जमा करना',
          assignedTo: 'डीबीटी प्रभारी',
          deadline: toDateStr(4),
          isConvertedToTask: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'th-meet-4',
      title: 'माता उन्मुखीकरण कार्यशाला (Mother Orientation Workshop)',
      date: toDateStr(4), // In 4 days
      startTime: '10:30',
      endTime: '12:00',
      timeDisplay: '10:30 AM - 12:00 PM',
      mode: 'offline',
      linkOrLocation: 'प्राथमिक विद्यालय परिसर',
      agenda: 'माताओं को घर पर बच्चों की पढ़ाई व गृहकार्य सहयोग हेतु प्रेरित करना व टीएलएम प्रदर्शन।',
      attendees: ['आंगनबाड़ी कार्यकत्री', 'प्राथमिक कक्षा माताओं का समूह', 'सहायक अध्यापिका'],
      organizedBy: 'नोडल आंगनबाड़ी शिक्षिका',
      status: 'scheduled',
      actionItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'th-meet-5',
      title: 'निपुण लक्ष्य आकलन व त्रैमासिक परीक्षा समीक्षा',
      date: toDateStr(-2), // 2 days ago (completed)
      startTime: '14:30',
      endTime: '15:30',
      timeDisplay: '02:30 PM - 03:30 PM',
      mode: 'offline',
      linkOrLocation: 'स्टाफ कक्ष / Staff Room',
      agenda: 'कक्षा 1 व 2 के 100% विद्यार्थियों को निपुण लक्ष्य प्राप्ति हेतु उपचारात्मक शिक्षण योजना।',
      attendees: ['प्रधानाध्यापक', 'कक्षा 1 व 2 अध्यापक'],
      organizedBy: 'प्रधानाध्यापक',
      status: 'completed',
      minutesOfMeeting:
        'कक्षा 1 के 22 में से 17 छात्र निपुण पाए गए। शेष 5 छात्रों हेतु अतिरिक्त शिक्षण समय निर्धारित किया गया।',
      actionItems: [
        {
          id: 'ai-5',
          text: 'कमजोर 5 बच्चों के अभिभावकों से व्यक्तिगत चर्चा कर गृहकार्य अभ्यास पत्रक उपलब्ध कराना',
          assignedTo: 'कक्षा 1 अध्यापक',
          deadline: toDateStr(3),
          isConvertedToTask: true,
          taskId: 'th-task-nip-1',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};
