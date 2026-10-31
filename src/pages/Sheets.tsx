import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { SheetType, UserProfile, WorkStatus } from '../types';
import { SectionNotesModal, WORK_STATUS_CONFIG } from '../components/SectionNotesModal';

interface SheetColumn {
  field: string;
  name: string;
  width?: string;
  auto?: boolean;
}

interface SheetDef {
  key: string;
  file: string;
  cols: SheetColumn[];
  sample: any[];
}

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const SHEETS_CONFIG: Record<SheetType, SheetDef> = {
  mdm: {
    key: 'btd-mdm',
    file: 'MDM-Sheet',
    cols: [
      { field: 'date', name: 'दिन', width: '130px' },
      { field: 'cls', name: 'कक्षा' },
      { field: 'enrolled', name: 'पंजीकृत' },
      { field: 'present', name: 'उपस्थित' },
      { field: 'served', name: 'भोजन कराया' },
      { field: 'notes', name: 'नोट' },
    ],
    sample: [
      {
        id: 's1',
        date: getTodayDate(),
        cls: 'कक्षा 3',
        enrolled: '28',
        present: '26',
        served: '26',
        notes: 'सब ठीक',
      },
      {
        id: 's2',
        date: getTodayDate(),
        cls: 'कक्षा 4',
        enrolled: '31',
        present: '29',
        served: '29',
        notes: '',
      },
    ],
  },
  att: {
    key: 'btd-att',
    file: 'Attendance-Sheet',
    cols: [
      { field: 'date', name: 'दिन', width: '130px' },
      { field: 'cls', name: 'कक्षा' },
      { field: 'name', name: 'नाम' },
      { field: 'roll', name: 'रोल' },
      { field: 'status', name: 'स्थिति' },
      { field: 'reason', name: 'कारण' },
    ],
    sample: [
      {
        id: 's1',
        date: getTodayDate(),
        cls: 'कक्षा 3',
        name: 'राहुल वर्मा',
        roll: '12',
        status: 'अनुपस्थित',
        reason: 'बुखार',
      },
      {
        id: 's2',
        date: getTodayDate(),
        cls: 'कक्षा 5',
        name: 'मीना कुमारी',
        roll: '07',
        status: 'अवकाश',
        reason: 'गाँव में कार्यक्रम',
      },
    ],
  },
  res: {
    key: 'btd-res',
    file: 'Result-Sheet',
    cols: [
      { field: 'exam', name: 'परीक्षा' },
      { field: 'cls', name: 'कक्षा' },
      { field: 'name', name: 'नाम' },
      { field: 'sub', name: 'विषय' },
      { field: 'max', name: 'पूर्ण अंक' },
      { field: 'got', name: 'प्राप्त अंक' },
      { field: 'grade', name: 'ग्रेड', auto: true },
      { field: 'pass', name: 'परिणाम', auto: true },
    ],
    sample: [
      {
        id: 's1',
        exam: 'अर्धवार्षिक',
        cls: 'कक्षा 5',
        name: 'अंकिता सिंह',
        sub: 'गणित',
        max: '100',
        got: '82',
      },
      {
        id: 's2',
        exam: 'अर्धवार्षिक',
        cls: 'कक्षा 5',
        name: 'विकास यादव',
        sub: 'गणित',
        max: '100',
        got: '28',
      },
    ],
  },
};

export const calculateGrade = (maxStr: string, gotStr: string): [string, string] => {
  const max = parseFloat(maxStr);
  const got = parseFloat(gotStr);
  if (isNaN(max) || isNaN(got) || max <= 0 || got < 0) {
    return ['—', '—'];
  }
  const pct = (got / max) * 100;
  const grade =
    pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : pct >= 33 ? 'D' : 'E';
  const pass = pct >= 33 ? 'उत्तीर्ण ✅' : 'अनुत्तीर्ण ❌';
  return [grade, pass];
};

interface SheetsProps {
  currentUser: UserProfile | null;
  onToast: (msg: string) => void;
  onNavigate: (page: 'home' | 'dashboard' | 'sheets' | 'login') => void;
}

