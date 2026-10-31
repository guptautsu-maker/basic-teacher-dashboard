/**
 * Teacher Hub - Safeguards System Pure Functions
 * Implements:
 * 1. Start-of-day auto-checklist
 * 2. End-of-day review & task deferral
 * 3. Weekly summary (Sunday digest)
 * 4. Critical overdue escalation (>3 days)
 * 5. Universal search across all modules
 * 6. Printable/PDF pending work report generator
 */

import { Task, TaskPriority, changeTaskStatus } from './taskStatusSystem';
import { Duty } from '../types/duty';
import { MeetingItem, TrainingItem, GovtOrderItem } from '../data/teacherHubSampleData';
import { PortalApp } from '../types/portalApp';
import { ClassSection } from '../types/classSection';
import {
  StartOfDayItem,
  EndOfDayAction,
  EndOfDayReviewItem,
  WeeklySummaryReport,
  WeeklyCategoryStat,
  CriticalEscalationItem,
  GlobalSearchAggregatedResults,
  GlobalSearchResultItem,
  PendingWorkReportData,
} from '../types/safeguards';

export const CRITICAL_OVERDUE_DAYS_THRESHOLD = 3;

function formatDateYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 1. Start-of-Day Checklist
 * Combines today's pending tasks, today's meetings, and today's scheduled duties.
 */
export function generateStartOfDayChecklist(
  tasks: Task[],
  duties: Duty[],
  meetings: MeetingItem[],
  referenceDate = new Date()
): StartOfDayItem[] {
  const todayYmd = formatDateYmd(referenceDate);
  const dayOfWeek = referenceDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const items: StartOfDayItem[] = [];

  // 1. Tasks due today or overdue with high/urgent priority
  for (const t of tasks) {
    if (t.status === 'done') continue;
    const taskDate = t.deadline ? t.deadline.split('T')[0] : '';

    if (taskDate === todayYmd) {
      items.push({
        id: `sod-task-${t.id}`,
        sourceType: 'task',
        title: t.title,
        subtitle: `कार्य प्रकार: ${t.type.toUpperCase()} • प्राथमिकता: ${t.priority.toUpperCase()}`,
        priority: t.priority,
        status: 'pending',
        timeLabel: 'आज अंतिम तिथि',
        portalUrl: t.portalUrl,
        originalId: t.id,
      });
    } else if (t.status === 'overdue' || (taskDate && taskDate < todayYmd && (t.priority === 'urgent' || t.priority === 'high'))) {
      items.push({
        id: `sod-overdue-${t.id}`,
        sourceType: 'task',
        title: `[विलंबित] ${t.title}`,
        subtitle: `अंतिम तिथि बीत चुकी है (${taskDate}) • प्राथमिकता: ${t.priority.toUpperCase()}`,
        priority: 'urgent',
        status: 'pending',
        timeLabel: 'अति आवश्यक',
        portalUrl: t.portalUrl,
        originalId: t.id,
      });
    }
  }

  // 2. Duties scheduled for today
  for (const d of duties) {
    if (d.status !== 'active') continue;
    if (Array.isArray(d.daysOfWeek) && d.daysOfWeek.includes(dayOfWeek)) {
      items.push({
        id: `sod-duty-${d.id}`,
        sourceType: 'duty',
        title: `दायित्व: ${d.dutyName}`,
        subtitle: `स्थान: ${d.location || 'विद्यालय'} • ${d.schedule}`,
        priority: 'high',
        status: 'pending',
        timeLabel: d.schedule,
        originalId: d.id,
      });
    }
  }

  // 3. Meetings scheduled for today
  for (const m of meetings) {
    if (m.date === todayYmd && m.status !== 'cancelled') {
      items.push({
        id: `sod-meeting-${m.id}`,
        sourceType: 'meeting',
        title: `बैठक: ${m.title}`,
        subtitle: `माध्यम: ${m.mode.toUpperCase()} • आयोजक: ${m.organizedBy}`,
        priority: 'medium',
        status: m.status === 'completed' ? 'completed' : 'pending',
        timeLabel: m.time,
        portalUrl: m.locationOrLink,
        originalId: m.id,
      });
    }
  }

  // Sort: urgent first, then high, then medium, then low
  const weight: Record<TaskPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return items.sort((a, b) => weight[b.priority] - weight[a.priority]);
}

/**
 * 2. End-of-Day Review
 * Identifies tasks that were due today or earlier and remain incomplete.
 */
