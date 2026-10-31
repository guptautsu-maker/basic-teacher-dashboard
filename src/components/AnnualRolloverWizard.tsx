import React, { useState, useEffect, useMemo } from 'react';
import {
  calculateNextAcademicYear,
  getNextGrade,
  buildInitialPromotionPlan,
  bulkUpdatePromotionPlan,
  getCarryOverCandidates,
  executeAnnualRollover,
  checkRolloverReversibility,
  rollbackAnnualRollover,
  searchArchive,
  getDefaultNewYearChecklist,
  ROLLOVER_GRACE_PERIOD_DAYS,
} from '../utils/sessionRolloverManager';
import {
  StudentPromotionItem,
  CarryOverSelections,
  NewYearChecklistItem,
  RolloverArchive,
} from '../types/sessionRollover';
import { ClassSection, Student, AttendanceRecord } from '../types/classSection';
import { Task } from '../utils/taskStatusSystem';
import { Duty } from '../types/duty';
import { PortalApp } from '../types/portalApp';
import { TrainingItem, getInitialTeacherHubTasks, getInitialTeacherHubTrainings } from '../data/teacherHubSampleData';
import { getSampleClassSections, getSampleAttendanceRecords } from '../utils/myClassesManager';
import { getSampleDuties } from '../utils/trainingsAndDutiesManager';
import { INITIAL_PORTAL_APPS } from '../data/portalAppData';

interface AnnualRolloverWizardProps {
  onToast: (msg: string) => void;
  onNavigate?: (page: any) => void;
  currentUser?: { name: string; email: string } | null;
}

const STORAGE_KEYS = {
  CLASSES: 'th-class-sections',
  ATTENDANCE: 'th-attendance-records',
  TASKS: 'th-tasks',
  DUTIES: 'th-duties',
  PORTALS: 'th-portal-apps',
  TRAININGS: 'th-trainings',
  ARCHIVES: 'th-rollover-archives',
  ACTIVE_ARCHIVE: 'th-active-rollover-archive',
  CHECKLIST: 'th-new-year-checklist',
  ACADEMIC_YEAR: 'th-current-academic-year',
};

