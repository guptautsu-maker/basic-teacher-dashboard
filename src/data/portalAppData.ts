import { PortalApp, PortalCategory, PortalCategoryMeta } from '../types/portalApp';

export const PORTAL_CATEGORIES: Record<PortalCategory, PortalCategoryMeta> = {
  attendance: {
    key: 'attendance',
    labelHi: 'उपस्थिति',
    labelEn: 'Attendance',
    emoji: '📋',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    borderColor: 'border-emerald-300 dark:border-emerald-800',
  },
  student_data: {
    key: 'student_data',
    labelHi: 'छात्र डाटा',
    labelEn: 'Student Data',
    emoji: '🧑‍🎓',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-800 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-800',
  },
  training: {
    key: 'training',
    labelHi: 'प्रशिक्षण',
    labelEn: 'Training',
    emoji: '🎓',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
    borderColor: 'border-purple-300 dark:border-purple-800',
  },
  scholarship: {
    key: 'scholarship',
    labelHi: 'छात्रवृत्ति',
    labelEn: 'Scholarship',
    emoji: '💰',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-300 dark:border-amber-800',
  },
  other: {
    key: 'other',
    labelHi: 'विभागीय सेवाएं',
    labelEn: 'Dept Services',
    emoji: '🏛️',
    badgeBg: 'bg-gray-100 dark:bg-gray-800',
    badgeText: 'text-gray-800 dark:text-gray-300',
    borderColor: 'border-gray-300 dark:border-gray-700',
  },
};

