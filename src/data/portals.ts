import { ActionCardItem, CategoryInfo, CategoryKey, Notice, Portal, WorkspaceTool } from '../types';

export const CATEGORIES: Record<CategoryKey, CategoryInfo> = {
  c1: { name: 'सीखना और प्रशिक्षण', emoji: '📚' },
  c2: { name: 'विद्यालय प्रबंधन', emoji: '🏫' },
  c3: { name: 'रजिस्टर', emoji: '📔' },
  c4: { name: 'शिक्षक सेवा व स्वास्थ्य', emoji: '🩺' },
  c5: { name: 'परीक्षा व प्रतियोगिता', emoji: '🏆' },
  c6: { name: 'अभियान व सर्वेक्षण', emoji: '🚀' },
};

export const PORTALS: Portal[] = [
  { id: '1', name: 'iGot कर्मयोगी ऐप', category: 'c1', url: 'https://igotkarmayogi.gov.in' },
  { id: '2', name: 'दीक्षा ऐप', category: 'c1', url: 'https://diksha.gov.in' },
  { id: '3', name: 'दीक्षा कोर्स ऐप', category: 'c1', url: 'https://diksha.gov.in' },
  { id: '4', name: 'समर्थ ऐप', category: 'c1', url: '' },
  { id: '5', name: 'शारदा ऐप', category: 'c1', url: '' },
  { id: '6', name: 'TheTeacher App', category: 'c1', url: '' },
  { id: '7', name: 'रीड अलांग ऐप', category: 'c1', url: '' },
  { id: '8', name: 'निपुण प्लस ऐप', category: 'c1', url: '' },
  { id: '9', name: 'उल्लास ऐप', category: 'c1', url: '' },
  { id: '10', name: 'प्रेरणा पोर्टल', category: 'c2', url: '' },
  { id: '11', name: 'प्रेरणा DBT ऐप', category: 'c2', url: '' },
  { id: '12', name: 'SHVR स्वच्छ एवं हरित विद्यालय', category: 'c2', url: '' },
  { id: '13', name: 'विद्याज्ञान पोर्टल', category: 'c2', url: '' },
  { id: '14', name: 'प्रशस्त ऐप', category: 'c2', url: '' },
  { id: '15', name: 'किताब वितरण ऐप', category: 'c2', url: '' },
  { id: '16', name: 'ज्ञान समीक्षा ऐप', category: 'c2', url: '' },
  { id: '17', name: 'SMC बैठक रजिस्टर', category: 'c3', url: '' },
  { id: '18', name: 'माता उन्मुखीकरण रजिस्टर', category: 'c3', url: '' },
  { id: '19', name: 'ईको क्लब रजिस्टर', category: 'c3', url: '' },
  { id: '20', name: 'मीना मंच रजिस्टर', category: 'c3', url: '' },
  { id: '21', name: 'बाल संसद रजिस्टर', category: 'c3', url: '' },
  { id: '22', name: 'मानव सम्पदा पोर्टल', category: 'c4', url: 'https://uphrms.gov.in' },
  { id: '23', name: 'PFMS पोर्टल', category: 'c4', url: 'https://pfms.nic.in' },
  { id: '24', name: 'आयुष्मान ऐप', category: 'c4', url: '' },
  { id: '25', name: 'CM शिक्षक कैशलेस चिकित्सा कार्ड', category: 'c4', url: '' },
  { id: '26', name: 'इंस्पायर अवार्ड पोर्टल', category: 'c5', url: 'https://inspireawards-dst.gov.in' },
  { id: '27', name: 'NMMS परीक्षा पोर्टल', category: 'c5', url: '' },
  { id: '28', name: 'नवोदय विद्यालय प्रवेश परीक्षा', category: 'c5', url: '' },
  { id: '29', name: 'विकसित भारत बिल्डथॉन', category: 'c5', url: '' },
  { id: '30', name: 'BLO ऐप', category: 'c6', url: '' },
  { id: '31', name: 'ईको क्लब पोर्टल', category: 'c6', url: '' },
  { id: '32', name: 'विद्यांजलि पोर्टल', category: 'c6', url: '' },
  { id: '33', name: 'वीर गाथा पोर्टल', category: 'c6', url: '' },
  { id: '34', name: 'NDD कैम्पेन', category: 'c6', url: '' },
];

export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'n1',
    type: 'pinned',
    badgeText: 'PINNED',
    title: 'जनगणना 2027 फेज 2',
    text: 'जनगणना 2027 फेज 2 की सटीक जानकारी हेतु फील्ड ट्रेनर WhatsApp समूह से जुड़ें। इस समूह का लिंक अपने जनपद के अन्य शिक्षकों के साथ साझा करें।',
    meta: 'फील्ड ट्रेनर · जनगणना 2027 फेज 2',
    status: 'in_progress',
  },
  {
    id: 'n2',
    type: 'new',
    badgeText: 'NEW',
    title: 'पोर्टल लिंक अपडेट',
    text: 'पोर्टल लिंक अपडेट: जिन पोर्टल्स का लिंक अभी नहीं जुड़ा, वे जल्द ही जोड़ दिए जाएंगे।',
    meta: 'डैशबोर्ड टीम',
    status: 'pending',
  },
];

export const DEFAULT_ACTION_CARDS: ActionCardItem[] = [
  {
    id: 'ac-wa',
    title: 'जनगणना 2027 फेज 2 — WhatsApp समूह',
    subtitle: 'फील्ड ट्रेनर समूह। सटीक जानकारी हेतु जुड़ें।',
    icon: '💬',
    type: 'whatsapp',
    url: 'https://chat.whatsapp.com/BqcCSUbJLoQ1SxjwqDv7rL?s=cl&p=a&mlu=4&ilr=4',
    btnText: 'समूह से जुड़ें →',
    status: 'in_progress',
  },
  {
    id: 'ac-yt',
    title: 'YouTube चैनल',
    subtitle: 'प्रशिक्षण और मार्गदर्शन वीडियो एक जगह।',
    icon: '▶️',
    type: 'youtube',
    url: 'https://youtube.com/@',
    btnText: 'चैनल खोलें',
    status: 'not_started',
  },
];

export const DEFAULT_WORKSPACE_TOOLS: WorkspaceTool[] = [
  {
    id: 'tool-wa',
    title: 'WhatsApp',
    emoji: '💬',
    type: 'whatsapp',
    desc: 'WhatsApp Web व समूह लिंक',
    status: 'in_progress',
  },
  {
    id: 'tool-yt',
    title: 'YouTube',
    emoji: '▶️',
    type: 'youtube',
    desc: 'प्रशिक्षण वीडियो प्लेयर',
    status: 'completed',
  },
];

