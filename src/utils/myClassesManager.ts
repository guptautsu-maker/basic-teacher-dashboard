/**
 * Teacher Hub - My Classes & Attendance Pure Business Logic
 * Minimal student data handling, CSV import/export with UTF-8 BOM support,
 * daily attendance statistics, and monthly student attendance summaries.
 */

import {
  Student,
  AttendanceStatus,
  AttendanceRecord,
  ClassSection,
  DailyAttendanceStats,
  StudentMonthlySummary,
} from '../types/classSection';

/**
 * Privacy notice displayed across the student data module
 */
export const STUDENT_PRIVACY_NOTICE = {
  titleHi: '🔒 बाल डेटा गोपनीयता एवं न्यूनतम सूचना सिद्धांत',
  titleEn: 'Student Privacy & Minimal Data Policy',
  bodyHi:
    'यह मॉड्यूल केवल शिक्षण एवं कक्षा उपस्थिति हेतु आवश्यक न्यूनतम विवरण (अनुक्रमांक व नाम) ही स्थानीय डिवाइस में सुरक्षित रखता है। आधार संख्या, बैंक खाता, जाति या संवेदनशील व्यक्तिगत विवरण यहाँ कतई संग्रहीत नहीं किए जाते हैं।',
  bodyEn:
    'This module strictly adheres to data minimization principles. Only minimal classroom details (Roll No & Name) are saved locally for attendance tracking. Sensitive personal records (Aadhaar, Bank details) are strictly prohibited.',
};

/**
 * Parses CSV content into Student records
 * Supports header detection, comma and semicolon delimiters, and quotes
 */
export const parseStudentCsv = (
  csvContent: string,
  classSectionId: string
): { students: Student[]; errors: string[] } => {
  const students: Student[] = [];
  const errors: string[] = [];

  if (!csvContent || !csvContent.trim()) {
    return { students, errors: ['CSV फाइल खाली है (CSV file is empty)'] };
  }

  // Split lines
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { students, errors: ['कोई डेटा पंक्ति नहीं मिली (No data rows found)'] };
  }

  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  // Check if first line is a header
  if (
    firstLine.includes('roll') ||
    firstLine.includes('name') ||
    firstLine.includes('नाम') ||
    firstLine.includes('क्रमांक')
  ) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const row = lines[i];
    // Split by comma or semicolon
    const cols = row
      .split(/[,;]/)
      .map((c) => c.replace(/^["']|["']$/g, '').trim());

    if (cols.length < 2) {
      errors.push(`पंक्ति ${i + 1}: अमान्य प्रारूप (कम से कम अनुक्रमांक व नाम आवश्यक है)`);
      continue;
    }

    const rollParsed = parseInt(cols[0], 10);
    const rollNumber = isNaN(rollParsed) ? i + 1 - startIndex : rollParsed;
    const name = cols[1];

    if (!name) {
      errors.push(`पंक्ति ${i + 1}: विद्यार्थी का नाम रिक्त है`);
      continue;
    }

    let gender: 'M' | 'F' | 'O' | undefined = undefined;
    if (cols.length >= 3 && cols[2]) {
      const g = cols[2].toUpperCase();
      if (g.startsWith('M') || g.startsWith('पु') || g.startsWith('B')) gender = 'M';
      else if (g.startsWith('F') || g.startsWith('म') || g.startsWith('G')) gender = 'F';
      else gender = 'O';
    }

    students.push({
      id: `std-${classSectionId}-${rollNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      rollNumber,
      name,
      gender,
      classSectionId,
    });
  }

  // Sort by roll number ascending
  students.sort((a, b) => a.rollNumber - b.rollNumber);

  return { students, errors };
};

/**
 * Exports students list to CSV format with UTF-8 BOM so Excel opens Hindi text without garbled characters
 */
export const exportStudentCsv = (
  students: Student[],
  attendanceMap?: Record<string, AttendanceStatus>,
  dateStr?: string
): string => {
  const BOM = '\uFEFF';
  const hasAttendance = !!attendanceMap;
  const header = hasAttendance && dateStr
    ? `अनुक्रमांक (Roll No),विद्यार्थी का नाम (Student Name),लिंग (Gender),उपस्थिति स्थिति (${dateStr})\n`
    : 'अनुक्रमांक (Roll No),विद्यार्थी का नाम (Student Name),लिंग (Gender)\n';

  const rows = students
    .slice()
    .sort((a, b) => a.rollNumber - b.rollNumber)
    .map((s) => {
      const safeName = `"${s.name.replace(/"/g, '""')}"`;
      const genderStr = s.gender === 'M' ? 'M (बालक)' : s.gender === 'F' ? 'F (बालिका)' : 'Other';
      if (hasAttendance && attendanceMap) {
        const rawStatus = attendanceMap[s.id] || 'unmarked';
        const statusStr =
          rawStatus === 'present'
            ? 'उपस्थित (Present)'
            : rawStatus === 'absent'
            ? 'अनुपस्थित (Absent)'
            : rawStatus === 'leave'
            ? 'अवकाश (Leave)'
            : 'चिह्नित नहीं (Unmarked)';
        return `${s.rollNumber},${safeName},${genderStr},${statusStr}`;
      }
      return `${s.rollNumber},${safeName},${genderStr}`;
    })
    .join('\n');

  return BOM + header + rows;
};

