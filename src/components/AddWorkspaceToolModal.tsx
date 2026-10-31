import React, { useState } from 'react';
import { WorkspaceTool, WorkStatus } from '../types';
import { WORK_STATUS_CONFIG } from './SectionNotesModal';

interface AddWorkspaceToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tool: WorkspaceTool) => void;
}

export const AddWorkspaceToolModal: React.FC<AddWorkspaceToolModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🛠️');
  const [type, setType] = useState<WorkspaceTool['type']>('link');
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<WorkStatus>('in_progress');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: 'tool-custom-' + Date.now(),
      title: title.trim(),
      emoji: emoji.trim() || '🛠️',
      type,
      url: url.trim(),
      desc: desc.trim() || 'कस्टम शिक्षक टूल',
      status,
      isCustom: true,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>＋ नया स्मार्ट वर्कस्पेस टूल जोड़ें</h3>
          <button type="button" className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="wtTitle">टूल का नाम *</label>
            <input
              id="wtTitle"
              className="input"
              type="text"
              required
              placeholder="जैसे: Google Drive, दीक्षा वेब, प्रेरणा पोर्टल…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="wtEmoji">आइकन / इमोजी</label>
            <input
              id="wtEmoji"
              className="input"
              type="text"
              style={{ width: '80px', textAlign: 'center', fontSize: '1.2rem' }}
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="wtUrl">टूल का लिंक (URL)</label>
            <input
              id="wtUrl"
              className="input"
              type="url"
              placeholder="https://drive.google.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="wtDesc">संक्षिप्त विवरण</label>
            <input
              id="wtDesc"
              className="input"
              type="text"
              placeholder="जैसे: स्कूल रिकॉर्ड फाइलें व दस्तावेज़"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
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
              ＋ टूल जोड़ें
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
