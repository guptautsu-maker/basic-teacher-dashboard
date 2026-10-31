/**
 * Teacher Hub - Trainings & Duties Management Logic
 * Pure business logic for tracking teacher professional trainings (DIKSHA, SCERT, NISHTHA),
 * progress calculation, deadline warnings, certificate uploads, and weekly duty rosters.
 */

import {
  Training,
  TrainingStatus,
  TrainingDeadlineInfo,
  TrainingCertificate,
} from '../types/training';
import { Duty, DutyStatus, WeeklyRosterDay } from '../types/duty';

/**
 * Format Date to YYYY-MM-DD string
 */
export const formatDateYmd = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get date string offset by N days
 */
export const getRelativeDateYmd = (offsetDays: number, baseDate: Date = new Date()): string => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return formatDateYmd(d);
};

/* ========================================================================== */
/* A) TRAININGS MODULE PURE LOGIC                                             */
/* ========================================================================== */

/**
 * Calculate progress percentage clamped between 0 and 100
 */
export const calculateTrainingProgress = (
  completedHours: number,
  totalHours: number
): number => {
  if (totalHours <= 0) return 0;
  const pct = Math.round((completedHours / totalHours) * 100);
  return Math.min(100, Math.max(0, pct));
};

/**
 * Calculate deadline status and warning for trainings nearing deadline
 * thresholdDays default is 3 days
 */
export const getTrainingDeadlineInfo = (
  dueDateStr: string,
  now: Date = new Date(),
  thresholdDays: number = 3
): TrainingDeadlineInfo => {
  if (!dueDateStr) {
    return {
      isOverdue: false,
      isNearingDeadline: false,
      daysRemaining: 999,
      badgeLabelHi: 'कोई अंतिम तिथि नहीं',
      badgeLabelEn: 'No Deadline',
    };
  }

  const cleanDueDate = dueDateStr.length > 10 ? dueDateStr.slice(0, 10) : dueDateStr;
  const nowYmd = formatDateYmd(now);

  const dueObj = new Date(`${cleanDueDate}T00:00:00`);
  const nowObj = new Date(`${nowYmd}T00:00:00`);

  const diffTime = dueObj.getTime() - nowObj.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      isOverdue: true,
      isNearingDeadline: false,
      daysRemaining,
      badgeLabelHi: `अंतिम तिथि समाप्त (${Math.abs(daysRemaining)} दिन विलंबित)`,
      badgeLabelEn: `Overdue by ${Math.abs(daysRemaining)} days`,
    };
  }

  if (daysRemaining === 0) {
    return {
      isOverdue: false,
      isNearingDeadline: true,
      daysRemaining: 0,
      badgeLabelHi: 'आज अंतिम तिथि है! (Due Today)',
      badgeLabelEn: 'Due Today',
    };
  }

  if (daysRemaining <= thresholdDays) {
    return {
      isOverdue: false,
      isNearingDeadline: true,
      daysRemaining,
      badgeLabelHi: `शीघ्र पूर्ण करें (केवल ${daysRemaining} दिन शेष)`,
      badgeLabelEn: `Nearing deadline (${daysRemaining} days left)`,
    };
  }

  return {
    isOverdue: false,
    isNearingDeadline: false,
    daysRemaining,
    badgeLabelHi: `${daysRemaining} दिन शेष`,
    badgeLabelEn: `${daysRemaining} days left`,
  };
};

/**
 * Update completed hours with automatic status transition
 */
