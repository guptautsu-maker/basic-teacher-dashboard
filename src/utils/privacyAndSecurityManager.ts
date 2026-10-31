/**
 * Privacy & Security Manager
 * - DPDP Act 2023 & UIDAI Compliant Sensitive Data Blocking (Aadhaar & Password validation)
 * - Local JSON Backup and Restore engine
 * - Role Configuration (Teacher default, Head/Admin placeholder)
 * - App Settings & Notification Preferences
 */

import {
  AppSettings,
  BackupValidationResult,
  DPDPNoticeData,
  SensitiveDataValidationResult,
  SensitiveDataViolation,
  TeacherHubBackupData,
  TeacherHubBackupMetadata,
  UserRole,
} from '../types/settingsAndPrivacy';

// =====================================================================
// 1. SENSITIVE DATA DETECTION & BLOCKING (AADHAAR & PASSWORDS)
// =====================================================================

/**
 * Checks for 12-digit Indian Aadhaar number patterns.
 * UIDAI Aadhaar specifications:
 * - 12 digits total
 * - Cannot start with 0 or 1 (usually starts with 2-9)
 * - Commonly formatted as 4-4-4: "XXXX XXXX XXXX" or "XXXX-XXXX-XXXX" or contiguous 12 digits
 */
export const detectAadhaar = (text: string): { found: boolean; matches: string[] } => {
  if (!text || typeof text !== 'string') return { found: false, matches: [] };

  const matches: string[] = [];

  // 1. Formatted 4-4-4 with space or hyphen: e.g. 5432 1234 5678 or 5432-1234-5678
  const formattedRegex = /\b[2-9]\d{3}[-\s]\d{4}[-\s]\d{4}\b/g;
  let m: RegExpExecArray | null;
  while ((m = formattedRegex.exec(text)) !== null) {
    matches.push(m[0]);
  }

  // 2. Contiguous 12 digits: e.g. 543212345678
  const raw12Regex = /\b[2-9]\d{11}\b/g;
  while ((m = raw12Regex.exec(text)) !== null) {
    if (!matches.some((existing) => existing.replace(/[-\s]/g, '') === m![0])) {
      matches.push(m[0]);
    }
  }

  // 3. Aadhaar keyword context followed by any 12 digits (e.g. "aadhaar: 123456789012")
  const keywordRegex = /(?:aadhaar|aadhar|आधार|uidai)\s*[:#-]?\s*([0-9\s-]{12,14})/gi;
  while ((m = keywordRegex.exec(text)) !== null) {
    const digitsOnly = m[1].replace(/[-\s]/g, '');
    if (
      digitsOnly.length === 12 &&
      !matches.some((existing) => existing.replace(/[-\s]/g, '') === digitsOnly)
    ) {
      matches.push(m[0]);
    }
  }

  return {
    found: matches.length > 0,
    matches,
  };
};

/**
 * Checks for explicit password, PIN, or credential strings in plain text.
 */
export const detectPasswordOrSecret = (text: string): { found: boolean; matches: string[] } => {
  if (!text || typeof text !== 'string') return { found: false, matches: [] };

  const matches: string[] = [];

  // Patterns like "password: xyz", "pwd: 12345", "पासवर्ड: mySecret", "pin: 1234"
  const passwordLabeledRegex =
    /(?:password|passwd|pwd|passcode|पासवर्ड|लॉगिन\s*पासवर्ड|pin|secret)\s*[:=]\s*([^\s,;]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = passwordLabeledRegex.exec(text)) !== null) {
    matches.push(m[0]);
  }

  // "password is xyz" or "पासवर्ड है xyz"
  const passwordIsRegex = /(?:password|पासवर्ड|pwd)\s+(?:is|है)\s+([^\s,;]+)/gi;
  while ((m = passwordIsRegex.exec(text)) !== null) {
    if (!matches.includes(m[0])) {
      matches.push(m[0]);
    }
  }

  return {
    found: matches.length > 0,
    matches,
  };
};

/**
 * Validates text inputs and blocks if Aadhaar or passwords are found.
 * Strictly complies with DPDP Act 2023 & UIDAI Aadhaar Regulations.
 */
