/**
 * Realistic sample data for Basic Education (Primary & Upper Primary) teachers in India.
 * Dates are calculated dynamically relative to the current day so data is always fresh and realistic.
 */

import { Task, RecurrenceFrequency, TaskPriority, TaskStatus } from '../utils/taskStatusSystem';

export interface MeetingItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "02:00 PM"
  mode: 'offline' | 'online';
  locationOrLink: string;
  agenda: string;
  organizedBy: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface TrainingItem {
  id: string;
  name: string;
  provider: string; // e.g. 'DIKSHA', 'SCERT', 'DIET', 'NIPUN Bharat'
  hours: number;
  dueDate: string; // YYYY-MM-DD
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercent: number;
  certificateRequired: boolean;
  link?: string;
}

export interface GovtOrderItem {
  id: string;
  orderNumber: string;
  title: string;
  date: string; // YYYY-MM-DD
  issuingAuthority: string; // e.g. 'राज्य परियोजना निदेशक, लखनऊ', 'सचिव बेसिक शिक्षा परिषद'
  summary: string;
  deadline?: string | null;
  attachmentName: string;
  attachmentUrl: string;
  acknowledgementRequired: boolean;
  isAcknowledged: boolean;
  isRead: boolean;
}

// Helpers to generate ISO dates relative to now
const getRelativeDate = (offsetDays: number, hours = 9, minutes = 0): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const toIso = (offsetDays: number, hours = 9, minutes = 0): string => {
  return getRelativeDate(offsetDays, hours, minutes).toISOString();
};

const toDateString = (offsetDays: number): string => {
  const d = getRelativeDate(offsetDays);
  return d.toISOString().split('T')[0];
};

