import React, { useRef } from 'react';
import { WorkStatus } from '../types';

export const WORK_STATUS_CONFIG: Record<
  WorkStatus,
  { label: string; emoji: string; color: string; badgeClass: string }
> = {
  not_started: { label: 'अप्रारंभ', emoji: '⚪', color: '#889890', badgeClass: 'badge-notstarted' },
  in_progress: { label: 'प्रगति पर', emoji: '🟡', color: '#B8680C', badgeClass: 'badge-pending' },
  pending: { label: 'लंबित कार्य', emoji: '🟠', color: '#D97706', badgeClass: 'badge-pending' },
  completed: { label: 'पूर्ण हुआ', emoji: '🟢', color: '#0D5B49', badgeClass: 'badge-completed' },
};

interface SectionNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  sectionIcon?: string;
  status: WorkStatus;
  onStatusChange: (status: WorkStatus) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onToast: (msg: string) => void;
}

export const SectionNotesModal: React.FC<SectionNotesModalProps> = ({
  isOpen,
  onClose,
  sectionTitle,
  sectionIcon = '📝',
  status,
  onStatusChange,
  notes,
  onNotesChange,
  onToast,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const insertText = (snippet: string) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const nextVal = notes.substring(0, start) + snippet + notes.substring(end);
    onNotesChange(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  };

  const handleCopyNotes = () => {
    if (!notes.trim()) {
      onToast('⚠️ कोई नोट लिखा नहीं है');
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(notes).then(() => {
        onToast('📋 नोट्स कॉपी हो गए!');
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          border: '1px solid var(--neon)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>{sectionIcon}</span>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>
                {sectionTitle} — नोट्स विंडो
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink2)' }}>
                कार्य स्थिति व सेक्शन से जुड़ी महत्वपूर्ण बातें
              </div>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close notes window"
          >
            ✕
          </button>
        </div>

        {/* Work Status Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--ink2)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            कार्य स्थिति (Work Status)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {(Object.keys(WORK_STATUS_CONFIG) as WorkStatus[]).map((stKey) => {
              const cfg = WORK_STATUS_CONFIG[stKey];
              const isSelected = status === stKey;
              return (
                <button
                  key={stKey}
                  type="button"
                  onClick={() => {
                    onStatusChange(stKey);
                    onToast(`✅ स्थिति: ${cfg.label} सेट हुई`);
                  }}
                  className={`btn btn-sm ${isSelected ? 'btn-neon' : 'btn-ghost'}`}
                  style={{
                    padding: '8px 4px',
                    fontSize: '0.8rem',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    border: isSelected ? 'none' : '1px solid var(--glass-border)',
                  }}
                >
                  <span>{cfg.emoji}</span>
                  <span style={{ fontWeight: 600 }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes Textarea */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <label
              htmlFor="secNotesText"
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--ink2)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              📝 सेक्शन नोट्स व टिप्पणियाँ
            </label>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink2)' }}>
              💾 LocalStorage में ऑटो-सेव
            </span>
          </div>

          <textarea
            id="secNotesText"
            ref={textareaRef}
            className="notes-area"
            style={{
              flex: 1,
              minHeight: '180px',
              width: '100%',
              fontSize: '0.93rem',
              lineHeight: 1.6,
            }}
            placeholder="इस सेक्शन से जुड़े रिमाइंडर, फोन नंबर, BRC निर्देश, या फॉलो-अप बिंदु यहाँ लिखें…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>

        {/* Quick Snippets & Tools */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => insertText('\n• [ ] ')}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              ☑️ चेकलिस्ट
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const time = new Date().toLocaleTimeString('hi-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                insertText(` [${time}] `);
              }}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              ⏰ समय
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleCopyNotes}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              📋 कॉपी
            </button>
          </div>

          {notes && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (window.confirm('क्या आप इस सेक्शन के सभी नोट्स हटाना चाहते हैं?')) {
                  onNotesChange('');
                  onToast('🧹 नोट्स साफ़ किए गए');
                }
              }}
              style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--danger)' }}
            >
              हटाएँ
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-neon btn-sm"
            onClick={onClose}
            style={{ width: '100%' }}
          >
            ✅ नोट्स विंडो बंद करें (सहेजें)
          </button>
        </div>
      </div>
    </div>
  );
};