// Relative date helper
const getFormattedDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const INITIAL_PORTAL_APPS: PortalApp[] = [
  // 1. Attendance Portal
  {
    id: 'portal-app-attendance',
    name: 'प्रेरणा उपस्थिति पोर्टल (Prerna Attendance Portal)',
    nameHi: 'प्रेरणा दैनिक छात्र व शिक्षक उपस्थिति',
    url: 'https://prerna.up.gov.in/attendance-sample',
    category: 'attendance',
    purpose: 'प्रातः विद्यालय समय में छात्र-छात्राओं एवं शिक्षकों की दैनिक डिजिटल उपस्थिति तथा आकस्मिक अवकाश (Casual Leave) का ऑनलाइन आवेदन।',
    neededForTask: 'दैनिक छात्र व शिक्षक उपस्थिति (Prerna Daily Attendance)',
    lastUsedDate: getFormattedDate(0), // Today
    loginHelpNote: 'यूजरनेम: विद्यालय के प्रधानाध्यापक का पंजीकृत 10 अंकों का मोबाइल नंबर। पासवर्ड भूलने पर बीआरसी ब्लॉक एमआईएस से संपर्क करें।',
    isCustom: false,
    createdAt: getFormattedDate(-30),
    updatedAt: getFormattedDate(0),
  },

  // 2. Student Data Portal
  {
    id: 'portal-app-student-data',
    name: 'यू-डायस+ छात्र डाटा पोर्टल (UDISE+ Student Profile)',
    nameHi: 'UDISE+ छात्र प्रोफ़ाइल व आधार प्रमाणीकरण पोर्टल',
    url: 'https://udiseplus.gov.in/student-sample',
    category: 'student_data',
    purpose: 'कक्षा 1 से 8 तक के सभी छात्र-छात्राओं का 12 अंकों का आधार प्रमाणीकरण, छात्र प्रोफाइल, बैंक खाता एवं नवप्रवेशी विद्यार्थियों का नामांकन।',
    neededForTask: 'UDISE+ छात्र प्रोफ़ाइल व आधार प्रमाणीकरण',
    lastUsedDate: getFormattedDate(-2), // 2 days ago
    loginHelpNote: 'यूजरनेम: 11 अंकों का विद्यालय UDISE कोड (उदा. 09123456789)। सत्र 2024-25 का छात्र मॉड्यूल सेलेक्ट करें।',
    isCustom: false,
    createdAt: getFormattedDate(-45),
    updatedAt: getFormattedDate(-2),
  },

  // 3. Training Portal
  {
    id: 'portal-app-training',
    name: 'दीक्षा प्रशिक्षण पोर्टल (DIKSHA Online Training)',
    nameHi: 'दीक्षा ऑनलाइन शिक्षक प्रशिक्षण एवं डिजिटल प्रमाण-पत्र',
    url: 'https://diksha.gov.in/training-sample',
    category: 'training',
    purpose: 'निपुण भारत मिशन एवं एससीईआरटी (SCERT) द्वारा निर्धारित अनिवार्य ऑनलाइन शिक्षक प्रशिक्षण कोर्स पूर्ण करना एवं डिजिटल सर्टिफिकेट डाउनलोड करना।',
    neededForTask: 'निपुण भारत मिशन ऑनलाइन प्रशिक्षण कोर्स पूर्ण करना',
    lastUsedDate: getFormattedDate(-5), // 5 days ago
    loginHelpNote: 'मानव संपदा पोर्टल आईडी (eHRMS ID) से "Sign in with State System" का चयन करें। राज्य उत्तर प्रदेश चुनें।',
    isCustom: false,
    createdAt: getFormattedDate(-60),
    updatedAt: getFormattedDate(-5),
  },

  // 4. Scholarship Portal
  {
    id: 'portal-app-scholarship',
    name: 'छात्रवृत्ति एवं शुल्क प्रतिपूर्ति पोर्टल (UP Scholarship Portal)',
    nameHi: 'छात्रवृत्ति एवं शुल्क प्रतिपूर्ति पोर्टल',
    url: 'https://scholarship.up.gov.in/portal-sample',
    category: 'scholarship',
    purpose: 'कक्षा 9-10 (पूर्व-दशम) एवं प्राथमिक वर्ग के आरक्षित व सामान्य वर्ग के पात्र छात्र-छात्राओं के ऑनलाइन छात्रवृत्ति आवेदन पत्रों का सत्यापन व अग्रसारण।',
    neededForTask: 'छात्रवृत्ति आवेदन पत्रों का सत्यापन व अग्रसारण',
    lastUsedDate: getFormattedDate(-12), // 12 days ago
    loginHelpNote: 'यूजरनेम: विद्यालय का शिक्षा विभाग पंजीकरण कोड। पासवर्ड नोडल शिक्षक के पास सुरक्षित रहता है। पासवर्ड भूलने पर जिला समाज कल्याण अधिकारी कार्यालय जाएं।',
    isCustom: false,
    createdAt: getFormattedDate(-90),
    updatedAt: getFormattedDate(-12),
  },

  // 5. Additional Key Portals for Teacher Hub
  {
    id: 'portal-app-ehrms',
    name: 'मानव संपदा पोर्टल (Manav Sampada eHRMS)',
    nameHi: 'मानव संपदा अवकाश एवं सेवा पुस्तिका पोर्टल',
    url: 'https://ehrms.upsdc.gov.in',
    category: 'other',
    purpose: 'चिकित्सीय अवकाश (Medical Leave), बाल्य देखभाल अवकाश (CCL), सर्विस बुक सत्यापन एवं वेतन पर्ची (Pay Slip) डाउनलोड हेतु।',
    neededForTask: 'मानव संपदा सेवा पुस्तिका (Service Book) विवरण सत्यापन',
    lastUsedDate: getFormattedDate(-1),
    loginHelpNote: 'यूजरनेम: 6 अंकों का eHRMS कोड। विभाग: Basic Education। पासवर्ड खोने पर m-STHAPANA ऐप द्वारा फॉरगॉट पासवर्ड करें।',
    isCustom: false,
    createdAt: getFormattedDate(-100),
    updatedAt: getFormattedDate(-1),
  },
  {
    id: 'portal-app-mdm-dbt',
    name: 'प्रेरणा डीबीटी व एमडीएम पोर्टल (Prerna DBT & MDM Portal)',
    nameHi: 'डीबीटी यूनिफॉर्म व एमडीएम खाद्यान्न पोर्टल',
    url: 'https://prernaup.in/mdm-sample',
    category: 'other',
    purpose: 'यूनिफॉर्म, स्वेटर, जूता-मोजा, बैग हेतु ₹1200 डीबीटी आधार सीडिंग सत्यापन एवं मासिक मध्याह्न भोजन उपभोग रिपोर्ट प्रेषण।',
    neededForTask: 'मासिक मध्याह्न भोजन (MDM) खाद्यान्न व कन्वर्जन कॉस्ट रिपोर्ट जमा',
    lastUsedDate: getFormattedDate(-3),
    loginHelpNote: 'यूजरनेम: पंजीकृत हेडमास्टर फोन नंबर। ओटीपी आधारित लॉगिन। कभी भी पासवर्ड साझा न करें।',
    isCustom: false,
    createdAt: getFormattedDate(-110),
    updatedAt: getFormattedDate(-3),
  },
];