export function getEndOfDayReviewItems(
  tasks: Task[],
  referenceDate = new Date()
): EndOfDayReviewItem[] {
  const todayYmd = formatDateYmd(referenceDate);

  const reviewItems: EndOfDayReviewItem[] = [];

  for (const t of tasks) {
    if (t.status === 'done') continue;
    const taskDate = t.deadline ? t.deadline.split('T')[0] : '';

    if (taskDate && taskDate <= todayYmd) {
      reviewItems.push({
        task: t,
        suggestedAction: 'done',
        isResolved: false,
      });
    }
  }

  return reviewItems;
}

/**
 * Resolve an End-of-Day task review item
 */
export function applyEndOfDayAction(
  task: Task,
  action: EndOfDayAction,
  options?: {
    customDate?: string;
    comment?: string;
    changedBy?: string;
    now?: Date;
  }
): { updatedTask: Task; nextInstance?: Task } {
  const now = options?.now || new Date();
  const changedBy = options?.changedBy || 'शिक्षक (सांध्य समीक्षा)';

  if (action === 'done') {
    const res = changeTaskStatus({
      task,
      newStatus: 'done',
      changedBy,
      comment: options?.comment || 'सांध्य समीक्षा में पूर्ण चिह्नित किया गया',
      now,
    });
    return { updatedTask: res.updatedTask, nextInstance: res.nextRecurringTask };
  }

  if (action === 'mark_blocked') {
    const res = changeTaskStatus({
      task,
      newStatus: 'blocked',
      changedBy,
      comment: options?.comment || 'कार्य में रुकावट दर्ज की गई',
      now,
    });
    return { updatedTask: res.updatedTask };
  }

  // Moving task (deferral)
  let newDeadlineDate: Date;
  if (action === 'move_tomorrow') {
    newDeadlineDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // move_next_week (+7 days)
    newDeadlineDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const newDeadlineIso = options?.customDate
    ? new Date(options.customDate).toISOString()
    : newDeadlineDate.toISOString();

  const updatedTask: Task = {
    ...task,
    deadline: newDeadlineIso,
    status: task.status === 'overdue' ? 'in_progress' : task.status,
    updatedAt: now.toISOString(),
  };

  return { updatedTask };
}

/**
 * 3. Weekly Summary Report (Sunday Review)
 */
export function generateWeeklySummary(
  tasks: Task[],
  referenceDate = new Date()
): WeeklySummaryReport {
  const ref = new Date(referenceDate);
  // Calculate start of current week (last Monday) and end (Sunday)
  const day = ref.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day; // day 0 is Sunday
  const monday = new Date(ref);
  monday.setDate(ref.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mondayYmd = formatDateYmd(monday);
  const sundayYmd = formatDateYmd(sunday);

  const doneTasks: Task[] = [];
  const pendingTasks: Task[] = [];
  const overdueTasks: Task[] = [];

  const categoryMap = new Map<string, { total: number; done: number; pending: number; overdue: number }>();

  for (const t of tasks) {
    const isDone = t.status === 'done';
    const isOverdue = t.status === 'overdue';

    if (isDone) {
      doneTasks.push(t);
    } else if (isOverdue) {
      overdueTasks.push(t);
    } else {
      pendingTasks.push(t);
    }

    const catKey = t.type;
    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, { total: 0, done: 0, pending: 0, overdue: 0 });
    }
    const stat = categoryMap.get(catKey)!;
    stat.total++;
    if (isDone) stat.done++;
    else if (isOverdue) stat.overdue++;
    else stat.pending++;
  }

  const totalTasks = tasks.length;
  const completionRatePercent = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  const categoryBreakdown: WeeklyCategoryStat[] = Array.from(categoryMap.entries()).map(
    ([category, stats]) => ({
      category,
      ...stats,
    })
  );

  // Generate actionable insights
  const insights: string[] = [];
  if (completionRatePercent >= 75) {
    insights.push(`🌟 उत्कृष्ट प्रगति! आपने इस सप्ताह ${completionRatePercent}% कार्य सफलतापूर्वक पूर्ण किए हैं।`);
  } else if (completionRatePercent >= 50) {
    insights.push(`👍 संतोषजनक कार्य! ${completionRatePercent}% कार्य पूर्ण हुए, आगामी सप्ताह पेंडिंग कार्यों को प्राथमिकता दें।`);
  } else {
    insights.push(`⚠️ ध्यान दें: इस सप्ताह केवल ${completionRatePercent}% कार्य ही पूर्ण हुए हैं।`);
  }

  if (overdueTasks.length > 0) {
    insights.push(`🚨 वर्तमान में ${overdueTasks.length} कार्य समयसीमा पार (Overdue) हैं। कृपया सोमवार प्रातः इन्हें प्राथमिकता दें।`);
  } else {
    insights.push('✅ कोई भी कार्य समयसीमा पार (Overdue) नहीं है। बहुत खूब!');
  }

  return {
    weekLabel: `${monday.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    startDate: mondayYmd,
    endDate: sundayYmd,
    totalTasks,
    doneTasks,
    pendingTasks,
    overdueTasks,
    completionRatePercent,
    categoryBreakdown,
    insights,
  };
}

/**
 * 4. Critical Overdue Escalations
 * Tasks overdue by more than threshold days (default 3 days).
 */
export function getCriticalEscalations(
  tasks: Task[],
  referenceDate = new Date(),
  thresholdDays = CRITICAL_OVERDUE_DAYS_THRESHOLD
): CriticalEscalationItem[] {
  const nowTime = referenceDate.getTime();
  const escalations: CriticalEscalationItem[] = [];

  for (const t of tasks) {
    if (t.status === 'done') continue;
    if (!t.deadline) continue;

    const deadlineTime = new Date(t.deadline).getTime();
    const diffMs = nowTime - deadlineTime;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= thresholdDays) {
      const isSevere = diffDays >= 7;
      let recAction = 'आज ही पोर्टल पर प्रविष्टि दर्ज कर कार्य पूर्ण करें';
      if (t.type === 'portal_entry') {
        recAction = 'विभागीय पोर्टल पर तत्काल लॉगिन कर डेटा लॉक करें';
      } else if (t.type === 'mdm') {
        recAction = 'एमडीएम स्टॉक व आईवीआरएस मिलान कर तुरंत रिपोर्ट भेजें';
      } else if (t.type === 'training') {
        recAction = 'दीक्षा कोर्स मॉड्यूल पूर्ण कर प्रमाणपत्र डाउनलोड करें';
      }

      escalations.push({
        task: t,
        daysOverdue: diffDays,
        deadlineDateStr: t.deadline.split('T')[0],
        severity: isSevere ? 'severe' : 'critical',
        recommendedAction: recAction,
      });
    }
  }

  // Sort by highest overdue days descending
  return escalations.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * 5. Universal Search Across All Modules
 */
export function searchAllModules(
  rawQuery: string,
  data: {
    tasks: Task[];
    orders: GovtOrderItem[];
    meetings: MeetingItem[];
    trainings: TrainingItem[];
    portals?: PortalApp[];
    classes?: ClassSection[];
  }
): GlobalSearchAggregatedResults {
  const query = rawQuery.trim().toLowerCase();
  const countsByModule = {
    task: 0,
    order: 0,
    meeting: 0,
    training: 0,
    portal: 0,
    class: 0,
  };

  if (!query) {
    return {
      query: '',
      totalCount: 0,
      items: [],
      countsByModule,
    };
  }

  const items: GlobalSearchResultItem[] = [];

  // Search Tasks
  for (const t of data.tasks) {
    if (
      t.title.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query)) ||
      (t.source && t.source.toLowerCase().includes(query)) ||
      t.type.toLowerCase().includes(query)
    ) {
      countsByModule.task++;
      items.push({
        id: `sr-task-${t.id}`,
        module: 'task',
        moduleLabelHi: 'कार्य',
        moduleLabelEn: 'Task',
        title: t.title,
        snippet: t.description || `स्रोत: ${t.source || 'सामान्य'} • स्थिति: ${t.status}`,
        badgeText: t.priority.toUpperCase(),
        badgeColor: t.status === 'overdue' ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-800',
        dateStr: t.deadline ? t.deadline.split('T')[0] : undefined,
        actionUrlOrHash: '#dashboard',
      });
    }
  }

  // Search Govt Orders
  for (const o of data.orders) {
    if (
      o.title.toLowerCase().includes(query) ||
      o.orderNumber.toLowerCase().includes(query) ||
      o.issuingAuthority.toLowerCase().includes(query) ||
      o.summary.toLowerCase().includes(query)
    ) {
      countsByModule.order++;
      items.push({
        id: `sr-order-${o.id}`,
        module: 'order',
        moduleLabelHi: 'शासनादेश',
        moduleLabelEn: 'Govt Order',
        title: o.title,
        snippet: `${o.issuingAuthority} • पत्रांक: ${o.orderNumber}`,
        badgeText: o.acknowledgementRequired ? 'हस्ताक्षर अपेक्षित' : 'पठनीय',
        badgeColor: 'bg-amber-100 text-amber-800',
        dateStr: o.date,
        actionUrlOrHash: '#govt-orders',
      });
    }
  }

  // Search Meetings
  for (const m of data.meetings) {
    if (
      m.title.toLowerCase().includes(query) ||
      m.agenda.toLowerCase().includes(query) ||
      m.organizedBy.toLowerCase().includes(query) ||
      m.locationOrLink.toLowerCase().includes(query)
    ) {
      countsByModule.meeting++;
      items.push({
        id: `sr-meeting-${m.id}`,
        module: 'meeting',
        moduleLabelHi: 'बैठक',
        moduleLabelEn: 'Meeting',
        title: m.title,
        snippet: `${m.agenda} • आयोजक: ${m.organizedBy}`,
        badgeText: m.mode.toUpperCase(),
        badgeColor: 'bg-blue-100 text-blue-800',
        dateStr: `${m.date} ${m.time}`,
        actionUrlOrHash: '#meetings',
      });
    }
  }

  // Search Trainings
  for (const tr of data.trainings) {
    if (
      tr.name.toLowerCase().includes(query) ||
      tr.provider.toLowerCase().includes(query)
    ) {
      countsByModule.training++;
      items.push({
        id: `sr-train-${tr.id}`,
        module: 'training',
        moduleLabelHi: 'प्रशिक्षण',
        moduleLabelEn: 'Training',
        title: tr.name,
        snippet: `प्रदाता: ${tr.provider} • अवधि: ${tr.hours} घंटे • प्रगति: ${tr.progressPercent}%`,
        badgeText: `${tr.progressPercent}% पूर्ण`,
        badgeColor: 'bg-purple-100 text-purple-800',
        dateStr: tr.dueDate,
        actionUrlOrHash: '#trainings',
      });
    }
  }

  // Search Portals (optional)
  if (data.portals) {
    for (const p of data.portals) {
      if (
        p.name.toLowerCase().includes(query) ||
        p.purpose.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      ) {
        countsByModule.portal++;
        items.push({
          id: `sr-portal-${p.id}`,
          module: 'portal',
          moduleLabelHi: 'पोर्टल',
          moduleLabelEn: 'Portal',
          title: p.name,
          snippet: `${p.purpose} • लिंक: ${p.url}`,
          badgeText: p.category.toUpperCase(),
          badgeColor: 'bg-cyan-100 text-cyan-800',
          actionUrlOrHash: '#portals',
        });
      }
    }
  }

  // Search Classes (optional)
  if (data.classes) {
    for (const c of data.classes) {
      if (
        c.grade.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query) ||
        c.section.toLowerCase().includes(query)
      ) {
        countsByModule.class++;
        items.push({
          id: `sr-class-${c.id}`,
          module: 'class',
          moduleLabelHi: 'कक्षा',
          moduleLabelEn: 'Class',
          title: `${c.grade} - ${c.section}`,
          snippet: `विषय: ${c.subject} • कुल छात्र: ${c.students.length}`,
          badgeText: `${c.students.length} छात्र`,
          badgeColor: 'bg-emerald-100 text-emerald-800',
          actionUrlOrHash: '#classes',
        });
      }
    }
  }

  return {
    query: rawQuery,
    totalCount: items.length,
    items,
    countsByModule,
  };
}

/**
 * 6. Printable/PDF Inspection-ready Pending Work Report Generator
 */
export function generatePendingWorkReportHtml(data: PendingWorkReportData): string {
  const criticalRows = data.criticalTasks
    .map(
      (c, i) => `
      <tr style="background-color: #fee2e2;">
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${i + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #991b1b;">${c.task.title}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;"><span style="background: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">${c.daysOverdue} दिन विलंबित (CRITICAL)</span></td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">${c.deadlineDateStr}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;">${c.recommendedAction}</td>
      </tr>
    `
    )
    .join('');

  const regularPendingRows = data.allPendingTasks
    .filter((t) => !data.criticalTasks.some((c) => c.task.id === t.id))
    .map(
      (t, i) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 500;">${t.title}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; text-transform: uppercase; font-size: 11px;">${t.priority}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">${t.deadline ? t.deadline.split('T')[0] : 'समयसीमा नहीं'}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;">${t.source || 'विभागीय कार्य'}</td>
      </tr>
    `
    )
    .join('');

  const dutiesRows = data.pendingDuties
    .map(
      (d, i) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">${d.dutyName}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${d.category.toUpperCase()}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">${d.schedule}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 11px;">${d.assignedBy}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <title>विद्यालय पेंडिंग कार्य निरीक्षण रिपोर्ट (Pending Work Audit Report)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 20px; color: #1e293b; }
    h1, h2, h3 { margin: 0; }
    .header { text-align: center; border-bottom: 2px solid #0d5b49; padding-bottom: 12px; margin-bottom: 16px; }
    .meta-grid { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; background: #f8fafc; padding: 10px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #0d5b49; color: white; padding: 8px; border: 1px solid #0d5b49; text-align: left; }
    .critical-badge { background: #fee2e2; border-left: 4px solid #dc2626; padding: 10px; margin-bottom: 15px; font-size: 12px; }
    .sign-section { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
    .sign-box { width: 220px; text-align: center; border-top: 1px dashed #64748b; padding-top: 8px; }
    @media print {
      body { margin: 10mm; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div style="text-align: right; margin-bottom: 10px;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #0d5b49; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
      🖨️ रिपोर्ट प्रिंट करें / Save as PDF
    </button>
  </div>

  <div class="header">
    <div style="font-size: 14px; font-weight: bold; color: #0d5b49; letter-spacing: 1px;">बेसिक शिक्षा विभाग • TEACHER HUB</div>
    <h1 style="font-size: 20px; font-weight: 800; margin-top: 4px;">विद्यालय पेंडिंग कार्य एवं समयबद्ध अनुपालन रिपोर्ट</h1>
    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Pending Tasks & Compliance Inspection Sheet</div>
  </div>

  <div class="meta-grid">
    <div><strong>विद्यालय:</strong> ${data.schoolName}</div>
    <div><strong>शिक्षक/प्रभारी:</strong> ${data.teacherName}</div>
    <div><strong>शैक्षिक सत्र:</strong> ${data.academicYear}</div>
    <div><strong>रिपोर्ट दिनांक:</strong> ${new Date(data.generatedAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  </div>

  ${
    data.criticalTasks.length > 0
      ? `
  <div class="critical-badge">
    <strong>🚨 अति आवश्यक चेतावनी / Critical Escalation Alert:</strong> कुल <strong>${data.criticalTasks.length}</strong> कार्य 3 दिवस से अधिक विलंबित हैं। इन कार्यों पर विभागीय स्तर पर विशेष ध्यान अपेक्षित है।
  </div>

  <h3 style="font-size: 14px; color: #991b1b; margin-bottom: 8px;">1. अति गंभीर विलंबित कार्य (>3 Days Overdue Critical Tasks)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">क्र०</th>
        <th>कार्य शीर्षक (Task Title)</th>
        <th style="width: 170px; text-align: center;">विलंब स्थिति</th>
        <th style="width: 100px;">मूल समयसीमा</th>
        <th>अपेक्षित त्वरित कार्रवाई</th>
      </tr>
    </thead>
    <tbody>
      ${criticalRows}
    </tbody>
  </table>
  `
      : ''
  }

  <h3 style="font-size: 14px; color: #0d5b49; margin-bottom: 8px;">2. सामान्य पेंडिंग कार्य सूची (General Pending Tasks - Total: ${data.allPendingTasks.length})</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">क्र०</th>
        <th>कार्य शीर्षक (Task Title)</th>
        <th style="width: 80px; text-align: center;">प्राथमिकता</th>
        <th style="width: 100px;">अंतिम तिथि</th>
        <th>कार्य स्रोत</th>
      </tr>
    </thead>
    <tbody>
      ${regularPendingRows || '<tr><td colspan="5" style="text-align: center; padding: 12px; color: #64748b;">कोई सामान्य पेंडिंग कार्य नहीं है।</td></tr>'}
    </tbody>
  </table>

  ${
    data.pendingDuties.length > 0
      ? `
  <h3 style="font-size: 14px; color: #0d5b49; margin-bottom: 8px;">3. नियमित आवर्ती विद्यालय दायित्व (Scheduled Duties)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">क्र०</th>
        <th>दायित्व का नाम</th>
        <th style="width: 100px; text-align: center;">श्रेणी</th>
        <th style="width: 180px;">समय सारणी</th>
        <th>आवंटनकर्ता</th>
      </tr>
    </thead>
    <tbody>
      ${dutiesRows}
    </tbody>
  </table>
  `
      : ''
  }

  <div class="sign-section">
    <div class="sign-box">
      हस्ताक्षर संबंधित अध्यापक<br>
      <span style="font-size: 10px; color: #64748b;">(Sign of Concerned Teacher)</span>
    </div>
    <div class="sign-box">
      हस्ताक्षर प्रधानाध्यापक / प्रभारी<br>
      <span style="font-size: 10px; color: #64748b;">(Sign of Head Teacher / Incharge)</span>
    </div>
    <div class="sign-box">
      निरीक्षण अधिकारी (BEO / ARPO / DIET)<br>
      <span style="font-size: 10px; color: #64748b;">(Inspecting Officer Seal & Sign)</span>
    </div>
  </div>
</body>
</html>
  `.trim();
}
