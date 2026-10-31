import React, { useState, useEffect } from 'react';
import { ActionCardItem, WorkStatus } from '../types';
import { WORK_STATUS_CONFIG } from './SectionNotesModal';

interface AddActionCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (card: ActionCardItem) => void;
  cardToEdit?: ActionCardItem | null;
}

export const AddActionCardModal: React.FC<AddActionCardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  cardToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [icon, setIcon] = useState('💬');
  const [type, setType] = useState<ActionCardItem['type']>('whatsapp');
  const [url, setUrl] = useState('');
  const [btnText, setBtnText] = useState('खोलें →');
  const [status, setStatus] = useState<WorkStatus>('in_progress');

  useEffect(() => {
    if (cardToEdit) {
      setTitle(cardToEdit.title);
      setSubtitle(cardToEdit.subtitle);
      setIcon(cardToEdit.icon);
      setType(cardToEdit.type);
      setUrl(cardToEdit.url);
      setBtnText(cardToEdit.btnText);
      setStatus(cardToEdit.status || 'in_progress');
    } else {
      setTitle('');
      setSubtitle('');
      setIcon('💬');
      setType('whatsapp');
      setUrl('https://chat.whatsapp.com/');
      setBtnText('समूह से जुड़ें →');
      setStatus('in_progress');
    }
  }, [cardToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: ActionCardItem['type']) => {
    setType(newType);
    if (newType === 'whatsapp') {
      setIcon('💬');
      setBtnText('समूह से जुड़ें →');
    } else if (newType === 'youtube') {
      setIcon('▶️');
      setBtnText('चैनल खोलें →');
    } else if (newType === 'telegram') {
      setIcon('✈️');
      setBtnText('चैनल से जुड़ें →');
    } else if (newType === 'meeting') {
      setIcon('📹');
      setBtnText('मीटिंग जॉइन करें →');
    } else {
      setIcon('🔗');
      setBtnText('खोलें →');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: cardToEdit ? cardToEdit.id : 'ac-custom-' + Date.now(),
      title: title.trim(),
      subtitle: subtitle.trim() || 'शिक्षक समूह / चैनल लिंक',
      icon: icon.trim() || '🔗',
      type,
      url: url.trim(),
      btnText: btnText.trim() || 'खोलें →',
      status,
      isCustom: cardToEdit ? cardToEdit.isCustom : true,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
            {cardToEdit ? '✏️ एक्शन कार्ड संपादित करें' : '＋ नया ग्रुप / चैनल / मीटिंग कार्ड जोड़ें'}
          </h3>
          <button type="button" className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="acType">प्रकार (Type)</label>
            <select
              id="acType"
              className="qn-select"
              style={{ width: '100%' }}
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as ActionCardItem['type'])}
            >
              <option value="whatsapp">💬 WhatsApp ग्रुप</option>
              <option value="youtube">▶️ YouTube चैनल / वीडियो</option>
              <option value="telegram">✈️ Telegram चैनल</option>
              <option value="meeting">📹 Google Meet / Zoom बैठक</option>
              <option value="custom">🔗 कस्टम लिंक कार्ड</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="acTitle">कार्ड का शीर्षक *</label>
            <input
              id="acTitle"
              className="input"
              type="text"
              required
              placeholder="जैसे: संकुल बैठक WhatsApp ग्रुप, गणित किट वीडियो…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="acSub">उप-विवरण (Subtitle)</label>
            <input
              id="acSub"
              className="input"
              type="text"
              placeholder="जैसे: संकुल शिक्षकों का आधिकारिक चर्चा समूह"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="acUrl">वेबसाइट या इनवाइट लिंक (URL) *</label>
            <input
              id="acUrl"
              className="input"
              type="url"
              required
              placeholder="https://chat.whatsapp.com/... या https://youtube.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="acBtn">बटन का नाम</label>
            <input
              id="acBtn"
              className="input"
              type="text"
              placeholder="जैसे: समूह से जुड़ें →"
              value={btnText}
              onChange={(e) => setBtnText(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>कार्य स्थिति (Work Status)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {(Object.keys(WORK_STATUS_CONFIG) as WorkStatus[]).map((stKey) => {
                const cfg = WORK_STATUS_CONFIG[stKey];
                const isSelected = status === stKey;
                return (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() => setStatus(stKey)}
                    className={`btn btn-sm ${isSelected ? 'btn-neon' : 'btn-ghost'}`}
                    style={{ padding: '6px 4px', fontSize: '0.75rem', borderRadius: '8px' }}
                  >
                    <span>{cfg.emoji}</span> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              रद्द करें
            </button>
            <button type="submit" className="btn btn-neon btn-sm">
              {cardToEdit ? 'अपडेट करें' : '＋ कार्ड जोड़ें'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