export const getInitialTeacherHubTasks = (): Task[] => {
  return [
    // OVERDUE TASKS
    {
      id: 'th-task-od-1',
      title: 'UDISE+ छात्र प्रोफ़ाइल व आधार प्रमाणीकरण (Student Profile & Aadhaar Verification)',
      description: 'सभी नव-प्रवेशी व मौजूदा छात्रों के आधार व माता-पिता के विवरण का UDISE+ पोर्टल पर शत-प्रतिशत सत्यापन।',
      type: 'portal_entry',
      source: 'UDISE+ Portal',
      portalUrl: 'https://udiseplus.gov.in',
      deadline: toIso(-4, 17, 0), // 4 days ago (Critical > 3 days)
      priority: 'urgent',
      status: 'overdue',
      recurrence: 'none',
      assignedTo: 'सहायक अध्यापक / Assistant Teacher',
      createdAt: toIso(-10),
      updatedAt: toIso(-4),
    },
    {
      id: 'th-task-od-2',
      title: 'मासिक मध्याह्न भोजन (MDM) खाद्यान्न व कन्वर्जन कॉस्ट रिपोर्ट जमा',
      description: 'गत माह का छात्र उपस्थिति अनुसार खाद्यान्न उपभोग व परिवर्तन लागत विवरण बीआरसी को प्रेषित करना।',
      type: 'mdm',
      source: 'MDM IVRS & BRC',
      portalUrl: 'https://prernaup.in',
      deadline: toIso(-1, 15, 0), // 1 day ago
      priority: 'high',
      status: 'overdue',
      recurrence: 'monthly',
      assignedTo: 'प्रधानाध्यापक / Headmaster',
      createdAt: toIso(-5),
      updatedAt: toIso(-1),
    },

    // TODAY TASKS ("Aaj ka kaam")
    {
      id: 'th-task-today-1',
      title: 'प्रेरणा ऐप पर दैनिक छात्र व शिक्षक उपस्थिति (Prerna Daily Attendance)',
      description: 'प्रातः विद्यालय समय में जियो-फेंसिंग (Geo-fencing) के अंतर्गत छात्र व शिक्षक डिजिटल उपस्थिति दर्ज करना।',
      type: 'attendance',
      source: 'Prerna App',
      portalUrl: 'https://prernaup.in',
      deadline: toIso(0, 9, 15), // Today 09:15 AM
      priority: 'urgent',
      status: 'in_progress',
      recurrence: 'daily',
      assignedTo: 'सभी शिक्षक',
      createdAt: toIso(0, 8, 0),
      updatedAt: toIso(0, 8, 30),
    },
    {
      id: 'th-task-today-2',
      title: 'मध्याह्न भोजन (MDM) दैनिक लाभार्थी संख्या IVRS कॉल / SMS प्रेषण',
      description: 'आज भोजन ग्रहण करने वाले पंजीकृत विद्यार्थियों की संख्या 15544 टोल-फ्री आईवीआरएस पर दर्ज करना।',
      type: 'mdm',
      source: 'MDM IVRS 15544',
      portalUrl: 'https://prernaup.in',
      deadline: toIso(0, 11, 30), // Today 11:30 AM
      priority: 'urgent',
      status: 'not_started',
      recurrence: 'daily',
      assignedTo: 'एमडीएम प्रभारी',
      createdAt: toIso(0, 8, 0),
      updatedAt: toIso(0, 8, 0),
    },
    {
      id: 'th-task-today-3',
      title: 'दीक्षा (DIKSHA) FLN 3.0 मॉड्यूल-4 ऑनलाइन असेसमेंट क्विज',
      description: 'बुनियादी भाषा एवं संख्या ज्ञान (FLN) प्रशिक्षण मॉड्यूल पूर्ण कर 70% अंकों के साथ प्रमाणपत्र प्राप्त करना।',
      type: 'training',
      source: 'DIKSHA Portal',
      portalUrl: 'https://diksha.gov.in',
      deadline: toIso(0, 17, 0), // Today 05:00 PM
      priority: 'high',
      status: 'in_progress',
      recurrence: 'none',
      assignedTo: 'प्राथमिक शिक्षक',
      createdAt: toIso(-2),
      updatedAt: toIso(0, 9, 0),
    },
    {
      id: 'th-task-today-4',
      title: 'कक्षा 1 से 3 निपुण तालिका (NIPUN Bharat Tracker) अद्यतन',
      description: 'सप्ताह की शिक्षण योजना अनुसार बच्चों के अधिगम प्रतिफल (Learning Outcomes) का दैनिक अंकन।',
      type: 'general',
      source: 'School Register',
      deadline: toIso(0, 14, 0), // Today 02:00 PM
      priority: 'medium',
      status: 'done',
      recurrence: 'daily',
      completedAt: toIso(0, 10, 0),
      assignedTo: 'कक्षाध्यापक',
      createdAt: toIso(0, 8, 0),
      updatedAt: toIso(0, 10, 0),
    },

    // UPCOMING 7 DAYS TASKS
    {
      id: 'th-task-up-1',
      title: 'निपुण लक्ष्य ऐप (NIPUN Lakshya App) साप्ताहिक स्पॉट असेसमेंट',
      description: 'एआरपी (ARP) / डायट मेंटर्स द्वारा किए जाने वाले स्पॉट असेसमेंट हेतु बच्चों का अभ्यास।',
      type: 'portal_entry',
      source: 'NIPUN Lakshya App',
      deadline: toIso(1, 12, 0), // Tomorrow
      priority: 'high',
      status: 'not_started',
      recurrence: 'weekly',
      createdAt: toIso(0),
      updatedAt: toIso(0),
    },
    {
      id: 'th-task-up-2',
      title: 'निःशुल्क पाठ्यपुस्तक व स्कूल बैग वितरण प्राप्ति रसीद पोर्टल अपलोड',
      description: 'छात्रों को वितरित पुस्तकों की संख्या व छात्र पंजिका क्रमांक की प्रविष्टि प्रेरणा डीबीटी पोर्टल पर करना।',
      type: 'portal_entry',
      source: 'Prerna DBT',
      portalUrl: 'https://prernaup.in',
      deadline: toIso(2, 16, 0), // In 2 days
      priority: 'medium',
      status: 'not_started',
      recurrence: 'none',
      createdAt: toIso(0),
      updatedAt: toIso(0),
    },
    {
      id: 'th-task-up-3',
      title: 'संचारी रोग नियंत्रण अभियान (Sanchari Rog) प्रभात फेरी व स्वच्छता शपथ',
      description: 'ग्राम पंचायत में बच्चों के साथ स्वास्थ्य जागरूकता रैली एवं अभिभावक परिचर्चा।',
      type: 'duty',
      source: 'BSA Circular',
      deadline: toIso(3, 10, 0), // In 3 days
      priority: 'high',
      status: 'not_started',
      recurrence: 'none',
      createdAt: toIso(0),
      updatedAt: toIso(0),
    },
    {
      id: 'th-task-up-4',
      title: 'मानव संपदा पोर्टल: सेवा पुस्तिका (e-Service Book) वार्षिक सत्यापन',
      description: 'शिक्षक सेवा अभिलेख, पदोन्नति एवं अवकाश विवरण की ऑनलाइन पुष्टि व संशोधन अनुरोध।',
      type: 'portal_entry',
      source: 'Manav Sampada (ehrms)',
      portalUrl: 'https://ehrms.upsdc.gov.in',
      deadline: toIso(4, 17, 0), // In 4 days
      priority: 'medium',
      status: 'not_started',
      recurrence: 'yearly',
      createdAt: toIso(0),
      updatedAt: toIso(0),
    },
    {
      id: 'th-task-up-5',
      title: 'कंपोजिट ग्रांट (Composite School Grant) व्यय वाउचर व पीएफएमएस (PFMS) प्रविष्टि',
      description: 'विद्यालय रखरखाव एवं टीएलएम क्रय के बिल-वाउचर एसएमसी अध्यक्ष से हस्ताक्षरित कराकर पोर्टल पर दर्ज करना।',
      type: 'general',
      source: 'PFMS / SMC',
      portalUrl: 'https://pfms.nic.in',
      deadline: toIso(6, 15, 0), // In 6 days
      priority: 'urgent',
      status: 'not_started',
      recurrence: 'none',
      createdAt: toIso(0),
      updatedAt: toIso(0),
    },
  ];
};