export const updateTrainingProgress = (
  training: Training,
  newCompletedHours: number
): Training => {
  const completedHours = Math.max(0, Math.min(training.totalHours, newCompletedHours));
  let status: TrainingStatus = training.status;

  if (completedHours >= training.totalHours) {
    status = 'completed';
  } else if (completedHours > 0) {
    status = 'in_progress';
  } else {
    status = 'not_started';
  }

  return {
    ...training,
    completedHours,
    status,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Attach certificate to training and mark completed if desired
 */
export const attachTrainingCertificate = (
  training: Training,
  certificate: TrainingCertificate,
  markAsCompleted: boolean = true
): Training => {
  return {
    ...training,
    certificate,
    completedHours: markAsCompleted ? training.totalHours : training.completedHours,
    status: markAsCompleted ? 'completed' : training.status,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Filter trainings
 */
export const filterTrainings = (
  trainings: Training[],
  options: {
    status?: TrainingStatus | 'all' | 'nearing_deadline';
    query?: string;
    now?: Date;
  }
): Training[] => {
  const { status = 'all', query = '', now = new Date() } = options;
  const q = query.trim().toLowerCase();

  return trainings.filter((t) => {
    // 1. Status / Nearing Deadline filter
    if (status === 'nearing_deadline') {
      const deadlineInfo = getTrainingDeadlineInfo(t.dueDate, now);
      if (!deadlineInfo.isNearingDeadline && !deadlineInfo.isOverdue) return false;
      if (t.status === 'completed') return false; // don't warn if already completed
    } else if (status !== 'all') {
      if (t.status !== status) return false;
    }

    // 2. Query search
    if (q) {
      const match = [
        t.name,
        t.provider,
        t.description || '',
        t.status,
      ].some((f) => f.toLowerCase().includes(q));

      if (!match) return false;
    }

    return true;
  });
};

/**
 * Sample teacher professional trainings in Uttar Pradesh
 */
export const getSampleTrainings = (baseDate: Date = new Date()): Training[] => {
  return [
    {
      id: 'th-tr-1',
      name: 'निपुण भारत (FLN 3.0) बुनियादी साक्षरता एवं संख्या ज्ञान',
      provider: 'DIKSHA Portal / NCERT',
      totalHours: 12,
      completedHours: 9,
      dueDate: getRelativeDateYmd(1, baseDate), // In 1 day (Nearing deadline warning!)
      status: 'in_progress',
      certificateRequired: true,
      link: 'https://diksha.gov.in',
      description: 'कक्षा 1 से 3 के विद्यार्थियों हेतु भाषा एवं गणित के बुनियादी अधिगम प्रतिफल आधारित मॉड्यूल।',
      createdAt: new Date(baseDate.getTime() - 10 * 86400000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 86400000).toISOString(),
    },
    {
      id: 'th-tr-2',
      name: 'निष्ठा (NISHTHA) 4.0 - प्रारंभिक बाल्यावस्था देखभाल एवं शिक्षा (ECCE)',
      provider: 'SCERT उत्तर प्रदेश',
      totalHours: 8,
      completedHours: 2,
      dueDate: getRelativeDateYmd(2, baseDate), // In 2 days (Nearing deadline warning!)
      status: 'in_progress',
      certificateRequired: true,
      link: 'https://diksha.gov.in',
      description: 'आंगनबाड़ी से प्राथमिक विद्यालय में संक्रमण एवं पूर्व-प्राथमिक बालवाटिका शिक्षण विधियां।',
      createdAt: new Date(baseDate.getTime() - 14 * 86400000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 2 * 86400000).toISOString(),
    },
    {
      id: 'th-tr-3',
      name: 'मिशन शक्ति 5.0 - आत्मरक्षा व कन्या सुरक्षा जागरूकता प्रशिक्षण',
      provider: 'बेसिक शिक्षा परिषद',
      totalHours: 6,
      completedHours: 0,
      dueDate: getRelativeDateYmd(6, baseDate),
      status: 'not_started',
      certificateRequired: true,
      link: 'https://prernaup.in',
      description: 'बालिकाओं की सुरक्षा, आत्मरक्षा कौशल एवं पॉक्सो (POCSO) अधिनियम संबंधी आवश्यक दिशा-निर्देश।',
      createdAt: new Date(baseDate.getTime() - 3 * 86400000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 3 * 86400000).toISOString(),
    },
    {
      id: 'th-tr-4',
      name: 'iGoT कर्मयोगी: लोक सेवक आचार संहिता एवं डिजिटल साक्षरता',
      provider: 'iGoT Karmayogi (DoPT)',
      totalHours: 10,
      completedHours: 10,
      dueDate: getRelativeDateYmd(-4, baseDate),
      status: 'completed',
      certificateRequired: true,
      certificate: {
        name: 'iGoT_Code_of_Conduct_Certificate.pdf',
        size: '1.2 MB',
        uploadedAt: '27 Oct 2026, 03:45 PM',
      },
      link: 'https://igotkarmayogi.gov.in',
      description: 'डिजिटल कार्यशैली, डेटा गोपनीयता व निष्पक्ष जनसेवा हेतु अनिवार्य पाठ्यक्रम।',
      createdAt: new Date(baseDate.getTime() - 30 * 86400000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 4 * 86400000).toISOString(),
    },
    {
      id: 'th-tr-5',
      name: 'समेकित शिक्षा (Inclusive Education): दिव्यांग बच्चों हेतु समावेशी कक्षा',
      provider: 'समग्र शिक्षा अभियान, लखनऊ',
      totalHours: 5,
      completedHours: 1,
      dueDate: getRelativeDateYmd(-1, baseDate), // Expired yesterday (Overdue warning!)
      status: 'in_progress',
      certificateRequired: true,
      link: 'https://diksha.gov.in',
      description: 'दिव्यांग व विशेष आवश्यकता वाले बच्चों (CWSN) के सुगम पठन-पाठन हेतु विशेष शैक्षणिक सामग्री।',
      createdAt: new Date(baseDate.getTime() - 20 * 86400000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 5 * 86400000).toISOString(),
    },
  ];
};

/* ========================================================================== */
/* B) DUTIES MODULE PURE LOGIC                                                */
/* ========================================================================== */

const HINDI_WEEKDAY_NAMES: Record<number, string> = {
  1: 'सोमवार',
  2: 'मंगलवार',
  3: 'बुधवार',
  4: 'गुरुवार',
  5: 'शुक्रवार',
  6: 'शनिवार',
  0: 'रविवार',
};

const EN_WEEKDAY_NAMES: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday',
};

/**
 * Checks if a recurring duty is active on a given date
 */
export const isDutyActiveOnDate = (duty: Duty, targetDate: Date = new Date()): boolean => {
  if (duty.status !== 'active') return false;

  const targetYmd = formatDateYmd(targetDate);

  // Check start date
  if (duty.startDate && targetYmd < duty.startDate) return false;

  // Check end date
  if (duty.endDate && targetYmd > duty.endDate) return false;

  // Check day of week (0 = Sun, 1 = Mon ... 6 = Sat)
  const dayOfWeek = targetDate.getDay();
  return duty.daysOfWeek.includes(dayOfWeek);
};

/**
 * Generates Weekly Duty Roster (Monday to Saturday)
 */
export const getWeeklyDutyRoster = (
  duties: Duty[],
  baseDate: Date = new Date()
): WeeklyRosterDay[] => {
  const todayYmd = formatDateYmd(new Date());

  // Calculate Monday of the given week
  const curr = new Date(baseDate);
  const day = curr.getDay();
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));

  const roster: WeeklyRosterDay[] = [];

  // Monday to Saturday (1 to 6)
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatDateYmd(d);
    const dayOfWeek = d.getDay();

    const activeDuties = duties.filter((duty) => isDutyActiveOnDate(duty, d));

    roster.push({
      dayOfWeek,
      dayNameHi: HINDI_WEEKDAY_NAMES[dayOfWeek],
      dayNameEn: EN_WEEKDAY_NAMES[dayOfWeek],
      dateStr,
      isToday: dateStr === todayYmd,
      duties: activeDuties,
    });
  }

  return roster;
};