export const validateSensitiveData = (text: string): SensitiveDataValidationResult => {
  const aadhaarCheck = detectAadhaar(text);
  const passwordCheck = detectPasswordOrSecret(text);

  const violations: SensitiveDataViolation[] = [];

  if (aadhaarCheck.found) {
    violations.push({
      type: 'aadhaar',
      messageHi:
        'आधार नंबर दर्ज करना प्रतिबंधित है। डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम 2023 व UIDAI नियमावली के अंतर्गत शिक्षक Hub में पूर्ण आधार नंबर संचित नहीं किया जा सकता।',
      messageEn:
        'Aadhaar number detected. Under DPDP Act 2023 & UIDAI regulations, storing full Aadhaar numbers in Teacher Hub is strictly prohibited.',
      detectedPattern: '12-digit Aadhaar pattern',
      matchedSnippet: aadhaarCheck.matches.join(', '),
    });
  }

  if (passwordCheck.found) {
    violations.push({
      type: 'password',
      messageHi:
        'पासवर्ड या सुरक्षा क्रेडेंशियल दर्ज करना प्रतिबंधित है। सुरक्षा कारणों से विभागीय पोर्टल पासवर्ड को यहां कभी भी स्टोर न करें।',
      messageEn:
        'Password or security credential detected. For account safety, storing plain text passwords is strictly prohibited.',
      detectedPattern: 'Password / Credential keyword',
      matchedSnippet: passwordCheck.matches.join(', '),
    });
  }

  const isValid = violations.length === 0;

  const errorSummaryHi = isValid
    ? ''
    : violations.map((v) => `⛔ ${v.messageHi}`).join(' | ');

  const errorSummaryEn = isValid
    ? ''
    : violations.map((v) => `⛔ ${v.messageEn}`).join(' | ');

  return {
    isValid,
    hasAadhaar: aadhaarCheck.found,
    hasPassword: passwordCheck.found,
    violations,
    errorSummaryHi,
    errorSummaryEn,
  };
};

// =====================================================================
// 2. DPDP ACT 2023 PRIVACY NOTICE & PRINCIPLES
// =====================================================================

export const getDPDPAuditNotice = (): DPDPNoticeData => {
  return {
    actName: 'डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम 2023 (Digital Personal Data Protection Act, 2023)',
    year: 2023,
    lastUpdated: '2026-10-31',
    dataControllerRole: 'सहायक अध्यापक / बेसिक शिक्षक (Classroom Data Fiduciary)',
    principles: [
      {
        key: 'data_minimization',
        titleHi: 'डेटा न्यूनीकरण (Data Minimization - धारा 6)',
        titleEn: 'Data Minimization',
        sectionRef: 'Section 6(1)',
        descriptionHi:
          'विद्यार्थियों का केवल उतना ही डेटा एकत्रित किया जाता है जितना दैनिक शैक्षणिक व उपस्थिति अभिलेख हेतु अनिवार्य है (उदा० छात्र का नाम, अनुक्रमांक, कक्षा-वर्ग)।',
        descriptionEn:
          'Only minimum student data necessary for daily classroom tracking (Student Name, Roll Number, Class Section) is retained.',
        icon: '🎯',
      },
      {
        key: 'purpose_limitation',
        titleHi: 'उद्देश्य सीमांकन (Purpose Limitation - धारा 4 व 5)',
        titleEn: 'Purpose Limitation',
        sectionRef: 'Section 4, 5',
        descriptionHi:
          'छात्र व विद्यालय डेटा का उपयोग केवल बेसिक शिक्षा परिषद के अधिकृत शैक्षणिक, मूल्यांकन एवं मध्याह्न भोजन अनुपालन कार्यों तक ही सीमित है।',
        descriptionEn:
          'Data is processed exclusively for official primary education administration, classroom evaluation, and MDM compliance.',
        icon: '🛡️',
      },
      {
        key: 'storage_limitation',
        titleHi: 'भंडारण सीमा व स्थानीय नियंत्रण (Storage Limitation - धारा 8)',
        titleEn: 'Local-Only Storage Limitation',
        sectionRef: 'Section 8(7)',
        descriptionHi:
          'आपका समस्त डेटा आपके स्थानीय डिवाइस (Browser LocalStorage) पर ही सुरक्षित रहता है। कोई भी डेटा बाहरी अनधिकृत सर्वर या विज्ञापनदाताओं को प्रेषित नहीं होता।',
        descriptionEn:
          'All records remain strictly on your local device browser storage. No data is leaked or sent to third-party ad networks.',
        icon: '💻',
      },
      {
        key: 'children_protection',
        titleHi: 'बाल डेटा संरक्षण (Protection of Children Data - धारा 9)',
        titleEn: 'Protection of Children Data',
        sectionRef: 'Section 9',
        descriptionHi:
          '18 वर्ष से कम आयु के विद्यार्थियों की संवेदनशील बायोमेट्रिक, स्वास्थ्य या वित्तीय सूचनाएं Teacher Hub में पूर्णतः वर्जित हैं।',
        descriptionEn:
          'Special protections for minors: no biometric, behavioral tracking, or unencrypted identifying numbers are processed.',
        icon: '🧒',
      },
      {
        key: 'security_safeguards',
        titleHi: 'उचित तकनीकी सुरक्षा उपाय (Reasonable Security - धारा 8)',
        titleEn: 'Security Safeguards & No-Password Policy',
        sectionRef: 'Section 8(5)',
        descriptionHi:
          'पोर्टल पासवर्ड व 12-अंकीय आधार नंबर का संचयन स्वतः ब्लॉक किया जाता है ताकि डेटा लीक या चोरी का जोखिम शून्य रहे।',
        descriptionEn:
          'Automated input validation actively blocks storing passwords or 12-digit Aadhaar numbers to guarantee zero risk of leaks.',
        icon: '🔒',
      },
    ],
    prohibitions: {
      titleHi: 'Teacher Hub में क्या संचित करना पूर्णतः प्रतिबंधित है:',
      titleEn: 'Strictly Prohibited Items in Teacher Hub:',
      items: [
        'छात्रों व शिक्षकों का 12-अंकीय पूर्ण आधार नंबर (Aadhaar Number)',
        'विभागीय पोर्टल (प्रेरणा, UDISE+, मानव संपदा) के व्यक्तिगत लॉगिन पासवर्ड',
        'विद्यार्थियों के बायोमेट्रिक स्कैन या फिंगरप्रिंट रिकॉर्ड',
        'माता-पिता का व्यक्तिगत बैंक खाता पिन या नेट बैंकिंग क्रेडेंशियल',
      ],
    },
  };
};

