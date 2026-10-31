export type DutyStatus = 'active' | 'completed' | 'excused';

export type DutyCategory =
  | 'mdm'
  | 'election'
  | 'exam'
  | 'library'
  | 'assembly'
  | 'discipline'
  | 'other';

export interface Duty {
  id: string;
  dutyName: string; // e.g. "मध्याह्न भोजन (MDM) पर्यवेक्षण"
  category: DutyCategory;
  schedule: string; // e.g. "प्रतिदिन 12:30 PM - 01:15 PM"
  daysOfWeek: number[]; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 0 = Sun
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null if ongoing
  assignedBy: string; // e.g. "प्रधानाध्यापक", "खंड शिक्षा अधिकारी (BEO)", "उप जिलाधिकारी (SDM)"
  status: DutyStatus;
  assignedTeacher: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyRosterDay {
  dayOfWeek: number; // 1 to 6
  dayNameHi: string;
  dayNameEn: string;
  dateStr: string; // YYYY-MM-DD
  isToday: boolean;
  duties: Duty[];
}