export const Sheets: React.FC<SheetsProps> = ({ currentUser, onToast, onNavigate }) => {
  const [currentSheet, setCurrentSheet] = useState<SheetType>('mdm');
  const [cloudStatus, setCloudStatus] = useState<string>('💾 डेटा इसी ब्राउज़र में सुरक्षित सेव हो रहा है');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Rows state for all sheets
  const [rowsMap, setRowsMap] = useState<Record<SheetType, any[]>>(() => {
    const initial: Record<SheetType, any[]> = { mdm: [], att: [], res: [] };
    (['mdm', 'att', 'res'] as SheetType[]).forEach((type) => {
      try {
        const raw = localStorage.getItem(SHEETS_CONFIG[type].key);
        if (raw) {
          initial[type] = JSON.parse(raw);
        } else {
          initial[type] = [...SHEETS_CONFIG[type].sample];
        }
      } catch {
        initial[type] = [...SHEETS_CONFIG[type].sample];
      }
    });
    return initial;
  });

  const saveTimerRef = useRef<any>(null);

  const persistRows = (type: SheetType, updatedRows: any[]) => {
    const updatedMap = { ...rowsMap, [type]: updatedRows };
    setRowsMap(updatedMap);
    try {
      localStorage.setItem(SHEETS_CONFIG[type].key, JSON.stringify(updatedRows));
    } catch {
      // ignore
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onToast('💾 सेव हो गया');
    }, 400);
  };

  // Section Work Status & Attached Notes for Sheets
  const [sheetStatus, setSheetStatus] = useState<WorkStatus>(() => {
    try {
      return (localStorage.getItem('btd-sheets-status') as WorkStatus) || 'in_progress';
    } catch {
      return 'in_progress';
    }
  });

  const [sheetNotes, setSheetNotes] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('btd-sheets-notes') ||
        '• MDM व दैनिक उपस्थिति प्रतिदिन दर्ज करें।\n• परीक्षा परिणाम घोषित होने पर रिजल्ट शीट अद्यतन करें।'
      );
    } catch {
      return '';
    }
  });

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const handleStatusChange = (st: WorkStatus) => {
    setSheetStatus(st);
    try {
      localStorage.setItem('btd-sheets-status', st);
    } catch {
      // ignore
    }
  };

  const handleNotesChange = (text: string) => {
    setSheetNotes(text);
    try {
      localStorage.setItem('btd-sheets-notes', text);
    } catch {
      // ignore
    }
  };

  // Check Supabase Cloud Sync
  useEffect(() => {
    async function initCloud() {
      if (!supabase) return;
      try {
        const sessionRes = await supabase.auth.getSession();
        const user = sessionRes.data?.session?.user;
        if (user) {
          setCloudStatus(`☁️ Supabase Cloud Sync सक्रिय (${user.email})`);
        } else {
          setCloudStatus('🔐 क्लाउड बैकअप के लिए लॉगिन करें · अभी डेटा आपके ब्राउज़र में सुरक्षित है।');
        }
      } catch {
        setCloudStatus('💾 लोकल स्टोरेज मोड में कार्यरत (ऑफलाइन सुरक्षित)');
      }
    }
    initCloud();
  }, [currentUser]);

  const handleCloudSync = async () => {
    if (!supabase) {
      onToast('⚠️ क्लाउड सर्विस उपलब्ध नहीं है');
      return;
    }
    setIsSyncing(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data?.session?.user;
      if (!user) {
        setCloudStatus('🔐 पहले Login करें, फिर Cloud Sync करें।');
        onToast('🔐 पहले Login करें');
        setIsSyncing(false);
        return;
      }

      setCloudStatus(`☁️ ${SHEETS_CONFIG[currentSheet].file} क्लाउड पर सिंक हो रहा है…`);
      const payload = {
        user_id: user.id,
        sheet: currentSheet,
        rows: rowsMap[currentSheet],
        updated_at: new Date().toISOString(),
      };

      const found = await supabase
        .from('sheets')
        .select('sheet')
        .eq('user_id', user.id)
        .eq('sheet', currentSheet)
        .limit(1);

      if (found.error) throw found.error;

      const result =
        found.data && found.data.length
          ? await supabase
              .from('sheets')
              .update({ rows: payload.rows, updated_at: payload.updated_at })
              .eq('user_id', user.id)
              .eq('sheet', currentSheet)
          : await supabase.from('sheets').insert(payload);

      if (result.error) throw result.error;

      const time = new Date().toLocaleTimeString('hi-IN');
      setCloudStatus(`✅ Cloud Sync सफल · ${time}`);
      onToast('☁️ क्लाउड सिंक पूरा हुआ!');
    } catch (e: any) {
      setCloudStatus(`❌ Cloud Sync: ${e.message || 'त्रुटि'} (लोकल डेटा सुरक्षित है)`);
      onToast('⚠️ सिंक विफल, डेटा डिवाइस पर सुरक्षित है');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddRow = () => {
    const currentList = rowsMap[currentSheet];
    const newRow: any = {
      id: Date.now().toString(),
      date: getTodayDate(),
    };
    persistRows(currentSheet, [...currentList, newRow]);
    onToast('➕ नई पंक्ति जुड़ गई — खानों में लिखें');
  };

  const handleFillSample = () => {
    const currentList = rowsMap[currentSheet];
    const sample = SHEETS_CONFIG[currentSheet].sample.map((s) => ({
      ...s,
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
    }));
    persistRows(currentSheet, [...currentList, ...sample]);
    onToast('✨ नमूना डेटा भर गया');
  };

  const handleDeleteRow = (index: number) => {
    const currentList = [...rowsMap[currentSheet]];
    currentList.splice(index, 1);
    persistRows(currentSheet, currentList);
    onToast('🗑️ पंक्ति हटा दी गई');
  };

  const handleCellChange = (rowIndex: number, field: string, value: string) => {
    const currentList = [...rowsMap[currentSheet]];
    if (!currentList[rowIndex]) return;
    currentList[rowIndex] = {
      ...currentList[rowIndex],
      [field]: value,
    };
    persistRows(currentSheet, currentList);
  };

  const handleExportCsv = () => {
    const config = SHEETS_CONFIG[currentSheet];
    const rows = rowsMap[currentSheet];
    if (!rows.length) {
      onToast('📭 खाली शीट एक्सपोर्ट नहीं होगी');
      return;
    }

    const output: string[][] = [];
    const headers = config.cols.map((c) => c.name);
    output.push(headers);

    rows.forEach((row) => {
      const line: string[] = [];
      config.cols.forEach((col) => {
        let val = row[col.field] || '';
        if (col.auto && currentSheet === 'res') {
          const [g, p] = calculateGrade(row.max || '', row.got || '');
          val = col.field === 'grade' ? g : p;
        }
        line.push(val);
      });
      output.push(line);
    });

    // UTF-8 BOM for Excel Hindi support
    let csv = '\uFEFF';
    output.forEach((rowCells) => {
      const escaped = rowCells.map((val) => `"${String(val).replace(/"/g, '""')}"`);
      csv += escaped.join(',') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.file}-${getTodayDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast('⬇️ CSV डाउनलोड हो गई!');
  };

  const activeConfig = SHEETS_CONFIG[currentSheet];
  const activeRows = rowsMap[currentSheet];

  return (
    <main className="wrap">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1>📊 स्कूल शीट्स</h1>
          <div className="hint">
            किसी भी खाने में सीधे लिखें — सब अपने आप सेव होता है 💾
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="status-badge-btn"
            onClick={() => {
              const next: WorkStatus =
                sheetStatus === 'not_started'
                  ? 'in_progress'
                  : sheetStatus === 'in_progress'
                  ? 'pending'
                  : sheetStatus === 'pending'
                  ? 'completed'
                  : 'not_started';
              handleStatusChange(next);
              onToast(`शीट्स कार्य स्थिति: ${WORK_STATUS_CONFIG[next].label}`);
            }}
            title="क्लिक करके कार्य स्थिति बदलें"
          >
            <span>{WORK_STATUS_CONFIG[sheetStatus].emoji}</span>
            <span>{WORK_STATUS_CONFIG[sheetStatus].label}</span>
          </button>

          <button
            type="button"
            className={`sec-notes-btn ${sheetNotes.trim() ? 'has-notes' : ''}`}
            onClick={() => setIsNotesModalOpen(true)}
            title="शीट्स की नोट्स विंडो खोलें"
          >
            <span>📝 शीट्स नोट्स विंडो</span>
            {sheetNotes.trim() && <span className="sec-notes-badge-dot" />}
          </button>

          <button className="btn btn-ghost" onClick={() => window.print()} type="button">
            🖨️ प्रिंट करें
          </button>
        </div>
      </div>

      {/* Cloud Status */}
      <div
        className="hint"
        style={{
          margin: '12px 0 20px',
          padding: '10px 14px',
          borderRadius: '10px',
          background: 'var(--surface2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span>{cloudStatus}</span>
        {!currentUser && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigate('login')}
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
          >
            🔐 लॉगिन करें
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="summary">
        <div
          className="glass-card sum-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setCurrentSheet('mdm')}
        >
          <div className="sum-icon">🍱</div>
          <div>
            <div className="sum-num">{rowsMap.mdm.length}</div>
            <div className="sum-label">MDM एंट्री</div>
          </div>
        </div>
        <div
          className="glass-card sum-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setCurrentSheet('att')}
        >
          <div className="sum-icon">🧑‍🤝‍🧑</div>
          <div>
            <div className="sum-num">{rowsMap.att.length}</div>
            <div className="sum-label">हाज़िरी एंट्री</div>
          </div>
        </div>
        <div
          className="glass-card sum-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setCurrentSheet('res')}
        >
          <div className="sum-icon">🏆</div>
          <div>
            <div className="sum-num">{rowsMap.res.length}</div>
            <div className="sum-label">रिज़ल्ट एंट्री</div>
          </div>
        </div>
      </div>

      {/* Sheet Tabs */}
      <div className="tabs-row">
        <button
          className={`chip ${currentSheet === 'mdm' ? 'active' : ''}`}
          onClick={() => setCurrentSheet('mdm')}
          type="button"
        >
          🍱 MDM शीट
        </button>
        <button
          className={`chip ${currentSheet === 'att' ? 'active' : ''}`}
          onClick={() => setCurrentSheet('att')}
          type="button"
        >
          🧑🤝‍ हाज़िरी / अनुपस्थिति
        </button>
        <button
          className={`chip ${currentSheet === 'res' ? 'active' : ''}`}
          onClick={() => setCurrentSheet('res')}
          type="button"
        >
          🏆 रिज़ल्ट शीट
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn btn-neon btn-sm" onClick={handleAddRow} type="button">
          ＋ नई पंक्ति जोड़ें
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleFillSample} type="button">
          ✨ नमूना डेटा भरें
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleExportCsv} type="button">
          ⬇️ CSV एक्सपोर्ट
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleCloudSync}
          disabled={isSyncing}
          type="button"
        >
          {isSyncing ? '⏳ सिंक हो रहा है…' : '☁️ अभी Sync करें'}
        </button>
      </div>

      {/* Table Card */}
      <div className="glass-card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {activeConfig.cols.map((col) => (
                  <th key={col.field} style={col.width ? { minWidth: col.width } : undefined}>
                    {col.name}
                  </th>
                ))}
                <th style={{ width: '44px' }} />
              </tr>
            </thead>
            <tbody>
              {activeRows.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={activeConfig.cols.length + 1}>
                    📭 अभी कोई एंट्री नहीं। ऊपर 'नई पंक्ति जोड़ें' या 'नमूना डेटा भरें' दबाएँ!
                  </td>
                </tr>
              ) : (
                activeRows.map((row, rIdx) => {
                  const [calculatedGrade, calculatedPass] =
                    currentSheet === 'res'
                      ? calculateGrade(row.max || '', row.got || '')
                      : ['', ''];

                  return (
                    <tr key={row.id || rIdx}>
                      {activeConfig.cols.map((col) => {
                        if (col.auto && currentSheet === 'res') {
                          const autoVal = col.field === 'grade' ? calculatedGrade : calculatedPass;
                          return (
                            <td key={col.field} className="auto">
                              {autoVal}
                            </td>
                          );
                        }

                        return (
                          <td key={col.field} style={{ padding: '4px 8px' }}>
                            <input
                              className="cell-input"
                              value={row[col.field] ?? ''}
                              onChange={(e) => handleCellChange(rIdx, col.field, e.target.value)}
                              placeholder="लिखें…"
                            />
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="row-del"
                          onClick={() => handleDeleteRow(rIdx)}
                          type="button"
                          title="पंक्ति हटाएँ"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SectionNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        sectionTitle="स्कूल शीट्स (School Sheets)"
        sectionIcon="📊"
        status={sheetStatus}
        onStatusChange={handleStatusChange}
        notes={sheetNotes}
        onNotesChange={handleNotesChange}
        onToast={onToast}
      />
    </main>
  );
};