export const AnnualRolloverWizard: React.FC<AnnualRolloverWizardProps> = ({
  onToast,
  onNavigate,
}) => {
  // -------------------------------------------------------------
  // Data Loading & State Initialization
  // -------------------------------------------------------------
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEAR);
      if (saved) return saved;
    } catch {
      // ignore
    }
    return '2026-27';
  });

  const [targetAcademicYear, setTargetAcademicYear] = useState<string>(() => {
    return calculateNextAcademicYear(currentAcademicYear);
  });

  const [currentClassSections, setCurrentClassSections] = useState<ClassSection[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLASSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleClassSections();
  });

  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleAttendanceRecords();
  });

  const [currentTasks, setCurrentTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getInitialTeacherHubTasks();
  });

  const [currentDuties, setCurrentDuties] = useState<Duty[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DUTIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getSampleDuties();
  });

  const [currentPortals, setCurrentPortals] = useState<PortalApp[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PORTALS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_PORTAL_APPS;
  });

  const [currentTrainings, setCurrentTrainings] = useState<TrainingItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRAININGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getInitialTeacherHubTrainings();
  });

  // Archive & Reversibility State
  const [activeArchive, setActiveArchive] = useState<RolloverArchive | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ARCHIVE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [allArchives, setAllArchives] = useState<RolloverArchive[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ARCHIVES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Checklist State
  const [checklist, setChecklist] = useState<NewYearChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CHECKLIST);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getDefaultNewYearChecklist();
  });

  // Wizard active step: 1 (Year), 2 (Students), 3 (Carry-over), 4 (Review/Execute), 5 (Checklist)
  // Or 'archive' mode to browse historical archives
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5 | 'archive'>(() => {
    // If an archive exists and rollover happened, default to Step 5 (checklist)
    if (activeArchive) return 5;
    return 1;
  });

  // Step 2: Student promotion plan
  const [promotionPlan, setPromotionPlan] = useState<StudentPromotionItem[]>(() => {
    return buildInitialPromotionPlan(currentClassSections, 5);
  });

  // Step 2 filter
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Step 3: Carry-over selections
  const { pendingTasks, activePortals, recurringDuties } = useMemo(() => {
    return getCarryOverCandidates(currentTasks, currentPortals, currentDuties);
  }, [currentTasks, currentPortals, currentDuties]);

  const [carryOverTaskIds, setCarryOverTaskIds] = useState<string[]>(() => {
    return pendingTasks.map((t) => t.id);
  });

  const [carryOverPortalIds, setCarryOverPortalIds] = useState<string[]>(() => {
    return activePortals.map((p) => p.id);
  });

  const [carryOverDutyIds, setCarryOverDutyIds] = useState<string[]>(() => {
    return recurringDuties.map((d) => d.id);
  });

  // Archive search query
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [selectedArchiveForView, setSelectedArchiveForView] = useState<RolloverArchive | null>(null);

  // Rollback confirmation modal state
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);

  // Sync checklist when updated
  const saveChecklist = (items: NewYearChecklistItem[]) => {
    setChecklist(items);
    try {
      localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  // Reversibility check
  const reversibility = useMemo(() => {
    return checkRolloverReversibility(activeArchive);
  }, [activeArchive]);

  // Update promotion plan if current classes change
  useEffect(() => {
    if (currentClassSections.length > 0 && promotionPlan.length === 0) {
      setPromotionPlan(buildInitialPromotionPlan(currentClassSections, 5));
    }
  }, [currentClassSections]);

  // Update target year when current academic year changes
  const handleCurrentYearChange = (year: string) => {
    setCurrentAcademicYear(year);
    setTargetAcademicYear(calculateNextAcademicYear(year));
  };

  // -------------------------------------------------------------
  // Step 2 Handlers: Student Promotion
  // -------------------------------------------------------------
  const handleTogglePromoted = (studentId: string) => {
    setPromotionPlan((prev) =>
      prev.map((item) => {
        if (item.studentId !== studentId) return item;
        const newPromoted = !item.isPromoted;
        if (!newPromoted) {
          return {
            ...item,
            isPromoted: false,
            toGrade: item.fromGrade,
            isGraduated: false,
          };
        } else {
          const nextGradeInfo = getNextGrade(item.fromGrade, 5);
          return {
            ...item,
            isPromoted: true,
            toGrade: nextGradeInfo.nextGrade,
            isGraduated: nextGradeInfo.isGraduated,
          };
        }
      })
    );
  };

  const handleBulkPromoteClass = (classId: string | 'all', promote: boolean) => {
    setPromotionPlan((prev) =>
      bulkUpdatePromotionPlan(prev, {
        fromClassSectionId: classId,
        isPromoted: promote,
      })
    );
    onToast(
      promote
        ? '✓ सभी चयनित विद्यार्थियों को अगली कक्षा में प्रोन्नत किया गया'
        : '🔁 विद्यार्थियों को उसी कक्षा में बनाए रखा गया (Retained)'
    );
  };

  const handleChangeTargetSection = (studentId: string, section: string) => {
    setPromotionPlan((prev) =>
      prev.map((item) =>
        item.studentId === studentId ? { ...item, toSection: section } : item
      )
    );
  };

  // Counts for step 2 summary
  const promotionCounts = useMemo(() => {
    let promoted = 0;
    let retained = 0;
    let graduated = 0;
    for (const item of promotionPlan) {
      if (item.isGraduated && item.isPromoted) graduated++;
      else if (item.isPromoted) promoted++;
      else retained++;
    }
    return { promoted, retained, graduated, total: promotionPlan.length };
  }, [promotionPlan]);

  // Filtered promotion list for Step 2 UI
  const filteredPromotionList = useMemo(() => {
    if (selectedClassFilter === 'all') return promotionPlan;
    return promotionPlan.filter(
      (item) => item.fromClassSectionId === selectedClassFilter
    );
  }, [promotionPlan, selectedClassFilter]);

  // -------------------------------------------------------------
  // Step 4: Execute Rollover
  // -------------------------------------------------------------
  const handleExecuteRollover = () => {
    const result = executeAnnualRollover({
      currentAcademicYear,
      targetAcademicYear,
      promotionItems: promotionPlan,
      currentClassSections,
      currentAttendanceRecords: currentAttendance,
      currentTasks,
      currentDuties,
      currentPortals,
      currentTrainings,
      carryOver: {
        taskIds: carryOverTaskIds,
        dutyIds: carryOverDutyIds,
        portalIds: carryOverPortalIds,
      },
      now: new Date(),
      notes: `सत्र ${currentAcademicYear} से ${targetAcademicYear} में सफल स्थानांतरण।`,
    });

    // Save newly formed entities into localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(result.newClassSections));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(result.newAttendanceRecords));
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(result.newTasks));
      localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(result.newDuties));
      localStorage.setItem(STORAGE_KEYS.PORTALS, JSON.stringify(result.newPortals));
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEAR, targetAcademicYear);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ARCHIVE, JSON.stringify(result.archive));

      const updatedArchives = [result.archive, ...allArchives.filter((a) => a.id !== result.archive.id)];
      localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(updatedArchives));

      // Reset default checklist for the new year
      const freshChecklist = getDefaultNewYearChecklist();
      localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(freshChecklist));

      // Update in-memory state
      setCurrentClassSections(result.newClassSections);
      setCurrentAttendance(result.newAttendanceRecords);
      setCurrentTasks(result.newTasks);
      setCurrentDuties(result.newDuties);
      setCurrentPortals(result.newPortals);
      setCurrentAcademicYear(targetAcademicYear);
      setActiveArchive(result.archive);
      setAllArchives(updatedArchives);
      setChecklist(freshChecklist);

      setActiveStep(5);
      onToast(`🎉 सत्र परिवर्तन पूर्ण! नया शैक्षिक सत्र ${targetAcademicYear} सक्रिय हो गया है।`);
    } catch (e) {
      console.error(e);
      onToast('सत्र परिवर्तन सहेजने में त्रुटि हुई।');
    }
  };

  // -------------------------------------------------------------
  // 7-Day Rollback Execution
  // -------------------------------------------------------------
  const handleRollback = () => {
    if (!activeArchive) return;
    const res = rollbackAnnualRollover(activeArchive, new Date());

    if (!res.success) {
      onToast(`❌ ${res.error || 'पूर्ववत करने में असमर्थ'}`);
      setShowRollbackModal(false);
      return;
    }

    try {
      if (res.restoredClassSections) {
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(res.restoredClassSections));
        setCurrentClassSections(res.restoredClassSections);
      }
      if (res.restoredAttendanceRecords) {
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(res.restoredAttendanceRecords));
        setCurrentAttendance(res.restoredAttendanceRecords);
      }
      if (res.restoredTasks) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(res.restoredTasks));
        setCurrentTasks(res.restoredTasks);
      }
      if (res.restoredDuties) {
        localStorage.setItem(STORAGE_KEYS.DUTIES, JSON.stringify(res.restoredDuties));
        setCurrentDuties(res.restoredDuties);
      }
      if (res.restoredPortals) {
        localStorage.setItem(STORAGE_KEYS.PORTALS, JSON.stringify(res.restoredPortals));
        setCurrentPortals(res.restoredPortals);
      }
      if (res.restoredAcademicYear) {
        localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEAR, res.restoredAcademicYear);
        setCurrentAcademicYear(res.restoredAcademicYear);
      }

      // Remove active archive and remove from archive list
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ARCHIVE);
      const remainingArchives = allArchives.filter((a) => a.id !== activeArchive.id);
      localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(remainingArchives));

      setActiveArchive(null);
      setAllArchives(remainingArchives);
      setShowRollbackModal(false);
      setActiveStep(1);

      onToast(`↩️ सत्र रोलओवर सफलतापूर्वक पूर्ववत कर दिया गया। सत्र ${res.restoredAcademicYear} पुनः सक्रिय है।`);
    } catch (e) {
      console.error(e);
      onToast('रोलओवर पूर्ववत करने में त्रुटि हुई।');
    }
  };

  // Lock archive permanently
  const handleManualLock = () => {
    if (!activeArchive) return;
    const lockedArchive: RolloverArchive = {
      ...activeArchive,
      isManuallyLocked: true,
    };

    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ARCHIVE, JSON.stringify(lockedArchive));
      const updated = allArchives.map((a) => (a.id === lockedArchive.id ? lockedArchive : a));
      localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(updated));
      setActiveArchive(lockedArchive);
      setAllArchives(updated);
      setShowLockModal(false);
      onToast('🔒 सत्र को अंतिम रूप से स्थायी लॉक कर दिया गया है।');
    } catch {
      onToast('त्रुटि हुई');
    }
  };

  // -------------------------------------------------------------
  // Step 5: Checklist Toggle
  // -------------------------------------------------------------
  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map((item) => {
      if (item.id === id) {
        const nextState = !item.isCompleted;
        return {
          ...item,
          isCompleted: nextState,
          completedAt: nextState ? new Date().toISOString() : undefined,
        };
      }
      return item;
    });
    saveChecklist(updated);
  };

  const checklistStats = useMemo(() => {
    const total = checklist.length;
    const completed = checklist.filter((c) => c.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [checklist]);

  // Archive search results
  const archiveToSearch = selectedArchiveForView || activeArchive || allArchives[0] || null;
  const archiveSearchResults = useMemo(() => {
    if (!archiveToSearch) return null;
    return searchArchive(archiveToSearch, archiveSearchQuery);
  }, [archiveToSearch, archiveSearchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ========================================================= */}
        {/* TOP HEADER & TITLE                                       */}
        {/* ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-800 to-emerald-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-teal-700/50">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-200">
              <span>📅 शैक्षिक सत्र प्रबंधन / Annual Academic Management</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-100 border border-teal-400/40 text-[11px]">
                सत्र: {currentAcademicYear}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1 flex items-center gap-2">
              <span>🔄</span>
              <span>वार्षिक सत्र परिवर्तन विजार्ड (Annual Session Rollover)</span>
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1">
              शैक्षिक सत्र पूर्ण होने पर छात्र प्रोन्नति, पेंडिंग कार्य कैरी-ओवर, पुराना सत्र अभिलेखागार एवं नए सत्र की चेकलिस्ट।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeStep === 'archive') setActiveStep(1);
                else setActiveStep('archive');
              }}
              className={`py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm border transition-all flex items-center gap-2 ${
                activeStep === 'archive'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <span>📂</span>
              <span>{activeStep === 'archive' ? 'विजार्ड पर लौटें' : 'पुराना अभिलेखागार (Archives)'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('classes');
                else window.location.hash = '#classes';
              }}
              className="py-2 px-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2"
            >
              <span>📚</span>
              <span>कक्षाएं व उपस्थिति (My Classes)</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 7-DAY REVERSIBLE GRACE PERIOD BANNER                     */}
        {/* ========================================================= */}
        {activeArchive && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
              reversibility.canRollback
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">
                {reversibility.canRollback ? '⏳' : '🔒'}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-sm sm:text-base">
                    सत्र रोलओवर स्थिति: {activeArchive.fromAcademicYear} → {activeArchive.toAcademicYear}
                  </h2>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      reversibility.canRollback
                        ? 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {reversibility.formattedRemaining}
                  </span>
                </div>
                <p className="text-xs sm:text-sm mt-1 opacity-90">
                  {reversibility.canRollback
                    ? `यह रोलओवर 7 दिनों के अनुमेय काल (Grace Period) में है। यदि कोई त्रुटि हुई हो, तो आप इसे ${activeArchive.fromAcademicYear} में पूर्ववत (Rollback) कर सकते हैं।`
                    : 'इस सत्र का रोलओवर 7 दिन पूर्ण होने या मैनुअल लॉक होने के कारण स्थायी रूप से संरक्षित कर दिया गया है।'}
                </p>
              </div>
            </div>

            {reversibility.canRollback && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRollbackModal(true)}
                  className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <span>↩️</span>
                  <span>पूर्ववत करें (Rollback)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLockModal(true)}
                  className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-600 transition-all flex items-center gap-1"
                  title="7 दिन से पहले ही स्थायी रूप से लॉक करें"
                >
                  <span>🔒</span>
                  <span>अंतिम लॉक करें</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEPPER BAR (STEPS 1 - 5)                                 */}
        {/* ========================================================= */}
        {activeStep !== 'archive' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-5 gap-1 sm:gap-2">
              {[
                { step: 1, labelHi: 'सत्र चयन', labelEn: '1. Years', icon: '📅' },
                { step: 2, labelHi: 'कक्षा प्रोन्नति', labelEn: '2. Promote', icon: '🎓' },
                { step: 3, labelHi: 'कैरी-ओवर', labelEn: '3. Carry-over', icon: '📦' },
                { step: 4, labelHi: 'पुष्टि व निष्पादन', labelEn: '4. Execute', icon: '🚀' },
                { step: 5, labelHi: 'नवीन चेकलिस्ट', labelEn: '5. Checklist', icon: '📋' },
              ].map((item) => {
                const isCurrent = activeStep === item.step;
                const isPassed = typeof activeStep === 'number' && activeStep > item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setActiveStep(item.step as any)}
                    className={`flex flex-col items-center justify-center py-2 px-1 sm:px-2 rounded-xl text-center transition-all min-h-[56px] ${
                      isCurrent
                        ? 'bg-teal-600 text-white font-bold shadow-md scale-[1.02]'
                        : isPassed
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-base sm:text-lg">
                      {isPassed ? '✓' : item.icon}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold leading-tight mt-0.5 line-clamp-1">
                      {item.labelHi}
                    </span>
                    <span className="text-[9px] sm:text-[10px] opacity-80 hidden sm:block">
                      {item.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: SELECT ACADEMIC YEARS                            */}
        {/* ========================================================= */}
        {activeStep === 1 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>📅</span>
                <span>चरण 1: वर्तमान शैक्षिक सत्र व नवीन शैक्षिक सत्र चुनें</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                वर्तमान सत्र से अगले सत्र में डेटा ट्रांसफर के लिए प्रारंभिक वर्ष निर्दिष्ट करें।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Year Selection */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  वर्तमान शैक्षिक सत्र (Current Academic Year)
                </label>
                <div className="flex gap-2">
                  <select
                    value={currentAcademicYear}
                    onChange={(e) => handleCurrentYearChange(e.target.value)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold"
                  >
                    <option value="2025-26">2025-26</option>
                    <option value="2026-27">2026-27</option>
                    <option value="2027-28">2027-28</option>
                    <option value="2028-29">2028-29</option>
                  </select>
                  <input
                    type="text"
                    value={currentAcademicYear}
                    onChange={(e) => handleCurrentYearChange(e.target.value)}
                    placeholder="कस्टम सत्र e.g. 2026-27"
                    className="w-32 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p>• कुल नामांकित कक्षाएं: <span className="font-bold text-slate-700 dark:text-slate-200">{currentClassSections.length}</span></p>
                  <p>• कुल छात्र संख्या: <span className="font-bold text-slate-700 dark:text-slate-200">{promotionPlan.length}</span></p>
                </div>
              </div>

              {/* Target New Year Selection */}
              <div className="bg-teal-50 dark:bg-teal-950/30 p-5 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-3">
                <label className="block text-sm font-bold text-teal-900 dark:text-teal-200">
                  आगामी नया शैक्षिक सत्र (Target New Academic Year)
                </label>
                <div className="flex gap-2">
                  <select
                    value={targetAcademicYear}
                    onChange={(e) => setTargetAcademicYear(e.target.value)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-sm font-bold text-teal-800 dark:text-teal-200"
                  >
                    <option value="2026-27">2026-27</option>
                    <option value="2027-28">2027-28</option>
                    <option value="2028-29">2028-29</option>
                    <option value="2029-30">2029-30</option>
                  </select>
                  <input
                    type="text"
                    value={targetAcademicYear}
                    onChange={(e) => setTargetAcademicYear(e.target.value)}
                    placeholder="e.g. 2027-28"
                    className="w-32 py-2.5 px-3 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
                <p className="text-xs text-teal-700 dark:text-teal-300">
                  ✓ सत्र परिवर्तन के उपरांत सभी सक्रिय रिकॉर्ड इस नए सत्र में स्थानांतरित हो जाएंगे।
                </p>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="py-3 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <span>आगे बढ़ें: कक्षा प्रोन्नति (Step 2)</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: PROMOTE / CHANGE CLASS SECTIONS                   */}
        {/* ========================================================= */}
        {activeStep === 2 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>🎓</span>
                <span>चरण 2: छात्र प्रोन्नति व कक्षा परिवर्तन सूची (Student Promotion & Sections)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                प्रत्येक विद्यार्थी को अगली कक्षा में प्रोन्नत करें। किसी छात्र को उसी कक्षा में रखने हेतु चेकबॉक्स अनचेक करें।
              </p>
            </div>

            {/* Metrics Chips & Quick Bulk Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">कुल छात्र संख्या</span>
                <p className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100">{promotionCounts.total}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">प्रोन्नत (Promoted)</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">{promotionCounts.promoted}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">उसी कक्षा में (Retained)</span>
                <p className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-100">{promotionCounts.retained}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">उत्तीर्ण/अलुमनाई (Graduated)</span>
                <p className="text-xl sm:text-2xl font-black text-purple-900 dark:text-purple-100">{promotionCounts.graduated}</p>
              </div>
            </div>

            {/* Bulk Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">कक्षा अनुसार देखें:</span>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="all">सभी कक्षाएं ({promotionPlan.length} छात्र)</option>
                  {currentClassSections.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.grade} - {cs.section} ({cs.students.length} छात्र)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkPromoteClass(selectedClassFilter, true)}
                  className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1"
                >
                  <span>✓</span>
                  <span>सभी प्रोन्नत करें (Bulk Promote)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkPromoteClass(selectedClassFilter, false)}
                  className="py-1.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1"
                >
                  <span>🔁</span>
                  <span>पूर्ववत रखें (Retain All)</span>
                </button>
              </div>
            </div>

            {/* Student Promotion Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">प्रोन्नत?</th>
                    <th className="py-3 px-3">छात्र का नाम (Name)</th>
                    <th className="py-3 px-3">सत्र {currentAcademicYear} (वर्तमान)</th>
                    <th className="py-3 px-3">सत्र {targetAcademicYear} (आगामी कक्षा)</th>
                    <th className="py-3 px-3">सेक्शन</th>
                    <th className="py-3 px-3 text-right">स्थिति</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredPromotionList.map((item) => (
                    <tr
                      key={item.studentId}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                        !item.isPromoted ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.isPromoted}
                          onChange={() => handleTogglePromoted(item.studentId)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {item.gender && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {item.gender === 'M' ? 'बालक' : 'बालिका'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          रोल नं: {item.originalRollNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">
                          {item.fromGrade} - {item.fromSection}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold flex items-center gap-1.5">
                          {item.isGraduated ? (
                            <span className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs border border-purple-200 dark:border-purple-800">
                              🎓 {item.toGrade}
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                              item.isPromoted
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {item.toGrade}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.toSection}
                          onChange={(e) => handleChangeTargetSection(item.studentId, e.target.value)}
                          disabled={item.isGraduated}
                          className="py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.isGraduated ? (
                          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                            प्राथमिक पूर्ण (Alumni)
                          </span>
                        ) : item.isPromoted ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            प्रोन्नत (Promoted)
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            उसी कक्षा में (Retained)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Step 2 Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="py-2.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold text-xs sm:text-sm transition-all"
              >
                ← पिछला चरण (Step 1)
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="py-3 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <span>आगे बढ़ें: कैरी-ओवर चयन (Step 3)</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: CARRY OVER PENDING TASKS, PORTALS, & DUTIES       */}
        {/* ========================================================= */}
        {activeStep === 3 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>📦</span>
                <span>चरण 3: पेंडिंग कार्य, पोर्टल व आवर्ती दायित्व कैरी-ओवर (Carry Over Selection)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                चुनें कि सत्र {currentAcademicYear} से कौन-से अपूर्ण कार्य, विभागीय पोर्टल एवं साप्ताहिक दायित्व नए सत्र {targetAcademicYear} में ले जाने हैं।
              </p>
            </div>

            {/* 1. Pending Tasks Carry-over */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <span>📝</span>
                  <span>अपूर्ण कार्य (Pending Tasks) ({carryOverTaskIds.length}/{pendingTasks.length} चयनित)</span>
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCarryOverTaskIds(pendingTasks.map((t) => t.id))}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold"
                  >
                    सभी चुनें
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setCarryOverTaskIds([])}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    खाली करें
                  </button>
                </div>
              </div>

              {pendingTasks.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">कोई पेंडिंग कार्य शेष नहीं है।</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
                  {pendingTasks.map((task) => {
                    const isSelected = carryOverTaskIds.includes(task.id);
                    return (
                      <label
                        key={task.id}
                        className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setCarryOverTaskIds((prev) => prev.filter((id) => id !== task.id));
                            } else {
                              setCarryOverTaskIds((prev) => [...prev, task.id]);
                            }
                          }}
                          className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span className="capitalize">{task.type}</span>
                            {task.deadline && (
                              <span>• अंतिम तिथि: {task.deadline.split('T')[0]}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Portals Carry-over */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <span>🌐</span>
                  <span>विभागीय पोर्टल व ऐप्स (Portals) ({carryOverPortalIds.length}/{activePortals.length} चयनित)</span>
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCarryOverPortalIds(activePortals.map((p) => p.id))}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold"
                  >
                    सभी चुनें
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setCarryOverPortalIds([])}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    खाली करें
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {activePortals.map((portal) => {
                  const isSelected = carryOverPortalIds.includes(portal.id);
                  return (
                    <label
                      key={portal.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setCarryOverPortalIds((prev) => prev.filter((id) => id !== portal.id));
                          } else {
                            setCarryOverPortalIds((prev) => [...prev, portal.id]);
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {portal.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Recurring Duties Carry-over */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <span>🛡️</span>
                  <span>साप्ताहिक व आवर्ती दायित्व (Recurring Duties) ({carryOverDutyIds.length}/{recurringDuties.length} चयनित)</span>
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCarryOverDutyIds(recurringDuties.map((d) => d.id))}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold"
                  >
                    सभी चुनें
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setCarryOverDutyIds([])}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    खाली करें
                  </button>
                </div>
              </div>

              {recurringDuties.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">कोई आवर्ती दायित्व नहीं मिला।</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {recurringDuties.map((duty) => {
                    const isSelected = carryOverDutyIds.includes(duty.id);
                    return (
                      <label
                        key={duty.id}
                        className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setCarryOverDutyIds((prev) => prev.filter((id) => id !== duty.id));
                            } else {
                              setCarryOverDutyIds((prev) => [...prev, duty.id]);
                            }
                          }}
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                            {duty.dutyName}
                          </p>
                          <span className="text-[11px] text-slate-500">
                            प्रकार: {duty.category.toUpperCase()} • {duty.assignedBy}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3 Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="py-2.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold text-xs sm:text-sm transition-all"
              >
                ← पिछला चरण (Step 2)
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="py-3 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <span>आगे बढ़ें: समीक्षा व निष्पादन (Step 4)</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: REVIEW & EXECUTE (WITH 7-DAY REVERSIBLE NOTICE)   */}
        {/* ========================================================= */}
        {activeStep === 4 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span>🚀</span>
                <span>चरण 4: अंतिम समीक्षा एवं सत्र परिवर्तन निष्पादन (Execution & Archival)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                कृपया सत्र परिवर्तन से पूर्व विवरण की समीक्षा करें। पुराना सत्र {currentAcademicYear} सुरक्षित रूप से केवल-पठनीय (Read-Only) अभिलेखागार में संग्रहीत हो जाएगा।
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase">शैक्षिक सत्र अंतरण</span>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {currentAcademicYear} ➔ {targetAcademicYear}
                </p>
                <p className="text-xs text-slate-500">
                  वर्तमान सत्र के सभी रजिस्टर व उपस्थिति को अभिलेखागार में संजोया जाएगा।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">छात्र प्रोन्नति विवरण</span>
                <p className="text-lg font-black text-emerald-800 dark:text-emerald-200">
                  {promotionCounts.promoted} प्रोन्नत • {promotionCounts.retained} उसी कक्षा में
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {promotionCounts.graduated} छात्र प्राथमिक उत्तीर्ण (Alumni/Graduated)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">कैरी-ओवर विवरण</span>
                <p className="text-lg font-black text-blue-800 dark:text-blue-200">
                  {carryOverTaskIds.length} कार्य • {carryOverPortalIds.length} पोर्टल • {carryOverDutyIds.length} दायित्व
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  चयनित पेंडिंग कार्य नए सत्र में नए स्रोतों के साथ स्थानांतरित होंगे।
                </p>
              </div>
            </div>

            {/* Reversibility Notice Card */}
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <span className="text-xl">⚠️</span>
                <span>7-दिवसीय पूर्णतः पूर्ववत करने योग्य गारंटी (7-Day Reversibility Guarantee)</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed opacity-95">
                सत्र परिवर्तन संपन्न होने के बाद, आपके पास पूरे <strong>7 दिन</strong> का समय रहेगा। यदि कक्षा या छात्र प्रोन्नति में कोई त्रुटि पाई जाती है, तो आप <strong>&apos;सत्र पूर्ववत करें (Rollback)&apos;</strong> बटन दबाकर पुराने सत्र {currentAcademicYear} को उसकी मूल स्थिति में वापस पा सकते हैं।
              </p>
            </div>

            {/* Step 4 Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="py-2.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold text-xs sm:text-sm transition-all"
              >
                ← पिछला चरण (Step 3)
              </button>

              <button
                type="button"
                onClick={handleExecuteRollover}
                className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 active:scale-95"
              >
                <span>🚀</span>
                <span>सत्र परिवर्तन संपन्न करें (Complete Rollover)</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 5: NEW ACADEMIC YEAR SETUP CHECKLIST                 */}
        {/* ========================================================= */}
        {activeStep === 5 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                    सत्र {currentAcademicYear} सक्रिय
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <span>📋</span>
                    <span>चरण 5: नवीन शैक्षिक सत्र तैयारी चेकलिस्ट (New Year Checklist)</span>
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  नए शैक्षिक सत्र में किए जाने वाले अनिवार्य विद्यालयी कार्यों की चेकलिस्ट। प्रत्येक कार्य पूर्ण होने पर टिक करें।
                </p>
              </div>

              {/* Progress Pill */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 py-2 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">प्रगति (Progress)</span>
                  <span className="text-sm font-black text-teal-600 dark:text-teal-400">
                    {checklistStats.completed}/{checklistStats.total} ({checklistStats.percentage}%)
                  </span>
                </div>
                <div className="w-12 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-500"
                    style={{ width: `${checklistStats.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Checklist Items List */}
            <div className="space-y-3">
              {checklist.map((item) => {
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                      item.isCompleted
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-teal-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => {}} // Handled by container onClick
                      className="mt-1 w-5 h-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm sm:text-base font-bold ${
                            item.isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {item.titleHi}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase">
                          {item.category}
                        </span>

                        {item.priority === 'high' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                            अनिवार्य
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item.titleEn}
                      </p>

                      {item.note && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 font-medium bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl inline-block border border-slate-200/50 dark:border-slate-700/50">
                          📌 {item.note}
                        </p>
                      )}

                      {item.completedAt && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">
                          ✓ पूर्ण किया गया: {new Date(item.completedAt).toLocaleDateString('hi-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 5 Footbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveStep('archive')}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5"
              >
                <span>📂</span>
                <span>अभिलेखागार में पिछला रिकॉर्ड खोजें</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate('classes');
                  else window.location.hash = '#classes';
                }}
                className="py-3 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <span>📚</span>
                <span>मेरी कक्षाएं एवं उपस्थिति पर जाएं</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ARCHIVE BROWSER & SEARCH MODE (READ-ONLY)                 */}
        {/* ========================================================= */}
        {activeStep === 'archive' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-800">
                    🔒 केवल-पठनीय अभिलेखागार (Read-Only Archive)
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mt-1">
                  <span>📂</span>
                  <span>पुराने शैक्षिक सत्रों का अभिलेखागार व खोज</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  पूर्व सत्रों के छात्रों का विवरण, अनुक्रमांक, कक्षाएं एवं कार्य सुरक्षित हैं और आवश्यकतानुसार खोजे जा सकते हैं।
                </p>
              </div>

              {/* Archive Year Selector */}
              {allArchives.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">सत्र चुनें:</span>
                  <select
                    value={archiveToSearch?.id || ''}
                    onChange={(e) => {
                      const found = allArchives.find((a) => a.id === e.target.value);
                      if (found) setSelectedArchiveForView(found);
                    }}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    {allArchives.map((arch) => (
                      <option key={arch.id} value={arch.id}>
                        सत्र {arch.fromAcademicYear} (रोलओवर {new Date(arch.rolloverDate).toLocaleDateString('hi-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* If no archives yet */}
            {!archiveToSearch ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-4xl">📭</span>
                <p className="font-bold text-slate-600 dark:text-slate-300">
                  वर्तमान में कोई पुराना सत्र अभिलेखागार में उपलब्ध नहीं है।
                </p>
                <p className="text-xs text-slate-400">
                  जब आप &apos;वार्षिक सत्र परिवर्तन विजार्ड&apos; पूर्ण करेंगे, तो पुराना सत्र यहाँ सुरक्षित हो जाएगा।
                </p>
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="py-2.5 px-5 rounded-2xl bg-teal-600 text-white font-bold text-xs"
                >
                  सत्र परिवर्तन प्रारंभ करें
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 text-base">🔍</span>
                  <input
                    type="text"
                    value={archiveSearchQuery}
                    onChange={(e) => setArchiveSearchQuery(e.target.value)}
                    placeholder="छात्र का नाम, अनुक्रमांक, कक्षा या कार्य खोजें... (Search by student name, roll no, task)"
                    className="w-full py-3 pl-11 pr-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Search Results / Archive Views */}
                {archiveSearchResults && (
                  <div className="space-y-5">
                    {/* 1. Matched Students */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span>👨‍🎓</span>
                        <span>
                          अभिलेखीय छात्र ({archiveSearchResults.matchedStudents.length} परिणाम)
                        </span>
                      </h3>

                      {archiveSearchResults.matchedStudents.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">कोई छात्र मैच नहीं हुआ।</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {archiveSearchResults.matchedStudents.map(({ student, classGrade, section, academicYear }) => (
                            <div
                              key={student.id}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3"
                            >
                              <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                {student.rollNumber}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                  {student.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {classGrade} - {section} • सत्र {academicYear}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 2. Matched Classes */}
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span>🏫</span>
                        <span>
                          अभिलेखीय कक्षाएं ({archiveSearchResults.matchedClasses.length} कक्षाएं)
                        </span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {archiveSearchResults.matchedClasses.map((cs) => (
                          <div
                            key={cs.id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                {cs.grade} - {cs.section}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {cs.students.length} छात्र
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              विषय: {cs.subject} • सत्र {cs.academicYear}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. Matched Tasks */}
                    {archiveSearchResults.matchedTasks.length > 0 && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <span>📝</span>
                          <span>अभिलेखीय कार्य ({archiveSearchResults.matchedTasks.length})</span>
                        </h3>
                        <div className="space-y-2">
                          {archiveSearchResults.matchedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {task.title}
                              </span>
                              <span className="text-slate-400">
                                स्थिति: {task.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ROLLBACK CONFIRMATION MODAL                               */}
        {/* ========================================================= */}
        {showRollbackModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 font-black text-2xl flex items-center justify-center">
                ↩️
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  क्या आप सत्र रोलओवर पूर्ववत (Rollback) करना चाहते हैं?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  यह कार्रवाई नए सत्र के डेटा को निरस्त कर देगी और अभिलेखागार से मूल सत्र <strong>{activeArchive?.fromAcademicYear}</strong> के सभी छात्र रिकॉर्ड, कक्षाएं, उपस्थिति एवं कार्य को पूर्व स्थिति में पुनर्स्थापित कर देगी।
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                ⏳ 7-दिवसीय अनुमेय काल में यह क्रिया पूर्णतः सुरक्षित एवं प्राधिकृत है।
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRollbackModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold transition-all"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleRollback}
                  className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  हां, पूर्ववत करें (Confirm Rollback)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MANUAL LOCK CONFIRMATION MODAL                            */}
        {/* ========================================================= */}
        {showLockModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 font-black text-2xl flex items-center justify-center">
                🔒
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  सत्र को अंतिम रूप से लॉक करें? (Lock Permanently)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  लॉक करने के बाद 7-दिन का पूर्ववत काल समाप्त हो जाएगा और पुराना सत्र स्थायी अभिलेख बन जाएगा। क्या आप आश्वस्त हैं?
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLockModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold transition-all"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleManualLock}
                  className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  हां, स्थायी लॉक करें (Lock Now)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
