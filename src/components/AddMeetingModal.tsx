import React, { useState, useEffect, useMemo } from 'react';
import { Meeting, MeetingMode, ClashWarning } from '../types/meeting';
import {
  detectMeetingClashes,
  formatTimeDisplay,
  DEFAULT_CLASS_SCHEDULE,
} from '../utils/meetingsManager';

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meetingData: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    mode: MeetingMode;
    linkOrLocation: string;
    agenda: string;
    attendees: string[];
    organizedBy: string;
  }) => void;
  existingMeetings: Meeting[];
  initialDate?: string;
  meetingToEdit?: Meeting | null;
}

const ATTENDEE_SUGGESTIONS = [
  'प्रधानाध्यापक',
  'समस्त सहायक अध्यापक',
  'एसएमसी (SMC) अध्यक्ष व सदस्य',
  'अभिभावक प्रतिनिधि',
  'खंड शिक्षा अधिकारी (BEO)',
  'संकुल नोडल शिक्षक',
  'एआरपी (ARP)',
  'आंगनबाड़ी कार्यकत्री',
];

export const AddMeetingModal: React.FC<AddMeetingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingMeetings,
  initialDate,
  meetingToEdit,
}) => {
  const todayStr = initialDate || new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:30');
  const [mode, setMode] = useState<MeetingMode>('offline');
  const [linkOrLocation, setLinkOrLocation] = useState('विद्यालय सभागार / Primary School Hall');
  const [agenda, setAgenda] = useState('');
  const [organizedBy, setOrganizedBy] = useState('प्रधानाध्यापक');
  const [attendees, setAttendees] = useState<string[]>([
    'प्रधानाध्यापक',
    'समस्त सहायक अध्यापक',
  ]);
  const [newAttendeeInput, setNewAttendeeInput] = useState('');

  // Reset or initialize on open/edit
  useEffect(() => {
    if (meetingToEdit) {
      setTitle(meetingToEdit.title);
      setDate(meetingToEdit.date);
      setStartTime(meetingToEdit.startTime || '14:00');
      setEndTime(meetingToEdit.endTime || '15:30');
      setMode(meetingToEdit.mode);
      setLinkOrLocation(meetingToEdit.linkOrLocation);
      setAgenda(meetingToEdit.agenda);
      setOrganizedBy(meetingToEdit.organizedBy || 'प्रधानाध्यापक');
      setAttendees(meetingToEdit.attendees || []);
    } else {
      setTitle('');
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setStartTime('14:00');
      setEndTime('15:30');
      setMode('offline');
      setLinkOrLocation('विद्यालय सभागार / Primary School Hall');
      setAgenda('');
      setOrganizedBy('प्रधानाध्यापक');
      setAttendees(['प्रधानाध्यापक', 'समस्त सहायक अध्यापक']);
    }
  }, [meetingToEdit, isOpen, initialDate]);

  // Live clash detection
  const clashWarnings: ClashWarning[] = useMemo(() => {
    if (!date || !startTime || !endTime) return [];
    return detectMeetingClashes(
      {
        id: meetingToEdit?.id,
        date,
        startTime,
        endTime,
        title: title || 'यह बैठक',
      },
      existingMeetings,
      DEFAULT_CLASS_SCHEDULE
    );
  }, [date, startTime, endTime, title, meetingToEdit, existingMeetings]);

  if (!isOpen) return null;

  const handleAddAttendee = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !attendees.includes(trimmed)) {
      setAttendees([...attendees, trimmed]);
    }
    setNewAttendeeInput('');
  };

  const handleRemoveAttendee = (tag: string) => {
    setAttendees(attendees.filter((a) => a !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !startTime || !endTime) return;

    onSave({
      title: title.trim(),
      date,
      startTime,
      endTime,
      mode,
      linkOrLocation: linkOrLocation.trim() || (mode === 'online' ? 'Google Meet' : 'विद्यालय सभागार'),
      agenda: agenda.trim(),
      attendees,
      organizedBy: organizedBy.trim() || 'प्रधानाध्यापक',
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] w-full max-w-2xl rounded-2xl border border-[#00F5D4]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#D3DDD6] dark:border-[#2B3C34] flex items-center justify-between bg-gradient-to-r from-[#0D5B49]/15 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#0D5B49] text-white flex items-center justify-center text-xl shadow-md font-bold">
              🤝
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {meetingToEdit ? 'बैठक विवरण संपादित करें' : 'नई बैठक / गुरु-गोष्ठी जोड़ें'}
              </h3>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                SMC, संकुल, बीआरसी, अभिभावक-शिक्षक बैठक या विभागीय समीक्षा
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Clash Detection Alert Box */}
          {clashWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <span className="text-base">⚠️</span>
                <span>समय टकराव चेतावनी (Schedule Clash Detected)</span>
              </div>
              <div className="space-y-1.5 pl-5">
                {clashWarnings.map((warn, idx) => (
                  <p key={idx} className="text-xs text-amber-900 dark:text-amber-200">
                    • {warn.message} ({warn.conflictingTime})
                  </p>
                ))}
              </div>
              <p className="text-[11px] text-[#52645B] dark:text-[#9DB0A5] italic">
                सुझाव: आप चाहें तो समय बदलकर टकराव से बच सकते हैं, अथवा इसी समय सुरक्षित कर सकते हैं।
              </p>
            </div>
          )}

          {/* Meeting Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              बैठक का नाम / Meeting Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="उदा. विद्यालय प्रबंध समिति (SMC) मासिक बैठक"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
            />
          </div>

          {/* Grid: Date, Start Time, End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                दिनांक / Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                प्रारंभ समय / Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                समाप्ति समय / End Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            </div>
          </div>

          {/* Time display preview */}
          {startTime && endTime && (
            <div className="text-xs text-[#0D5B49] dark:text-[#00F5D4] font-semibold flex items-center gap-1.5">
              <span>🕒</span>
              <span>समय अवधि: {formatTimeDisplay(startTime, endTime)}</span>
            </div>
          )}

          {/* Grid: Mode & Organizer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                बैठक मोड / Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('offline');
                    if (linkOrLocation.includes('http')) {
                      setLinkOrLocation('विद्यालय सभागार / Primary School Hall');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    mode === 'offline'
                      ? 'bg-[#0D5B49] text-white border-[#0D5B49] shadow-sm'
                      : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] border-[#D3DDD6] dark:border-[#2B3C34]'
                  }`}
                >
                  <span>🏫</span>
                  <span>ऑफलाइन (Physical)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('online');
                    if (!linkOrLocation.includes('http')) {
                      setLinkOrLocation('https://meet.google.com/btd-basic-teach');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    mode === 'online'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#52645B] dark:text-[#9DB0A5] border-[#D3DDD6] dark:border-[#2B3C34]'
                  }`}
                >
                  <span>💻</span>
                  <span>ऑनलाइन (Virtual)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
                आयोजक / Organized By
              </label>
              <input
                type="text"
                placeholder="उदा. प्रधानाध्यापक / संकुल नोडल / BEO"
                value={organizedBy}
                onChange={(e) => setOrganizedBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
            </div>
          </div>

          {/* Link or Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              {mode === 'online' ? 'मीटिंग लिंक (Google Meet / Zoom URL)' : 'बैठक स्थल / Venue'}
            </label>
            <input
              type="text"
              required
              placeholder={
                mode === 'online'
                  ? 'उदा. https://meet.google.com/xyz-abc-def'
                  : 'उदा. विद्यालय सभागार / BRC Hall Bareilly'
              }
              value={linkOrLocation}
              onChange={(e) => setLinkOrLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
            />
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              बैठक का एजेंडा व मुख्य चर्चा बिंदु / Agenda
            </label>
            <textarea
              rows={3}
              placeholder="बैठक में विचारणीय विषय (उदा. निपुण भारत आकलन, छात्र नामांकन, उपस्थिति, मध्याह्न भोजन)..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-sm focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52645B] dark:text-[#9DB0A5] mb-1">
              अपेक्षित उपस्थित सदस्य / Attendees
            </label>

            {/* Selected chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attendees.map((att) => (
                <span
                  key={att}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0D5B49]/15 text-[#0D5B49] dark:text-[#00F5D4] text-xs font-semibold"
                >
                  <span>👤 {att}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttendee(att)}
                    className="hover:text-rose-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="सदस्य का नाम या पद लिखें..."
                value={newAttendeeInput}
                onChange={(e) => setNewAttendeeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAttendee(newAttendeeInput);
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F1F5F2] dark:bg-[#1E2E26] text-xs focus:outline-none focus:ring-2 focus:ring-[#00F5D4]"
              />
              <button
                type="button"
                onClick={() => handleAddAttendee(newAttendeeInput)}
                className="px-3.5 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-xs font-semibold"
              >
                ＋ जोड़ें
              </button>
            </div>

            {/* Suggested quick chips */}
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[11px] text-[#52645B] dark:text-[#9DB0A5] mr-1">त्वरित सुझाव:</span>
              {ATTENDEE_SUGGESTIONS.filter((s) => !attendees.includes(s)).slice(0, 5).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddAttendee(s)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-gray-300 dark:border-gray-700 hover:border-[#00F5D4] text-gray-600 dark:text-gray-300"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#D3DDD6] dark:border-[#2B3C34]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
            >
              रद्द करें / Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0D5B49] to-[#00F5D4] text-[#13231C] font-bold text-xs shadow-lg hover:shadow-[#00F5D4]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              ✓ {meetingToEdit ? 'अपडेट सुरक्षित करें' : 'बैठक जोड़ें / Save Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
