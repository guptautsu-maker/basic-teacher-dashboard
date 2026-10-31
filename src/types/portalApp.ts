import { Task } from '../utils/taskStatusSystem';

export type PortalCategory =
  | 'attendance'
  | 'student_data'
  | 'training'
  | 'scholarship'
  | 'other';

export interface PortalApp {
  id: string;
  name: string;
  nameHi?: string;
  url: string;
  purpose: string;
  category: PortalCategory;
  neededForTask: string; // which task needs this portal
  lastUsedDate?: string; // YYYY-MM-DD
  loginHelpNote?: string; // Guidance for login, username format, nodal contacts — NEVER passwords!
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortalCategoryMeta {
  key: PortalCategory;
  labelHi: string;
  labelEn: string;
  emoji: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}
