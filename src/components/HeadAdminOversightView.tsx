import React, { useState } from 'react';
import { UserRole } from '../types/settingsAndPrivacy';
import { Task } from '../utils/taskStatusSystem';
import { Duty } from '../types/duty';
import { MeetingItem, TrainingItem, GovtOrderItem } from '../data/teacherHubSampleData';

interface HeadAdminOversightViewProps {
  currentRole: UserRole;
  onRoleChange: (newRole: UserRole) => void;
  tasks: Task[];
  duties: Duty[];
  meetings: MeetingItem[];
  trainings: TrainingItem[];
  orders: GovtOrderItem[];
  schoolName?: string;
  onToast: (msg: string) => void;
  onNavigate?: (page: any) => void;
}

export const HeadAdminOversightView: React.FC<HeadAdminOversightViewProps> = ({
  currentRole,
  onRoleChange,
  tasks,
  duties,
  meetings,
  trainings,
  orders,
  schoolName = 'प्राथमिक विद्यालय (कंपोजिट), लखनऊ',
  onToast,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'compliance' | 'inspections'>('overview');

  // Realistic sample staff roster for basic primary/composite schools in UP
  const staffMembers = [
    {
      id: 'staff-1',
      name: 'श्री रामेश्वर सिंह',
      designation: 'प्रधानाध्यापक (Headmaster)',
      classes: 'समग्र विद्यालय पर्यवेक्षण',
      pendingTasks: 2,
      mdmDuty: 'स्वीकृत',
      dikshaCompleted: 5,
      attendanceMarked: true,
      status: 'present',
    },
    {
      id: 'staff-2',
      name: 'सुरेश कुमार जी (आप)',
      designation: 'सहायक अध्यापक (Assistant Teacher)',
      classes: 'कक्षा 4 व 5 (गणित व पर्यावरण)',
      pendingTasks: tasks.filter((t) => t.status !== 'done').length,
      mdmDuty: 'सक्रिय (आज)',
      dikshaCompleted: trainings.filter((tr) => tr.status === 'completed').length,
      attendanceMarked: true,
      status: 'present',
    },
    {
      id: 'staff-3',
      name: 'श्रीमती अनीता देवी',
      designation: 'सहायक अध्यापिका (Assistant Teacher)',
      classes: 'कक्षा 1 व 2 (निपुण भारत FLN प्रभारी)',
      pendingTasks: 3,
      mdmDuty: 'आगामी सोमवार',
      dikshaCompleted: 4,
      attendanceMarked: true,
      status: 'present',
    },
    {
      id: 'staff-4',
      name: 'श्री विजय प्रकाश',
      designation: 'शिक्षामित्र (Shikshamitra)',
      classes: 'कक्षा 3 (हिंदी व बालवाटिका)',
      pendingTasks: 1,
      mdmDuty: 'सहायक',
      dikshaCompleted: 3,
      attendanceMarked: true,
      status: 'present',
    },
  ];

  const handleSendStaffReminder = (staffName: string) => {
    onToast(`📲 ${staffName} को लंबित कार्य हेतु अनुस्मारक (Reminder) प्रेषित किया गया`);
  };

  const handleSignOffMdm = () => {
    onToast('✍️ आज का मध्याह्न भोजन (MDM) वितरण व लाभार्थी संख्या प्रमाणित व लॉक की गई');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Role Banner / View Mode Indicator */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 shadow-xl border border-purple-500/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🏫</span>
              <span>प्रधानाध्यापक व संकुल प्रशासक दृश्य • Head / Admin View Mode</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white m-0">
              समग्र विद्यालय प्रशासनिक निगरानी
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 mt-1">
              {schoolName} • पूरे स्टाफ का कार्यभार, शाला उपस्थिति, UDISE+ व BEO अनुपालन।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Quick Role Switcher */}
            <div className="flex items-center rounded-2xl bg-white/10 p-1 border border-white/20">
              <button
                type="button"
                onClick={() => {
                  onRoleChange('teacher');
                  onToast('🧑‍🏫 शिक्षक दृश्य (Teacher View) पर स्विच किया गया');
                }}
                className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  currentRole === 'teacher'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-purple-200 hover:text-white'
                }`}
              >
                <span>🧑‍🏫</span>
                <span>शिक्षक दृश्य</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onRoleChange('headmaster');
                  onToast('🏫 प्रधानाध्यापक दृश्य (Head/Admin View) सक्रिय है');
                }}
                className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  currentRole !== 'teacher'
                    ? 'bg-[#00F5D4] text-[#0D5B49] shadow-md'
                    : 'text-purple-200 hover:text-white'
                }`}
              >
                <span>🏫</span>
                <span>हेड/एडमिन दृश्य</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-800">
        {[
          { key: 'overview', icon: '📊', label: 'समग्र विद्यालय स्थिति (School Overview)' },
          { key: 'staff', icon: '👥', label: 'स्टाफ कार्यभार व निगरानी (Staff Workload)' },
          { key: 'compliance', icon: '📜', label: 'विभागीय अनुपालन (Compliance & MDM)' },
          { key: 'inspections', icon: '🎖️', label: 'निरीक्षण तैयारी स्कोर (Inspection Readiness)' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`py-2 px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-[#0D5B49] text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: SCHOOL OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#16231D] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">👥</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                  100% उपस्थित
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">4 / 4</div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                शिक्षक व शिक्षामित्र स्टाफ
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#16231D] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎒</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                  88.4% उपस्थिति
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">142 / 160</div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                आज कुल छात्र उपस्थिति
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#16231D] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🍲</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                  IVRS दर्ज
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">138 छात्र</div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                MDM लाभार्थी संख्या (आज)
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#16231D] border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📜</span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                  {orders.length} कुल आदेश
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {orders.filter((o) => !o.isAcknowledged).length} लंबित
              </div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                शासनादेश प्राप्ति पावती शेष
              </div>
            </div>
          </div>

          {/* Quick Headmaster Administrative Actions */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-white dark:from-[#11241d] dark:via-[#142921] dark:to-[#101e18] border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <span>⚡</span>
              <span>प्रधानाध्यापक त्वरित प्रशासनिक कार्य (One-Click Actions)</span>
            </h3>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleSignOffMdm}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>✍️</span>
                <span>MDM दैनिक रजिस्टर डिजिटल हस्ताक्षर</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate('duties');
                  else window.location.hash = '#duties';
                }}
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>🛡️</span>
                <span>साप्ताहिक रोस्टर ड्यूटी अनुमोदन</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate('safeguards');
                  else window.location.hash = '#safeguards';
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>🚨</span>
                <span>अति गंभीर विलंबित कार्य समीक्षा</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF WORKLOAD */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              शिक्षक स्टाफ कार्यभार एवं दैनिक दायित्व स्थिति
            </h3>
            <span className="text-xs text-slate-500">कुल स्टाफ: 4</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {staffMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16231D] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {member.name}
                    </h4>
                    <p className="text-xs font-semibold text-[#0D5B49] dark:text-[#00F5D4]">
                      {member.designation}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      कक्षा आवंटन: {member.classes}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    🟢 {member.status === 'present' ? 'उपस्थित' : 'अवकाश'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                    <div className="font-black text-rose-600 dark:text-rose-400">
                      {member.pendingTasks}
                    </div>
                    <div className="text-[10px] text-gray-500">लंबित कार्य</div>
                  </div>

                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                      {member.dikshaCompleted}
                    </div>
                    <div className="text-[10px] text-gray-500">दीक्षा पूर्ण</div>
                  </div>

                  <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                    <div className="font-black text-amber-600 dark:text-amber-400">
                      {member.mdmDuty}
                    </div>
                    <div className="text-[10px] text-gray-500">MDM रोस्टर</div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleSendStaffReminder(member.name)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>📲 अनुस्मारक भेजें (Send Reminder)</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLIANCE & MDM */}
      {activeTab === 'compliance' && (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16231D] space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📋</span>
            <span>विभागीय पोर्टल एवं शासन प्राथमिकता अनुपालन</span>
          </h3>

          <div className="space-y-3">
            {[
              { title: 'UDISE+ छात्र आधार प्रमाणीकरण (Student Profile & Aadhaar)', status: '85% पूर्ण', color: 'amber' },
              { title: 'डीबीटी (DBT) माता-पिता बैंक खाता सीडिंग', status: '94% पूर्ण', color: 'emerald' },
              { title: 'मध्याह्न भोजन (MDM) दैनिक आईवीआरएस कॉल 15544', status: 'आज संपन्न', color: 'emerald' },
              { title: 'दीक्षा FLN शिक्षक प्रशिक्षण कोर्स 1-4', status: 'शत-प्रतिशत पूर्ण', color: 'emerald' },
              { title: 'वार्षिक विद्यालय अनुदान (Composite School Grant) व्यय वाउचर', status: 'समीक्षाधीन', color: 'blue' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-gray-800/40"
              >
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {item.title}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    item.color === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : item.color === 'amber'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INSPECTION READINESS */}
      {activeTab === 'inspections' && (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16231D] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🎖️</span>
                <span>बीईओ / डायट मेंटर औचक निरीक्षण तैयारी स्कोर (Readiness Score)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                बेसिक शिक्षा विभाग के 14-बिंदु कायाकल्प व शैक्षणिक मानकों पर आधारित स्कोर
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">92 / 100</span>
              <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Grade: A+ (उत्कृष्ट)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">शैक्षणिक अभिलेख</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">शिक्षक डायरी, छात्र उपस्थिति पंजिका व समय-सारणी अद्यतन।</div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">MDM व खाद्यान्न अभिलेख</div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">स्टॉक पंजिका, मीनू चार्ट व रसोइया मानदेय रजिस्टर तैयार।</div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <div className="font-bold text-xs text-amber-900 dark:text-amber-200">UDISE+ व प्रमाणीकरण</div>
              <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">3 छात्रों के आधार सत्यापन हेतु अभिभावकों से संपर्क शेष।</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
