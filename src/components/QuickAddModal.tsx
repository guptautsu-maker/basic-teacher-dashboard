import React, { useState } from 'react';
import { Task, TaskPriority, TaskType, RecurrenceFrequency, createNewTask } from '../utils/taskStatusSystem';
import { MeetingItem, TrainingItem } from '../data/teacherHubSampleData';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'task' | 'meeting' | 'training';
  onAddTask: (task: Task) => void;
  onAddMeeting: (meeting: MeetingItem) => void;
  onAddTraining: (training: TrainingItem) => void;
  onToast: (msg: string) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'task',
  onAddTask,
  onAddMeeting,
  onAddTraining,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'task' | 'meeting' | 'training'>(initialTab);

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('portal_entry');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('urgent');
  const [taskSource, setTaskSource] = useState('Prerna App');
  const [taskDeadlineDate, setTaskDeadlineDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [taskDeadlineTime, setTaskDeadlineTime] = useState('17:00');
  const [taskRecurrence, setTaskRecurrence] = useState<RecurrenceFrequency>('none');
  const [taskDescription, setTaskDescription] = useState('');

  // Meeting form state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [meetingTime, setMeetingTime] = useState('02:00 PM - 03:00 PM');
  const [meetingMode, setMeetingMode] = useState<'offline' | 'online'>('offline');
  const [meetingLocation, setMeetingLocation] = useState('विद्यालय कक्ष / School Hall');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingOrganizedBy, setMeetingOrganizedBy] = useState('प्रधानाध्यापक / Headmaster');

  // Training form state
  const [trainingName, setTrainingName] = useState('');
  const [trainingProvider, setTrainingProvider] = useState('DIKSHA Portal');
  const [trainingHours, setTrainingHours] = useState('4');
  const [trainingDueDate, setTrainingDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [trainingCert, setTrainingCert] = useState(true);
  const [trainingLink, setTrainingLink] = useState('https://diksha.gov.in');

  if (!isOpen) return null;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      onToast('कृपया कार्य का शीर्षक दर्ज करें / Please enter task title');
      return;
    }

    let deadlineIso: string | undefined;
    if (taskDeadlineDate) {
      const timePart = taskDeadlineTime || '17:00';
      deadlineIso = new Date(`${taskDeadlineDate}T${timePart}:00`).toISOString();
    }

    const { task } = createNewTask({
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      type: taskType,
      source: taskSource,
      priority: taskPriority,
      status: 'not_started',
      deadline: deadlineIso,
      recurrence: taskRecurrence,
      createdBy: 'शिक्षक / Teacher',
    });

    onAddTask(task);
    onToast(`नया कार्य जोड़ा गया: ${task.title}`);
    resetAndClose();
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) {
      onToast('कृपया बैठक का शीर्षक दर्ज करें / Please enter meeting title');
      return;
    }

    const newMeeting: MeetingItem = {
      id: `meet_${Date.now()}`,
      title: meetingTitle.trim(),
      date: meetingDate,
      time: meetingTime.trim() || '11:00 AM',
      mode: meetingMode,
      locationOrLink: meetingLocation.trim() || (meetingMode === 'online' ? 'Google Meet' : 'School'),
      agenda: meetingAgenda.trim() || 'सामान्य समीक्षा एवं योजना',
      organizedBy: meetingOrganizedBy.trim() || 'प्रधानाध्यापक',
      status: 'scheduled',
    };

    onAddMeeting(newMeeting);
    onToast(`नई बैठक जोड़ी गई: ${newMeeting.title}`);
    resetAndClose();
  };

  const handleCreateTraining = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingName.trim()) {
      onToast('कृपया प्रशिक्षण का नाम दर्ज करें / Please enter training name');
      return;
    }

    const newTraining: TrainingItem = {
      id: `tr_${Date.now()}`,
      name: trainingName.trim(),
      provider: trainingProvider.trim() || 'DIKSHA',
      hours: Number(trainingHours) || 2,
      dueDate: trainingDueDate,
      status: 'not_started',
      progressPercent: 0,
      certificateRequired: trainingCert,
      link: trainingLink.trim() || 'https://diksha.gov.in',
    };

    onAddTraining(newTraining);
    onToast(`नया प्रशिक्षण जोड़ा गया: ${newTraining.name}`);
    resetAndClose();
  };

  const resetAndClose = () => {
    setTaskTitle('');
    setTaskDescription('');
    setMeetingTitle('');
    setMeetingAgenda('');
    setTrainingName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] w-full max-w-xl rounded-2xl border border-[#00F5D4]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between bg-gradient-to-r from-[#0D5B49]/10 to-transparent">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#0D5B49] text-white flex items-center justify-center text-xl shadow-md font-bold">
              ⚡
            </span>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                नया जोड़ें / Quick Add
              </h3>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                कार्य, बैठक अथवा प्रशिक्षण तुरंत दर्ज करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher - Big Touch Targets */}
        <div className="grid grid-cols-3 p-2 bg-[#F1F5F2] dark:bg-[#0A0E27] gap-2 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
          <button
            type="button"
            onClick={() => setActiveTab('task')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all shadow-sm ${
              activeTab === 'task'
                ? 'bg-[#0D5B49] text-white shadow-md'
                : 'bg-white dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
            }`}
          >
            <span className="text-base">📝</span>
            <span>+ कार्य (Task)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('meeting')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all shadow-sm ${
              activeTab === 'meeting'
                ? 'bg-[#9B5DE5] text-white shadow-md'
                : 'bg-white dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
            }`}
          >
            <span className="text-base">👥</span>
            <span>+ बैठक (Meeting)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('training')}
            className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all shadow-sm ${
              activeTab === 'training'
                ? 'bg-[#00B39B] text-white shadow-md'
                : 'bg-white dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
            }`}
          >
            <span className="text-base">🎓</span>
            <span>+ प्रशिक्षण (Training)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'task' && (
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                  कार्य का नाम / Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="उदा. MDM राशन सत्यापन, प्रेरणा छात्र उपस्थिति..."
                  className="w-full px-4 py-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    कार्य प्रकार / Category
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as TaskType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  >
                    <option value="portal_entry">🌐 पोर्टल प्रविष्टि (Portal Entry)</option>
                    <option value="attendance">📋 उपस्थिति (Attendance)</option>
                    <option value="mdm">🍲 मध्याह्न भोजन (MDM)</option>
                    <option value="training">🎓 प्रशिक्षण (Training)</option>
                    <option value="duty">🎖️ विशेष ड्यूटी (Duty / Election)</option>
                    <option value="meeting">👥 बैठक (Meeting)</option>
                    <option value="govt_order">📜 शासनादेश अनुपालन (Order)</option>
                    <option value="general">📌 सामान्य कार्य (General)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    प्राथमिकता / Urgency
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  >
                    <option value="urgent">🔴 अति आवश्यक (Urgent)</option>
                    <option value="high">🟠 उच्च (High)</option>
                    <option value="medium">🟡 सामान्य (Medium)</option>
                    <option value="low">🟢 कम (Low)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    स्रोत / Portal / Source
                  </label>
                  <input
                    type="text"
                    value={taskSource}
                    onChange={(e) => setTaskSource(e.target.value)}
                    placeholder="उदा. Prerna App, UDISE+, DIKSHA, BSA"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    पुनरावृत्ति / Recurrence
                  </label>
                  <select
                    value={taskRecurrence}
                    onChange={(e) => setTaskRecurrence(e.target.value as RecurrenceFrequency)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  >
                    <option value="none">एक बार (One-time)</option>
                    <option value="daily">दैनिक (Daily - हर दिन)</option>
                    <option value="weekly">साप्ताहिक (Weekly - हर हफ्ते)</option>
                    <option value="monthly">मासिक (Monthly - हर महीने)</option>
                    <option value="yearly">वार्षिक (Yearly - हर साल)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    अंतिम तिथि / Deadline Date
                  </label>
                  <input
                    type="date"
                    value={taskDeadlineDate}
                    onChange={(e) => setTaskDeadlineDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    समय / Deadline Time
                  </label>
                  <input
                    type="time"
                    value={taskDeadlineTime}
                    onChange={(e) => setTaskDeadlineTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                  विवरण / टिप्पणियां (वैकल्पिक)
                </label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="अतिरिक्त निर्देश या आवश्यक प्रपत्र..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/5"
                >
                  रद्द करें / Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#0D5B49] text-white font-bold text-sm shadow-lg shadow-[#0D5B49]/30 hover:bg-[#00B39B] transition-all flex items-center justify-center gap-2"
                >
                  <span>✓ कार्य सहेजें / Save Task</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'meeting' && (
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                  बैठक का नाम / Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="उदा. SMC बैठक, संकुल शिक्षक मीटिंग, BRC गुरु-गोष्ठी..."
                  className="w-full px-4 py-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#9B5DE5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    दिनांक / Date
                  </label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    समय / Time Slot
                  </label>
                  <input
                    type="text"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    placeholder="उदा. 02:00 PM - 03:30 PM"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    माध्यम / Mode
                  </label>
                  <select
                    value={meetingMode}
                    onChange={(e) => setMeetingMode(e.target.value as 'offline' | 'online')}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  >
                    <option value="offline">🏫 ऑफलाइन / भौतिक उपस्थिति (Offline)</option>
                    <option value="online">💻 ऑनलाइन (Google Meet / Zoom)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    स्थान अथवा लिंक / Location or Link
                  </label>
                  <input
                    type="text"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    placeholder={meetingMode === 'online' ? 'https://meet.google.com/...' : 'विद्यालय कक्ष / BRC'}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                  एजेंडा / मुख्य विषय / Agenda
                </label>
                <textarea
                  rows={2}
                  value={meetingAgenda}
                  onChange={(e) => setMeetingAgenda(e.target.value)}
                  placeholder="चर्चा के मुख्य बिंदु..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                  आयोजक / Organized By
                </label>
                <input
                  type="text"
                  value={meetingOrganizedBy}
                  onChange={(e) => setMeetingOrganizedBy(e.target.value)}
                  placeholder="उदा. प्रधानाध्यापक / BEO / ARP"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/5"
                >
                  रद्द करें / Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#9B5DE5] text-white font-bold text-sm shadow-lg shadow-[#9B5DE5]/30 hover:bg-[#8338EC] transition-all flex items-center justify-center gap-2"
                >
                  <span>✓ बैठक जोड़ें / Save Meeting</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'training' && (
            <form onSubmit={handleCreateTraining} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                  प्रशिक्षण का नाम / Training Name *
                </label>
                <input
                  type="text"
                  required
                  value={trainingName}
                  onChange={(e) => setTrainingName(e.target.value)}
                  placeholder="उदा. निपुण भारत FLN 3.0, निष्ठा 4.0, ICT शिक्षण..."
                  className="w-full px-4 py-3 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-[#13231C] dark:text-[#E7F0EA] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#00B39B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    संस्था / Provider
                  </label>
                  <input
                    type="text"
                    value={trainingProvider}
                    onChange={(e) => setTrainingProvider(e.target.value)}
                    placeholder="उदा. DIKSHA, SCERT, DIET, NCERT"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    अवधि (घंटे) / Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={trainingHours}
                    onChange={(e) => setTrainingHours(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    अंतिम तिथि / Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={trainingDueDate}
                    onChange={(e) => setTrainingDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#52645B] dark:text-[#9DB0A5]">
                    प्रशिक्षण लिंक / Link
                  </label>
                  <input
                    type="text"
                    value={trainingLink}
                    onChange={(e) => setTrainingLink(e.target.value)}
                    placeholder="https://diksha.gov.in/..."
                    className="w-full px-3 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#1E2E26] text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34]">
                <input
                  type="checkbox"
                  id="certToggle"
                  checked={trainingCert}
                  onChange={(e) => setTrainingCert(e.target.checked)}
                  className="w-5 h-5 rounded text-[#0D5B49] focus:ring-[#0D5B49]"
                />
                <label htmlFor="certToggle" className="text-xs sm:text-sm font-semibold cursor-pointer">
                  प्रमाणपत्र अनिवार्य है / Certificate required for service record
                </label>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/5"
                >
                  रद्द करें / Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#00B39B] text-white font-bold text-sm shadow-lg shadow-[#00B39B]/30 hover:bg-[#0D5B49] transition-all flex items-center justify-center gap-2"
                >
                  <span>✓ प्रशिक्षण जोड़ें / Save Training</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
