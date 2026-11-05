import { useState, useEffect, useCallback } from 'react';
import {
  getStoredAppSettings,
  saveStoredAppSettings,
} from './privacyAndSecurityManager';
import { AppLanguage } from '../types/settingsAndPrivacy';

export const LANGUAGE_CHANGED_EVENT = 'th-language-changed';

/**
 * Returns whether English mode is currently active based on AppLanguage.
 */
export function isEnglishLanguage(lang?: AppLanguage | string | null): boolean {
  return lang === 'en';
}

/**
 * Reads the current active language ('hi' | 'en') from stored settings.
 */
export function getCurrentLanguage(): 'hi' | 'en' {
  try {
    const direct = localStorage.getItem('btd-lang');
    if (direct === 'en' || direct === 'hi') return direct;
    const settings = getStoredAppSettings();
    if (settings.language === 'en') return 'en';
  } catch {
    // ignore
  }
  return 'hi';
}

/**
 * Updates the active language in localStorage ('th-app-settings' and 'btd-lang'),
 * updates <html lang="...">, and notifies all mounted components immediately.
 */
export function setCurrentLanguage(nextLang: 'hi' | 'en'): void {
  try {
    localStorage.setItem('btd-lang', nextLang);
    const currentSettings = getStoredAppSettings();
    const updatedSettings = {
      ...currentSettings,
      language: nextLang as AppLanguage,
    };
    saveStoredAppSettings(updatedSettings);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLang;
      document.documentElement.setAttribute('data-lang', nextLang);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('th-settings-updated'));
      window.dispatchEvent(
        new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { language: nextLang } })
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Dictionary of common Hindi strings / phrases in the app (including sample tasks,
 * portals, orders, and UI labels) mapped to clean, simple English for teachers.
 */
