import { PortalApp, PortalCategory } from '../types/portalApp';
import { Task } from './taskStatusSystem';

export const PASSWORD_WARNING_NOTICE = {
  hi: '⚠️ सुरक्षा चेतावनी: कभी भी अपना या विभाग का पासवर्ड यहाँ दर्ज न करें। यह स्थान केवल लॉगिन निर्देश, यूजरनेम प्रारूप या नोडल अधिकारी हेल्पलाइन नोट करने के लिए है।',
  en: '⚠️ Security Warning: NEVER store passwords here. Use this field only for official username format, BRC helpline numbers, or step-by-step guidance.',
};

/**
 * Checks if a login help note contains obvious password leaks or sensitive keywords.
 */
export function validateLoginHelpNote(note?: string): {
  isValid: boolean;
  hasPasswordWarning: boolean;
  warningMessage?: string;
} {
  if (!note || !note.trim()) {
    return { isValid: true, hasPasswordWarning: false };
  }

  const lower = note.toLowerCase();

  // Pattern detection for explicit password storage attempts
  const suspiciousPatterns = [
    /\bpassword\s*[:=]\s*\S+/i,
    /\bpwd\s*[:=]\s*\S+/i,
    /\bpass\s*[:=]\s*\S+/i,
    /(?:^|[\s,;।])पासवर्ड\s*[:=]\s*\S+/i,
    /(?:^|[\s,;।])पिन\s*[:=]\s*\d{4,8}/i,
    /\b(my|secret)\s*password\b/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(lower)) {
      return {
        isValid: false,
        hasPasswordWarning: true,
        warningMessage:
          '⚠️ सुरक्षा कारणों से पासवर्ड सहेजना सख्त वर्जित है! कृपया पासवर्ड हटाकर केवल सामान्य निर्देश या हेल्पलाइन दर्ज करें।',
      };
    }
  }

  // Soft warning if words "password" or "पासवर्ड" appear without explicit assignment
  if (lower.includes('password') || lower.includes('पासवर्ड')) {
    return {
      isValid: true,
      hasPasswordWarning: true,
      warningMessage:
        'कृपया सुनिश्चित करें कि आपने यहाँ वास्तविक पासवर्ड दर्ज नहीं किया है। केवल यूजरनेम व निर्देश सहेजें।',
    };
  }

  return { isValid: true, hasPasswordWarning: false };
}

/**
 * Add a new portal to the list
 */
