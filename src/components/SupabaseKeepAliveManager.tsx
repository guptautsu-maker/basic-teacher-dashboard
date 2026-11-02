import React, { useState, useEffect } from 'react';
import {
  SupabaseProjectConfig,
  SupabasePingLog,
  loadStoredSupabaseProjects,
  saveStoredSupabaseProjects,
  loadStoredSupabasePingLogs,
  saveStoredSupabasePingLogs,
  normalizeSupabaseRestEndpoint,
  isPlaceholderProject,
  generateCurlCommand,
  generateGitHubActionsYaml,
  pingSupabaseProject,
  getDefaultSupabaseProjects,
} from '../utils/supabaseKeepAliveManager';
import { PWAInstallButton } from './PWAInstallButton';

interface SupabaseKeepAliveManagerProps {
  onToast?: (msg: string) => void;
}

export const SupabaseKeepAliveManager: React.FC<SupabaseKeepAliveManagerProps> = ({
  onToast,
}) => {
  const [projects, setProjects] = useState<SupabaseProjectConfig[]>(() =>
    loadStoredSupabaseProjects()
  );
  const [logs, setLogs] = useState<SupabasePingLog[]>(() =>
    loadStoredSupabasePingLogs()
  );
  const [pingingId, setPingingId] = useState<string | 'all' | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'yaml' | 'logs'>('projects');
  const [cronSchedule, setCronSchedule] = useState('0 10 * * *');

  useEffect(() => {
    saveStoredSupabaseProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveStoredSupabasePingLogs(logs);
  }, [logs]);

  const handleUpdateProject = (
    id: string,
    field: 'name' | 'projectUrlOrRef' | 'anonKey',
    value: string
  ) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleAddProject = () => {
    const nextNum = projects.length + 1;
    const newProj: SupabaseProjectConfig = {
      id: `proj-${Date.now()}`,
      name: `Supabase Project ${nextNum}`,
      projectUrlOrRef: `YOUR_PROJECT_URL_${nextNum}`,
      anonKey: `YOUR_ANON_KEY_${nextNum}`,
      enabled: true,
      lastPingAt: null,
      lastStatus: 'idle',
      lastHttpCode: null,
      lastLatencyMs: null,
    };
    setProjects((prev) => [...prev, newProj]);
    onToast?.(`➕ प्रोजेक्ट ${nextNum} जोड़ा गया`);
  };

  const handleRemoveProject = (id: string) => {
    if (projects.length <= 1) {
      onToast?.('⚠️ कम से कम 1 प्रोजेक्ट आवश्यक है');
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    onToast?.('🗑️ प्रोजेक्ट हटाया गया');
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultSupabaseProjects();
    setProjects(defaults);
    onToast?.('🔄 डिफ़ॉल्ट 2 Supabase प्रोजेक्ट्स रीसेट किए गए');
  };

  const handlePingSingle = async (project: SupabaseProjectConfig) => {
    setPingingId(project.id);
    try {
      const { updatedProject, logEntry } = await pingSupabaseProject(project);
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? updatedProject : p))
      );
      setLogs((prev) => [logEntry, ...prev.slice(0, 29)]);
      if (updatedProject.lastStatus === 'ok') {
        onToast?.(`✅ ${project.name}: HTTP ${updatedProject.lastHttpCode} (${updatedProject.lastLatencyMs}ms)`);
      } else if (updatedProject.lastStatus === 'simulated') {
        onToast?.(`⚡ ${project.name}: Dry-Run Ping सफल (${updatedProject.lastLatencyMs}ms)`);
      } else {
        onToast?.(`⚠️ ${project.name}: ${updatedProject.lastMessage}`);
      }
    } finally {
      setPingingId(null);
    }
  };

  const handlePingAll = async () => {
    setPingingId('all');
    try {
      const nextProjects: SupabaseProjectConfig[] = [];
      const newLogs: SupabasePingLog[] = [];
      for (const proj of projects) {
        const { updatedProject, logEntry } = await pingSupabaseProject(proj);
        nextProjects.push(updatedProject);
        newLogs.push(logEntry);
      }
      setProjects(nextProjects);
      setLogs((prev) => [...newLogs, ...prev].slice(0, 30));
      onToast?.(`🚀 सभी ${projects.length} Supabase प्रोजेक्ट्स को REST API GET पिंग भेजा गया!`);
    } finally {
      setPingingId(null);
    }
  };

  const yamlContent = generateGitHubActionsYaml(projects, cronSchedule);

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast?.(`📋 ${label} क्लिपबोर्ड पर कॉपी हो गया!`);
    } catch {
      onToast?.(`📋 ${label} तैयार है`);
    }
  };

  const handleDownloadYaml = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keep-supabase-alive.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast?.('📥 keep-supabase-alive.yml फ़ाइल डाउनलोड हो गई!');
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Native Android Style Header Card */}
      <div className="rounded-2xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0D5B49] dark:text-[#3FBF9B]">
              <span>🟢 SUPABASE FREE-TIER KEEP-ALIVE WEBAPP</span>
              <span>·</span>
              <span>CRON 10:00 AM UTC</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#13231C] dark:text-[#E7F0EA]">
              🔋 Supabase Keep-Alive &amp; GitHub Actions Studio
            </h2>
            <p className="text-xs sm:text-sm text-[#52645B] dark:text-[#9DB0A5]">
              अपने Supabase Free Tier प्रोजेक्ट्स को ऑटो-पॉज़ (Inactivity Pause) से बचाएं — सीधे मोबाइल ऐप से{' '}
              <code className="px-1.5 py-0.5 rounded bg-[#E6EDE8] dark:bg-[#1E2E26] font-mono text-xs">
                /rest/v1/
              </code>{' '}
              को पिंग करें या GitHub Actions YAML डाउनलोड करें।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <PWAInstallButton variant="compact" onToast={onToast} />
            <button
              type="button"
              onClick={handlePingAll}
              disabled={pingingId !== null}
              data-testid="ping-all-supabase-btn"
              className="py-2.5 px-4 rounded-xl bg-[#0D5B49] hover:bg-[#094537] active:scale-95 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{pingingId === 'all' ? '⏳ पिंग हो रहा है...' : '⚡ सभी प्रोजेक्ट्स पिंग करें (Ping All)'}</span>
            </button>
          </div>
        </div>

        {/* Android Segmented Pill Tabs */}
        <div className="mt-4 pt-4 border-t border-[#D3DDD6] dark:border-[#2B3C34] flex flex-wrap items-center justify-between gap-3">
          <div
            className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto rounded-xl bg-[#F1F5F2] dark:bg-[#0F1814] p-1 border border-[#D3DDD6] dark:border-[#2B3C34]"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'projects'}
              onClick={() => setActiveTab('projects')}
              className={`py-2 px-2 sm:px-3.5 rounded-lg text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-[#0D5B49] text-white shadow-xs'
                  : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
              }`}
            >
              🗄️ प्रोजेक्ट्स ({projects.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'yaml'}
              onClick={() => setActiveTab('yaml')}
              className={`py-2 px-2 sm:px-3.5 rounded-lg text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'yaml'
                  ? 'bg-[#0D5B49] text-white shadow-xs'
                  : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
              }`}
            >
              ⚙️ GitHub YAML
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'logs'}
              onClick={() => setActiveTab('logs')}
              className={`py-2 px-2 sm:px-3.5 rounded-lg text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-[#0D5B49] text-white shadow-xs'
                  : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white'
              }`}
            >
              📜 पिंग लॉग्स ({logs.length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#52645B] dark:text-[#9DB0A5]">
            <span>Next.js Path:</span>
            <code className="px-2 py-1 rounded-lg bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#0D5B49] dark:text-[#3FBF9B] font-mono font-semibold">
              .github/workflows/keep-supabase-alive.yml
            </code>
          </div>
        </div>
      </div>

      {/* TAB 1: SUPABASE PROJECTS & LIVE REST API PING */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projects.map((proj, index) => {
              const endpoint = normalizeSupabaseRestEndpoint(proj.projectUrlOrRef);
              const isPlaceholder = isPlaceholderProject(proj);
              const curlCmd = generateCurlCommand(proj);

              return (
                <div
                  key={proj.id}
                  data-testid={`supabase-project-card-${index + 1}`}
                  className="rounded-2xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-4 sm:p-5 space-y-4 shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#DCEEE6] dark:bg-[#173A2F] text-[#0D5B49] dark:text-[#3FBF9B] text-xs font-bold shrink-0">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) =>
                            handleUpdateProject(proj.id, 'name', e.target.value)
                          }
                          aria-label={`Project ${index + 1} Name`}
                          className="font-bold text-sm sm:text-base text-[#13231C] dark:text-[#E7F0EA] bg-transparent border-b border-transparent focus:border-[#0D5B49] focus:outline-none w-full"
                        />
                      </div>

                      {projects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveProject(proj.id)}
                          className="p-1.5 rounded-lg text-[#52645B] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                          title="प्रोजेक्ट हटाएं"
                          aria-label={`Remove ${proj.name}`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pl-8">
                      <p className="text-[11px] font-mono text-[#52645B] dark:text-[#9DB0A5] break-all">
                        GET {endpoint}
                      </p>
                      {proj.lastStatus === 'ok' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                          200 OK · {proj.lastLatencyMs}ms
                        </span>
                      )}
                      {proj.lastStatus === 'simulated' && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-[11px] font-bold shrink-0">
                          Dry-Run OK · {proj.lastLatencyMs}ms
                        </span>
                      )}
                      {proj.lastStatus === 'error' && (
                        <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[11px] font-bold shrink-0">
                          Error
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#52645B] dark:text-[#9DB0A5] mb-1">
                        Project URL / Reference ID (उदा. <code className="font-mono">YOUR_PROJECT_URL_{index + 1}</code>)
                      </label>
                      <input
                        type="text"
                        value={proj.projectUrlOrRef}
                        onChange={(e) =>
                          handleUpdateProject(proj.id, 'projectUrlOrRef', e.target.value)
                        }
                        placeholder={`YOUR_PROJECT_URL_${index + 1}`}
                        className="w-full px-3 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#0F1814] text-xs sm:text-sm font-mono text-[#13231C] dark:text-[#E7F0EA] focus:outline-none focus:border-[#0D5B49]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#52645B] dark:text-[#9DB0A5] mb-1">
                        Supabase Anon Key (<code className="font-mono">apikey</code> &amp; <code className="font-mono">Bearer</code>)
                      </label>
                      <input
                        type="text"
                        value={proj.anonKey}
                        onChange={(e) =>
                          handleUpdateProject(proj.id, 'anonKey', e.target.value)
                        }
                        placeholder={`YOUR_ANON_KEY_${index + 1}`}
                        className="w-full px-3 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#0F1814] text-xs sm:text-sm font-mono text-[#13231C] dark:text-[#E7F0EA] focus:outline-none focus:border-[#0D5B49]"
                      />
                    </div>
                  </div>

                  {/* cURL Preview Box */}
                  <div className="rounded-xl bg-[#13231C] text-[#E7F0EA] p-3 font-mono text-[11px] overflow-x-auto space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#9DB0A5] pb-1 border-b border-white/10">
                      <span>cURL HTTP GET Request</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(curlCmd, `${proj.name} cURL`)}
                        className="text-[#00F5D4] hover:underline font-sans font-semibold cursor-pointer"
                      >
                        📋 Copy cURL
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap break-all leading-relaxed">{curlCmd}</pre>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-[#52645B] dark:text-[#9DB0A5]">
                      {proj.lastPingAt ? (
                        <span>
                          अंतिम पिंग: {new Date(proj.lastPingAt).toLocaleTimeString('hi-IN')}
                        </span>
                      ) : isPlaceholder ? (
                        <span>प्लेसहोल्डर मोड (Dry-Run तैयार)</span>
                      ) : (
                        <span>लाइव पिंग के लिए तैयार</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePingSingle(proj)}
                      disabled={pingingId !== null}
                      data-testid={`ping-project-btn-${index + 1}`}
                      className="py-2 px-3.5 rounded-xl bg-[#0D5B49] hover:bg-[#094537] active:scale-95 text-white font-semibold text-xs transition-all cursor-pointer shrink-0"
                    >
                      {pingingId === proj.id ? '⏳ पिंग हो रहा...' : '⚡ अभी पिंग करें (Ping GET)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddProject}
                className="py-2 px-3.5 rounded-xl border border-[#0D5B49] text-[#0D5B49] dark:text-[#3FBF9B] hover:bg-[#DCEEE6]/40 dark:hover:bg-[#1E2E26] font-semibold text-xs transition-colors cursor-pointer"
              >
                ➕ नया Supabase प्रोजेक्ट जोड़ें
              </button>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="py-2 px-3.5 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                🔄 डिफ़ॉल्ट रीसेट करें
              </button>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('yaml')}
              className="py-2 px-4 rounded-xl bg-[#F1F5F2] dark:bg-[#1E2E26] text-[#0D5B49] dark:text-[#3FBF9B] font-bold text-xs hover:underline cursor-pointer"
            >
              GitHub Actions YAML देखें और डाउनलोड करें →
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: GITHUB ACTIONS WORKFLOW YAML */}
      {activeTab === 'yaml' && (
        <div className="rounded-2xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA]">
                📄 .github/workflows/keep-supabase-alive.yml
              </h3>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                यह फ़ाइल अपने Next.js रिपॉजिटरी के रूट में{' '}
                <code className="font-mono font-bold text-[#0D5B49] dark:text-[#3FBF9B]">
                  .github/workflows/keep-supabase-alive.yml
                </code>{' '}
                पथ पर सेव करें।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={cronSchedule}
                onChange={(e) => setCronSchedule(e.target.value)}
                aria-label="Cron Schedule"
                className="px-3 py-2 rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#0F1814] text-xs font-semibold text-[#13231C] dark:text-[#E7F0EA]"
              >
                <option value="0 10 * * *">Daily 10:00 AM UTC (0 10 * * *)</option>
                <option value="0 */12 * * *">Every 12 Hours (0 */12 * * *)</option>
                <option value="0 10 */3 * *">Every 3 Days 10:00 AM UTC</option>
              </select>

              <button
                type="button"
                onClick={() => handleCopyText(yamlContent, 'GitHub Actions YAML')}
                data-testid="copy-yaml-btn"
                className="py-2 px-3.5 rounded-xl border border-[#0D5B49] text-[#0D5B49] dark:text-[#3FBF9B] font-bold text-xs hover:bg-[#DCEEE6]/40 transition-colors cursor-pointer"
              >
                📋 Copy YAML
              </button>

              <button
                type="button"
                onClick={handleDownloadYaml}
                data-testid="download-yaml-btn"
                className="py-2 px-4 rounded-xl bg-[#0D5B49] hover:bg-[#094537] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                📥 Download .yml
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-[#0F1814] text-[#E7F0EA] p-4 font-mono text-xs overflow-x-auto border border-[#2B3C34]">
            <pre className="leading-relaxed">{yamlContent}</pre>
          </div>
        </div>
      )}

      {/* TAB 3: PING LOGS */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-4 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
            <div>
              <h3 className="text-base font-bold text-[#13231C] dark:text-[#E7F0EA]">
                📜 REST API पिंग इतिहास (Ping Activity Logs)
              </h3>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                प्रत्येक पिंग आपके Supabase डेटाबेस के <code className="font-mono">/rest/v1/</code> एंडपॉइंट को सक्रिय रखता है।
              </p>
            </div>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLogs([]);
                  onToast?.('🧹 पिंग लॉग्स साफ़ किए गए');
                }}
                className="py-1.5 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] text-xs font-semibold text-[#52645B] hover:text-red-600 cursor-pointer"
              >
                लॉग्स साफ़ करें
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="text-3xl">📡</div>
              <p className="text-sm font-semibold text-[#13231C] dark:text-[#E7F0EA]">
                अभी तक कोई पिंग लॉग नहीं है
              </p>
              <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                ऊपर &ldquo;सभी प्रोजेक्ट्स पिंग करें (Ping All)&rdquo; बटन दबाकर तुरंत टेस्ट करें।
              </p>
              <button
                type="button"
                onClick={handlePingAll}
                className="py-2 px-4 rounded-xl bg-[#0D5B49] text-white font-bold text-xs cursor-pointer"
              >
                ⚡ अभी टेस्ट पिंग चलाएं
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#D3DDD6] dark:divide-[#2B3C34]">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#13231C] dark:text-[#E7F0EA] flex items-center gap-2">
                      <span>
                        {log.status === 'ok'
                          ? '✅'
                          : log.status === 'simulated'
                          ? '⚡'
                          : '❌'}
                      </span>
                      <span>{log.projectName}</span>
                      <span className="font-mono text-[11px] text-[#0D5B49] dark:text-[#3FBF9B]">
                        HTTP {log.httpCode} · {log.latencyMs}ms
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-[#52645B] dark:text-[#9DB0A5] break-all">
                      GET {log.endpoint} — {log.message}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#52645B] dark:text-[#9DB0A5] shrink-0">
                    {new Date(log.timestamp).toLocaleString('hi-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
