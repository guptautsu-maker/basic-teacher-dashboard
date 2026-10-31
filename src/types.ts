export type CategoryKey = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6';

export type WorkStatus = 'not_started' | 'in_progress' | 'pending' | 'completed';

export type {
  TaskStatus,
  RecurrenceFrequency,
  TaskPriority,
  TaskType,
  StatusLog,
  Task,
  StatusMeta,
} from './utils/taskStatusSystem.js';

export interface CategoryInfo {
  name: string;
  emoji: string;
}

export interface Portal {
  id: string;
  name: string;
  category: CategoryKey;
  url: string;
  status?: WorkStatus;
  notes?: string;
  isCustom?: boolean;
}

export interface Notice {
  id: string;
  type: 'pinned' | 'new' | 'info' | 'urgent';
  badgeText: string;
  title?: string;
  text: string;
  meta: string;
  status?: WorkStatus;
  notes?: string;
  isCustom?: boolean;
}

export interface ActionCardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  type: 'whatsapp' | 'youtube' | 'telegram' | 'meeting' | 'custom';
  url: string;
  btnText: string;
  status?: WorkStatus;
  notes?: string;
  isCustom?: boolean;
}

export interface WorkspaceTool {
  id: string;
  title: string;
  emoji: string;
  type: 'whatsapp' | 'youtube' | 'link' | 'embed';
  url?: string;
  desc?: string;
  status?: WorkStatus;
  notes?: string;
  isCustom?: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  status?: WorkStatus;
  priority?: 'high' | 'normal' | 'low';
}

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  category: 'reminder' | 'school' | 'teaching' | 'urgent' | 'general';
  isPinned?: boolean;
  createdAt: string;
  updatedAt?: string;
  status?: WorkStatus;
}

export interface SectionState {
  status: WorkStatus;
  notes: string;
  updatedAt?: string;
}

export interface MdmRow {
  id: string;
  date: string;
  cls: string;
  enrolled: string;
  present: string;
  served: string;
  notes: string;
  [key: string]: string;
}

export interface AttendanceRow {
  id: string;
  date: string;
  cls: string;
  name: string;
  roll: string;
  status: string;
  reason: string;
  [key: string]: string;
}

export interface ResultRow {
  id: string;
  exam: string;
  cls: string;
  name: string;
  sub: string;
  max: string;
  got: string;
  grade?: string;
  pass?: string;
  [key: string]: string | undefined;
}

export type SheetType = 'mdm' | 'att' | 'res';

export interface UserProfile {
  name: string;
  email: string;
}
