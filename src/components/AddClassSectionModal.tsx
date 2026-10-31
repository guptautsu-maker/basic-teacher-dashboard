import React, { useState } from 'react';
import { ClassSection, TimetableSlot } from '../types/classSection';

interface AddClassSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classSection: Omit<ClassSection, 'id' | 'students' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: ClassSection | null;
  defaultTeacherName?: string;
}

const COMMON_GRADES = [
  'कक्षा 1 (Class 1)',
  'कक्षा 2 (Class 2)',
  'कक्षा 3 (Class 3)',
  'कक्षा 4 (Class 4)',
  'कक्षा 5 (Class 5)',
  'कक्षा 6 (Class 6)',
  'कक्षा 7 (Class 7)',
  'कक्षा 8 (Class 8)',
];

const COMMON_SUBJECTS = [
  'गणित (Mathematics)',
  'हिंदी व भाषा (Hindi Literature)',
  'अंग्रेजी (English)',
  'हमारा परिवेश / विज्ञान (EVS & Science)',
  'सामाजिक विषय (Social Studies)',
  'संस्कृत (Sanskrit)',
  'कला, संगीत व शारीरिक शिक्षा',
  'समस्त विषय (All Subjects - Primary)',
];

export const AddClassSectionModal: React.FC<AddClassSectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultTeacherName = 'सुरेश कुमार (सहायक अध्यापक)',
}) => {
  const [grade, setGrade] = useState(initialData?.grade || 'कक्षा 4 (Class 4)');
  const [section, setSection] = useState(initialData?.section || 'A');
  const [subject, setSubject] = useState(initialData?.subject || 'गणित (Mathematics)');
  const [academicYear, setAcademicYear] = useState(initialData?.academicYear || '2026-27');
  const [roomNumber, setRoomNumber] = useState(initialData?.roomNumber || 'कक्ष सं० 04');
  const [classTeacher, setClassTeacher] = useState(initialData?.classTeacher || defaultTeacherName);

  // Timetable Slot
  const initialSlot = initialData?.timetableSlots[0];
  const [dayLabel, setDayLabel] = useState(initialSlot?.dayLabel || 'सोमवार - शनिवार (Mon-Sat)');
  const [period, setPeriod] = useState(initialSlot?.period ? String(initialSlot.period) : '2');
  const [time, setTime] = useState(initialSlot?.time || '09:45 AM - 10:30 AM');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grade.trim()) {
      setError('कृपया कक्षा का चयन करें (Please select class)');
      return;
    }
    if (!section.trim()) {
      setError('कृपया सेक्शन दर्ज करें (Please enter section)');
      return;
    }

    const timetableSlot: TimetableSlot = {
      id: initialSlot?.id || `ts-${Date.now()}`,
      dayLabel: dayLabel.trim(),
      period: parseInt(period, 10) || 1,
      time: time.trim() || '09:00 AM - 09:45 AM',
      room: roomNumber.trim(),
    };

    onSave({
      grade: grade.trim(),
      section: section.trim().toUpperCase(),
      subject: subject.trim(),
      academicYear: academicYear.trim(),
      roomNumber: roomNumber.trim(),
      classTeacher: classTeacher.trim(),
      timetableSlots: [timetableSlot],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏫</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {initialData ? 'कक्षा विवरण संपादित करें' : 'नई कक्षा सेक्शन बनाएं (Create Class Section)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                कक्षा, सेक्शन, विषय व समय-सारिणी (Timetable Slot) विन्यास
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              ⚠️ {error}
            </div>
          )}

          {/* Grade & Section */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                कक्षा (Class / Grade) <span className="text-rose-500">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {COMMON_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                सेक्शन (Section) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="उदा. A, B, अ, ब"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              विषय (Subject) <span className="text-rose-500">*</span>
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {COMMON_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year & Room */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                शैक्षणिक सत्र (Academic Year)
              </label>
              <input
                type="text"
                placeholder="उदा. 2026-27"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                कक्ष संख्या (Room Number)
              </label>
              <input
                type="text"
                placeholder="उदा. कक्ष सं० 04"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Class Teacher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              कक्षाध्यापक / विषय शिक्षक (Class Teacher)
            </label>
            <input
              type="text"
              placeholder="शिक्षक का नाम..."
              value={classTeacher}
              onChange={(e) => setClassTeacher(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Timetable Slot Configuration */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>⏰</span>
              <span>समय-सारिणी स्लॉट (Timetable Slot)</span>
            </h4>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  दिन (Day Schedule)
                </label>
                <input
                  type="text"
                  placeholder="उदा. सोमवार - शनिवार"
                  value={dayLabel}
                  onChange={(e) => setDayLabel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  कालांश (Period)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                समय अवधि (Time Slot)
              </label>
              <input
                type="text"
                placeholder="उदा. 09:45 AM - 10:30 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-600/20 transition flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>{initialData ? 'बदलाव सहेजें' : 'कक्षा बनाएं (Save Class)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