export const getInitialTeacherHubMeetings = (): MeetingItem[] => {
  return [
    {
      id: 'th-meet-1',
      title: 'विद्यालय प्रबंध समिति (SMC) मासिक बैठक',
      date: toDateString(0), // Today
      time: '02:00 PM - 03:30 PM',
      mode: 'offline',
      locationOrLink: 'विद्यालय सभागार / Primary School Hall',
      agenda: 'निपुण भारत लक्ष्य प्रगति, विद्यालय कायाकल्प 19 पैरामीटर, एवं 100% छात्र उपस्थिति सुनिश्चित करना।',
      organizedBy: 'प्रधानाध्यापक एवं एसएमसी अध्यक्ष',
      status: 'scheduled',
    },
    {
      id: 'th-meet-2',
      title: 'संकुल शिक्षक (CRC) आकस्मिक समीक्षा ऑनलाइन बैठक',
      date: toDateString(0), // Today
      time: '04:30 PM - 05:15 PM',
      mode: 'online',
      locationOrLink: 'https://meet.google.com/btd-basic-teach',
      agenda: 'NAT परीक्षा की तैयारी, ओएमआर शीट वितरण स्थिति, एवं दीक्षा प्रशिक्षण प्रगति समीक्षा।',
      organizedBy: 'संकुल नोडल शिक्षक',
      status: 'scheduled',
    },
    {
      id: 'th-meet-3',
      title: 'बीआरसी (BRC) मासिक गुरु-गोष्ठी / समीक्षा बैठक',
      date: toDateString(1), // Tomorrow
      time: '11:00 AM - 01:30 PM',
      mode: 'offline',
      locationOrLink: 'खंड शिक्षा अधिकारी कार्यालय (BRC Hall)',
      agenda: 'डीबीटी अवशेष छात्र, एमडीएम खाद्यान्न आवंटन एवं उपचारात्मक शिक्षण (Remedial Teaching)।',
      organizedBy: 'खंड शिक्षा अधिकारी (BEO)',
      status: 'scheduled',
    },
    {
      id: 'th-meet-4',
      title: 'माता उन्मुखीकरण कार्यशाला (Mother Orientation Workshop)',
      date: toDateString(4), // In 4 days
      time: '10:30 AM - 12:00 PM',
      mode: 'offline',
      locationOrLink: 'प्राथमिक विद्यालय परिसर',
      agenda: 'माताओं को घर पर बच्चों की पढ़ाई व गृहकार्य सहयोग हेतु प्रेरित करना व टीएलएम प्रदर्शन।',
      organizedBy: 'नोडल आंगनबाड़ी शिक्षिका',
      status: 'scheduled',
    },
  ];
};

export const getInitialTeacherHubTrainings = (): TrainingItem[] => {
  return [
    {
      id: 'th-tr-1',
      name: 'निपुण भारत (FLN 3.0) बुनियादी साक्षरता एवं संख्या ज्ञान',
      provider: 'DIKSHA Portal / NCERT',
      hours: 12,
      dueDate: toDateString(0), // Due Today
      status: 'in_progress',
      progressPercent: 75,
      certificateRequired: true,
      link: 'https://diksha.gov.in',
    },
    {
      id: 'th-tr-2',
      name: 'निष्ठा (NISHTHA) 4.0 - प्रारंभिक बाल्यावस्था देखभाल एवं शिक्षा (ECCE)',
      provider: 'SCERT State Project',
      hours: 8,
      dueDate: toDateString(3), // In 3 days
      status: 'not_started',
      progressPercent: 0,
      certificateRequired: true,
      link: 'https://diksha.gov.in',
    },
    {
      id: 'th-tr-3',
      name: 'मिशन शक्ति 5.0 - आत्मरक्षा व कन्या सुरक्षा जागरूकता प्रशिक्षण',
      provider: 'बेसिक शिक्षा परिषद',
      hours: 4,
      dueDate: toDateString(6), // In 6 days
      status: 'not_started',
      progressPercent: 0,
      certificateRequired: true,
      link: 'https://prernaup.in',
    },
  ];
};

