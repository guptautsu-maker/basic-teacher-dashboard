import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../data/portals';
import { CategoryKey, Portal, WorkStatus } from '../types';
import { WORK_STATUS_CONFIG } from './SectionNotesModal';

interface AddPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (portal: Portal) => void;
  portalToEdit?: Portal | null;
}

export const AddPortalModal: React.FC<AddPortalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  portalToEdit,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryKey>('c1');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<WorkStatus>('not_started');

  useEffect(() => {
    if (portalToEdit) {
      setName(portalToEdit.name);
      setCategory(portalToEdit.category);
      setUrl(portalToEdit.url || '');
      setStatus(portalToEdit.status || 'not_started');
    } else {
      setName('');
      setCategory('c1');
      setUrl('');
      setStatus('not_started');
    }
  }, [portalToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: portalToEdit ? portalToEdit.id : 'p-custom-' + Date.now(),
      name: name.trim(),
      category,
      url: url.trim(),
      status,
      isCustom: portalToEdit ? portalToEdit.isCustom : true,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
            {portalToEdit ? '✏️ पोर्टल विवरण संपादित करें' : '＋ नया सरकारी पोर्टल या ऐप जोड़ें'}
          </h3>
          <button type="button" className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="pName">पोर्टल / ऐप का नाम *</label>
            <input
              id="pName"
              className="input"
              type="text"
              required
              placeholder="जैसे: U-DISE Plus पोर्टल, प्रेरणा पोर्टल…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="pCat">श्रेणी (Category) *</label>
            <select
              id="pCat"
              className="qn-select"
              style={{ width: '100%' }}
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
            >
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((catKey) => (
                <option key={catKey} value={catKey}>
                  {CATEGORIES[catKey].emoji} {CATEGORIES[catKey].name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="pUrl">वेबसाइट या ऐप का लिंक (URL)</label>
            <input
              id="pUrl"
              className="input"
              type="url"
              placeholder="https://example.gov.in (वैकल्पिक)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
              {portalToEdit ? 'अपडेट करें' : '＋ पोर्टल जोड़ें'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
