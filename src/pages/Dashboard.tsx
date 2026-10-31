import React, { useState, useEffect, useRef } from 'react';
import {
  CATEGORIES,
  DEFAULT_ACTION_CARDS,
  DEFAULT_WORKSPACE_TOOLS,
  INITIAL_NOTICES,
  PORTALS,
} from '../data/portals';
import {
  ActionCardItem,
  CategoryKey,
  Notice,
  Portal,
  QuickNote,
  SectionState,
  TodoItem,
  UserProfile,
  WorkspaceTool,
  WorkStatus,
} from '../types';
import { SectionNotesModal, WORK_STATUS_CONFIG } from '../components/SectionNotesModal';
import { AddPortalModal } from '../components/AddPortalModal';
import { AddNoticeModal } from '../components/AddNoticeModal';
import { AddActionCardModal } from '../components/AddActionCardModal';
import { AddWorkspaceToolModal } from '../components/AddWorkspaceToolModal';
import { TeacherHubDashboard } from '../components/TeacherHubDashboard';
import { PortalsManager } from '../components/PortalsManager';

const NOTE_CATEGORIES: Record<
  QuickNote['category'],
  { label: string; emoji: string; badgeClass: string }
> = {
  reminder: { label: 'दैनिक रिमाइंडर', emoji: '📅', badgeClass: 'badge-new' },
  school: { label: 'विद्यालय कार्य', emoji: '🏫', badgeClass: 'badge-completed' },
  teaching: { label: 'शिक्षण बिंदु', emoji: '📝', badgeClass: 'badge-pin' },
  urgent: { label: 'आवश्यक / ज़रूरी', emoji: '⚠️', badgeClass: 'badge-pending' },
  general: { label: 'सामान्य नोट', emoji: '📌', badgeClass: 'badge-notstarted' },
};

const DEFAULT_QUICK_NOTES: QuickNote[] = [
  {
    id: 'qn-1',
    title: 'MDM खाद्यान्न स्टॉक व राशन सत्यापन',
    content:
      'शुक्रवार को कोटेदार से खाद्यान्न प्राप्ति रसीद का मिलान करना है तथा प्रेरणा पोर्टल पर स्टॉक अपडेट दर्ज करना है।',
    category: 'urgent',
    isPinned: true,
    createdAt: 'आज सुबह 08:30',
    status: 'in_progress',
  },
  {
    id: 'qn-2',
    title: 'अभिभावक-शिक्षक बैठक (SMC / PTM)',
    content:
      'कक्षा 1 से 5 के शत-प्रतिशत विद्यार्थियों के अभिभावकों को निपुण प्रगति पत्रक वितरण व उपस्थिति चर्चा हेतु आमंत्रण भेजा गया।',
    category: 'school',
    isPinned: true,
    createdAt: 'कल दोपहर 02:15',
    status: 'completed',
  },
  {
    id: 'qn-3',
    title: 'कक्षा 4 गणित — भिन्न व गुणा अभ्यास',
    content: 'दीक्षा ऐप टीएलएम (TLM) सामग्री का उपयोग कर गतिविधि आधारित शिक्षण कार्य कराना है।',
    category: 'teaching',
    isPinned: false,
    createdAt: '28 Oct',
    status: 'not_started',
  },
];