/**
 * Generates sample CSV template for teachers to download and fill
 */
export const generateSampleCsvTemplate = (): string => {
  const BOM = '\uFEFF';
  const header = 'Roll No,Student Name,Gender\n';
  const sampleRows = [
    '1,अमित कुमार,M',
    '2,प्रिया वर्मा,F',
    '3,रोहित सिंह,M',
    '4,अंजलि देवी,F',
    '5,विकास यादव,M',
  ].join('\n');

  return BOM + header + sampleRows;
};

/**
 * Calculates daily attendance statistics
 */
export const calculateDailyAttendanceStats = (
  students: Student[],
  attendanceRecord?: AttendanceRecord
): DailyAttendanceStats => {
  const totalStudents = students.length;
  if (!attendanceRecord || totalStudents === 0) {
    return {
      totalStudents,
      markedStudents: 0,
      presentCount: 0,
      absentCount: 0,
      leaveCount: 0,
      percentage: 0,
    };
  }

  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let markedStudents = 0;

  for (const s of students) {
    const st = attendanceRecord.records[s.id];
    if (st) {
      markedStudents++;
      if (st === 'present') presentCount++;
      else if (st === 'absent') absentCount++;
      else if (st === 'leave') leaveCount++;
    }
  }

  const percentage =
    markedStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return {
    totalStudents,
    markedStudents,
    presentCount,
    absentCount,
    leaveCount,
    percentage,
  };
};

/**
 * Marks all students with a specific status (e.g. all present)
 */
export const markAllAttendance = (
  students: Student[],
  defaultStatus: AttendanceStatus = 'present'
): Record<string, AttendanceStatus> => {
  const result: Record<string, AttendanceStatus> = {};
  for (const s of students) {
    result[s.id] = defaultStatus;
  }
  return result;
};

/**
 * Calculates monthly attendance summary per student across a specific month (YYYY-MM)
 */
export const calculateMonthlyAttendanceSummary = (
  students: Student[],
  attendanceRecords: AttendanceRecord[],
  yearMonth: string // e.g. "2026-10"
): StudentMonthlySummary[] => {
  // Filter records belonging to the month
  const monthRecords = attendanceRecords.filter((r) => r.date.startsWith(yearMonth));
  const totalDays = monthRecords.length;

  return students
    .slice()
    .sort((a, b) => a.rollNumber - b.rollNumber)
    .map((s) => {
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;

      for (const record of monthRecords) {
        const st = record.records[s.id];
        if (st === 'present') presentDays++;
        else if (st === 'absent') absentDays++;
        else if (st === 'leave') leaveDays++;
      }

      const percentage =
        totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      return {
        studentId: s.id,
        rollNumber: s.rollNumber,
        name: s.name,
        gender: s.gender,
        totalDays,
        presentDays,
        absentDays,
        leaveDays,
        percentage,
      };
    });
};

/**
 * Sample initial class sections
 */
