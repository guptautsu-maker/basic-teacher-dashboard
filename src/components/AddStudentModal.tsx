import React, { useState } from 'react';
import { Student } from '../types/classSection';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Omit<Student, 'id' | 'classSectionId'>) => void;
  initialData?: Student | null;
  suggestedRollNumber?: number;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  suggestedRollNumber = 1,
}) => {
  const [rollNumber, setRollNumber] = useState(
    initialData ? String(initialData.rollNumber) : String(suggestedRollNumber)
  );
  const [name, setName] = useState(initialData?.name || '');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>(initialData?.gender || 'M');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('कृपया विद्यार्थी का नाम दर्ज करें (Student name is required)');
      return;
    }
    const parsedRoll = parseInt(rollNumber, 10);
    if (isNaN(parsedRoll) || parsedRoll <= 0) {
      setError('अमान्य अनुक्रमांक (Invalid Roll Number)');
      return;
    }

    onSave({
      rollNumber: parsedRoll,
      name: name.trim(),
      gender,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {initialData ? 'विद्यार्थी विवरण संपादित करें' : 'नया विद्यार्थी जोड़ें (Add Student)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              ⚠️ {error}
            </div>
          )}

          {/* Roll Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              अनुक्रमांक (Roll Number) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={rollNumber}
              onChange={(e) => {
                setRollNumber(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              विद्यार्थी का नाम (Student Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="उदा. अमित कुमार / प्रिया वर्मा"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              लिंग (Gender)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGender('M')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  gender === 'M'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                👦 बालक (M)
              </button>
              <button
                type="button"
                onClick={() => setGender('F')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  gender === 'F'
                    ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                👧 बालिका (F)
              </button>
              <button
                type="button"
                onClick={() => setGender('O')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                  gender === 'O'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                अन्य (O)
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
            🔒 <strong>गोपनीयता:</strong> केवल उपस्थिति दर्ज करने हेतु न्यूनतम सूचना रखी जाती है।
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              {initialData ? 'सहेजें' : 'जोड़ें (Save)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
