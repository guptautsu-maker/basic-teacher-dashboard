import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task } from '../utils/taskStatusSystem';
import { Duty } from '../types/duty';
import { MeetingItem, TrainingItem, GovtOrderItem } from '../data/teacherHubSampleData';
import { PortalApp } from '../types/portalApp';
import { ClassSection } from '../types/classSection';
import { searchAllModules } from '../utils/safeguardsManager';
import { SearchModuleType, GlobalSearchResultItem } from '../types/safeguards';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  orders: GovtOrderItem[];
  meetings: MeetingItem[];
  trainings: TrainingItem[];
  portals?: PortalApp[];
  classes?: ClassSection[];
  onNavigate?: (page: any) => void;
  onSelectTask?: (task: Task) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  tasks,
  orders,
  meetings,
  trainings,
  portals,
  classes,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchModuleType | 'all'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setActiveFilter('all');
    }
  }, [isOpen]);

  // Keyboard shortcut ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    return searchAllModules(query, {
      tasks,
      orders,
      meetings,
      trainings,
      portals,
      classes,
    });
  }, [query, tasks, orders, meetings, trainings, portals, classes]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return searchResults.items;
    return searchResults.items.filter((item) => item.module === activeFilter);
  }, [searchResults.items, activeFilter]);

  if (!isOpen) return null;

  const handleSelectResult = (item: GlobalSearchResultItem) => {
    onClose();
    if (item.actionUrlOrHash) {
      window.location.hash = item.actionUrlOrHash;
      if (onNavigate) {
        const page = item.actionUrlOrHash.replace('#', '');
        onNavigate(page);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-12 sm:pt-20">
      <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Header Input */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <span className="text-xl sm:text-2xl text-teal-600 dark:text-teal-400">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="सभी मॉड्यूल में खोजें (कार्य, शासनादेश, बैठक, प्रशिक्षण, पोर्टल, कक्षा)..."
            className="flex-1 bg-transparent text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              साफ करें
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-3 px-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'all', label: `सभी (${searchResults.totalCount})`, icon: '🌐' },
            { id: 'task', label: `कार्य (${searchResults.countsByModule.task})`, icon: '📝' },
            { id: 'order', label: `शासनादेश (${searchResults.countsByModule.order})`, icon: '📜' },
            { id: 'meeting', label: `बैठक (${searchResults.countsByModule.meeting})`, icon: '🤝' },
            { id: 'training', label: `प्रशिक्षण (${searchResults.countsByModule.training})`, icon: '🎓' },
            { id: 'portal', label: `पोर्टल (${searchResults.countsByModule.portal})`, icon: '🌐' },
            { id: 'class', label: `कक्षाएं (${searchResults.countsByModule.class})`, icon: '📚' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === tab.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 dark:divide-slate-800/60">
          {!query ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <span className="text-3xl block">🔎</span>
              <p className="text-sm font-semibold">खोजने के लिए कोई भी शब्द टाइप करें</p>
              <p className="text-xs">उदाहरण: &quot;MDM&quot;, &quot;निपुण&quot;, &quot;दीक्षा&quot;, &quot;प्रेरणा&quot;, &quot;कक्षा 4&quot;, &quot;बैठक&quot;</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <span className="text-3xl block">📭</span>
              <p className="text-sm font-semibold">&quot;{query}&quot; से संबंधित कोई परिणाम नहीं मिला</p>
              <p className="text-xs">कृपया अन्य कीवर्ड या स्पेलिंग जांचें</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectResult(item)}
                className="py-3 px-3 rounded-2xl hover:bg-teal-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3 group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center text-sm flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  {item.module === 'task' && '📝'}
                  {item.module === 'order' && '📜'}
                  {item.module === 'meeting' && '🤝'}
                  {item.module === 'training' && '🎓'}
                  {item.module === 'portal' && '🌐'}
                  {item.module === 'class' && '📚'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase">
                      {item.moduleLabelHi} ({item.moduleLabelEn})
                    </span>

                    {item.badgeText && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-slate-200 text-slate-800'}`}>
                        {item.badgeText}
                      </span>
                    )}

                    {item.dateStr && (
                      <span className="text-[10px] text-slate-400 font-medium ml-auto">
                        📅 {item.dateStr}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                    {item.title}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {item.snippet}
                  </p>
                </div>

                <span className="text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 text-xs self-center transition-colors">
                  ➔
                </span>
              </div>
            ))
          )}
        </div>

        {/* Modal Footnote */}
        <div className="p-3 px-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>💡 टिप: किसी भी परिणाम पर क्लिक करके तुरंत संबंधित मॉड्यूल पर जाएं</span>
          <span>ESC दबाकर बंद करें</span>
        </div>
      </div>
    </div>
  );
};
