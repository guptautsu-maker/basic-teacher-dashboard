/**
 * Teacher Hub - Government Orders (शासनादेश व विभागीय आदेश) Management Logic
 * Pure business logic functions for filtering, acknowledging, converting to tasks,
 * and categorization of official government circulars for Basic School Teachers.
 */

import { Task } from './taskStatusSystem';
import {
  GovtOrder,
  GovtOrderFilter,
  GovtOrderPriority,
  ConvertOrderToTaskInput,
} from '../types/govtOrder';

/**
 * Format Date to YYYY-MM-DD string
 */
export const formatDateToYmd = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format date offset by N days from a base date
 */
export const getRelativeYmd = (offsetDays: number, baseDate: Date = new Date()): string => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return formatDateToYmd(d);
};

/**
 * Checks if a given deadline is expired relative to current reference date
 */
export const isDeadlineExpired = (deadline: string | null | undefined, now: Date = new Date()): boolean => {
  if (!deadline) return false;
  const deadlineYmd = deadline.length > 10 ? deadline.slice(0, 10) : deadline;
  const nowYmd = formatDateToYmd(now);
  return deadlineYmd < nowYmd;
};

/**
 * Categorize a single Govt Order into status flags
 */
export const categorizeGovtOrder = (
  order: GovtOrder,
  now: Date = new Date()
): {
  isNew: boolean;
  isActionNeeded: boolean;
  isAcknowledged: boolean;
  isExpired: boolean;
} => {
  const isAcknowledged = Boolean(order.isAcknowledged);
  const isExpired = isDeadlineExpired(order.deadline, now);

  // Expired takes precedence if deadline passed and not completed
  if (isExpired) {
    return {
      isNew: false,
      isActionNeeded: false,
      isAcknowledged,
      isExpired: true,
    };
  }

  // Action Needed: has an active deadline (today or future), or has pending required acknowledgement,
  // or is urgent/high priority and not yet acknowledged
  const hasActiveDeadline = Boolean(order.deadline && !isExpired);
  const needsAck = Boolean(order.acknowledgementRequired && !isAcknowledged);
  const isActionNeeded = hasActiveDeadline || needsAck;

  // New: Order is unread or not yet acknowledged, issued recently (within 5 days)
  const orderDateYmd = order.date.length > 10 ? order.date.slice(0, 10) : order.date;
  const fiveDaysAgoYmd = getRelativeYmd(-5, now);
  const isRecent = orderDateYmd >= fiveDaysAgoYmd;
  const isNew = (!isAcknowledged || order.isRead === false) && isRecent;

  return {
    isNew,
    isActionNeeded,
    isAcknowledged,
    isExpired: false,
  };
};

/**
 * Keyword search matcher across Hindi and English text
 */
export const matchesSearchQuery = (order: GovtOrder, query: string): boolean => {
  if (!query || !query.trim()) return true;
  const normalizedQuery = query.toLowerCase().trim();

  const searchableFields = [
    order.title,
    order.orderNumber,
    order.issuingOffice,
    order.summary,
    order.priority,
    ...(order.tags || []),
    order.attachment?.name || '',
  ];

  return searchableFields.some((field) =>
    field.toLowerCase().includes(normalizedQuery)
  );
};

/**
 * Filter and search government orders
 */
export const filterGovtOrders = (
  orders: GovtOrder[],
  options: {
    filter?: GovtOrderFilter;
    query?: string;
    now?: Date;
  }
): GovtOrder[] => {
  const { filter = 'all', query = '', now = new Date() } = options;

  return orders.filter((order) => {
    // 1. Check keyword search
    if (!matchesSearchQuery(order, query)) {
      return false;
    }

    // 2. Check filter tab
    if (filter === 'all') return true;

    const cats = categorizeGovtOrder(order, now);
    switch (filter) {
      case 'new':
        return cats.isNew;
      case 'action_needed':
        return cats.isActionNeeded;
      case 'acknowledged':
        return cats.isAcknowledged;
      case 'expired':
        return cats.isExpired;
      default:
        return true;
    }
  });
};

/**
 * Calculate counts for each filter category
 */