export const HINDI_TO_ENGLISH_DICTIONARY: Record<string, string> = {
  // App & Navigation
  'मुख्य पृष्ठ': 'Home',
  'बेसिक शिक्षक डैशबोर्ड': 'Basic Teacher Dashboard',
  'शिक्षक कार्यक्षेत्र': 'Teacher Workspace',
  'डैशबोर्ड (Dashboard)': 'Dashboard',
  'डैशबोर्ड (Teacher Hub)': 'Dashboard (Teacher Hub)',
  'मेरी कक्षाएं (Classes)': 'My Classes & Attendance',
  'मेरी कक्षाएं (My Classes)': 'My Classes & Attendance',
  'शासनादेश (Orders)': 'Govt Orders',
  'शासनादेश (Govt Orders)': 'Govt Orders',
  'सरकारी पोर्टल (Portals)': 'Govt Portals',
  'प्रशिक्षण (Trainings)': 'Trainings',
  'ड्यूटी रोस्टर (Duties)': 'Duty Roster',
  'बैठकें (Meetings)': 'Meetings (PTM/SMC)',
  'स्कूल शीट्स (Sheets)': 'School Registers & MDM',
  'कार्य समीक्षा (Safeguards)': 'Work Review & PDF',
  'सत्र परिवर्तन (Rollover)': 'New Session Rollover',
  'सूचना केंद्र (Alerts)': 'Notifications & Alerts',
  'सूचना केंद्र (Notifications)': 'Notifications & Alerts',
  'मुख्य कार्यक्षेत्र (Core)': 'Daily School Work',
  'विद्यालय व अकादमिक (School)': 'School Registers & Activities',
  'समीक्षा व प्रबंधन (Admin)': 'Reports & More Tools',
  'शिक्षक मोड': 'Teacher Mode',
  'प्रधानाध्यापक': 'Headmaster Mode',
  'सहायक अध्यापक': 'Assistant Teacher',
  'सेटिंग्स': 'Settings',
  '⚙️ सेटिंग्स': '⚙️ Settings',
  '🚪 लॉगआउट': '🚪 Logout',
  'लॉगिन': 'Login',
  'खोजें': 'Search',
  'सभी ऐप्स': 'All Tools',
  'डैशबोर्ड': 'Dashboard',
  'कक्षाएं': 'Classes',
  'मेरी कक्षाएं': 'My Classes',
  'आदेश': 'Orders',
  'शासनादेश': 'Govt Orders',
  'सरकारी पोर्टल': 'Govt Portals',
  'प्रशिक्षण': 'Trainings',
  'ड्यूटी रोस्टर': 'Duty Roster',
  'बैठकें': 'Meetings',
  'स्कूल शीट्स': 'School Sheets',
  'कार्य समीक्षा': 'Work Review',
  'सत्र परिवर्तन': 'Session Rollover',
  'सूचना केंद्र': 'Notifications',
  'विशेषताएं': 'Features',
  'सवाल-जवाब': 'FAQs',
  'मुफ़्त शुरू करें →': 'Start Free →',
  'डैशबोर्ड खोलें →': 'Open Dashboard →',
  'मुख्य डैशबोर्ड': 'Main Dashboard',
  'क्लासिक टूल्स व नोट्स': 'Classic Tools & Notes',
  'आज की कार्यसूची व विद्यालय प्रबंधन': "Today's Tasks & School Work",
  'सुबह की चेकलिस्ट': 'Morning Checklist',
  'शाम की समीक्षा': 'Evening Review',
  'डेमो प्रोफ़ाइल व QA परीक्षण': 'Demo Profile & QA',
  'A+ फ़ॉन्ट व सुगम्यता': 'A+ Font Size',
  'समीक्षा, बैकअप व रिपोर्ट': 'Review, Backup & Reports',
  'रीसेट (Reset)': 'Reset',
  'प्रगति पर': 'In Progress',
  'पोर्टल ↗': 'Open Portal ↗',
  'गंभीर सूची देखें →': 'View Critical List →',
  'इन कार्यों की समय-सीमा समाप्त हो चुकी है।': 'The deadline for these tasks has passed.',

  // Settings Modal tabs & buttons
  'भाषा व सामान्य': 'Language & General',
  'विद्यालय व भूमिका': 'School & Role',
  'रिमाइंडर प्राथमिकताएं': 'Reminder Alerts',
  'DPDP Act 2023 प्राइवेसी': 'Data Privacy',
  'क्लाउड सिंक व बैकअप': 'Cloud Sync & Backup',
  'रद्द करें (Cancel)': 'Cancel',
  'सेटिंग्स सुरक्षित करें (Save Settings)': 'Save Settings',

  // Sample Tasks & School Data translations
  'MDM दैनिक उपस्थिति एवं मध्याह्न भोजन लाभार्थी संख्या प्रविष्टि':
    'MDM Daily Attendance & Mid-Day Meal Beneficiary Entry',
  'प्रेरणा पोर्टल पर आज के उपस्थित छात्रों और मध्याह्न भोजन (MDM) की संख्या दोपहर 12:00 बजे से पूर्व दर्ज करें।':
    'Enter today’s student attendance and Mid-Day Meal (MDM) count on Prerna Portal before 12:00 PM.',
  'UDISE+ छात्र प्रोफाइल एवं आधार सत्यापन (कक्षा 1 से 5)':
    'UDISE+ Student Profile & Aadhaar Verification (Class 1 to 5)',
  'लंबित 8 छात्रों के अभिभावकों से संपर्क कर जन्म प्रमाण-पत्र व आधार विवरण अपडेट करें।':
    'Contact parents of 8 pending students to update birth certificate and Aadhaar details.',
  'निपुण भारत साप्ताहिक आकलन ट्रैकर अपडेट (सप्ताह 14)':
    'NIPUN Bharat Weekly Assessment Tracker Update (Week 14)',
  'कक्षा 1 से 3 के भाषा एवं गणित साप्ताहिक आकलन प्रपत्रों का संकलन व निपुण लक्ष्य ऐप पर प्रविष्टि।':
    'Compile Class 1–3 Hindi & Maths weekly assessment sheets and update on NIPUN Lakshya App.',
  'मानव संपदा (ehrms) अवकाश एवं सर्विस बुक सत्यापन':
    'Manav Sampada (eHRMS) Leave & Service Book Verification',
  'मासिक उपस्थिति लॉक होने से पूर्व अपनी सर्विस बुक और सीएल (CL) बैलेंस की जाँच करें।':
    'Verify your Service Book and Casual Leave (CL) balance before monthly attendance lock.',
  'विद्यालय प्रबंध समिति (SMC) मासिक बैठक कार्यवृत्त लेखन':
    'School Management Committee (SMC) Monthly Meeting Minutes',
  'इस माह की SMC बैठक के एजेंडा व कंपोजिट ग्रांट व्यय विवरण पंजिका में दर्ज करें।':
    'Record this month’s SMC meeting agenda and Composite Grant expenditure in the register.',
  'बाल सभा एवं शनिवार सांस्कृतिक गतिविधि आयोजन':
    'Bal Sabha & Saturday Cultural Activity Organization',
  'शनिवार को नो-बैग डे (No Bag Day) के अंतर्गत बच्चों की कहानी वाचन व चित्रकला प्रतियोगिता कराना।':
    'Conduct children’s storytelling and drawing activity on Saturday under No-Bag Day.',
  'पुस्तकालय (Library) पुस्तक वितरण पंजिका अपडेट':
    'School Library Book Distribution Register Update',
  'कक्षा 4 व 5 के छात्रों को रीडिंग कॉर्नर से नई कहानी की पुस्तकें आवंटित करना।':
    'Issue new storybooks from the Reading Corner to Class 4 and 5 students.',
  'रसोइया मानदेय एवं खाद्यान्न (गेहूँ/चावल) स्टॉक मिलान':
    'Cook Honorarium & Foodgrain (Wheat/Rice) Stock Verification',
  'कोटेदार से प्राप्त खाद्यान्न बोरी का वजन व पंजिका में प्रविष्टि सत्यापित करें।':
    'Verify foodgrain sack weight received from fair-price shop and update stock register.',
  'प्रेरणा पोर्टल (MDM)': 'Prerna Portal (MDM)',
  'UDISE+ पोर्टल': 'UDISE+ Portal',
  'निपुण भारत मिशन': 'NIPUN Bharat Mission',
  'मानव संपदा पोर्टल': 'Manav Sampada Portal',
  'विद्यालय पंजिका': 'School Register',
  'सह-पाठ्यक्रम': 'Co-Curricular',
  'पुस्तकालय पंजिका': 'Library Register',
  'एमडीएम पंजिका': 'MDM Register',
  'शासनादेश संख्या: 1428/बेसिक-शिक्षा/2026': 'Govt Order No: 1428/Basic-Shiksha/2026',
  'प्राथमिक विद्यालय मॉडलपुर, ब्लॉक सदर': 'Primary School Modelpur, Block Sadar',
  'प्राथमिक विद्यालय (कंपोजिट), लखनऊ': 'Primary School (Composite), Lucknow',
  'श्री राजेश कुमार शर्मा': 'Shri Rajesh Kumar Sharma',
  'शिक्षक जी': 'Teacher',
  'सहायक अध्यापक (PRT)': 'Assistant Teacher (PRT)',
  'अति आवश्यक': 'Urgent',
  'उच्च प्राथमिकता': 'High Priority',
  'सामान्य': 'Normal',
  'कम प्राथमिकता': 'Low Priority',
  'प्रशासनिक': 'Administrative',
  'अकादमिक / शिक्षण': 'Academic',
  'शैक्षणिक': 'Academic',
  'सह-पाठ्यक्रम / अन्य': 'Extra-curricular',
  'सह-पाठ्यचर्या': 'Extra-curricular',
  'श्रेणी अनुसार छाँटें (Filter by Category):': 'Filter by Category:',
  'दैनिक': 'Daily',
  '+ बैठक जोड़ें': '+ Add Meeting',
  '+ प्रशिक्षण जोड़ें': '+ Add Training',
  '✓ पूर्ण करें': '✓ Mark Done',
  '✓ संपन्न': '✓ Completed',
  '↺ पुनः खोलें': '↺ Reopen',
  'लिंक खोलें ↗': 'Open Link ↗',
  'ऑनलाइन': 'Online',
  'विद्यालय परिसर': 'School Campus',

  // Exact Sample Tasks from teacherHubSampleData.ts
  'UDISE+ छात्र प्रोफ़ाइल व आधार प्रमाणीकरण (Student Profile & Aadhaar Verification)':
    'UDISE+ Student Profile & Aadhaar Verification',
  'सभी नव-प्रवेशी व मौजूदा छात्रों के आधार व माता-पिता के विवरण का UDISE+ पोर्टल पर शत-प्रतिशत सत्यापन।':
    '100% verification of Aadhaar and parent details for all new and existing students on UDISE+ portal.',
  'मासिक मध्याह्न भोजन (MDM) खाद्यान्न व कन्वर्जन कॉस्ट रिपोर्ट जमा':
    'Submit Monthly Mid-Day Meal (MDM) Foodgrain & Conversion Cost Report',
  'गत माह का छात्र उपस्थिति अनुसार खाद्यान्न उपभोग व परिवर्तन लागत विवरण बीआरसी को प्रेषित करना।':
    'Send last month’s foodgrain consumption and conversion cost details to BRC as per student attendance.',
  'प्रेरणा ऐप पर दैनिक छात्र व शिक्षक उपस्थिति (Prerna Daily Attendance)':
    'Prerna App Daily Student & Teacher Attendance',
  'प्रातः विद्यालय समय में जियो-फेंसिंग (Geo-fencing) के अंतर्गत छात्र व शिक्षक डिजिटल उपस्थिति दर्ज करना।':
    'Mark digital attendance of students and teachers under Geo-fencing during morning school hours.',
  'मध्याह्न भोजन (MDM) दैनिक लाभार्थी संख्या IVRS कॉल / SMS प्रेषण':
    'Mid-Day Meal (MDM) Daily Beneficiary Count IVRS Call / SMS',
  'आज भोजन ग्रहण करने वाले पंजीकृत विद्यार्थियों की संख्या 15544 टोल-फ्री आईवीआरएस पर दर्ज करना।':
    'Report today’s registered student meal count on the 15544 toll-free IVRS number.',
  'दीक्षा (DIKSHA) FLN 3.0 मॉड्यूल-4 ऑनलाइन असेसमेंट क्विज':
    'DIKSHA FLN 3.0 Module-4 Online Assessment Quiz',
  'बुनियादी भाषा एवं संख्या ज्ञान (FLN) प्रशिक्षण मॉड्यूल पूर्ण कर 70% अंकों के साथ प्रमाणपत्र प्राप्त करना।':
    'Complete Foundational Literacy & Numeracy (FLN) training module with 70% score to get certificate.',
  'कक्षा 1 से 3 निपुण तालिका (NIPUN Bharat Tracker) अद्यतन':
    'Update Class 1 to 3 NIPUN Bharat Assessment Tracker',
  'सप्ताह की शिक्षण योजना अनुसार बच्चों के अधिगम प्रतिफल (Learning Outcomes) का दैनिक अंकन।':
    'Daily marking of children’s learning outcomes according to the weekly teaching plan.',
  'प्रार्थना सभा, बाल संसद व खेलकूद गतिविधि (Morning Assembly & Sports)':
    'Morning Assembly, Bal Sansad & Sports Activity',
  'छात्रों द्वारा दैनिक समाचार वाचन, स्वच्छता जाँच एवं अपराह्न 30 मिनट आउटडोर खेल गतिविधि।':
    'Daily news reading by students, hygiene check, and 30-minute afternoon outdoor sports.',
  'विद्यालय प्रबंध समिति (SMC) मासिक बैठक':
    'School Management Committee (SMC) Monthly Meeting',
  'विद्यालय सभागार / Primary School Hall · प्रधानाध्यापक एवं एसएमसी अध्यक्ष':
    'Primary School Hall · Headmaster & SMC President',
  'संकुल शिक्षक (CRC) आकस्मिक समीक्षा ऑनलाइन बैठक':
    'Cluster Teacher (CRC) Online Review Meeting',
  'निपुण लक्ष्य ऐप (NIPUN Lakshya App) साप्ताहिक स्पॉट असेसमेंट':
    'NIPUN Lakshya App Weekly Spot Assessment',
  'एआरपी (ARP) / डायट मेंटर्स द्वारा किए जाने वाले स्पॉट असेसमेंट हेतु बच्चों का अभ्यास।':
    'Practice with students for spot assessment by ARP / DIET mentors.',
  'निःशुल्क पाठ्यपुस्तक व स्कूल बैग वितरण प्राप्ति रसीद पोर्टल अपलोड':
    'Free Textbook & School Bag Distribution Receipt Upload on Portal',
  'छात्रों को वितरित पुस्तकों की संख्या व छात्र पंजिका क्रमांक की प्रविष्टि प्रेरणा डीबीटी पोर्टल पर करना।':
    'Enter distributed book count and student register serial numbers on Prerna DBT portal.',
  'संचारी रोग नियंत्रण अभियान (Sanchari Rog) प्रभात फेरी व स्वच्छता शपथ':
    'Communicable Disease Control (Sanchari Rog) Rally & Hygiene Pledge',
  'ग्राम पंचायत में बच्चों के साथ स्वास्थ्य जागरूकता रैली एवं अभिभावक परिचर्चा।':
    'Health awareness rally with children and parent discussion in Gram Panchayat.',
  'मानव संपदा पोर्टल: सेवा पुस्तिका (e-Service Book) वार्षिक सत्यापन':
    'Manav Sampada Portal: Annual e-Service Book Verification',
  'शिक्षक सेवा अभिलेख, पदोन्नति एवं अवकाश विवरण की ऑनलाइन पुष्टि व संशोधन अनुरोध।':
    'Online confirmation and correction request for teacher service record, promotion and leave details.',
};

const WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/नमस्ते,/g, 'Hello,'],
  [/शिक्षक जी/g, 'Teacher'],
  [/प्राथमिक विद्यालय \(कंपोजिट\), लखनऊ/g, 'Primary School (Composite), Lucknow'],
  [/प्राथमिक/g, 'Primary'],
  [/कंपोजिट/g, 'Composite'],
  [/लखनऊ/g, 'Lucknow'],
  [/श्री राजेश कुमार शर्मा/g, 'Shri Rajesh Kumar Sharma'],
  [/प्राथमिक विद्यालय मॉडलपुर, ब्लॉक सदर/g, 'Primary School Modelpur, Block Sadar'],
  [/सत्र /g, 'Session '],
  [/अति गंभीर/g, 'Critical'],
  [/दिन/g, 'days'],
  [/अंतिम तिथि:/g, 'Due Date:'],
  [/विलंबित कार्य/g, 'Overdue Tasks'],
  [/आज व लंबित कार्य/g, "Today's & Pending Tasks"],
  [/आज के कार्य/g, "Today's Tasks"],
  [/सभी श्रेणियाँ/g, 'All Categories'],
  [/शुरू नहीं/g, 'Not Started'],
  [/प्रगति पर/g, 'In Progress'],
  [/विलंबित/g, 'Overdue'],
  [/पूर्ण/g, 'Completed'],
  [/अपठित/g, 'Unread'],
  [/कार्य जोड़ें/g, 'Add Task'],
  [/यहाँ क्लिक करें/g, 'Click here'],
  [/सहायक अध्यापक/g, 'Assistant Teacher'],
  [/प्रधानाध्यापक/g, 'Headmaster'],
  [/संकुल नोडल शिक्षक/g, 'Cluster Nodal Teacher'],
  [/विद्यालय/g, 'School'],
  [/उपस्थिति/g, 'Attendance'],
  [/छात्र/g, 'Students'],
  [/कक्षा/g, 'Class'],
  [/शासनादेश/g, 'Govt Orders'],
  [/सरकारी पोर्टल/g, 'Govt Portals'],
  [/प्रशिक्षण/g, 'Trainings'],
  [/ड्यूटी रोस्टर/g, 'Duty Roster'],
  [/बैठकें/g, 'Meetings'],
  [/स्कूल शीट्स/g, 'School Sheets'],
  [/सूचना केंद्र/g, 'Notifications'],
  [/सेटिंग्स/g, 'Settings'],
  [/लॉगआउट/g, 'Logout'],
  [/लॉगिन/g, 'Login'],
  [/खोजें/g, 'Search'],
];

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

