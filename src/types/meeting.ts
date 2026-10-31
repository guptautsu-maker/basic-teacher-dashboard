export type MeetingMode = 'online' | 'offline';
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';
export type CalendarViewType = 'month' | 'week' | 'day' | 'list';

export interface ActionItem {
  id: string;
  text: string;
  assignedTo?: string;
  deadline?: string; // YYYY-MM-DD
  isConvertedToTask: boolean;
  taskId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "14:00"
  endTime: string; // "15:30"
  timeDisplay?: string; // "02:00 PM - 03:30 PM"
  mode: MeetingMode;
  linkOrLocation: string; // URL or Venue
  agenda: string;
  attendees: string[]; // List of attendees/roles
  organizedBy: string;
  status: MeetingStatus;
  minutesOfMeeting?: string; // Detailed MoM proceedings & summary
  actionItems: ActionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SchoolClassPeriod {
  id: string;
  className: string; // e.g. "कक्षा 4: गणित (Class 4 Math)"
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "10:00"
  endTime: string; // "11:00"
  teacherName?: string;
}

export interface ClashWarning {
  type: 'meeting_overlap' | 'class_overlap';
  severity: 'high' | 'medium';
  message: string;
  conflictingItemTitle: string;
  conflictingTime: string;
}