interface DashboardProps {
  currentUser: UserProfile | null;
  onToast: (msg: string) => void;
  onNavigate: (page: 'home' | 'dashboard' | 'portals' | 'govt_orders' | 'meetings' | 'sheets' | 'trainings' | 'duties' | 'notifications' | 'classes' | 'rollover' | 'safeguards' | 'login') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, onToast, onNavigate }) => {
  // Main view toggle: 'teacher_hub' (default) vs 'portals'
  const [dashboardMode, setDashboardMode] = useState<'teacher_hub' | 'portals'>('teacher_hub');

  // Date chip
  const [dateText, setDateText] = useState('');
  useEffect(() => {
    try {
      setDateText(
        new Date().toLocaleDateString('hi-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    } catch {
      setDateText('आज');
    }
  }, []);

  // -------------------------------------------------------------
  // Section States (Work Status & Attached Notes for each section)
  // -------------------------------------------------------------
  const [sectionStates, setSectionStates] = useState<Record<string, SectionState>>(() => {
    try {
      const raw = localStorage.getItem('btd-section-states');
      return raw
        ? JSON.parse(raw)
        : {
            action_cards: { status: 'in_progress', notes: 'जनगणना ग्रुप अपडेट नियमित रूप से चेक करें।' },
            workspace: { status: 'in_progress', notes: 'प्रशिक्षण वीडियो प्लेलिस्ट सहेजी गई है।' },
            notices: { status: 'pending', notes: 'BRC आदेश पर तुरंत हस्ताक्षर करवाकर जमा करना है।' },
            portals: { status: 'in_progress', notes: 'महीने के अंत में प्रेरणा पोर्टल व MDM रिपोर्ट भरनी है।' },
            quick_notes: { status: 'in_progress', notes: 'दैनिक रिमाइंडर सूची अद्यतन है।' },
            tools: { status: 'not_started', notes: 'साप्ताहिक कार्य सूची तैयार करें।' },
          };
    } catch {
      return {
        action_cards: { status: 'in_progress', notes: '' },
        workspace: { status: 'in_progress', notes: '' },
        notices: { status: 'pending', notes: '' },
        portals: { status: 'in_progress', notes: '' },
        quick_notes: { status: 'in_progress', notes: '' },
        tools: { status: 'not_started', notes: '' },
      };
    }
  });

  const saveSectionStates = (updated: Record<string, SectionState>) => {
    setSectionStates(updated);
    try {
      localStorage.setItem('btd-section-states', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const updateSectionState = (secKey: string, partial: Partial<SectionState>) => {
    const prev = sectionStates[secKey] || { status: 'not_started', notes: '' };
    const next = { ...prev, ...partial, updatedAt: new Date().toISOString() };
    const updated = { ...sectionStates, [secKey]: next };
    saveSectionStates(updated);
  };

  // Section Notes Modal State
  const [activeNotesModal, setActiveNotesModal] = useState<{
    key: string;
    title: string;
    icon: string;
  } | null>(null);

  // Status cycler helper
  const nextStatus = (curr: WorkStatus = 'not_started'): WorkStatus => {
    if (curr === 'not_started') return 'in_progress';
    if (curr === 'in_progress') return 'pending';
    if (curr === 'pending') return 'completed';
    return 'not_started';
  };

  // -------------------------------------------------------------
  // 1. Action Cards Section (Editable: Add / Edit / Delete / Status)
  // -------------------------------------------------------------
  const [actionCards, setActionCards] = useState<ActionCardItem[]>(() => {
    try {
      const raw = localStorage.getItem('btd-action-cards');
      return raw ? JSON.parse(raw) : DEFAULT_ACTION_CARDS;
    } catch {
      return DEFAULT_ACTION_CARDS;
    }
  });
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<ActionCardItem | null>(null);

  const saveActionCards = (updated: ActionCardItem[]) => {
    setActionCards(updated);
    try {
      localStorage.setItem('btd-action-cards', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSaveActionCard = (card: ActionCardItem) => {
    const exists = actionCards.some((c) => c.id === card.id);
    const updated = exists ? actionCards.map((c) => (c.id === card.id ? card : c)) : [...actionCards, card];
    saveActionCards(updated);
    onToast(exists ? '✏️ कार्ड अपडेट हो गया' : '＋ नया कार्ड जुड़ गया');
  };

  const handleDeleteActionCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस कार्ड को हटाना चाहते हैं?')) {
      const updated = actionCards.filter((c) => c.id !== id);
      saveActionCards(updated);
      onToast('🗑️ कार्ड हटा दिया गया');
    }
  };

  const handleCycleCardStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = actionCards.map((c) => {
      if (c.id === id) {
        const next = nextStatus(c.status);
        onToast(`स्थिति: ${WORK_STATUS_CONFIG[next].label}`);
        return { ...c, status: next };
      }
      return c;
    });
    saveActionCards(updated);
  };

  const copyLink = (link: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        onToast('📋 लिंक कॉपी हो गया!');
      });
    } else {
      onToast('📋 लिंक: ' + link);
    }
  };

  // -------------------------------------------------------------
  // 2. Smart Workspace Section (Editable: Add / Delete Tool Tabs)
  // -------------------------------------------------------------
  const [workspaceTools, setWorkspaceTools] = useState<WorkspaceTool[]>(() => {
    try {
      const raw = localStorage.getItem('btd-workspace-tools');
      return raw ? JSON.parse(raw) : DEFAULT_WORKSPACE_TOOLS;
    } catch {
      return DEFAULT_WORKSPACE_TOOLS;
    }
  });
  const [activeToolId, setActiveToolId] = useState<string>('tool-wa');
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);

  const saveWorkspaceTools = (updated: WorkspaceTool[]) => {
    setWorkspaceTools(updated);
    try {
      localStorage.setItem('btd-workspace-tools', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSaveWorkspaceTool = (tool: WorkspaceTool) => {
    const updated = [...workspaceTools, tool];
    saveWorkspaceTools(updated);
    setActiveToolId(tool.id);
    onToast('＋ नया वर्कस्पेस टूल जुड़ गया');
  };

  const handleDeleteWorkspaceTool = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस टूल को हटाना चाहते हैं?')) {
      const updated = workspaceTools.filter((t) => t.id !== id);
      saveWorkspaceTools(updated);
      if (activeToolId === id) {
        setActiveToolId(updated[0]?.id || 'tool-wa');
      }
      onToast('🗑️ टूल हटा दिया गया');
    }
  };

  // YouTube player in Workspace
  const [videoInput, setVideoInput] = useState<string>(() => {
    try {
      return localStorage.getItem('btd-workspace-video') || '';
    } catch {
      return '';
    }
  });
  const [currentVideoId, setCurrentVideoId] = useState<string>('');

  const parseYoutubeId = (url: string): string => {
    if (!url) return '';
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      if (host === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
      if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
        if (u.searchParams.get('v')) return u.searchParams.get('v') || '';
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length > 1 && ['embed', 'shorts', 'live'].includes(parts[0])) return parts[1];
      }
    } catch {
      if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    }
    return '';
  };

  const loadVideo = (url: string) => {
    const id = parseYoutubeId(url);
    if (!id) {
      onToast('⚠️ सही YouTube वीडियो लिंक डालें');
      return;
    }
    setCurrentVideoId(id);
    try {
      localStorage.setItem('btd-workspace-video', url);
    } catch {
      // ignore
    }
    onToast('▶️ वीडियो लोड हो गया!');
  };

  useEffect(() => {
    if (videoInput) {
      const id = parseYoutubeId(videoInput);
      if (id) setCurrentVideoId(id);
    }
  }, []);

  // -------------------------------------------------------------
  // 3. Notices Section (Editable: Add / Edit / Delete / Status)
  // -------------------------------------------------------------
  const [notices, setNotices] = useState<Notice[]>(() => {
    try {
      const raw = localStorage.getItem('btd-notices');
      return raw ? JSON.parse(raw) : INITIAL_NOTICES;
    } catch {
      return INITIAL_NOTICES;
    }
  });
  const [isAddNoticeOpen, setIsAddNoticeOpen] = useState(false);
  const [noticeToEdit, setNoticeToEdit] = useState<Notice | null>(null);

  const saveNotices = (updated: Notice[]) => {
    setNotices(updated);
    try {
      localStorage.setItem('btd-notices', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSaveNotice = (notice: Notice) => {
    const exists = notices.some((n) => n.id === notice.id);
    const updated = exists ? notices.map((n) => (n.id === notice.id ? notice : n)) : [notice, ...notices];
    saveNotices(updated);
    onToast(exists ? '✏️ नोटिस अपडेट हो गया' : '＋ नया नोटिस जोड़ा गया');
  };

  const handleDeleteNotice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस नोटिस को हटाना चाहते हैं?')) {
      const updated = notices.filter((n) => n.id !== id);
      saveNotices(updated);
      onToast('🗑️ नोटिस हटा दिया गया');
    }
  };

  const handleCycleNoticeStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notices.map((n) => {
      if (n.id === id) {
        const next = nextStatus(n.status);
        onToast(`नोटिस स्थिति: ${WORK_STATUS_CONFIG[next].label}`);
        return { ...n, status: next };
      }
      return n;
    });
    saveNotices(updated);
  };

  // -------------------------------------------------------------
  // 4. Portals Section (Editable: Add / Edit / Delete / Status)
  // -------------------------------------------------------------
  const [portalsList, setPortalsList] = useState<Portal[]>(() => {
    try {
      const raw = localStorage.getItem('btd-portals');
      return raw ? JSON.parse(raw) : PORTALS;
    } catch {
      return PORTALS;
    }
  });
  const [isAddPortalOpen, setIsAddPortalOpen] = useState(false);
  const [portalToEdit, setPortalToEdit] = useState<Portal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<CategoryKey | 'all'>('all');
  const [portalStatusFilter, setPortalStatusFilter] = useState<WorkStatus | 'all'>('all');

  const savePortalsList = (updated: Portal[]) => {
    setPortalsList(updated);
    try {
      localStorage.setItem('btd-portals', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleSavePortal = (portal: Portal) => {
    const exists = portalsList.some((p) => p.id === portal.id);
    const updated = exists
      ? portalsList.map((p) => (p.id === portal.id ? portal : p))
      : [portal, ...portalsList];
    savePortalsList(updated);
    onToast(exists ? '✏️ पोर्टल अपडेट हो गया' : '＋ नया पोर्टल जोड़ दिया गया');
  };

  const handleDeletePortal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस पोर्टल को हटाना चाहते हैं?')) {
      const updated = portalsList.filter((p) => p.id !== id);
      savePortalsList(updated);
      onToast('🗑️ पोर्टल हटा दिया गया');
    }
  };

  const handleCyclePortalStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = portalsList.map((p) => {
      if (p.id === id) {
        const next = nextStatus(p.status);
        onToast(`पोर्टल कार्य स्थिति: ${WORK_STATUS_CONFIG[next].label}`);
        return { ...p, status: next };
      }
      return p;
    });
    savePortalsList(updated);
  };

  const handlePortalClick = (portal: Portal) => {
    if (portal.url) {
      window.open(portal.url, '_blank', 'noopener,noreferrer');
    } else {
      onToast(`🔗 "${portal.name}" का लिंक जल्द जोड़ा जाएगा`);
    }
  };

  const filteredPortals = portalsList.filter((p) => {
    if (selectedCat !== 'all' && p.category !== selectedCat) return false;
    if (portalStatusFilter !== 'all' && (p.status || 'not_started') !== portalStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const catName = CATEGORIES[p.category]?.name?.toLowerCase() || '';
      return p.name.toLowerCase().includes(q) || catName.includes(q);
    }
    return true;
  });

  // -------------------------------------------------------------
  // 5. Quick Notes Section (Editable: Add / Edit / Delete / Status)
  // -------------------------------------------------------------
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>(() => {
    try {
      const raw = localStorage.getItem('btd-quick-notes');
      return raw ? JSON.parse(raw) : DEFAULT_QUICK_NOTES;
    } catch {
      return DEFAULT_QUICK_NOTES;
    }
  });

  const [qnTitle, setQnTitle] = useState('');
  const [qnContent, setQnContent] = useState('');
  const [qnCategory, setQnCategory] = useState<QuickNote['category']>('reminder');
  const [qnPinned, setQnPinned] = useState(false);
  const [qnStatus, setQnStatus] = useState<WorkStatus>('not_started');
  const [qnFilter, setQnFilter] = useState<'all' | 'pinned' | QuickNote['category']>('all');
  const [qnSearch, setQnSearch] = useState('');

  const saveQuickNotes = (updated: QuickNote[]) => {
    setQuickNotes(updated);
    try {
      localStorage.setItem('btd-quick-notes', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddQuickNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const contentTrimmed = qnContent.trim();
    const titleTrimmed = qnTitle.trim();

    if (!contentTrimmed && !titleTrimmed) {
      onToast('⚠️ कृपया नोट का शीर्षक या विवरण लिखें');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' });

    const newNote: QuickNote = {
      id: 'qn-' + Date.now().toString(),
      title: titleTrimmed || 'दैनिक रिमाइंडर',
      content: contentTrimmed,
      category: qnCategory,
      isPinned: qnPinned,
      status: qnStatus,
      createdAt: `आज ${timeStr} (${dateStr})`,
    };

    const updated = [newNote, ...quickNotes];
    saveQuickNotes(updated);
    setQnTitle('');
    setQnContent('');
    setQnPinned(false);
    setQnStatus('not_started');
    onToast('📌 क्विक नोट सुरक्षित हो गया!');
  };

  const handleTogglePinNote = (id: string) => {
    const updated = quickNotes.map((note) =>
      note.id === id ? { ...note, isPinned: !note.isPinned } : note
    );
    saveQuickNotes(updated);
    onToast('📌 पिन स्थिति अपडेट हुई');
  };

  const handleDeleteQuickNote = (id: string) => {
    const updated = quickNotes.filter((note) => note.id !== id);
    saveQuickNotes(updated);
    onToast('🗑️ नोट हटा दिया गया');
  };

  const handleCycleNoteStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quickNotes.map((n) => {
      if (n.id === id) {
        const next = nextStatus(n.status);
        onToast(`नोट स्थिति: ${WORK_STATUS_CONFIG[next].label}`);
        return { ...n, status: next };
      }
      return n;
    });
    saveQuickNotes(updated);
  };

  const handleCopyQuickNote = (note: QuickNote) => {
    const textToCopy = `${note.title ? note.title + '\n' : ''}${note.content}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        onToast('📋 नोट कॉपी हो गया!');
      });
    } else {
      onToast('📋 कॉपी: ' + textToCopy.slice(0, 30) + '...');
    }
  };

  const filteredQuickNotes = quickNotes
    .filter((note) => {
      if (qnFilter === 'pinned' && !note.isPinned) return false;
      if (qnFilter !== 'all' && qnFilter !== 'pinned' && note.category !== qnFilter) return false;
      if (qnSearch.trim()) {
        const q = qnSearch.toLowerCase().trim();
        return (
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q) ||
          NOTE_CATEGORIES[note.category].label.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  // -------------------------------------------------------------
  // 6. Tools Section (To-Do & Scratchpad)
  // -------------------------------------------------------------
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const raw = localStorage.getItem('btd-todos');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newTodoText, setNewTodoText] = useState('');

  const saveTodos = (updated: TodoItem[]) => {
    setTodos(updated);
    try {
      localStorage.setItem('btd-todos', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAddTodo = () => {
    const trimmed = newTodoText.trim();
    if (!trimmed) return;
    const newItem: TodoItem = {
      id: Date.now().toString(),
      text: trimmed,
      done: false,
      status: 'in_progress',
    };
    saveTodos([...todos, newItem]);
    setNewTodoText('');
    onToast('✅ काम जोड़ दिया गया');
  };

  const handleToggleTodo = (index: number) => {
    const updated = [...todos];
    updated[index].done = !updated[index].done;
    updated[index].status = updated[index].done ? 'completed' : 'in_progress';
    saveTodos(updated);
  };

  const handleDeleteTodo = (index: number) => {
    const updated = [...todos];
    updated.splice(index, 1);
    saveTodos(updated);
    onToast('🗑️ काम हटा दिया गया');
  };

  // Scratchpad Notes
  const [notes, setNotes] = useState<string>(() => {
    try {
      return localStorage.getItem('btd-notes') || '';
    } catch {
      return '';
    }
  });
  const [saveStatus, setSaveStatus] = useState<string>('💾 अपने आप सेव होता है');
  const noteTimerRef = useRef<any>(null);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('btd-notes', val);
        const timeStr = new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
        setSaveStatus(`✅ सेव हो गया (${timeStr})`);
      } catch {
        setSaveStatus('⚠️ सेव नहीं हो पाया');
      }
    }, 400);
  };

  // Global Reset to Defaults
  const handleResetAllDefaults = () => {
    if (window.confirm('क्या आप पूरे डैशबोर्ड को डिफ़ॉल्ट स्थिति में रीसेट करना चाहते हैं?')) {
      localStorage.removeItem('btd-action-cards');
      localStorage.removeItem('btd-workspace-tools');
      localStorage.removeItem('btd-notices');
      localStorage.removeItem('btd-portals');
      localStorage.removeItem('btd-quick-notes');
      localStorage.removeItem('btd-section-states');
      setActionCards(DEFAULT_ACTION_CARDS);
      setWorkspaceTools(DEFAULT_WORKSPACE_TOOLS);
      setNotices(INITIAL_NOTICES);
      setPortalsList(PORTALS);
      setQuickNotes(DEFAULT_QUICK_NOTES);
      onToast('🔄 डैशबोर्ड सफलतापूर्वक रीसेट हो गया!');
    }
  };

  const teacherName = currentUser?.name || 'शिक्षक जी';

  // Section Header Control Helper
  const renderSectionHeader = (
    secKey: string,
    title: string,
    icon: string,
    onAddClick?: () => void,
    addBtnLabel = '＋ नया जोड़ें'
  ) => {
    const secState = sectionStates[secKey] || { status: 'not_started', notes: '' };
    const cfg = WORK_STATUS_CONFIG[secState.status || 'not_started'];
    const hasNotes = Boolean(secState.notes && secState.notes.trim().length > 0);

    return (
      <div className="sec-header-bar">
        <div className="sec-title-group">
          <h2 className="section-h" style={{ margin: 0 }}>
            {icon} {title}
          </h2>
        </div>

        <div className="sec-actions-group">
          {/* Work Status Badge / Button */}
          <button
            type="button"
            className="status-badge-btn"
            onClick={() => {
              const next = nextStatus(secState.status);
              updateSectionState(secKey, { status: next });
              onToast(`सेक्शन स्थिति: ${WORK_STATUS_CONFIG[next].label}`);
            }}
            title="क्लिक करके कार्य स्थिति बदलें"
          >
            <span>{cfg.emoji}</span>
            <span>{cfg.label}</span>
          </button>

          {/* Attached Notes Window Button */}
          <button
            type="button"
            className={`sec-notes-btn ${hasNotes ? 'has-notes' : ''}`}
            onClick={() => setActiveNotesModal({ key: secKey, title, icon })}
            title="इस सेक्शन की नोट्स विंडो खोलें"
          >
            <span>📝 नोट्स विंडो</span>
            {hasNotes && <span className="sec-notes-badge-dot" />}
          </button>

          {/* Add Item Button */}
          {onAddClick && (
            <button
              type="button"
              className="btn btn-neon btn-sm"
              onClick={onAddClick}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              {addBtnLabel}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="dash">
      {/* Welcome Bar */}
      <div className="welcome-bar">
        <div>
          <h1>
            नमस्ते, <span>{teacherName}</span>! 👋
          </h1>
          <div style={{ fontSize: '0.88rem', color: 'var(--ink2)', marginTop: '2px' }}>
            हर सेक्शन को आप जोड़, संपादित या हटा सकते हैं। सभी नोट्स व कार्य स्थिति सुरक्षित रहती है।
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="date-chip">{dateText}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleResetAllDefaults}
            title="डिफ़ॉल्ट सेटिंग्स पुनः लोड करें"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            🔄 रीसेट
          </button>
        </div>
      </div>

      {/* View Switcher: Teacher Hub vs Portals Directory */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '6px',
          borderRadius: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--glass-border)',
          marginBottom: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}
      >
        <button
          type="button"
          onClick={() => setDashboardMode('teacher_hub')}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: 'none',
            fontFamily: 'var(--font-b)',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.25s ease',
            background: dashboardMode === 'teacher_hub' ? 'var(--brand)' : 'transparent',
            color: dashboardMode === 'teacher_hub' ? '#ffffff' : 'var(--ink2)',
            boxShadow: dashboardMode === 'teacher_hub' ? '0 4px 14px rgba(13,91,73,0.35)' : 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>⚡</span>
          <span>मुख्य शिक्षक हब (Teacher Hub)</span>
        </button>

        <button
          type="button"
          onClick={() => setDashboardMode('portals')}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: 'none',
            fontFamily: 'var(--font-b)',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.25s ease',
            background: dashboardMode === 'portals' ? 'var(--brand)' : 'transparent',
            color: dashboardMode === 'portals' ? '#ffffff' : 'var(--ink2)',
            boxShadow: dashboardMode === 'portals' ? '0 4px 14px rgba(13,91,73,0.35)' : 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>📂</span>
          <span>पोर्टल व टूल्स निर्देशिका (Portals Directory)</span>
        </button>
      </div>

      {dashboardMode === 'teacher_hub' ? (
        <TeacherHubDashboard onToast={onToast} currentUser={currentUser} onNavigate={onNavigate} />
      ) : (
        <>
          {/* Portals and Apps Module */}
          <div style={{ marginBottom: '32px' }}>
            <PortalsManager onToast={onToast} onNavigate={onNavigate} />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 1. Action Cards Section (Editable: Add / Edit / Delete / Status) */}
          {/* ------------------------------------------------------------- */}
          <section id="action-cards" style={{ marginBottom: '28px' }}>
        {renderSectionHeader('action_cards', 'एक्शन हब व ग्रुप लिंक्स', '💬', () => {
          setCardToEdit(null);
          setIsAddCardOpen(true);
        }, '＋ नया कार्ड जोड़ें')}

        <div className="action-cards">
          {actionCards.map((card) => {
            const stCfg = WORK_STATUS_CONFIG[card.status || 'not_started'];
            return (
              <div key={card.id} className="glass-card action-card">
                <div className="item-actions-top">
                  <button
                    type="button"
                    className="item-status-pill badge"
                    style={{ background: 'var(--surface2)', color: 'var(--ink)' }}
                    onClick={(e) => handleCycleCardStatus(card.id, e)}
                    title="क्लिक करके स्थिति बदलें"
                  >
                    {stCfg.emoji} {stCfg.label}
                  </button>

                  <div className="card-action-btns">
                    <button
                      type="button"
                      className="card-icon-btn"
                      onClick={(e) => copyLink(card.url, e)}
                      title="लिंक कॉपी करें"
                    >
                      📋 कॉपी
                    </button>
                    <button
                      type="button"
                      className="card-icon-btn"
                      onClick={() => {
                        setCardToEdit(card);
                        setIsAddCardOpen(true);
                      }}
                      title="संपादित करें"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="card-icon-btn danger"
                      onClick={(e) => handleDeleteActionCard(card.id, e)}
                      title="हटाएँ"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="ac-head">
                  <div
                    className={`ac-icon ${
                      card.type === 'whatsapp' ? 'ac-wa' : card.type === 'youtube' ? 'ac-yt' : 'ac-wa'
                    }`}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <div className="ac-title">{card.title}</div>
                    <div className="ac-sub">{card.subtitle}</div>
                  </div>
                </div>

                <div className="ac-btns">
                  <a
                    className={`btn btn-sm ${
                      card.type === 'whatsapp' ? 'btn-wa' : card.type === 'youtube' ? 'btn-yt' : 'btn-neon'
                    }`}
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {card.btnText || 'खोलें →'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. Smart Workspace Section (Editable: Add / Delete Tool Tabs) */}
      {/* ------------------------------------------------------------- */}
      <section className="workspace-section" id="workspace" aria-labelledby="workspaceTitle">
        {renderSectionHeader('workspace', 'Smart Workspace', '🖥️', () => {
          setIsAddToolOpen(true);
        }, '＋ नया टूल जोड़ें')}

        <div className="glass-card workspace-card">
          <div className="workspace-tabs" role="tablist" aria-label="Smart Workspace ऐप">
            {workspaceTools.map((tool) => (
              <div
                key={tool.id}
                style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
              >
                <button
                  className={`workspace-tab ${activeToolId === tool.id ? 'active' : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={activeToolId === tool.id}
                  onClick={() => setActiveToolId(tool.id)}
                >
                  {tool.emoji} {tool.title}
                </button>
                {tool.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteWorkspaceTool(tool.id, e)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--ink2)',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontSize: '0.8rem',
                    }}
                    title="टूल हटाएँ"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Active Workspace View */}
          {activeToolId === 'tool-wa' && (
            <div className="workspace-panel">
              <div className="workspace-message">
                <div className="workspace-big-icon">💬</div>
                <div>
                  <h3>WhatsApp Web</h3>
                  <p>
                    WhatsApp अपनी सुरक्षा नीति के कारण दूसरे पेज के अंदर एम्बेड होने की अनुमति नहीं देता। नीचे दिए बटन से इसे नए टैब में खोलें या जनगणना समूह से जुड़ें।
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                <a
                  className="btn btn-wa"
                  href="https://web.whatsapp.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Web खोलें ↗
                </a>
                <a
                  className="workspace-secondary"
                  href="https://chat.whatsapp.com/BqcCSUbJLoQ1SxjwqDv7rL?s=cl&p=a&mlu=4&ilr=4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  जनगणना 2027 WhatsApp समूह से जुड़ें
                </a>
              </div>
            </div>
          )}

          {activeToolId === 'tool-yt' && (
            <div className="workspace-panel">
              <div className="workspace-video-tools">
                <label htmlFor="ytVideoUrl">YouTube वीडियो का लिंक डालें</label>
                <div className="workspace-url-row">
                  <input
                    id="ytVideoUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadVideo(videoInput.trim());
                    }}
                  />
                  <button
                    className="btn btn-yt btn-sm"
                    type="button"
                    onClick={() => loadVideo(videoInput.trim())}
                  >
                    चलाएँ
                  </button>
                </div>
                <p className="workspace-help">
                  ट्रेनिंग वीडियो लिंक डालकर उसे इसी डैशबोर्ड में देखें। लिंक आपके ब्राउज़र में सेव रहेगा।
                </p>
              </div>

              <div className="workspace-player">
                {currentVideoId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(currentVideoId)}`}
                    title="YouTube वीडियो प्लेयर"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <div className="workspace-player-empty">
                    ▶️ यहाँ आपका YouTube वीडियो दिखाई देगा। ऊपर वीडियो का लिंक पेस्ट करके 'चलाएँ' दबाएँ।
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Tool View */}
          {activeToolId !== 'tool-wa' && activeToolId !== 'tool-yt' && (
            <div className="workspace-panel">
              {(() => {
                const currentTool = workspaceTools.find((t) => t.id === activeToolId);
                if (!currentTool) return null;
                return (
                  <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{currentTool.emoji}</div>
                    <h3>{currentTool.title}</h3>
                    <p style={{ color: 'var(--ink2)', maxWidth: '480px', margin: '8px auto 20px' }}>
                      {currentTool.desc || 'यह शिक्षक वर्कस्पेस के लिए जोड़ा गया टूल है।'}
                    </p>
                    {currentTool.url ? (
                      <a
                        className="btn btn-neon"
                        href={currentTool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🔗 {currentTool.title} खोलें ↗
                      </a>
                    ) : (
                      <p style={{ color: 'var(--ink2)' }}>इस टूल का कोई लिंक उपलब्ध नहीं है।</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. Notices Section (Editable: Add / Edit / Delete / Status) */}
      {/* ------------------------------------------------------------- */}
      <section id="notices" style={{ marginBottom: '28px' }}>
        {renderSectionHeader('notices', 'नोटिस बोर्ड व आदेश', '📢', () => {
          setNoticeToEdit(null);
          setIsAddNoticeOpen(true);
        }, '＋ नया नोटिस जोड़ें')}

        <div className="notice-list">
          {notices.map((n) => {
            const stCfg = WORK_STATUS_CONFIG[n.status || 'not_started'];
            return (
              <div key={n.id} className="glass-card notice-item" style={{ flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="n-icon">
                      {n.type === 'pinned' ? '📌' : n.type === 'urgent' ? '⚠️' : '🆕'}
                    </span>
                    <span className={`badge ${n.type === 'pinned' ? 'badge-pin' : 'badge-new'}`}>
                      {n.badgeText}
                    </span>
                    <button
                      type="button"
                      className="item-status-pill badge"
                      style={{ background: 'var(--surface2)', color: 'var(--ink)' }}
                      onClick={(e) => handleCycleNoticeStatus(n.id, e)}
                      title="क्लिक करके नोटिस स्थिति बदलें"
                    >
                      {stCfg.emoji} {stCfg.label}
                    </button>
                  </div>

                  <div className="card-action-btns">
                    <button
                      type="button"
                      className="card-icon-btn"
                      onClick={() => {
                        setNoticeToEdit(n);
                        setIsAddNoticeOpen(true);
                      }}
                      title="नोटिस संपादित करें"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="card-icon-btn danger"
                      onClick={(e) => handleDeleteNotice(n.id, e)}
                      title="नोटिस हटाएँ"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div>
                  <p style={{ margin: 0 }}>
                    <strong>{n.title}</strong>: {n.text}
                  </p>
                  <div className="notice-meta" style={{ marginTop: '6px' }}>
                    {n.meta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. Portals Section (Editable: Add / Edit / Delete / Status) */}
      {/* ------------------------------------------------------------- */}
      <section id="portals" style={{ marginBottom: '36px' }}>
        {renderSectionHeader('portals', 'सभी पोर्टल और ऐप', '🔗', () => {
          setPortalToEdit(null);
          setIsAddPortalOpen(true);
        }, '＋ नया पोर्टल जोड़ें')}

        <div className="portal-tools">
          <input
            type="search"
            className="search-box"
            placeholder="🔍 पोर्टल खोजें… (जैसे: दीक्षा, PFMS, प्रेरणा)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="qn-select"
            value={portalStatusFilter}
            onChange={(e) => setPortalStatusFilter(e.target.value as WorkStatus | 'all')}
            style={{ minWidth: '160px' }}
            aria-label="कार्य स्थिति फ़िल्टर"
          >
            <option value="all">⚡ सभी स्थितियाँ</option>
            <option value="completed">🟢 केवल पूर्ण पोर्टल</option>
            <option value="in_progress">🟡 प्रगति पर पोर्टल</option>
            <option value="pending">🟠 केवल लंबित पोर्टल</option>
            <option value="not_started">⚪ अप्रारंभ पोर्टल</option>
          </select>
        </div>

        <div className="chips">
          <button
            className={`chip ${selectedCat === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCat('all')}
            type="button"
          >
            सभी ({portalsList.length})
          </button>
          {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
            const cat = CATEGORIES[key];
            const count = portalsList.filter((p) => p.category === key).length;
            return (
              <button
                key={key}
                className={`chip ${selectedCat === key ? 'active' : ''}`}
                onClick={() => setSelectedCat(key)}
                type="button"
              >
                {cat.emoji} {cat.name} ({count})
              </button>
            );
          })}
        </div>

        <div className="portal-grid">
          {filteredPortals.length > 0 ? (
            filteredPortals.map((portal) => {
              const stCfg = WORK_STATUS_CONFIG[portal.status || 'not_started'];
              return (
                <div
                  key={portal.id}
                  className="glass-card portal-tile"
                  onClick={() => handlePortalClick(portal)}
                  title={portal.url ? `${portal.url} खोलें` : 'लिंक जल्द जुड़ेगा'}
                  style={{ position: 'relative' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <span className="p-icon">{CATEGORIES[portal.category]?.emoji || '🔗'}</span>
                    <div className="card-action-btns" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="item-status-pill badge"
                        style={{ background: 'var(--surface2)', color: 'var(--ink)' }}
                        onClick={(e) => handleCyclePortalStatus(portal.id, e)}
                        title="कार्य स्थिति बदलें"
                      >
                        {stCfg.emoji}
                      </button>
                      <button
                        type="button"
                        className="card-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPortalToEdit(portal);
                          setIsAddPortalOpen(true);
                        }}
                        title="पोर्टल संपादित करें"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="card-icon-btn danger"
                        onClick={(e) => handleDeletePortal(portal.id, e)}
                        title="पोर्टल हटाएँ"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <span className="p-name">{portal.name}</span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                    }}
                  >
                    <span className="p-cat">{CATEGORIES[portal.category]?.name || 'सामान्य'}</span>
                    <span style={{ fontSize: '0.72rem', color: stCfg.color, fontWeight: 600 }}>
                      {stCfg.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="portal-empty">
              😕 कोई पोर्टल नहीं मिला। फ़िल्टर बदलें या ऊपर "＋ नया पोर्टल जोड़ें" दबाएँ।
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. Quick Notes Section (Editable: Add / Edit / Delete / Status) */}
      {/* ------------------------------------------------------------- */}
      <section className="qn-section" id="quick-notes" aria-labelledby="quickNotesTitle">
        {renderSectionHeader('quick_notes', 'Quick Notes (दैनिक रिमाइंडर)', '📌')}

        {/* Note Creation Form */}
        <div className="glass-card qn-create-card">
          <form onSubmit={handleAddQuickNote}>
            <div className="qn-inputs-grid">
              <input
                className="input"
                type="text"
                placeholder="नोट का शीर्षक (जैसे: SMC बैठक, MDM राशन सत्यापन, छात्रवृत्ति…)"
                value={qnTitle}
                onChange={(e) => setQnTitle(e.target.value)}
              />
              <select
                className="qn-select"
                value={qnCategory}
                onChange={(e) => setQnCategory(e.target.value as QuickNote['category'])}
                aria-label="नोट श्रेणी"
              >
                {(Object.keys(NOTE_CATEGORIES) as QuickNote['category'][]).map((catKey) => (
                  <option key={catKey} value={catKey}>
                    {NOTE_CATEGORIES[catKey].emoji} {NOTE_CATEGORIES[catKey].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`qn-pin-btn ${qnPinned ? 'active' : ''}`}
                onClick={() => setQnPinned(!qnPinned)}
                title="महत्वपूर्ण नोट को सबसे ऊपर रखने के लिए पिन करें"
              >
                📌 {qnPinned ? 'पिन किया' : 'पिन करें'}
              </button>
            </div>

            <textarea
              className="qn-textarea"
              placeholder="यहाँ दैनिक रिमाइंडर, आवश्यक कार्य या महत्वपूर्ण बिंदु लिखें… (जैसे: 11:30 बजे बीआरसी पर फॉर्म जमा करना है)"
              value={qnContent}
              onChange={(e) => setQnContent(e.target.value)}
              rows={3}
            />

            <div className="qn-actions-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--ink2)' }}>स्थिति:</span>
                <select
                  className="qn-select"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  value={qnStatus}
                  onChange={(e) => setQnStatus(e.target.value as WorkStatus)}
                >
                  <option value="not_started">⚪ अप्रारंभ</option>
                  <option value="in_progress">🟡 प्रगति पर</option>
                  <option value="pending">🟠 लंबित</option>
                  <option value="completed">🟢 पूर्ण</option>
                </select>
              </div>

              <button className="btn btn-neon btn-sm" type="submit">
                ＋ नोट सुरक्षित करें (Save Note)
              </button>
            </div>
          </form>
        </div>

        {/* Filters and Search */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div className="qn-filters" style={{ margin: 0 }}>
            <button
              type="button"
              className={`chip ${qnFilter === 'all' ? 'active' : ''}`}
              onClick={() => setQnFilter('all')}
            >
              सभी ({quickNotes.length})
            </button>
            <button
              type="button"
              className={`chip ${qnFilter === 'pinned' ? 'active' : ''}`}
              onClick={() => setQnFilter('pinned')}
            >
              📌 पिन किए ({quickNotes.filter((n) => n.isPinned).length})
            </button>
            {(Object.keys(NOTE_CATEGORIES) as QuickNote['category'][]).map((catKey) => {
              const cat = NOTE_CATEGORIES[catKey];
              const count = quickNotes.filter((n) => n.category === catKey).length;
              return (
                <button
                  key={catKey}
                  type="button"
                  className={`chip ${qnFilter === catKey ? 'active' : ''}`}
                  onClick={() => setQnFilter(catKey)}
                >
                  {cat.emoji} {cat.label} ({count})
                </button>
              );
            })}
          </div>

          <div style={{ minWidth: '200px', flex: '1', maxWidth: '300px' }}>
            <input
              type="search"
              className="input"
              style={{ padding: '8px 14px', fontSize: '0.88rem' }}
              placeholder="🔍 नोट्स खोजें…"
              value={qnSearch}
              onChange={(e) => setQnSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Notes Grid */}
        <div className="qn-grid">
          {filteredQuickNotes.length > 0 ? (
            filteredQuickNotes.map((note) => {
              const catMeta = NOTE_CATEGORIES[note.category];
              const stCfg = WORK_STATUS_CONFIG[note.status || 'not_started'];
              return (
                <div
                  key={note.id}
                  className={`glass-card qn-card ${note.isPinned ? 'pinned' : ''}`}
                >
                  <div className="qn-card-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${catMeta.badgeClass}`}>
                        {catMeta.emoji} {catMeta.label}
                      </span>
                      <button
                        type="button"
                        className="item-status-pill badge"
                        style={{ background: 'var(--surface2)', color: 'var(--ink)' }}
                        onClick={(e) => handleCycleNoteStatus(note.id, e)}
                        title="नोट की कार्य स्थिति बदलें"
                      >
                        {stCfg.emoji} {stCfg.label}
                      </button>
                    </div>
                    {note.isPinned && (
                      <span className="badge badge-pin" style={{ fontSize: '11px' }}>
                        📌 PINNED
                      </span>
                    )}
                  </div>

                  <div className="qn-card-title">{note.title}</div>
                  <div className="qn-card-content">{note.content}</div>

                  <div className="qn-card-foot">
                    <span>{note.createdAt}</span>
                    <div className="qn-card-btns">
                      <button
                        type="button"
                        className="qn-btn-icon"
                        onClick={() => handleCopyQuickNote(note)}
                        title="नोट कॉपी करें"
                      >
                        📋 कॉपी
                      </button>
                      <button
                        type="button"
                        className="qn-btn-icon"
                        onClick={() => handleTogglePinNote(note.id)}
                        title={note.isPinned ? 'पिन हटाएँ' : 'पिन करें'}
                      >
                        {note.isPinned ? '📌 अनपिन' : '📍 पिन'}
                      </button>
                      <button
                        type="button"
                        className="qn-btn-icon del"
                        onClick={() => handleDeleteQuickNote(note.id)}
                        title="नोट हटाएँ"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass-card qn-empty">
              🌱 इस श्रेणी में कोई नोट नहीं है। ऊपर दिए फॉर्म से नया नोट जोड़ें!
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. My Tools Section (To-Do & Notes Scratchpad) */}
      {/* ------------------------------------------------------------- */}
      <section id="tools" style={{ marginBottom: '28px' }}>
        {renderSectionHeader('tools', 'मेरे टूल्स व कार्य सूची', '🧰')}

        <div className="todo-notes">
          {/* To-Do */}
          <div className="glass-card">
            <div className="ac-title" style={{ marginBottom: '12px' }}>
              ✅ टू-डू लिस्ट
            </div>
            <div className="todo-input-row">
              <input
                className="todo-input"
                placeholder="नया काम लिखें… (Enter दबाएँ)"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTodo();
                }}
              />
              <button className="btn btn-neon btn-sm" onClick={handleAddTodo} type="button">
                जोड़ें
              </button>
            </div>
            <ul className="todo-list">
              {todos.length === 0 ? (
                <li style={{ background: 'transparent', color: 'var(--ink2)' }}>
                  कोई काम नहीं। ऊपर लिखकर जोड़ें! 🌱
                </li>
              ) : (
                todos.map((item, idx) => (
                  <li key={item.id} className={item.done ? 'done' : ''}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleTodo(idx)}
                    />
                    <span>{item.text}</span>
                    <button
                      className="todo-del"
                      onClick={() => handleDeleteTodo(idx)}
                      type="button"
                      title="हटाएँ"
                    >
                      ✕
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Notes Scratchpad */}
          <div className="glass-card">
            <div className="ac-title" style={{ marginBottom: '12px' }}>
              📝 फ्री स्क्रैचपैड (Freeform Scratchpad)
            </div>
            <textarea
              className="notes-area"
              placeholder="यहाँ कुछ भी लिखें — त्वरित रिमाइंडर, पिन कोड, मीटिंग नोट्स… सब अपने आप सेव होगा।"
              value={notes}
              onChange={handleNotesChange}
            />
            <div className="save-hint">{saveStatus}</div>
          </div>
        </div>
      </section>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modals for Adding / Editing and Section Notes Window */}
      {/* ------------------------------------------------------------- */}
      {/* Section Notes Window */}
      {activeNotesModal && (
        <SectionNotesModal
          isOpen={true}
          onClose={() => setActiveNotesModal(null)}
          sectionTitle={activeNotesModal.title}
          sectionIcon={activeNotesModal.icon}
          status={sectionStates[activeNotesModal.key]?.status || 'not_started'}
          onStatusChange={(newStatus) => updateSectionState(activeNotesModal.key, { status: newStatus })}
          notes={sectionStates[activeNotesModal.key]?.notes || ''}
          onNotesChange={(newNotes) => updateSectionState(activeNotesModal.key, { notes: newNotes })}
          onToast={onToast}
        />
      )}

      {/* Add / Edit Portal Modal */}
      <AddPortalModal
        isOpen={isAddPortalOpen}
        onClose={() => {
          setIsAddPortalOpen(false);
          setPortalToEdit(null);
        }}
        onSave={handleSavePortal}
        portalToEdit={portalToEdit}
      />

      {/* Add / Edit Notice Modal */}
      <AddNoticeModal
        isOpen={isAddNoticeOpen}
        onClose={() => {
          setIsAddNoticeOpen(false);
          setNoticeToEdit(null);
        }}
        onSave={handleSaveNotice}
        noticeToEdit={noticeToEdit}
      />

      {/* Add / Edit Action Card Modal */}
      <AddActionCardModal
        isOpen={isAddCardOpen}
        onClose={() => {
          setIsAddCardOpen(false);
          setCardToEdit(null);
        }}
        onSave={handleSaveActionCard}
        cardToEdit={cardToEdit}
      />

      {/* Add Workspace Tool Modal */}
      <AddWorkspaceToolModal
        isOpen={isAddToolOpen}
        onClose={() => setIsAddToolOpen(false)}
        onSave={handleSaveWorkspaceTool}
      />
    </main>
  );
};
