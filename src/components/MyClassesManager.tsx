import React, { useState, useMemo } from 'react';
import {
  ClassSection,
  Student,
  AttendanceRecord,
  AttendanceStatus,
} from '../types/classSection';
import {
  getSampleClassSections,
  getSampleAttendanceRecords,
  calculateDailyAttendanceStats,
  calculateMonthlyAttendanceSummary,
  markAllAttendance,
  exportStudentCsv,
  STUDENT_PRIVACY_NOTICE,
} from '../utils/myClassesManager';
import { AddClassSectionModal } from './AddClassSectionModal';
import { AddStudentModal } from './AddStudentModal';
import { CsvImportExportModal } from './CsvImportExportModal';

interface MyClassesManagerProps {
  onToast: (msg: string) => void;
  onNavigate?: (page: any) => void;
  currentUser?: { name: string; email: string } | null;
}

const STORAGE_KEY_CLASSES = 'th-class-sections';
const STORAGE_KEY_ATTENDANCE = 'th-attendance-records';

export const MyClassesManager: React.FC<MyClassesManagerProps> = ({
  onToast,
  onNavigate,
  currentUser,
}) => {
  // 1. Persistent Class Sections State
  const [classSections, setClassSections] = useState<ClassSection[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLASSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleClassSections();
  });

  const saveClassSections = (updated: ClassSection[]) => {
    setClassSections(updated);
    try {
      localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // 2. Persistent Attendance Records State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleAttendanceRecords();
  });

  const saveAttendanceRecords = (updated: AttendanceRecord[]) => {
    setAttendanceRecords(updated);
    try {
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // 3. Active Selected Class Section
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classSections[0]?.id || ''
  );

  const activeClass = useMemo(() => {
    return classSections.find((c) => c.id === selectedClassId) || classSections[0];
  }, [classSections, selectedClassId]);

  // 4. View Tabs: 'daily' vs 'monthly'
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  // 5. Date selection for Daily Attendance
  const todayYmd = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd);

  // Month selection for Monthly Summary
  const currentYearMonth = useMemo(() => todayYmd.slice(0, 7), [todayYmd]);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // 6. Modals State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassSection | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Current day attendance record for active class
  const currentDailyRecord = useMemo(() => {
    if (!activeClass) return undefined;
    return attendanceRecords.find(
      (r) => r.classSectionId === activeClass.id && r.date === selectedDate
    );
  }, [activeClass, attendanceRecords, selectedDate]);

  // Daily attendance in-memory working state
  const [dailyStatusMap, setDailyStatusMap] = useState<Record<string, AttendanceStatus>>({});

  // Sync dailyStatusMap when selectedClass or selectedDate changes
  React.useEffect(() => {
    if (currentDailyRecord) {
      setDailyStatusMap(currentDailyRecord.records);
    } else if (activeClass) {
      // default: unmarked or all present for new day
      setDailyStatusMap({});
    }
  }, [selectedClassId, selectedDate, currentDailyRecord, activeClass]);

  // 7. Daily Stats calculation
  const dailyStats = useMemo(() => {
    if (!activeClass) {
      return { totalStudents: 0, markedStudents: 0, presentCount: 0, absentCount: 0, leaveCount: 0, percentage: 0 };
    }
    const mockRecord: AttendanceRecord = {
      id: 'temp',
      classSectionId: activeClass.id,
      date: selectedDate,
      records: dailyStatusMap,
      takenAt: new Date().toISOString(),
    };
    return calculateDailyAttendanceStats(activeClass.students, mockRecord);
  }, [activeClass, selectedDate, dailyStatusMap]);

  // 8. Monthly Summary calculation
  const monthlySummary = useMemo(() => {
    if (!activeClass) return [];
    return calculateMonthlyAttendanceSummary(
      activeClass.students,
      attendanceRecords.filter((r) => r.classSectionId === activeClass.id),
      selectedMonth
    );
  }, [activeClass, attendanceRecords, selectedMonth]);

  // Total working days recorded in selected month
  const monthlyRecordedDaysCount = useMemo(() => {
    if (!activeClass) return 0;
    return attendanceRecords.filter(
      (r) => r.classSectionId === activeClass.id && r.date.startsWith(selectedMonth)
    ).length;
  }, [activeClass, attendanceRecords, selectedMonth]);

  // 9. Class Section Actions
  const handleSaveClass = (data: Omit<ClassSection, 'id' | 'students' | 'createdAt' | 'updatedAt'>) => {
    const nowIso = new Date().toISOString();
    if (editingClass) {
      const updated = classSections.map((c) =>
        c.id === editingClass.id
          ? {
              ...c,
              ...data,
              updatedAt: nowIso,
            }
          : c
      );
      saveClassSections(updated);
      onToast('✅ कक्षा सेक्शन विवरण अपडेट किया गया');
    } else {
      const newClass: ClassSection = {
        ...data,
        id: `cs-${Date.now()}`,
        students: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      saveClassSections([...classSections, newClass]);
      setSelectedClassId(newClass.id);
      onToast('🎉 नई कक्षा सफलतापूर्वक बनाई गई');
    }
    setEditingClass(null);
  };

  const handleDeleteClass = (id: string, name: string) => {
    if (classSections.length <= 1) {
      onToast('⚠️ कम से कम एक कक्षा सेक्शन का होना आवश्यक है');
      return;
    }
    if (confirm(`क्या आप कक्षा "${name}" एवं इसके सभी विद्यार्थियों को हटाना चाहते हैं?`)) {
      const updated = classSections.filter((c) => c.id !== id);
      saveClassSections(updated);
      setSelectedClassId(updated[0]?.id || '');
      onToast('🗑️ कक्षा सेक्शन हटा दिया गया');
    }
  };

  // 10. Student Actions
  const handleSaveStudent = (data: Omit<Student, 'id' | 'classSectionId'>) => {
    if (!activeClass) return;

    if (editingStudent) {
      const updatedStudents = activeClass.students.map((s) =>
        s.id === editingStudent.id ? { ...s, ...data } : s
      );
      const updatedClasses = classSections.map((c) =>
        c.id === activeClass.id ? { ...c, students: updatedStudents } : c
      );
      saveClassSections(updatedClasses);
      onToast('✅ विद्यार्थी विवरण अपडेट किया गया');
    } else {
      const newStudent: Student = {
        ...data,
        id: `std-${activeClass.id}-${Date.now()}`,
        classSectionId: activeClass.id,
      };
      const updatedStudents = [...activeClass.students, newStudent].sort(
        (a, b) => a.rollNumber - b.rollNumber
      );
      const updatedClasses = classSections.map((c) =>
        c.id === activeClass.id ? { ...c, students: updatedStudents } : c
      );
      saveClassSections(updatedClasses);
      onToast(`🎉 विद्यार्थी "${data.name}" जोड़ा गया!`);
    }
    setEditingStudent(null);
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (!activeClass) return;
    if (confirm(`क्या आप विद्यार्थी "${studentName}" को कक्षा से हटाना चाहते हैं?`)) {
      const updatedStudents = activeClass.students.filter((s) => s.id !== studentId);
      const updatedClasses = classSections.map((c) =>
        c.id === activeClass.id ? { ...c, students: updatedStudents } : c
      );
      saveClassSections(updatedClasses);
      onToast('🗑️ विद्यार्थी सूची से हटा दिया गया');
    }
  };

  const handleImportStudents = (imported: Student[], mode: 'replace' | 'append') => {
    if (!activeClass) return;
    const existing = mode === 'replace' ? [] : activeClass.students;
    const combined = [...existing, ...imported].sort((a, b) => a.rollNumber - b.rollNumber);
    const updatedClasses = classSections.map((c) =>
      c.id === activeClass.id ? { ...c, students: combined } : c
    );
    saveClassSections(updatedClasses);
  };

  // 11. Attendance Actions
  const handleToggleStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setDailyStatusMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!activeClass) return;
    const allMarked = markAllAttendance(activeClass.students, status);
    setDailyStatusMap(allMarked);
    onToast(
      status === 'present'
        ? '✓ समस्त विद्यार्थी उपस्थित चिह्नित किए गए'
        : '✕ समस्त विद्यार्थी अनुपस्थित चिह्नित किए गए'
    );
  };

  const handleSaveAttendance = () => {
    if (!activeClass) return;
    const nowIso = new Date().toISOString();
    const existingIndex = attendanceRecords.findIndex(
      (r) => r.classSectionId === activeClass.id && r.date === selectedDate
    );

    let updatedRecords: AttendanceRecord[];
    if (existingIndex !== -1) {
      updatedRecords = attendanceRecords.map((r, idx) =>
        idx === existingIndex
          ? {
              ...r,
              records: dailyStatusMap,
              takenAt: nowIso,
              takenBy: currentUser?.name || 'सुरेश कुमार (सहायक अध्यापक)',
            }
          : r
      );
    } else {
      const newRec: AttendanceRecord = {
        id: `att-${activeClass.id}-${selectedDate}`,
        classSectionId: activeClass.id,
        date: selectedDate,
        records: dailyStatusMap,
        takenAt: nowIso,
        takenBy: currentUser?.name || 'सुरेश कुमार (सहायक अध्यापक)',
      };
      updatedRecords = [newRec, ...attendanceRecords];
    }

    saveAttendanceRecords(updatedRecords);
    onToast(`💾 ${selectedDate} की उपस्थिति सफलतापूर्वक सहेजी गई!`);
  };

  const handleExportMonthlyCsv = () => {
    if (!activeClass || monthlySummary.length === 0) {
      onToast('⚠️ निर्यात करने हेतु कोई मासिक डेटा नहीं है');
      return;
    }

    const BOM = '\uFEFF';
    const header = `माह (${selectedMonth}) उपस्थिति सारांश - ${activeClass.grade} ${activeClass.section} (${activeClass.subject})\nअनुक्रमांक (Roll No),विद्यार्थी का नाम (Name),कुल कार्य दिवस (Total Days),उपस्थित दिन (Present Days),अनुपस्थित दिन (Absent Days),अवकाश (Leave Days),उपस्थिति प्रतिशत (%)\n`;

    const rows = monthlySummary
      .map(
        (s) =>
          `${s.rollNumber},"${s.name.replace(/"/g, '""')}",${s.totalDays},${s.presentDays},${s.absentDays},${s.leaveDays},${s.percentage}%`
      )
      .join('\n');

    const csvContent = BOM + header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeClass.grade}_${activeClass.section}_Attendance_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('📤 मासिक उपस्थिति सारांश CSV निर्यात हो गया');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-cyan-800 to-indigo-900 text-white py-8 px-4 sm:px-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-teal-600/60 text-xs font-medium tracking-wide">
                  School & Classroom Management
                </span>
                <span className="text-teal-200 text-xs">• कक्षा, समय-सारिणी व दैनिक/मासिक छात्र उपस्थिति</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                <span>📚</span>
                <span>मेरी कक्षाएं व उपस्थिति (My Classes)</span>
              </h1>
              <p className="text-sm text-teal-100 mt-1 max-w-2xl">
                कक्षा व सेक्शन प्रबंधन, विद्यार्थी सूची, CSV इम्पोर्ट/एक्सपोर्ट, न्यूनतम डेटा गोपनीयता एवं दैनिक व मासिक उपस्थिति सारांश।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition backdrop-blur-sm"
                >
                  ⚡ मुख्य डैशबोर्ड
                </button>
              )}
              <button
                onClick={() => {
                  if (onNavigate) onNavigate('rollover');
                  else window.location.hash = '#rollover';
                }}
                className="px-3.5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
                title="सत्र समाप्त होने पर कक्षा व छात्र प्रोन्नति विजार्ड"
              >
                <span>🔄</span>
                <span>सत्र परिवर्तन (Rollover)</span>
              </button>
              <button
                onClick={() => {
                  setEditingClass(null);
                  setIsClassModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-teal-950/30 transition flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>नई कक्षा जोड़ें</span>
              </button>
            </div>
          </div>

          {/* Class Sections Tabs Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-6 scrollbar-none">
            {classSections.map((cs) => {
              const isSelected = cs.id === selectedClassId;
              return (
                <button
                  key={cs.id}
                  onClick={() => setSelectedClassId(cs.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 ${
                    isSelected
                      ? 'bg-white text-teal-900 shadow-md scale-[1.02]'
                      : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
                  }`}
                >
                  <span>🏫</span>
                  <span>{cs.grade} - {cs.section}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-teal-100 text-teal-800' : 'bg-black/30 text-teal-200'
                  }`}>
                    {cs.students.length} छात्र
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Active Class Info & Action Toolbar */}
        {activeClass && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-extrabold text-xs">
                    {activeClass.grade} • सेक्शन {activeClass.section}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    📖 विषय: {activeClass.subject}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {activeClass.roomNumber} • सत्र {activeClass.academicYear}
                  </span>
                </div>

                {/* Timetable Slot Chip */}
                {activeClass.timetableSlots.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium flex items-center gap-1.5">
                      <span>⏰</span>
                      <span>
                        {activeClass.timetableSlots[0].dayLabel} • कालांश{' '}
                        {activeClass.timetableSlots[0].period} ({activeClass.timetableSlots[0].time})
                      </span>
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      शिक्षक: {activeClass.classTeacher || 'सहायक अध्यापक'}
                    </span>
                  </div>
                )}
              </div>

              {/* Class & Student Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>📥/📤</span>
                  <span>CSV आयात / निर्यात</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    setIsStudentModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <span>➕</span>
                  <span>विद्यार्थी जोड़ें</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingClass(activeClass);
                    setIsClassModalOpen(true);
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs"
                  title="कक्षा विवरण संपादित करें"
                >
                  ✏️
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteClass(activeClass.id, `${activeClass.grade} ${activeClass.section}`)}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition"
                  title="कक्षा सेक्शन हटाएं"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Student Privacy Callout Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <span className="text-xl flex-shrink-0">🔒</span>
              <div className="leading-relaxed">
                <span className="font-bold">{STUDENT_PRIVACY_NOTICE.titleHi}: </span>
                <span className="text-[11px] text-amber-800 dark:text-amber-300">
                  {STUDENT_PRIVACY_NOTICE.bodyHi}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* View Switcher: Daily Attendance vs Monthly Summary */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <span>📋</span>
              <span>दैनिक उपस्थिति अंकन (Daily Attendance)</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'monthly'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <span>📊</span>
              <span>मासिक उपस्थिति सारांश (Monthly Summary)</span>
            </button>
          </div>

          {/* Date Picker (for Daily) or Month Picker (for Monthly) */}
          {activeTab === 'daily' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">तिथि (Date):</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              {selectedDate === todayYmd && (
                <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] font-bold">
                  आज (Today)
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">माह (Month):</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleExportMonthlyCsv}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1"
              >
                <span>⬇️</span>
                <span>मासिक CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: DAILY ATTENDANCE MARKING (दैनिक उपस्थिति)             */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'daily' && activeClass && (
          <div className="space-y-4">
            {/* Daily Metrics Card */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">कुल नामांकित (Enrolled)</div>
                <div className="text-2xl font-black mt-1 text-slate-800 dark:text-slate-100">
                  {dailyStats.totalStudents}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span>🟢 उपस्थित (Present)</span>
                </div>
                <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
                  {dailyStats.presentCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-rose-200 dark:border-rose-800 shadow-xs">
                <div className="text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1">
                  <span>🔴 अनुपस्थित (Absent)</span>
                </div>
                <div className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">
                  {dailyStats.absentCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-amber-200 dark:border-amber-800 shadow-xs">
                <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <span>🟡 अवकाश (Leave)</span>
                </div>
                <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
                  {dailyStats.leaveCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">उपस्थिति प्रतिशत (%)</div>
                <div className="text-2xl font-black mt-1 text-teal-600 dark:text-teal-400">
                  {dailyStats.percentage}%
                </div>
              </div>
            </div>

            {/* Quick Bulk Action Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">त्वरित क्रिया:</span>
                <button
                  type="button"
                  onClick={() => handleMarkAll('present')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 transition shadow-xs"
                >
                  ✓ सभी उपस्थित (All Present)
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('absent')}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-300 dark:border-rose-800 transition"
                >
                  ✕ सभी अनुपस्थित (All Absent)
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-md shadow-teal-600/20 transition flex items-center gap-1.5"
              >
                <span>💾</span>
                <span>उपस्थिति सुरक्षित करें (Save Attendance)</span>
              </button>
            </div>

            {/* Student Attendance List */}
            {activeClass.students.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
                <div className="text-4xl mb-3">👥</div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  इस कक्षा में कोई विद्यार्थी नामांकित नहीं है
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  CSV फाइल द्वारा पूरी सूची एक साथ आयात करें या एक-एक कर विद्यार्थी जोड़ें।
                </p>
                <div className="mt-4 flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCsvModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
                  >
                    📥 CSV आयात करें
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudent(null);
                      setIsStudentModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  >
                    ➕ विद्यार्थी जोड़ें
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {activeClass.students.map((student) => {
                  const status = dailyStatusMap[student.id];

                  return (
                    <div
                      key={student.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Left: Student Identity */}
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center border border-slate-200 dark:border-slate-700 flex-shrink-0">
                          {student.rollNumber}
                        </span>

                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <span>{student.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                              {student.gender === 'M' ? 'बालक' : student.gender === 'F' ? 'बालिका' : 'अन्य'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            अनुक्रमांक: {student.rollNumber}
                          </div>
                        </div>
                      </div>

                      {/* Right: 3 Big Status Buttons + Edit/Delete */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStudentStatus(student.id, 'present')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1 ${
                            status === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          <span>🟢</span>
                          <span>उपस्थित (P)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStudentStatus(student.id, 'absent')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1 ${
                            status === 'absent'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                          }`}
                        >
                          <span>🔴</span>
                          <span>अनुपस्थित (A)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStudentStatus(student.id, 'leave')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1 ${
                            status === 'leave'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <span>🟡</span>
                          <span>अवकाश (L)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudent(student);
                            setIsStudentModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 text-xs"
                          title="विद्यार्थी संपादित करें"
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 text-xs"
                          title="विद्यार्थी हटाएं"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: MONTHLY SUMMARY (मासिक उपस्थिति सारांश)               */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'monthly' && activeClass && (
          <div className="space-y-4">
            {/* Monthly Header Summary Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>📊</span>
                  <span>
                    माह {selectedMonth} उपस्थिति सारांश ({activeClass.grade} - {activeClass.section})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  इस माह में कुल <strong>{monthlyRecordedDaysCount} दिवस</strong> की उपस्थिति दर्ज की गई है।
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">औसत कक्षा उपस्थिति</div>
                  <div className="text-xl font-black text-teal-600 dark:text-teal-400">
                    {monthlySummary.length > 0
                      ? Math.round(
                          monthlySummary.reduce((acc, s) => acc + s.percentage, 0) /
                            monthlySummary.length
                        )
                      : 0}
                    %
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportMonthlyCsv}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <span>⬇️</span>
                  <span>CSV रिपोर्ट</span>
                </button>
              </div>
            </div>

            {/* Monthly Student Cards / Table */}
            {monthlySummary.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-400">
                इस माह ({selectedMonth}) में अभी कोई उपस्थिति दर्ज नहीं की गई है।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {monthlySummary.map((s) => {
                  const isLowAttendance = s.percentage < 75 && s.totalDays > 0;

                  return (
                    <div
                      key={s.studentId}
                      className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-xs transition ${
                        isLowAttendance
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center">
                            {s.rollNumber}
                          </span>
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {s.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {s.gender === 'M' ? 'बालक' : s.gender === 'F' ? 'बालिका' : 'अन्य'}
                            </div>
                          </div>
                        </div>

                        {/* Percentage Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                            s.percentage >= 75
                              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {s.percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            s.percentage >= 75
                              ? 'bg-emerald-500'
                              : s.percentage >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, s.percentage)}%` }}
                        />
                      </div>

                      {/* Days stats breakdown */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-1 text-center text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg">
                          <div className="text-[10px] text-slate-400">कुल दिन</div>
                          <div className="font-bold text-slate-700 dark:text-slate-300">{s.totalDays}</div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg text-emerald-800 dark:text-emerald-300">
                          <div className="text-[10px]">उपस्थित</div>
                          <div className="font-bold">{s.presentDays}</div>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg text-rose-800 dark:text-rose-300">
                          <div className="text-[10px]">अनुपस्थित</div>
                          <div className="font-bold">{s.absentDays}</div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg text-amber-800 dark:text-amber-300">
                          <div className="text-[10px]">अवकाश</div>
                          <div className="font-bold">{s.leaveDays}</div>
                        </div>
                      </div>

                      {isLowAttendance && (
                        <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <span>⚠️</span>
                          <span>उपस्थिति 75% से कम है (अभिभावक संपर्क आवश्यक)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Class Modal */}
      <AddClassSectionModal
        isOpen={isClassModalOpen}
        onClose={() => {
          setIsClassModalOpen(false);
          setEditingClass(null);
        }}
        onSave={handleSaveClass}
        initialData={editingClass}
        defaultTeacherName={currentUser?.name || 'सुरेश कुमार (सहायक अध्यापक)'}
      />

      {/* Add / Edit Student Modal */}
      <AddStudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleSaveStudent}
        initialData={editingStudent}
        suggestedRollNumber={(activeClass?.students.length || 0) + 1}
      />

      {/* CSV Import / Export Modal */}
      {activeClass && (
        <CsvImportExportModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          classSectionId={activeClass.id}
          classTitle={`${activeClass.grade} - ${activeClass.section}`}
          students={activeClass.students}
          currentAttendanceRecord={currentDailyRecord}
          onImportStudents={handleImportStudents}
          onToast={onToast}
        />
      )}
    </div>
  );
};