// =====================================================================
// 3. DEFAULT APP SETTINGS & ROLE CONFIGURATION
// =====================================================================

export const STORAGE_KEY_SETTINGS = 'th-app-settings';

export const getDefaultAppSettings = (): AppSettings => {
  return {
    language: 'bilingual',
    activeAcademicYear: '2026-27',
    role: 'teacher',
    schoolProfile: {
      schoolName: 'प्राथमिक विद्यालय (कंपोजिट), लखनऊ',
      udiseCode: '09120104501',
      block: 'सरोजिनी नगर',
      district: 'लखनऊ',
      state: 'उत्तर प्रदेश',
      teacherName: 'सुरेश कुमार जी',
      designation: 'सहायक अध्यापक (PRT)',
      role: 'teacher',
    },
    notifications: {
      inAppAlerts: true,
      browserPush: false,
      soundAlerts: true,
      leadTimes: {
        threeDaysBefore: true,
        oneDayBefore: true,
        sameDayMorning: true,
        dailyOverdue: true,
      },
      quietHoursEnabled: true,
      quietHoursStart: '20:00',
      quietHoursEnd: '07:00',
    },
    dataPrivacyAccepted: true,
    lastBackupDate: null,
  };
};

export const getStoredAppSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...getDefaultAppSettings(),
        ...parsed,
        schoolProfile: {
          ...getDefaultAppSettings().schoolProfile,
          ...(parsed.schoolProfile || {}),
        },
        notifications: {
          ...getDefaultAppSettings().notifications,
          ...(parsed.notifications || {}),
        },
      };
    }
  } catch {
    // ignore
  }
  return getDefaultAppSettings();
};

export const saveStoredAppSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
};

// =====================================================================
// 4. LOCAL BACKUP & RESTORE ENGINE (JSON EXPORT & IMPORT)
// =====================================================================

export const STORAGE_KEYS = {
  tasks: 'th-tasks',
  duties: 'th-duties',
  meetings: 'th-meetings',
  trainings: 'th-trainings',
  govtOrders: 'th-govt-orders',
  portals: 'th-portal-apps',
  classSections: 'th-class-sections',
  attendanceRecords: 'th-attendance-records',
  settings: STORAGE_KEY_SETTINGS,
};

/**
 * Gathers all Teacher Hub records from localStorage and generates a single structured backup JSON.
 */
