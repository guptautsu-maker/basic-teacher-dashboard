import React, { useState } from 'react';
import { Duty, DutyCategory, DutyStatus } from '../types/duty';

interface AddDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (duty: Omit<Duty, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Duty | null;
  defaultTeacherName?: string;
}

const CATEGORY_OPTIONS: { id: DutyCategory; labelHi: string; labelEn: string; icon: string }[] = [
  { id: 'mdm', labelHi: 'मध्याह्न भोजन (MDM)', labelEn: 'Mid-Day Meal', icon: '🍲' },
  { id: 'election', labelHi: 'बीएलओ / निर्वाचन (BLO/Election)', labelEn: 'Election Duty', icon: '🗳️' },
  { id: 'exam', labelHi: 'परीक्षा / कक्ष निरीक्षक (Exam / Invigilation)', labelEn: 'Exam Duty', icon: '📝' },
  { id: 'library', labelHi: 'पुस्तकालय (Library)', labelEn: 'Library Duty', icon: '📚' },
  { id: 'assembly', labelHi: 'प्रार्थना सभा व चेतना सत्र', labelEn: 'Morning Assembly', icon: '🔔' },
  { id: 'discipline', labelHi: 'अनुशासन व सुरक्षा (Discipline)', labelEn: 'Discipline Duty', icon: '🛡️' },
  { id: 'other', labelHi: 'अन्य दायित्व (Other Duties)', labelEn: 'Other Duty', icon: '📌' },
];

const WEEK_DAYS = [
  { id: 1, labelHi: 'सोम', labelEn: 'Mon' },
  { id: 2, labelHi: 'मंगल', labelEn: 'Tue' },
  { id: 3, labelHi: 'बुध', labelEn: 'Wed' },
  { id: 4, labelHi: 'गुरु', labelEn: 'Thu' },
  { id: 5, labelHi: 'शुक्र', labelEn: 'Fri' },
  { id: 6, labelHi: 'शनि', labelEn: 'Sat' },
  { id: 0, labelHi: 'रवि', labelEn: 'Sun' },
];

export const AddDutyModal: React.FC<AddDutyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultTeacherName = 'सुरेश कुमार (सहायक अध्यापक)',
}) => {
  const [dutyName, setDutyName] = useState(initialData?.dutyName || '');
  const [category, setCategory] = useState<DutyCategory>(initialData?.category || 'mdm');
  const [schedule, setSchedule] = useState(initialData?.schedule || 'प्रतिदिन 12:30 PM - 01:15 PM');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialData?.daysOfWeek || [1, 2, 3, 4, 5, 6]);
  const [startDate, setStartDate] = useState(
    initialData?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [isOngoing, setIsOngoing] = useState(initialData ? initialData.endDate === null : true);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [assignedBy, setAssignedBy] = useState(initialData?.assignedBy || 'प्रधानाध्यापक');
  const [assignedTeacher, setAssignedTeacher] = useState(initialData?.assignedTeacher || defaultTeacherName);
  const [location, setLocation] = useState(initialData?.location || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [status, setStatus] = useState<DutyStatus>(initialData?.status || 'active');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleDay = (dayNum: number) => {
    if (daysOfWeek.includes(dayNum)) {
      if (daysOfWeek.length === 1) return; // keep at least 1 day
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayNum));
    } else {
      setDaysOfWeek([...daysOfWeek, dayNum].sort());
    }
  };

  const selectAllWeekdays = () => {
    setDaysOfWeek([1, 2, 3, 4, 5, 6]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dutyName.trim()) {
      setError('कृपया दायित्व का नाम दर्ज करें (Please enter duty name)');
      return;
    }
    if (daysOfWeek.length === 0) {
      setError('कृपया कम से कम एक दिन चुनें (Select at least one day of week)');
      return;
    }
    if (!startDate) {
      setError('कृपया प्रारंभ तिथि दर्ज करें (Please enter start date)');
      return;
    }

    onSave({
      dutyName: dutyName.trim(),
      category,
      schedule: schedule.trim(),
      daysOfWeek,
      startDate,
      endDate: isOngoing ? null : endDate || null,
      assignedBy: assignedBy.trim() || 'प्रधानाध्यापक',
      assignedTeacher: assignedTeacher.trim() || defaultTeacherName,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {initialData ? 'दायित्व संपादित करें' : 'नया दायित्व व ड्यूटी जोड़ें (Add Duty)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                एमडीएम, बीएलओ/निर्वाचन, परीक्षा या विद्यालयी आवर्ती ड्यूटी
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

          {/* Duty Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              दायित्व का नाम (Duty Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="उदा. मध्याह्न भोजन (MDM) वितरण व स्वच्छता पर्यवेक्षण"
              value={dutyName}
              onChange={(e) => {
                setDutyName(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              दायित्व की श्रेणी (Duty Category)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DutyCategory)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.labelHi} ({c.labelEn})
                </option>
              ))}
            </select>
          </div>

          {/* Schedule / Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              समय / आवृत्ति (Schedule & Timing) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="उदा. प्रतिदिन 12:30 PM - 01:15 PM अथवा प्रत्येक शनिवार"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Days of week selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                साप्ताहिक दिन (Weekly Schedule Days) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={selectAllWeekdays}
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-medium"
              >
                सोम-शनि चुनें (Mon-Sat)
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map((wd) => {
                const isSelected = daysOfWeek.includes(wd.id);
                return (
                  <button
                    key={wd.id}
                    type="button"
                    onClick={() => toggleDay(wd.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                    }`}
                  >
                    <span>{wd.labelHi}</span>
                    <span className="text-[10px] opacity-80">{wd.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range: Start & End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                प्रारंभ तिथि (Start Date) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  समाप्ति तिथि (End Date)
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOngoing}
                    onChange={(e) => setIsOngoing(e.target.checked)}
                    className="w-3.5 h-3.5 text-teal-600 rounded"
                  />
                  <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">सतत (Ongoing)</span>
                </label>
              </div>
              <input
                type="date"
                disabled={isOngoing}
                value={isOngoing ? '' : endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  isOngoing ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40' : ''
                }`}
              />
            </div>
          </div>

          {/* Assigned By & Assigned Teacher */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                आदेशकर्ता / सौंपा गया (Assigned By)
              </label>
              <input
                type="text"
                placeholder="उदा. प्रधानाध्यापक / BEO / SDM"
                value={assignedBy}
                onChange={(e) => setAssignedBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                प्रभारी शिक्षक (Assigned Teacher)
              </label>
              <input
                type="text"
                placeholder="उदा. सहायक अध्यापक"
                value={assignedTeacher}
                onChange={(e) => setAssignedTeacher(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Status & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                स्थिति (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DutyStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="active">🟢 सक्रिय (Active)</option>
                <option value="completed">✅ पूर्ण (Completed)</option>
                <option value="excused">⚪ अवमुक्त / स्थगित (Excused)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                स्थान / कक्ष (Location)
              </label>
              <input
                type="text"
                placeholder="उदा. रसोई प्रांगण / बूथ 142"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              महत्वपूर्ण निर्देश व नोट्स (Duty Notes / Instructions)
            </label>
            <textarea
              rows={2}
              placeholder="दायित्व निर्वहन संबंधी महत्वपूर्ण बिंदु..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
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
              <span>{initialData ? 'बदलाव सहेजें (Save Changes)' : 'दायित्व जोड़ें (Save Duty)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