export const getGovtOrderCounts = (
  orders: GovtOrder[],
  now: Date = new Date()
): Record<GovtOrderFilter, number> => {
  const counts: Record<GovtOrderFilter, number> = {
    all: orders.length,
    new: 0,
    action_needed: 0,
    acknowledged: 0,
    expired: 0,
  };

  orders.forEach((order) => {
    const cats = categorizeGovtOrder(order, now);
    if (cats.isNew) counts.new += 1;
    if (cats.isActionNeeded) counts.action_needed += 1;
    if (cats.isAcknowledged) counts.acknowledged += 1;
    if (cats.isExpired) counts.expired += 1;
  });

  return counts;
};

/**
 * Acknowledge an order and log the exact teacher and timestamp
 */
export const acknowledgeGovtOrder = (
  order: GovtOrder,
  acknowledgedBy: string = 'शिक्षक जी',
  timestampStr?: string
): GovtOrder => {
  const formattedTimestamp =
    timestampStr ||
    new Date().toLocaleString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return {
    ...order,
    isAcknowledged: true,
    acknowledgedAt: formattedTimestamp,
    acknowledgedBy: acknowledgedBy.trim() || 'शिक्षक जी',
    isRead: true,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Revert/un-acknowledge an order
 */
export const unacknowledgeGovtOrder = (order: GovtOrder): GovtOrder => {
  return {
    ...order,
    isAcknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Convert a Government Order into an actionable Task in Teacher Hub
 */
export const convertGovtOrderToTask = (
  order: GovtOrder,
  input: ConvertOrderToTaskInput,
  idGenerator: () => string = () => `th-task-go-${Date.now()}-${Math.floor(Math.random() * 1000)}`
): { task: Task; updatedOrder: GovtOrder } => {
  const taskId = idGenerator();
  const nowIso = new Date().toISOString();

  // Create deadline ISO string if YYYY-MM-DD was provided
  let taskDeadline: string | null = null;
  const rawDeadline = input.deadline || order.deadline;
  if (rawDeadline) {
    if (rawDeadline.includes('T')) {
      taskDeadline = rawDeadline;
    } else {
      taskDeadline = `${rawDeadline}T17:00:00.000Z`;
    }
  }

  const task: Task = {
    id: taskId,
    title: input.title.trim(),
    description: input.description?.trim() || order.summary,
    type: 'govt_order',
    source: `शासनादेश पत्रांक: ${order.orderNumber}`,
    portalUrl: order.attachment?.dataUrl || undefined,
    deadline: taskDeadline,
    priority: input.priority || order.priority || 'high',
    status: 'not_started',
    recurrence: input.recurrence || 'none',
    assignedTo: input.assignedTo?.trim() || 'शिक्षक जी',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const updatedOrder: GovtOrder = {
    ...order,
    linkedTaskIds: Array.from(new Set([...order.linkedTaskIds, taskId])),
    updatedAt: nowIso,
  };

  return { task, updatedOrder };
};

/**
 * Create a new Government Order with validation
 */
export const createGovtOrder = (
  input: {
    title: string;
    orderNumber?: string;
    date: string;
    issuingOffice: string;
    deadline?: string | null;
    priority?: GovtOrderPriority;
    summary: string;
    acknowledgementRequired?: boolean;
    attachment?: {
      name: string;
      size?: string;
      type?: string;
      dataUrl?: string;
    };
    tags?: string[];
  },
  idGenerator: () => string = () => `go-${Date.now()}`
): GovtOrder => {
  const nowIso = new Date().toISOString();
  const id = idGenerator();
  const orderNumber =
    input.orderNumber?.trim() ||
    `पत्रांक: शि०का० / ${Math.floor(1000 + Math.random() * 9000)} / 2026-27`;

  return {
    id,
    orderNumber,
    title: input.title.trim(),
    date: input.date || formatDateToYmd(new Date()),
    issuingOffice: input.issuingOffice.trim(),
    deadline: input.deadline ? input.deadline.trim() : null,
    priority: input.priority || 'medium',
    summary: input.summary.trim(),
    acknowledgementRequired: input.acknowledgementRequired ?? true,
    isAcknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
    linkedTaskIds: [],
    isRead: false,
    attachment: input.attachment,
    tags: input.tags || ['शासनादेश', 'विभागीय'],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

/**
 * Seed realistic Uttar Pradesh Basic Education Government Orders
 */
export const getSampleGovtOrders = (baseDate: Date = new Date()): GovtOrder[] => {
  return [
    {
      id: 'go-001',
      orderNumber: 'पत्रांक: बे०शि०प० / 14205-14310 / 2026-27',
      title: 'शीतकालीन यूनिफॉर्म, स्वेटर, जूता-मोज़ा डीबीटी (DBT) धनराशि अंतरण व क्रय सत्यापन निर्देश',
      date: getRelativeYmd(0, baseDate), // Today
      issuingOffice: 'महानिदेशक, स्कूल शिक्षा एवं राज्य परियोजना निदेशक, लखनऊ',
      deadline: getRelativeYmd(10, baseDate), // In 10 days
      priority: 'urgent',
      summary:
        'समस्त परिषदीय प्राथमिक एवं उच्च प्राथमिक विद्यालयों में नामांकित छात्र-छात्राओं के अभिभावकों के आधार लिंक बैंक खातों में ₹1200 प्रति छात्र की दर से धनराशि हस्तांतरित कर दी गई है। सभी शिक्षक प्रेरणा डीबीटी ऐप पर क्रय सत्यापन पूर्ण करें।',
      attachment: {
        name: 'Shashanadesh_DBT_Uniform_2026.pdf',
        size: '1.4 MB',
        type: 'application/pdf',
      },
      acknowledgementRequired: true,
      isAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      linkedTaskIds: ['th-task-up-1'],
      isRead: false,
      tags: ['डीबीटी', 'यूनिफॉर्म', 'प्रेरणा'],
      createdAt: new Date(baseDate.getTime() - 2 * 3600000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 2 * 3600000).toISOString(),
    },
    {
      id: 'go-002',
      orderNumber: 'पत्रांक: शि०नि० / गोपन-09 / NAT-2026',
      title: 'निपुण असेसमेंट टेस्ट (NAT) परीक्षा कार्यक्रम एवं सरल ऐप (Saral App) ओएमआर स्कैनिंग समय-सारणी',
      date: getRelativeYmd(-1, baseDate), // Yesterday
      issuingOffice: 'सचिव, उत्तर प्रदेश बेसिक शिक्षा परिषद, प्रयागराज',
      deadline: getRelativeYmd(14, baseDate),
      priority: 'high',
      summary:
        'सत्र 2026-27 हेतु कक्षा 1 से 8 तक के विद्यार्थियों का NAT आकलन आगामी 18 से 20 नवंबर को आयोजित होगा। परीक्षा उपरांत उसी दिन सरल ऐप के माध्यम से ओएमआर शीट स्कैन कर डेटा सिंक करना अनिवार्य है।',
      attachment: {
        name: 'NAT_Exam_Schedule_Guidelines.pdf',
        size: '2.1 MB',
        type: 'application/pdf',
      },
      acknowledgementRequired: true,
      isAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      linkedTaskIds: [],
      isRead: false,
      tags: ['निपुण', 'सरल ऐप', 'परीक्षा'],
      createdAt: new Date(baseDate.getTime() - 26 * 3600000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 26 * 3600000).toISOString(),
    },
    {
      id: 'go-003',
      orderNumber: 'पत्रांक: जि०बे०शि०अ० / कायाकल्प / 8841 / 2026',
      title: 'ऑपरेशन कायाकल्प: 19 मूलभूत अवस्थापना सुविधाओं के शत-प्रतिशत संतृप्तिकरण बाबत',
      date: getRelativeYmd(-2, baseDate),
      issuingOffice: 'जिला बेसिक शिक्षा अधिकारी (BSA Office)',
      deadline: getRelativeYmd(7, baseDate),
      priority: 'medium',
      summary:
        'ग्राम प्रधान व पंचायत सचिव के समन्वय से शुद्ध पेयजल, दिव्यांग सुलभ बालक-बालिका शौचालय, विद्युतीकरण एवं टाइल्स कार्य की समीक्षा कर कायाकल्प पोर्टल पर जियो-टैग फोटोग्राफ अपलोड करना सुनिश्चित करें।',
      attachment: {
        name: 'Operation_Kayakalp_19_Parameters.pdf',
        size: '860 KB',
        type: 'application/pdf',
      },
      acknowledgementRequired: true,
      isAcknowledged: true,
      acknowledgedAt: '29 Oct 2026, 11:20 AM',
      acknowledgedBy: 'रमेश चंद्र (प्रधानाध्यापक)',
      linkedTaskIds: [],
      isRead: true,
      tags: ['कायाकल्प', 'भौतिक सत्यापन', 'BSA'],
      createdAt: new Date(baseDate.getTime() - 50 * 3600000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 40 * 3600000).toISOString(),
    },
    {
      id: 'go-004',
      orderNumber: 'पत्रांक: प्र०नि० / विद्या०समय / 2026-27',
      title: 'ग्रीष्मकालीन से शीतकालीन विद्यालय समय-सारणी परिवर्तन सूचना (प्रातः 09:00 से अप० 03:00)',
      date: getRelativeYmd(-4, baseDate),
      issuingOffice: 'शिक्षा निदेशक (बेसिक), उत्तर प्रदेश',
      deadline: null, // General information circular, no action deadline
      priority: 'low',
      summary:
        'मौसम में बदलाव के दृष्टिगत समस्त बेसिक शिक्षा परिषद विद्यालयों का संचालन समय अब प्रातः 09:00 बजे से अपराह्न 03:00 बजे तक रहेगा। प्रार्थना सभा 09:15 बजे संपन्न होगी।',
      attachment: {
        name: 'School_Timing_Winter_Circular.pdf',
        size: '420 KB',
        type: 'application/pdf',
      },
      acknowledgementRequired: false,
      isAcknowledged: true,
      acknowledgedAt: '27 Oct 2026, 04:15 PM',
      acknowledgedBy: 'शिक्षक जी',
      linkedTaskIds: [],
      isRead: true,
      tags: ['समय सारणी', 'शीतकालीन'],
      createdAt: new Date(baseDate.getTime() - 96 * 3600000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 80 * 3600000).toISOString(),
    },
    {
      id: 'go-005',
      orderNumber: 'पत्रांक: यू-डायस / छात्र-प्रमाणीकरण / 5512 / 2026',
      title: 'UDISE+ 2026-27: छात्र प्रोफाइल एवं शिक्षक मॉड्यूल डेटा सत्यापन अंतिम चेतावनी',
      date: getRelativeYmd(-10, baseDate),
      issuingOffice: 'राज्य परियोजना कार्यालय समग्र शिक्षा, लखनऊ',
      deadline: getRelativeYmd(-2, baseDate), // Expired 2 days ago!
      priority: 'urgent',
      summary:
        'सत्र 2026-27 हेतु यू-डायस प्लस पोर्टल पर नामांकित समस्त छात्रों का आधार प्रमाणीकरण तथा शिक्षक विवरण का सत्यापन पूर्ण करने हेतु अंतिम अवसर। अपूर्ण रहने पर विद्यालय अनुदान बाधित हो सकता है।',
      attachment: {
        name: 'UDISE_Verification_Final_Notice.pdf',
        size: '1.8 MB',
        type: 'application/pdf',
      },
      acknowledgementRequired: true,
      isAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      linkedTaskIds: [],
      isRead: true,
      tags: ['UDISE+', 'आधार', 'वेरिफिकेशन'],
      createdAt: new Date(baseDate.getTime() - 240 * 3600000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 240 * 3600000).toISOString(),
    },
    {
      id: 'go-006',
      orderNumber: 'पत्रांक: बीईओ / एमडीएम-खाद्यान्न / 773 / 2026',
      title: 'मध्याह्न भोजन (MDM) त्रैमासिक परिवर्तन लागत (Conversion Cost) व्यय विवरण प्रेषण',
      date: getRelativeYmd(-1, baseDate),
      issuingOffice: 'खंड शिक्षा अधिकारी (BEO Office)',
      deadline: getRelativeYmd(5, baseDate),
      priority: 'high',
      summary:
        'अक्टूबर से दिसंबर त्रैमास हेतु विद्यालय प्रबंध समिति (SMC) के खाते में अंतरित परिवर्तन लागत व रसोइया मानदेय का उपभोग प्रमाण-पत्र (UC) बीआरसी पर तीन प्रतियों में जमा करें।',
      attachment: {
        name: 'MDM_Quarterly_UC_Format.pdf',
        size: '650 KB',
        type: 'application/pdf',
      },
      acknowledgementRequired: true,
      isAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      linkedTaskIds: [],
      isRead: false,
      tags: ['MDM', 'कन्वर्जन कॉस्ट', 'BEO'],
      createdAt: new Date(baseDate.getTime() - 20 * 3600000).toISOString(),
      updatedAt: new Date(baseDate.getTime() - 20 * 3600000).toISOString(),
    },
  ];
};