/**
 * Converts a Hindi or bilingual ("हिंदी / English" or "हिंदी (English)") string into clean English.
 */
export function convertBilingualOrHindiToEnglish(input: string): string {
  if (!input || !DEVANAGARI_REGEX.test(input)) return input;
  const trimmed = input.trim();

  // 1. Exact dictionary match
  if (HINDI_TO_ENGLISH_DICTIONARY[trimmed]) {
    return HINDI_TO_ENGLISH_DICTIONARY[trimmed];
  }

  // 2. Slash-separated bilingual pattern: "इंटरफ़ेस भाषा चयन / Interface Language"
  if (trimmed.includes(' / ')) {
    const parts = trimmed.split(' / ');
    const englishPart = parts.find((p) => !DEVANAGARI_REGEX.test(p) && /[A-Za-z]/.test(p));
    if (englishPart) {
      // Preserve leading emoji if present in first part
      const leadingEmojiMatch = parts[0].match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}+➕⚡📚📜🌐🎓🛡️🤝📋✅🔄🔔⚙️🚪🔍📄🔐🔢📲☁️💾]+\s*)/u);
      const prefix = leadingEmojiMatch ? leadingEmojiMatch[1] : '';
      return `${prefix}${englishPart.trim()}`;
    }
  }

  // 3. Parenthetical bilingual pattern: "मेरी कक्षाएं (My Classes)" or "📲 ऐप इंस्टॉल (WebApp)"
  const parenMatch = trimmed.match(/^(.*?)\(([^()]+)\)\s*([→↗✕]*)$/);
  if (parenMatch) {
    const beforeParen = parenMatch[1].trim();
    const insideParen = parenMatch[2].trim();
    const suffix = parenMatch[3] ? ` ${parenMatch[3]}` : '';
    if (!DEVANAGARI_REGEX.test(insideParen) && /[A-Za-z]/.test(insideParen)) {
      const leadingEmojiMatch = beforeParen.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}+➕⚡📚📜🌐🎓🛡️🤝📋✅🔄🔔⚙️🚪🔍📄🔐🔢📲☁️💾]+\s*)/u);
      const prefix = leadingEmojiMatch ? leadingEmojiMatch[1] : '';
      return `${prefix}${insideParen}${suffix}`;
    }
  }

  // 4. Word/phrase level replacements
  let result = input;
  for (const [hi, en] of Object.entries(HINDI_TO_ENGLISH_DICTIONARY)) {
    if (result.includes(hi)) {
      result = result.split(hi).join(en);
    }
  }
  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Translates a known Hindi string or falls back cleanly when English is active.
 */
