import React, { useState, useMemo } from 'react';
import { Training, TrainingCertificate } from '../types/training';
import {
  getSampleTrainings,
  filterTrainings,
  getTrainingDeadlineInfo,
  updateTrainingProgress,
  attachTrainingCertificate,
} from '../utils/trainingsAndDutiesManager';
import { AddTrainingModal } from './AddTrainingModal';

interface TrainingsManagerProps {
  onToast: (msg: string) => void;
  onNavigate?: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'login') => void;
  currentUser?: { name: string; email: string } | null;
}

export const TrainingsManager: React.FC<TrainingsManagerProps> = ({
  onToast,
  onNavigate,
  currentUser,
}) => {
  // 1. Persistent Trainings State
  const [trainings, setTrainings] = useState<Training[]>(() => {
    try {
      const saved = localStorage.getItem('th-trainings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleTrainings();
  });

  const saveTrainings = (updated: Training[]) => {
    setTrainings(updated);
    try {
      localStorage.setItem('th-trainings', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // 2. Filter & Search State
  const [activeTab, setActiveTab] = useState<'all' | 'nearing_deadline' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 3. Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [viewingCertTraining, setViewingCertTraining] = useState<Training | null>(null);

  // 4. Metrics calculation
  const metrics = useMemo(() => {
    let completedCount = 0;
    let inProgressCount = 0;
    let nearingDeadlineCount = 0;

    trainings.forEach((t) => {
      if (t.status === 'completed') {
        completedCount++;
      } else {
        if (t.status === 'in_progress') inProgressCount++;
        const dl = getTrainingDeadlineInfo(t.dueDate);
        if (dl.isNearingDeadline || dl.isOverdue) {
          nearingDeadlineCount++;
        }
      }
    });

    return {
      total: trainings.length,
      inProgress: inProgressCount,
      nearingDeadline: nearingDeadlineCount,
      completed: completedCount,
    };
  }, [trainings]);

  // 5. Nearing Deadline alerts for banner
  const urgentTrainings = useMemo(() => {
    return trainings.filter((t) => {
      if (t.status === 'completed') return false;
      const dl = getTrainingDeadlineInfo(t.dueDate);
      return dl.isNearingDeadline || dl.isOverdue;
    });
  }, [trainings]);

  // 6. Filtered list
  const filteredList = useMemo(() => {
    return filterTrainings(trainings, {
      status: activeTab,
      query: searchQuery,
    });
  }, [trainings, activeTab, searchQuery]);

  // 7. Actions
  const handleSaveTraining = (data: Omit<Training, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nowIso = new Date().toISOString();
    if (editingTraining) {
      const updated = trainings.map((t) =>
        t.id === editingTraining.id
          ? {
              ...t,
              ...data,
              updatedAt: nowIso,
            }
          : t
      );
      saveTrainings(updated);
      onToast('✅ प्रशिक्षण विवरण अपडेट किया गया (Training updated)');
    } else {
      const newTraining: Training = {
        ...data,
        id: `th-tr-${Date.now()}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      saveTrainings([newTraining, ...trainings]);
      onToast('🎉 नया प्रशिक्षण सफलतापूर्वक जोड़ा गया (Training added)');
    }
    setEditingTraining(null);
  };

  const handleDeleteTraining = (id: string, name: string) => {
    if (confirm(`क्या आप प्रशिक्षण "${name}" को हटाना चाहते हैं?`)) {
      const updated = trainings.filter((t) => t.id !== id);
      saveTrainings(updated);
      onToast('🗑️ प्रशिक्षण हटा दिया गया');
    }
  };

  const handleAddHours = (training: Training, hoursToAdd: number) => {
    const newHours = Math.min(training.totalHours, training.completedHours + hoursToAdd);
    const updatedTraining = updateTrainingProgress(training, newHours);
    const updated = trainings.map((t) => (t.id === training.id ? updatedTraining : t));
    saveTrainings(updated);

    if (newHours >= training.totalHours) {
      onToast(`🎊 बधाई! "${training.name}" पूर्ण हो गया! कृपया प्रमाणपत्र संलग्न करें।`);
    } else {
      onToast(`⏱️ ${hoursToAdd} घंटे जोड़े गए (${newHours}/${training.totalHours} घंटे)`);
    }
  };

  const handleFileUpload = (training: Training, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cert: TrainingCertificate = {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      type: file.type || 'application/pdf',
      uploadedAt: new Date().toLocaleDateString('hi-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedTraining = attachTrainingCertificate(training, cert, true);
    const updated = trainings.map((t) => (t.id === training.id ? updatedTraining : t));
    saveTrainings(updated);
    onToast(`📜 प्रमाणपत्र "${file.name}" सफलतापूर्वक अपलोड किया गया!`);
  };

  const handleRemoveCertificate = (trainingId: string) => {
    if (confirm('क्या आप अपलोड किया गया प्रमाणपत्र हटाना चाहते हैं?')) {
      const updated = trainings.map((t) => {
        if (t.id === trainingId) {
          const clone = { ...t };
          delete clone.certificate;
          return clone;
        }
        return t;
      });
      saveTrainings(updated);
      onToast('प्रमाणपत्र हटा दिया गया');
      if (viewingCertTraining?.id === trainingId) {
        setViewingCertTraining(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-800 text-white py-8 px-4 sm:px-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-md bg-teal-600/60 text-xs font-medium tracking-wide">
                  Teacher Professional Development (CPD)
                </span>
                <span className="text-teal-200 text-xs">• दीक्षा, निष्ठा व परिषदीय प्रशिक्षण</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                <span>🎓</span>
                <span>विभागीय प्रशिक्षण मॉड्यूल (Trainings)</span>
              </h1>
              <p className="text-sm text-teal-100 mt-1 max-w-2xl">
                अनिवार्य 50 घंटे सतत व्यावसायिक विकास (CPD), दीक्षा कोर्स, निष्ठा प्रशिक्षण एवं प्रमाण-पत्र ट्रैकिंग।
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
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
                  setEditingTraining(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold text-xs shadow-lg shadow-teal-950/30 transition flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>नया प्रशिक्षण जोड़ें</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-teal-200">कुल प्रशिक्षण (Total)</div>
              <div className="text-2xl font-black mt-1">{metrics.total}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-teal-200">प्रगति पर (In Progress)</div>
              <div className="text-2xl font-black mt-1 text-cyan-300">{metrics.inProgress}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-rose-200 flex items-center gap-1">
                <span>⚠️ शीघ्र पूर्ण करें (Due Soon)</span>
              </div>
              <div className="text-2xl font-black mt-1 text-rose-300 flex items-center gap-2">
                <span>{metrics.nearingDeadline}</span>
                {metrics.nearingDeadline > 0 && (
                  <span className="text-[10px] bg-rose-500/80 px-2 py-0.5 rounded-full text-white font-semibold">
                    ध्यान दें!
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <div className="text-xs text-teal-200">पूर्ण (Completed)</div>
              <div className="text-2xl font-black mt-1 text-emerald-300">{metrics.completed}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Warning Banner for Nearing Deadline / Overdue Trainings */}
        {urgentTrainings.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 shadow-sm animate-pulse-slow">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <span>शीघ्र पूर्ण करने हेतु आवश्यक प्रशिक्षण चेतावनी ({urgentTrainings.length})</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-semibold">
                    Deadline Alert
                  </span>
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  निम्न प्रशिक्षणों की अंतिम तिथि निकट है या समाप्त हो चुकी है। कृपया समय से पूर्ण कर प्रमाण-पत्र अपलोड करें:
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {urgentTrainings.map((ut) => {
                    const dl = getTrainingDeadlineInfo(ut.dueDate);
                    return (
                      <div
                        key={ut.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-xs shadow-xs"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[200px]">
                          {ut.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            dl.isOverdue
                              ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200'
                              : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          {dl.badgeLabelHi}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar & Search */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'all'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              सभी ({trainings.length})
            </button>
            <button
              onClick={() => setActiveTab('nearing_deadline')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                activeTab === 'nearing_deadline'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <span>⚠️</span>
              <span>शीघ्र पूर्ण करें ({metrics.nearingDeadline})</span>
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'in_progress'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              प्रगति पर ({metrics.inProgress})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              पूर्ण ({metrics.completed})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <input
              type="text"
              placeholder="प्रशिक्षण या संस्था खोजें (Search)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Trainings Cards Grid */}
        {filteredList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="text-4xl mb-3">🎓</div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              कोई प्रशिक्षण उपलब्ध नहीं मिला
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {searchQuery
                ? 'आपके खोजे गए शब्द से कोई परिणाम नहीं मिला। कृपया पुनः प्रयास करें।'
                : 'इस श्रेणी में अभी कोई प्रशिक्षण नहीं है। नया प्रशिक्षण जोड़ने के लिए ऊपर दिए बटन पर क्लिक करें।'}
            </p>
            <button
              onClick={() => {
                setEditingTraining(null);
                setIsAddModalOpen(true);
              }}
              className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
            >
              <span>➕</span>
              <span>नया प्रशिक्षण जोड़ें</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((training) => {
              const deadline = getTrainingDeadlineInfo(training.dueDate);
              const progressPct = Math.round(
                (training.completedHours / Math.max(training.totalHours, 1)) * 100
              );
              const isFinished = training.status === 'completed';

              return (
                <div
                  key={training.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 p-5 shadow-sm hover:shadow-md flex flex-col justify-between ${
                    deadline.isOverdue && !isFinished
                      ? 'border-rose-400 dark:border-rose-800/80'
                      : deadline.isNearingDeadline && !isFinished
                      ? 'border-amber-400 dark:border-amber-800/80'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header: Provider & Deadline warning badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold">
                        🏛️ {training.provider}
                      </span>

                      {/* Status / Deadline Badge */}
                      {isFinished ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1">
                          <span>✅ पूर्ण (Completed)</span>
                        </span>
                      ) : deadline.isOverdue ? (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                          <span>🔴 {deadline.badgeLabelHi}</span>
                        </span>
                      ) : deadline.isNearingDeadline ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1">
                          <span>⚠️ {deadline.badgeLabelHi}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                          📅 अंतिम: {training.dueDate}
                        </span>
                      )}
                    </div>

                    {/* Course Title */}
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
                      {training.name}
                    </h3>

                    {training.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {training.description}
                      </p>
                    )}

                    {/* Progress Bar Section */}
                    <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          प्रगति (Progress):
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {training.completedHours} / {training.totalHours} घंटे ({progressPct}%)
                        </span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isFinished
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : deadline.isOverdue
                              ? 'bg-gradient-to-r from-rose-500 to-red-600'
                              : deadline.isNearingDeadline
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                              : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                          }`}
                          style={{ width: `${Math.min(100, progressPct)}%` }}
                        />
                      </div>

                      {/* Quick Hours Log Stepper */}
                      {!isFinished && (
                        <div className="mt-2.5 flex items-center justify-between gap-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            त्वरित घंटे जोड़ें:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddHours(training, 1)}
                              className="px-2 py-0.5 rounded-md bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-800 text-teal-800 dark:text-teal-200 text-[11px] font-semibold transition"
                            >
                              +1 घंटा
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddHours(training, 2)}
                              className="px-2 py-0.5 rounded-md bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-800 text-teal-800 dark:text-teal-200 text-[11px] font-semibold transition"
                            >
                              +2 घंटे
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const remaining = training.totalHours - training.completedHours;
                                handleAddHours(training, remaining);
                              }}
                              className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 text-[11px] font-semibold transition"
                            >
                              पूर्ण करें (100%)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Certificate section */}
                    <div className="mt-3.5">
                      {training.certificate ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl">📜</span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                                {training.certificate.name}
                              </p>
                              <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                {training.certificate.size || 'PDF'} • {training.certificate.uploadedAt}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setViewingCertTraining(training)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition shadow-xs"
                            >
                              देखें (View)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCertificate(training.id)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs transition"
                              title="प्रमाणपत्र हटाएं"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <span>📄</span>
                            <span>प्रमाणपत्र अभी अपलोड नहीं किया गया</span>
                          </span>
                          <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition flex items-center gap-1">
                            <span>📤</span>
                            <span>अपलोड करें</span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(training, e)}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Card Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      {training.link ? (
                        <a
                          href={training.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          <span>🔗 पोर्टल खोलें (Open Link)</span>
                          <span className="text-[10px]">↗</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400">पोर्टल लिंक नहीं</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTraining(training);
                          setIsAddModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition"
                      >
                        ✏️ संपादन
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTraining(training.id, training.name)}
                        className="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Training Modal */}
      <AddTrainingModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTraining(null);
        }}
        onSave={handleSaveTraining}
        initialData={editingTraining}
      />

      {/* Certificate Viewer Modal */}
      {viewingCertTraining && viewingCertTraining.certificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📜</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    प्रशिक्षण पूर्णता प्रमाण-पत्र (Training Certificate)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {viewingCertTraining.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingCertTraining(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Certificate Preview Card */}
            <div className="p-6">
              <div className="border-4 border-double border-teal-600/40 dark:border-teal-400/40 rounded-2xl p-6 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 text-center relative shadow-inner">
                {/* Emblem header */}
                <div className="text-3xl mb-1">🏛️</div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-wider uppercase">
                  {viewingCertTraining.provider}
                </div>
                <div className="text-lg font-serif font-black text-teal-800 dark:text-teal-300 mt-2">
                  प्रमाण-पत्र (CERTIFICATE OF COMPLETION)
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                  यह प्रमाणित किया जाता है कि
                </p>

                <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {currentUser?.name || 'श्री / श्रीमती शिक्षक जी (सहायक अध्यापक)'}
                </p>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
                  ने सफलतापूर्वक <strong>"{viewingCertTraining.name}"</strong> संबंधी कुल{' '}
                  <strong>{viewingCertTraining.totalHours} घंटे</strong> का पाठ्यक्रम निर्धारित समय-सीमा
                  में पूर्ण किया है।
                </p>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="text-left">
                    <div>दस्तावेज: {viewingCertTraining.certificate.name}</div>
                    <div>दिनांक: {viewingCertTraining.certificate.uploadedAt}</div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                      ✓ प्रमाणित (VERIFIED)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onToast('📥 प्रमाणपत्र डाउनलोड हो रहा है (Certificate Downloaded)...');
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
                >
                  <span>⬇️</span>
                  <span>प्रमाणपत्र डाउनलोड करें (Download)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCertTraining(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  बंद करें (Close)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
