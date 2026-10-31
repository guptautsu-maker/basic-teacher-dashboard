import React, { useState } from 'react';
import { Student, AttendanceRecord } from '../types/classSection';
import {
  parseStudentCsv,
  exportStudentCsv,
  generateSampleCsvTemplate,
  STUDENT_PRIVACY_NOTICE,
} from '../utils/myClassesManager';

interface CsvImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classSectionId: string;
  classTitle: string;
  students: Student[];
  currentAttendanceRecord?: AttendanceRecord;
  onImportStudents: (imported: Student[], mode: 'replace' | 'append') => void;
  onToast: (msg: string) => void;
}

export const CsvImportExportModal: React.FC<CsvImportExportModalProps> = ({
  isOpen,
  onClose,
  classSectionId,
  classTitle,
  students,
  currentAttendanceRecord,
  onImportStudents,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [csvText, setCsvText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        const res = parseStudentCsv(content, classSectionId);
        setPreviewStudents(res.students);
        setParseErrors(res.errors);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    if (text.trim()) {
      const res = parseStudentCsv(text, classSectionId);
      setPreviewStudents(res.students);
      setParseErrors(res.errors);
    } else {
      setPreviewStudents([]);
      setParseErrors([]);
    }
  };

  const handleDownloadSampleTemplate = () => {
    const csvContent = generateSampleCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'TeacherHub_Student_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('📥 नमूना CSV टेम्पलेट डाउनलोड हो गया (Sample CSV downloaded)');
  };

  const handleExportCsv = (includeTodayAttendance: boolean) => {
    const attendanceMap = includeTodayAttendance && currentAttendanceRecord
      ? currentAttendanceRecord.records
      : undefined;
    const dateStr = includeTodayAttendance && currentAttendanceRecord
      ? currentAttendanceRecord.date
      : undefined;

    const csvContent = exportStudentCsv(students, attendanceMap, dateStr);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = classTitle.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_');
    link.setAttribute(
      'download',
      `${safeTitle}_Students_${dateStr || new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('📤 विद्यार्थी सूची CSV सफलतापूर्वक निर्यात की गई (CSV Exported)');
  };

  const handleCommitImport = () => {
    if (previewStudents.length === 0) {
      onToast('⚠️ आयात करने हेतु कोई विद्यार्थी डेटा नहीं मिला');
      return;
    }
    onImportStudents(previewStudents, importMode);
    onToast(
      `🎉 ${previewStudents.length} विद्यार्थी सफलतापूर्वक ${
        importMode === 'replace' ? 'प्रतिस्थापित' : 'जोड़े'
      } गए!`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                विद्यार्थी सूची CSV आयात / निर्यात ({classTitle})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CSV फाइल द्वारा थोक में विद्यार्थी जोड़ें या एक्सेल हेतु एक्सपोर्ट करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Privacy Note */}
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
            <span className="text-xl flex-shrink-0">🔒</span>
            <div>
              <div className="font-bold">{STUDENT_PRIVACY_NOTICE.titleHi}</div>
              <div className="text-[11px] text-teal-800 dark:text-teal-300 mt-0.5 leading-relaxed">
                {STUDENT_PRIVACY_NOTICE.bodyHi}
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'import'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <span>📥</span>
              <span>CSV आयात (Import)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <span>📤</span>
              <span>CSV निर्यात (Export)</span>
            </button>
          </div>

          {/* TAB 1: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Template Download banner */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    नमूना टेम्पलेट (Sample CSV Template)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    स्तंभ: Roll No, Student Name, Gender (M/F)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-slate-100 shadow-xs"
                >
                  ⬇️ टेम्पलेट डाउनलोड
                </button>
              </div>

              {/* File Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. CSV फाइल चुनें (Upload CSV File)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-center hover:border-teal-500 transition cursor-pointer relative bg-slate-50/50 dark:bg-slate-800/30">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="text-2xl mb-1">📄</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {fileName ? `चयनित फाइल: ${fileName}` : 'यहाँ CSV फाइल ड्रैग करें अथवा क्लिक कर चुनें'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    UTF-8 समर्थित (हिंदी नाम पूर्णतः समर्थित हैं)
                  </div>
                </div>
              </div>

              {/* Or paste CSV text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. अथवा CSV टेक्स्ट सीधे पेस्ट करें (Paste CSV Text)
                </label>
                <textarea
                  rows={4}
                  placeholder={`Roll No,Student Name,Gender\n1,अमित कुमार,M\n2,प्रिया वर्मा,F`}
                  value={csvText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Import Mode: Replace vs Append */}
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold">आयात विकल्प:</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-teal-600"
                  />
                  <span>मौजूदा सूची में जोड़ें (Append)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-rose-600"
                  />
                  <span>पूरी सूची प्रतिस्थापित करें (Replace All)</span>
                </label>
              </div>

              {/* Parse Errors if any */}
              {parseErrors.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-0.5 max-h-24 overflow-y-auto">
                  <div className="font-bold">⚠️ कुछ पंक्तियों में त्रुटियां मिलीं:</div>
                  {parseErrors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}

              {/* Preview of Parsed Students */}
              {previewStudents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      आयात हेतु तैयार विद्यार्थी ({previewStudents.length})
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ मान्य डेटा
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {previewStudents.map((s) => (
                      <div key={s.id} className="p-2 flex items-center justify-between bg-white dark:bg-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-bold text-[10px]">
                            #{s.rollNumber}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {s.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {s.gender === 'M' ? 'बालक' : s.gender === 'F' ? 'बालिका' : 'अन्य'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Commit Action */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  disabled={previewStudents.length === 0}
                  onClick={handleCommitImport}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>{previewStudents.length} विद्यार्थी आयात करें</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      मौजूदा नामांकित विद्यार्थी:
                    </div>
                    <div className="text-lg font-black text-teal-600 dark:text-teal-400">
                      {students.length} विद्यार्थी
                    </div>
                  </div>
                  <span className="text-2xl">📋</span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  निर्यात की गई CSV फाइल में UTF-8 BOM संलग्न रहता है, जिससे माइक्रोसॉफ्ट एक्सेल एवं गूगल शीट्स में हिंदी नाम बिना किसी त्रुटि के सीधे खुलते हैं।
                </p>
              </div>

              {/* Export Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleExportCsv(false)}
                  className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2"
                >
                  <span>📤</span>
                  <span>केवल विद्यार्थी सूची निर्यात करें (Roll No, Name, Gender)</span>
                </button>

                {currentAttendanceRecord && (
                  <button
                    type="button"
                    onClick={() => handleExportCsv(true)}
                    className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
                  >
                    <span>📊</span>
                    <span>
                      आज की उपस्थिति सहित निर्यात करें ({currentAttendanceRecord.date})
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