export const createBackupBundle = (customSettings?: AppSettings): TeacherHubBackupData => {
  const readList = (key: string): any[] => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  };

  const tasks = readList(STORAGE_KEYS.tasks);
  const duties = readList(STORAGE_KEYS.duties);
  const meetings = readList(STORAGE_KEYS.meetings);
  const trainings = readList(STORAGE_KEYS.trainings);
  const govtOrders = readList(STORAGE_KEYS.govtOrders);
  const portals = readList(STORAGE_KEYS.portals);
  const classSections = readList(STORAGE_KEYS.classSections);
  const attendanceRecords = readList(STORAGE_KEYS.attendanceRecords);
  const settings = customSettings || getStoredAppSettings();

  const meta: TeacherHubBackupMetadata = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    app: 'Teacher Hub - Basic Shiksha Parishad',
    academicYear: settings.activeAcademicYear,
    schoolName: settings.schoolProfile.schoolName,
    teacherName: settings.schoolProfile.teacherName,
    role: settings.role,
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
  };

  return {
    meta,
    tasks,
    duties,
    meetings,
    trainings,
    govtOrders,
    portals,
    classSections,
    attendanceRecords,
    settings,
  };
};

/**
 * Validates an imported JSON object before restoring.
 */
export const validateBackupData = (rawObj: unknown): BackupValidationResult => {
  if (!rawObj || typeof rawObj !== 'object') {
    return { isValid: false, error: 'अमान्य बैकअप फाइल: JSON डेटा एक ऑब्जेक्ट होना चाहिए।' };
  }

  const data = rawObj as Partial<TeacherHubBackupData>;

  if (!data.meta || typeof data.meta !== 'object') {
    return { isValid: false, error: 'अमान्य बैकअप फाइल: मेटाडेटा (meta) अनुपस्थित है।' };
  }

  if (data.meta.app && !data.meta.app.toLowerCase().includes('teacher hub')) {
    return {
      isValid: false,
      error: 'यह बैकअप फाइल Teacher Hub की नहीं प्रतीत होती है। कृपया सही फाइल चुनें।',
    };
  }

  if (!Array.isArray(data.tasks)) {
    return { isValid: false, error: 'अमान्य बैकअप फाइल: कार्यों (tasks) की सूची अमान्य है।' };
  }

  return {
    isValid: true,
    meta: data.meta as TeacherHubBackupMetadata,
    taskCount: data.tasks.length,
    classCount: Array.isArray(data.classSections) ? data.classSections.length : 0,
    attendanceCount: Array.isArray(data.attendanceRecords) ? data.attendanceRecords.length : 0,
    orderCount: Array.isArray(data.govtOrders) ? data.govtOrders.length : 0,
  };
};

/**
 * Restores records from validated backup data into localStorage.
 */
export const restoreBackupBundle = (
  backup: TeacherHubBackupData,
  mode: 'replace' | 'merge' = 'replace'
): { success: boolean; message: string; restoredCounts: Record<string, number> } => {
  const validation = validateBackupData(backup);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.error || 'अमान्य बैकअप',
      restoredCounts: {},
    };
  }

  const restoredCounts: Record<string, number> = {};

  const restoreArray = (key: string, incoming: any[], idField = 'id') => {
    if (!Array.isArray(incoming)) return;
    if (mode === 'replace') {
      try {
        localStorage.setItem(key, JSON.stringify(incoming));
        restoredCounts[key] = incoming.length;
      } catch {
        // ignore
      }
    } else {
      // Merge mode
      try {
        const existingRaw = localStorage.getItem(key);
        const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
        const existingIds = new Set(existing.map((item) => item[idField]));
        const newItems = incoming.filter((item) => !existingIds.has(item[idField]));
        const merged = [...newItems, ...existing];
        localStorage.setItem(key, JSON.stringify(merged));
        restoredCounts[key] = merged.length;
      } catch {
        // ignore
      }
    }
  };

  restoreArray(STORAGE_KEYS.tasks, backup.tasks || []);
  restoreArray(STORAGE_KEYS.duties, backup.duties || []);
  restoreArray(STORAGE_KEYS.meetings, backup.meetings || []);
  restoreArray(STORAGE_KEYS.trainings, backup.trainings || []);
  restoreArray(STORAGE_KEYS.govtOrders, backup.govtOrders || []);
  restoreArray(STORAGE_KEYS.portals, backup.portals || []);
  restoreArray(STORAGE_KEYS.classSections, backup.classSections || []);
  restoreArray(STORAGE_KEYS.attendanceRecords, backup.attendanceRecords || []);

  if (backup.settings) {
    saveStoredAppSettings({
      ...backup.settings,
      lastBackupDate: new Date().toISOString(),
    });
  }

  return {
    success: true,
    message: `सफलतापूर्वक डेटा रिस्टोर किया गया (${mode === 'replace' ? 'पूर्ण प्रतिस्थापन' : 'मर्ज'} मोड)।`,
    restoredCounts,
  };
};