export const getSampleClassSections = (): ClassSection[] => {
  return [
    {
      id: 'cs-1',
      grade: 'कक्षा 4 (Class 4)',
      section: 'A',
      subject: 'गणित (Mathematics)',
      academicYear: '2026-27',
      roomNumber: 'कक्ष सं० 04',
      classTeacher: 'सुरेश कुमार (स०अ०)',
      timetableSlots: [
        {
          id: 'ts-1',
          dayLabel: 'सोमवार - शनिवार (Mon-Sat)',
          period: 2,
          time: '09:45 AM - 10:30 AM',
          room: 'कक्ष सं० 04',
        },
      ],
      students: [
        { id: 'std-4a-1', rollNumber: 1, name: 'अमित कुमार', gender: 'M', classSectionId: 'cs-1' },
        { id: 'std-4a-2', rollNumber: 2, name: 'प्रिया वर्मा', gender: 'F', classSectionId: 'cs-1' },
        { id: 'std-4a-3', rollNumber: 3, name: 'रोहित सिंह', gender: 'M', classSectionId: 'cs-1' },
        { id: 'std-4a-4', rollNumber: 4, name: 'अंजलि देवी', gender: 'F', classSectionId: 'cs-1' },
        { id: 'std-4a-5', rollNumber: 5, name: 'विकास यादव', gender: 'M', classSectionId: 'cs-1' },
        { id: 'std-4a-6', rollNumber: 6, name: 'पूजा कुमारी', gender: 'F', classSectionId: 'cs-1' },
        { id: 'std-4a-7', rollNumber: 7, name: 'संदीप भारती', gender: 'M', classSectionId: 'cs-1' },
        { id: 'std-4a-8', rollNumber: 8, name: 'निधि पटेल', gender: 'F', classSectionId: 'cs-1' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cs-2',
      grade: 'कक्षा 5 (Class 5)',
      section: 'A',
      subject: 'हिंदी व भाषा (Hindi Literature)',
      academicYear: '2026-27',
      roomNumber: 'कक्ष सं० 05',
      classTeacher: 'सुरेश कुमार (स०अ०)',
      timetableSlots: [
        {
          id: 'ts-2',
          dayLabel: 'सोमवार - शनिवार (Mon-Sat)',
          period: 1,
          time: '09:00 AM - 09:45 AM',
          room: 'कक्ष सं० 05',
        },
      ],
      students: [
        { id: 'std-5a-1', rollNumber: 1, name: 'आकाश मौर्या', gender: 'M', classSectionId: 'cs-2' },
        { id: 'std-5a-2', rollNumber: 2, name: 'दीक्षा शर्मा', gender: 'F', classSectionId: 'cs-2' },
        { id: 'std-5a-3', rollNumber: 3, name: 'सूरज कुमार', gender: 'M', classSectionId: 'cs-2' },
        { id: 'std-5a-4', rollNumber: 4, name: 'कोमल गुप्ता', gender: 'F', classSectionId: 'cs-2' },
        { id: 'std-5a-5', rollNumber: 5, name: 'मनोज कुमार', gender: 'M', classSectionId: 'cs-2' },
        { id: 'std-5a-6', rollNumber: 6, name: 'स्वाति सिंह', gender: 'F', classSectionId: 'cs-2' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cs-3',
      grade: 'कक्षा 3 (Class 3)',
      section: 'B',
      subject: 'हमारा परिवेश (EVS & Science)',
      academicYear: '2026-27',
      roomNumber: 'कक्ष सं० 03',
      classTeacher: 'सुनीता शर्मा (स०अ०)',
      timetableSlots: [
        {
          id: 'ts-3',
          dayLabel: 'सोम, बुध, शुक्र (Mon, Wed, Fri)',
          period: 4,
          time: '11:15 AM - 12:00 PM',
          room: 'कक्ष सं० 03',
        },
      ],
      students: [
        { id: 'std-3b-1', rollNumber: 1, name: 'ऋषभ पाल', gender: 'M', classSectionId: 'cs-3' },
        { id: 'std-3b-2', rollNumber: 2, name: 'शालिनी यादव', gender: 'F', classSectionId: 'cs-3' },
        { id: 'std-3b-3', rollNumber: 3, name: 'हर्षित मिश्रा', gender: 'M', classSectionId: 'cs-3' },
        { id: 'std-3b-4', rollNumber: 4, name: 'नैना कश्यप', gender: 'F', classSectionId: 'cs-3' },
        { id: 'std-3b-5', rollNumber: 5, name: 'कार्तिक बिंद', gender: 'M', classSectionId: 'cs-3' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
};

/**
 * Sample seed attendance records for realistic month data
 */
export const getSampleAttendanceRecords = (
  classSections: ClassSection[] = getSampleClassSections(),
  baseDate: Date = new Date()
): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');

  // Generate 5 days of attendance for Class 4-A
  const cs1 = classSections[0];
  if (cs1) {
    const dates = [
      `${y}-${m}-26`,
      `${y}-${m}-27`,
      `${y}-${m}-28`,
      `${y}-${m}-29`,
      `${y}-${m}-30`,
      `${y}-${m}-31`,
    ];

    dates.forEach((d, index) => {
      const recMap: Record<string, AttendanceStatus> = {};
      cs1.students.forEach((s, sIdx) => {
        // Most present, occasional absent or leave
        if ((sIdx + index) % 7 === 0) recMap[s.id] = 'absent';
        else if ((sIdx + index) % 9 === 0) recMap[s.id] = 'leave';
        else recMap[s.id] = 'present';
      });

      records.push({
        id: `att-cs1-${d}`,
        classSectionId: cs1.id,
        date: d,
        records: recMap,
        takenAt: `${d}T09:45:00.000Z`,
        takenBy: 'सुरेश कुमार (सहायक अध्यापक)',
      });
    });
  }

  return records;
};