export function addPortal(
  portals: PortalApp[],
  newPortalData: Omit<PortalApp, 'id' | 'createdAt' | 'updatedAt'>,
  idGen: () => string = () => `portal-app-${Date.now()}`
): { portals: PortalApp[]; created: PortalApp } {
  const now = new Date().toISOString().split('T')[0];
  const created: PortalApp = {
    ...newPortalData,
    id: idGen(),
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  return {
    portals: [created, ...portals],
    created,
  };
}

/**
 * Update an existing portal by ID
 */
export function updatePortal(
  portals: PortalApp[],
  portalId: string,
  updates: Partial<PortalApp>
): { portals: PortalApp[]; updated: PortalApp | null } {
  let updatedRecord: PortalApp | null = null;
  const now = new Date().toISOString().split('T')[0];

  const nextList = portals.map((p) => {
    if (p.id === portalId) {
      updatedRecord = {
        ...p,
        ...updates,
        updatedAt: now,
      };
      return updatedRecord;
    }
    return p;
  });

  return {
    portals: nextList,
    updated: updatedRecord,
  };
}

/**
 * Delete a portal by ID
 */
export function deletePortal(
  portals: PortalApp[],
  portalId: string
): { portals: PortalApp[]; deleted: PortalApp | null } {
  const target = portals.find((p) => p.id === portalId) || null;
  const filtered = portals.filter((p) => p.id !== portalId);
  return {
    portals: filtered,
    deleted: target,
  };
}

/**
 * Records portal opened event, updating lastUsedDate to the specified or current day
 */
export function recordPortalOpened(
  portals: PortalApp[],
  portalId: string,
  customDate?: string
): { portals: PortalApp[]; portal: PortalApp | null } {
  const dateStr = customDate || new Date().toISOString().split('T')[0];
  let targetPortal: PortalApp | null = null;

  const nextList = portals.map((p) => {
    if (p.id === portalId) {
      targetPortal = {
        ...p,
        lastUsedDate: dateStr,
        updatedAt: dateStr,
      };
      return targetPortal;
    }
    return p;
  });

  return {
    portals: nextList,
    portal: targetPortal,
  };
}

/**
 * Retrieves pending tasks related to a specific portal
 */
export function getPendingWorkForPortal(portal: PortalApp, tasks: Task[]): Task[] {
  // Only tasks that are NOT completed/done
  const activeTasks = tasks.filter((t) => t.status !== 'done');

  return activeTasks.filter((task) => {
    // 1. Direct URL match or ID match
    if (task.portalUrl && portal.url) {
      const cleanTaskUrl = task.portalUrl.replace(/^https?:\/\//, '').split('/')[0];
      const cleanPortalUrl = portal.url.replace(/^https?:\/\//, '').split('/')[0];
      if (cleanTaskUrl && cleanPortalUrl && cleanTaskUrl === cleanPortalUrl) {
        return true;
      }
    }

    // 2. Direct name/source match
    if (task.source) {
      const src = task.source.toLowerCase();
      const pName = portal.name.toLowerCase();
      if (src.includes('prerna') && pName.includes('prerna')) return true;
      if (src.includes('udise') && pName.includes('udise')) return true;
      if (src.includes('diksha') && pName.includes('diksha')) return true;
      if (src.includes('scholarship') && pName.includes('scholarship')) return true;
      if (src.includes('ehrms') && (pName.includes('ehrms') || pName.includes('संपदा'))) return true;
      if (src.includes('mdm') && (pName.includes('mdm') || pName.includes('मध्याह्न'))) return true;
    }

    // 3. Match by neededForTask
    if (portal.neededForTask) {
      const needed = portal.neededForTask.toLowerCase().trim();
      if (
        task.title.toLowerCase().includes(needed) ||
        needed.includes(task.title.toLowerCase())
      ) {
        return true;
      }
    }

    // 4. Category-specific heuristic fallbacks
    if (portal.category === 'attendance' && task.type === 'attendance') {
      return true;
    }
    if (portal.category === 'training' && (task.type === 'training' || task.title.includes('प्रशिक्षण') || task.title.includes('दीक्षा'))) {
      return true;
    }
    if (portal.category === 'student_data' && (task.title.includes('UDISE') || task.title.includes('छात्र प्रोफ़ाइल') || task.title.includes('आधार प्रमाणीकरण'))) {
      return true;
    }
    if (portal.category === 'scholarship' && (task.title.includes('छात्रवृत्ति') || task.title.includes('Scholarship'))) {
      return true;
    }

    return false;
  });
}

/**
 * Format relative date display for lastUsedDate
 */
export function formatLastUsed(
  lastUsedDate?: string,
  referenceDate: Date = new Date()
): { textHi: string; textEn: string; isRecent: boolean } {
  if (!lastUsedDate) {
    return {
      textHi: 'अभी तक उपयोग नहीं हुआ',
      textEn: 'Never opened',
      isRecent: false,
    };
  }

  const todayStr = referenceDate.toISOString().split('T')[0];
  if (lastUsedDate === todayStr) {
    return {
      textHi: 'आज (Today)',
      textEn: 'Today',
      isRecent: true,
    };
  }

  const yest = new Date(referenceDate);
  yest.setDate(yest.getDate() - 1);
  const yestStr = yest.toISOString().split('T')[0];
  if (lastUsedDate === yestStr) {
    return {
      textHi: 'कल (Yesterday)',
      textEn: 'Yesterday',
      isRecent: true,
    };
  }

  try {
    const diffTime = referenceDate.getTime() - new Date(lastUsedDate).getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays < 30) {
      return {
        textHi: `${diffDays} दिन पहले`,
        textEn: `${diffDays} days ago`,
        isRecent: diffDays <= 3,
      };
    }
  } catch {
    // fallback
  }

  return {
    textHi: lastUsedDate,
    textEn: lastUsedDate,
    isRecent: false,
  };
}
