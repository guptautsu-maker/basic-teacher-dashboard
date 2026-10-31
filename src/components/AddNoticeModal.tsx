import React, { useState, useEffect } from 'react';
import { Notice, WorkStatus } from '../types';
import { WORK_STATUS_CONFIG } from './SectionNotesModal';

interface AddNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notice: Notice) => void;
  noticeToEdit?: Notice | null;
}

export const AddNoticeModal: React.FC<AddNoticeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  noticeToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [type, setType] = useState<Notice['type']>('info');
  const [meta, setMeta] = useState('');
  const [status, setStatus] = useState<WorkStatus>('not_started');

  useEffect(() => {
    if (noticeToEdit) {
      setTitle(noticeToEdit.title || '');
      setText(noticeToEdit.text);
      setType(noticeToEdit.type);
      setMeta(noticeToEdit.meta);
      setStatus(noticeToEdit.status || 'not_started');
    } else {
      setTitle('');
      setText('');
      setType('new');
      setMeta('डैशबोर्ड टीम · ' + new Date().toLocaleDateString('hi-IN'));
      setStatus('not_started');
    }
  }, [noticeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const badgeText =
      type === 'pinned' ? 'PINNED' : type === 'urgent' ? 'URGENT' : type === 'new' ? 'NEW' : 'INFO';

    onSave({
      id: noticeToEdit ? noticeToEdit.id : 'n-custom-' + Date.now(),
      title: title.trim() || 'सरकारी सूचना',
      text: text.trim(),
      type,
      badgeText,
      meta: meta.trim() || 'विभाग · ' + new Date().toLocaleDateString('hi-IN'),
      status,
      isCustom: noticeToEdit ? noticeToEdit.isCustom : true,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
            {noticeToEdit ? '✏️ नोटिस विवरण संपादित करें' : '＋ नया नोटिस / आदेश जोड़ें'}
          </h3>
          <button type="button" className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="nTitle">नोटिस का शीर्षक *</label>
            <input
              id="nTitle"
              className="input"
              type="text"
              required
              placeholder="जैसे: शीतकालीन अवकाश आदेश, निपुण मूल्यांकन..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="nType">नोटिस प्रकार / बैज *</label>
            <select
              id="nType"
              className="qn-select"
              style={{ width: '100%' }}
              value={type}
              onChange={(e) => setType(e.target.value as Notice['type'])}
            >
              <option value="new">🆕 नया (NEW)</option>
              <option value="pinned">📌 पिन किया गया (PINNED)</option>
              <option value="urgent">⚠️ ज़रूरी / अंतिम तिथि (URGENT)</option>
              <option value="info">ℹ️ सामान्य सूचना (INFO)</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="nText">नोटिस का पूरा विवरण *</label>
            <textarea
              id="nText"
              className="qn-textarea"
              required
              rows={4}
              placeholder="सरकारी आदेश, परिपत्र या सूचना का विवरण यहाँ लिखें…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="nMeta">स्रोत / संदर्भ विवरण</label>
            <input
              id="nMeta"
              className="input"
              type="text"
              placeholder="जैसे: BSA कार्यालय · पत्रांक 402/2026"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>कार्रवाई स्थिति (Work Status)</label>
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
              {noticeToEdit ? 'अपडेट करें' : '＋ नोटिस जोड़ें'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
