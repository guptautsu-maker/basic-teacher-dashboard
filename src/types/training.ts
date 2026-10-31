export type TrainingStatus = 'not_started' | 'in_progress' | 'completed';

export interface TrainingCertificate {
  name: string;
  size?: string;
  type?: string;
  uploadedAt: string;
  dataUrl?: string;
}

export interface Training {
  id: string;
  name: string;
  provider: string; // e.g. 'DIKSHA Portal', 'SCERT State Project', 'iGoT Karmayogi', 'NCERT', 'बेसिक शिक्षा परिषद'
  totalHours: number;
  completedHours: number;
  dueDate: string; // YYYY-MM-DD
  status: TrainingStatus;
  certificateRequired: boolean;
  certificate?: TrainingCertificate;
  link?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingDeadlineInfo {
  isOverdue: boolean;
  isNearingDeadline: boolean;
  daysRemaining: number;
  badgeLabelHi: string;
  badgeLabelEn: string;
}
