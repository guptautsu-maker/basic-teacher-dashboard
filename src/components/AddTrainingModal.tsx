import React, { useState } from 'react';
import { Training } from '../types/training';

interface AddTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (training: Omit<Training, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Training | null;
}

const COMMON_PROVIDERS = [
  'DIKSHA Portal / NCERT',
  'SCERT उत्तर प्रदेश',
  'iGoT Karmayogi (DoPT)',
  'बेसिक शिक्षा परिषद (UP)',
  'समग्र शिक्षा अभियान',
  'अन्य (Other)',
];

export const AddTrainingModal: React.FC<AddTrainingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [provider, setProvider] = useState(initialData?.provider || 'DIKSHA Portal / NCERT');
  const [customProvider, setCustomProvider] = useState('');
  const [totalHours, setTotalHours] = useState(initialData?.totalHours ? String(initialData.totalHours) : '12');
  const [completedHours, setCompletedHours] = useState(initialData?.completedHours ? String(initialData.completedHours) : '0');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [certificateRequired, setCertificateRequired] = useState(initialData?.certificateRequired ?? true);
  const [link, setLink] = useState(initialData?.link || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('कृपया प्रशिक्षण का नाम दर्ज करें (Please enter training name)');
      return;
    }
    const tot = parseFloat(totalHours) || 0;
    const comp = parseFloat(completedHours) || 0;
    if (tot <= 0) {
      setError('कुल घंटे 0 से अधिक होने चाहिए (Total hours must be greater than 0)');
      return;
    }
    if (comp < 0 || comp > tot) {
      setError('पूर्ण किए गए घंटे 0 और कुल घंटों के मध्य होने चाहिए (Completed hours must be between 0 and total)');
      return;
    }

    const resolvedProvider = provider === 'अन्य (Other)' ? (customProvider.trim() || 'अन्य') : provider;

    let status = initialData?.status || 'not_started';
    if (comp >= tot) {
      status = 'completed';
    } else if (comp > 0) {
      status = 'in_progress';
    } else {
      status = 'not_started';
    }

    onSave({
      name: name.trim(),
      provider: resolvedProvider,
      totalHours: tot,
      completedHours: comp,
      dueDate,
      status,
      certificateRequired,
      link: link.trim() || undefined,
      description: description.trim() || undefined,
      certificate: initialData?.certificate,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {initialData ? 'प्रशिक्षण विवरण संपादित करें' : 'नया प्रशिक्षण जोड़ें (Add Training)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                DIKSHA, SCERT, निष्ठा अथवा अन्य विभागीय प्रशिक्षण
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

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              प्रशिक्षण का नाम (Training Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="उदा. निपुण भारत FLN 3.0 बुनियादी साक्षरता मॉड्यूल"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              प्रशिक्षण प्रदाता संस्था (Provider / Agency)
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {COMMON_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {provider === 'अन्य (Other)' && (
              <input
                type="text"
                placeholder="संस्था का नाम दर्ज करें (e.g. IGNOU, Tata Trusts)"
                value={customProvider}
                onChange={(e) => setCustomProvider(e.target.value)}
                className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            )}
          </div>

          {/* Hours (Total & Completed) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                कुल घंटे (Total Hours) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                पूर्ण घंटे (Completed Hours)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={completedHours}
                onChange={(e) => setCompletedHours(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              अंतिम तिथि (Due Date) <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              अंतिम तिथि से 3 दिन पूर्व या विलंबित होने पर सिस्टम स्वतः चेतावनी प्रदर्शित करेगा।
            </p>
          </div>

          {/* Certificate Required Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="certReq"
              checked={certificateRequired}
              onChange={(e) => setCertificateRequired(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <label htmlFor="certReq" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              प्रमाणपत्र आवश्यक है (Certificate required upon completion)
            </label>
          </div>

          {/* Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              प्रशिक्षण लिंक / पोर्टल URL (DIKSHA / iGoT Web Link)
            </label>
            <input
              type="url"
              placeholder="https://diksha.gov.in/explore/course/..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              विवरण एवं उद्देश्य (Description & Module Details)
            </label>
            <textarea
              rows={2}
              placeholder="पाठ्यक्रम के प्रमुख बिंदु व सीखने के प्रतिफल..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              <span>{initialData ? 'बदलाव सहेजें (Save Changes)' : 'प्रशिक्षण जोड़ें (Save)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