export const getInitialTeacherHubGovtOrders = (): GovtOrderItem[] => {
  return [
    {
      id: 'go-001',
      orderNumber: 'पत्रांक: बे०शि०प० / 14205-14310 / 2026-27',
      title: 'शीतकालीन यूनिफॉर्म, स्वेटर, जूता-मोज़ा डीबीटी (DBT) धनराशि अंतरण व सत्यापन निर्देश',
      date: toDateString(0), // Today
      issuingAuthority: 'महानिदेशक, स्कूल शिक्षा एवं राज्य परियोजना निदेशक, लखनऊ',
      summary:
        'समस्त परिषदीय प्राथमिक एवं उच्च प्राथमिक विद्यालयों में नामांकित छात्र-छात्राओं के अभिभावकों के आधार लिंक बैंक खातों में ₹1200 प्रति छात्र की दर से धनराशि हस्तांतरित कर दी गई है। सभी शिक्षक प्रेरणा डीबीटी ऐप पर क्रय सत्यापन पूर्ण करें।',
      deadline: toDateString(10),
      attachmentName: 'Shashanadesh_DBT_Uniform_2026.pdf',
      attachmentUrl: '#',
      acknowledgementRequired: true,
      isAcknowledged: false,
      isRead: false,
    },
    {
      id: 'go-002',
      orderNumber: 'पत्रांक: शि०नि० / गोपन-09 / NAT-2026',
      title: 'निपुण असेसमेंट टेस्ट (NAT) परीक्षा कार्यक्रम एवं सरल ऐप (Saral App) ओएमआर स्कैनिंग समय-सारणी',
      date: toDateString(-1), // Yesterday
      issuingAuthority: 'सचिव, उत्तर प्रदेश बेसिक शिक्षा परिषद, प्रयागराज',
      summary:
        'सत्र 2026-27 हेतु कक्षा 1 से 8 तक के विद्यार्थियों का NAT आकलन आगामी 18 से 20 नवंबर को आयोजित होगा। परीक्षा उपरांत उसी दिन सरल ऐप के माध्यम से ओएमआर शीट स्कैन कर डेटा सिंक करना अनिवार्य है।',
      deadline: toDateString(14),
      attachmentName: 'NAT_Exam_Schedule_Guidelines.pdf',
      attachmentUrl: '#',
      acknowledgementRequired: true,
      isAcknowledged: false,
      isRead: false,
    },
    {
      id: 'go-003',
      orderNumber: 'पत्रांक: जि०बे०शि०अ० / कायाकल्प / 8841 / 2026',
      title: 'ऑपरेशन कायाकल्प: 19 मूलभूत अवस्थापना सुविधाओं के शत-प्रतिशत संतृप्तिकरण बाबत',
      date: toDateString(-2), // 2 days ago
      issuingAuthority: 'जिला बेसिक शिक्षा अधिकारी (BSA Office)',
      summary:
        'ग्राम प्रधान व पंचायत सचिव के समन्वय से शुद्ध पेयजल, दिव्यांग सुलभ शौचालय, विद्युतीकरण एवं टाइल्स कार्य की समीक्षा कर कायाकल्प पोर्टल पर जियो-टैग फोटोग्राफ अपलोड करना सुनिश्चित करें।',
      deadline: toDateString(7),
      attachmentName: 'Operation_Kayakalp_19_Parameters.pdf',
      attachmentUrl: '#',
      acknowledgementRequired: false,
      isAcknowledged: false,
      isRead: false,
    },
    {
      id: 'go-004',
      orderNumber: 'पत्रांक: प्र०नि० / विद्या०समय / 2026-27',
      title: 'ग्रीष्मकालीन से शीतकालीन विद्यालय समय-सारणी परिवर्तन सूचना (प्रातः 09:00 से अप० 03:00)',
      date: toDateString(-4),
      issuingAuthority: 'शिक्षा निदेशक (बेसिक), उत्तर प्रदेश',
      summary:
        'मौसम में बदलाव के दृष्टिगत समस्त बेसिक शिक्षा परिषद विद्यालयों का संचालन समय अब प्रातः 09:00 बजे से अपराह्न 03:00 बजे तक रहेगा। प्रार्थना सभा 09:15 बजे संपन्न होगी।',
      deadline: null,
      attachmentName: 'School_Timing_Winter_Circular.pdf',
      attachmentUrl: '#',
      acknowledgementRequired: false,
      isAcknowledged: true,
      isRead: true,
    },
  ];
};