/**
 * Filter duties list
 */
export const filterDuties = (
  duties: Duty[],
  options: {
    category?: string;
    status?: DutyStatus | 'all';
    query?: string;
  }
): Duty[] => {
  const { category = 'all', status = 'all', query = '' } = options;
  const q = query.trim().toLowerCase();

  return duties.filter((d) => {
    if (status !== 'all' && d.status !== status) return false;
    if (category !== 'all' && d.category !== category) return false;

    if (q) {
      const match = [
        d.dutyName,
        d.schedule,
        d.assignedBy,
        d.assignedTeacher,
        d.location || '',
        d.notes || '',
      ].some((f) => f.toLowerCase().includes(q));

      if (!match) return false;
    }

    return true;
  });
};

/**
 * Sample school duties for basic teachers in India
 */
export const getSampleDuties = (baseDate: Date = new Date()): Duty[] => {
  const startMonthYmd = getRelativeDateYmd(-20, baseDate);
  const endMonthYmd = getRelativeDateYmd(40, baseDate);

  return [
    {
      id: 'duty-1',
      dutyName: 'मध्याह्न भोजन (MDM) वितरण व स्वच्छता पर्यवेक्षण',
      category: 'mdm',
      schedule: 'प्रतिदिन 12:30 PM - 01:15 PM',
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
      startDate: startMonthYmd,
      endDate: endMonthYmd,
      assignedBy: 'प्रधानाध्यापक',
      status: 'active',
      assignedTeacher: 'सुरेश कुमार (सहायक अध्यापक)',
      location: 'रसोईघर एवं भोजन प्रांगण',
      notes: 'भोजन की गुणवत्ता जांच, हाथ धुलाई एवं छात्रों के पंक्तिबद्ध भोजन की देखरेख।',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'duty-2',
      dutyName: 'बीएलओ / निर्वाचन नामावली पुनरीक्षण (BLO / Election Duty)',
      category: 'election',
      schedule: 'प्रत्येक शनिवार एवं अवकाश दिवस (10:00 AM - 04:00 PM)',
      daysOfWeek: [6, 0], // Sat & Sun
      startDate: startMonthYmd,
      endDate: getRelativeDateYmd(25, baseDate),
      assignedBy: 'उप जिलाधिकारी (SDM) / निर्वाचक रजिस्ट्रीकरण अधिकारी',
      status: 'active',
      assignedTeacher: 'शिक्षक जी (BLO)',
      location: 'मतदेय स्थल बूथ सं० 142, प्राथमिक विद्यालय',
      notes: 'फॉर्म 6, 7 व 8 का संकलन, नाम परिवर्धन एवं आधार प्रमाणीकरण कार्य।',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'duty-3',
      dutyName: 'निपुण असेसमेंट टेस्ट (NAT) कक्ष निरीक्षक दायित्व',
      category: 'exam',
      schedule: 'सोमवार व मंगलवार (09:30 AM - 12:30 PM)',
      daysOfWeek: [1, 2], // Mon & Tue
      startDate: getRelativeDateYmd(10, baseDate),
      endDate: getRelativeDateYmd(15, baseDate),
      assignedBy: 'खंड शिक्षा अधिकारी (BEO Office)',
      status: 'active',
      assignedTeacher: 'समस्त सहायक अध्यापक',
      location: 'कक्षा 1 से 5 परीक्षा कक्ष',
      notes: 'ओएमआर शीट वितरण, परीक्षा शुचिता एवं सरल ऐप स्कैनिंग सहयोग।',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'duty-4',
      dutyName: 'विद्यालय पुस्तकालय प्रभारी व रीडिंग कैंपेन (Library Duty)',
      category: 'library',
      schedule: 'प्रत्येक बुधवार एवं शुक्रवार (02:00 PM - 03:00 PM)',
      daysOfWeek: [3, 5], // Wed & Fri
      startDate: startMonthYmd,
      endDate: null, // Ongoing
      assignedBy: 'प्रधानाध्यापक',
      status: 'active',
      assignedTeacher: 'सुनीता शर्मा (स०अ०)',
      location: 'पुस्तकालय कक्ष (Library Room)',
      notes: 'पुस्तकालय पंजिका में पुस्तक जारी/वापसी अंकन एवं कहानियों का पाठन।',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'duty-5',
      dutyName: 'प्रातःकालीन प्रार्थना सभा एवं अनुशासन प्रभारी',
      category: 'assembly',
      schedule: 'प्रतिदिन 09:00 AM - 09:30 AM',
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
      startDate: startMonthYmd,
      endDate: null,
      assignedBy: 'प्रधानाध्यापक',
      status: 'active',
      assignedTeacher: 'रमेश चंद्र (सहायक अध्यापक)',
      location: 'मुख्य विद्यालय मैदान',
      notes: 'दैनिक सुविचार, सामान्य ज्ञान प्रश्नोत्तरी, राष्ट्रगान एवं पंक्ति अनुशासन।',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};