export function translateText(text: string, lang: 'hi' | 'en'): string {
  if (lang !== 'en' || !text) return text;
  return convertBilingualOrHindiToEnglish(text);
}

/**
 * Helper to pick Hindi or English string based on current language.
 */
export function pickLangText(lang: 'hi' | 'en', hi: string, en: string): string {
  return lang === 'en' ? en : hi;
}

/**
 * Walks DOM text nodes and translates remaining Hindi strings when lang === 'en',
 * or restores original Hindi text when lang === 'hi'.
 */
export function localizeDomTree(root: HTMLElement | null, lang: 'hi' | 'en'): void {
  if (!root || typeof document === 'undefined') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode() as (Text & { __origHi?: string; __lastEn?: string }) | null;

  while (currentNode) {
    const parentTag = currentNode.parentElement?.tagName;
    const skip =
      parentTag === 'SCRIPT' ||
      parentTag === 'STYLE' ||
      parentTag === 'CODE' ||
      parentTag === 'PRE' ||
      currentNode.parentElement?.getAttribute('data-no-auto-translate') === 'true';

    if (!skip) {
      const val = currentNode.nodeValue || '';
      if (lang === 'en') {
        if (DEVANAGARI_REGEX.test(val)) {
          if (!currentNode.__origHi || currentNode.__lastEn !== val) {
            currentNode.__origHi = val;
          }
          const converted = convertBilingualOrHindiToEnglish(val);
          if (converted !== val) {
            currentNode.__lastEn = converted;
            currentNode.nodeValue = converted;
          }
        }
      } else if (lang === 'hi' && currentNode.__origHi) {
        if (currentNode.nodeValue === currentNode.__lastEn) {
          currentNode.nodeValue = currentNode.__origHi;
        }
      }
    }
    currentNode = walker.nextNode() as (Text & { __origHi?: string; __lastEn?: string }) | null;
  }
}

/**
 * React hook that subscribes to language changes across the entire app.
 */
export function useAppLanguage() {
  const [lang, setLangState] = useState<'hi' | 'en'>(() => getCurrentLanguage());

  useEffect(() => {
    const syncLang = () => {
      const current = getCurrentLanguage();
      setLangState(current);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = current;
        document.documentElement.setAttribute('data-lang', current);
      }
    };

    syncLang();
    window.addEventListener('th-settings-updated', syncLang);
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLang);
    window.addEventListener('storage', syncLang);
    return () => {
      window.removeEventListener('th-settings-updated', syncLang);
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLang);
      window.removeEventListener('storage', syncLang);
    };
  }, []);

  const setLanguage = useCallback((next: 'hi' | 'en') => {
    setLangState(next);
    setCurrentLanguage(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = lang === 'en' ? 'hi' : 'en';
    setLangState(next);
    setCurrentLanguage(next);
    return next;
  }, [lang]);

  const t = useCallback(
    (hi: string, en: string) => (lang === 'en' ? en : hi),
    [lang]
  );

  const tr = useCallback(
    (text: string) => translateText(text, lang),
    [lang]
  );

  return {
    lang,
    isEn: lang === 'en',
    setLanguage,
    toggleLanguage,
    t,
    tr,
  };
}
