export interface SupabaseProjectConfig {
  id: string;
  name: string;
  projectUrlOrRef: string;
  anonKey: string;
  enabled: boolean;
  lastPingAt?: string | null;
  lastStatus?: 'idle' | 'ok' | 'simulated' | 'error';
  lastHttpCode?: number | null;
  lastLatencyMs?: number | null;
  lastMessage?: string;
}

export interface SupabasePingLog {
  id: string;
  projectId: string;
  projectName: string;
  endpoint: string;
  timestamp: string;
  status: 'ok' | 'simulated' | 'error';
  httpCode: number;
  latencyMs: number;
  message: string;
}

export const SUPABASE_KEEPALIVE_STORAGE_KEY = 'th-supabase-keepalive-projects-v1';
export const SUPABASE_KEEPALIVE_LOGS_KEY = 'th-supabase-keepalive-logs-v1';

export function getDefaultSupabaseProjects(): SupabaseProjectConfig[] {
  return [
    {
      id: 'proj-1',
      name: 'Supabase Project 1 (Primary DB)',
      projectUrlOrRef: 'YOUR_PROJECT_URL_1',
      anonKey: 'YOUR_ANON_KEY_1',
      enabled: true,
      lastPingAt: null,
      lastStatus: 'idle',
      lastHttpCode: null,
      lastLatencyMs: null,
    },
    {
      id: 'proj-2',
      name: 'Supabase Project 2 (Secondary DB)',
      projectUrlOrRef: 'YOUR_PROJECT_URL_2',
      anonKey: 'YOUR_ANON_KEY_2',
      enabled: true,
      lastPingAt: null,
      lastStatus: 'idle',
      lastHttpCode: null,
      lastLatencyMs: null,
    },
  ];
}

/**
 * Normalizes any user input (project ref, domain, or full URL) into the exact
 * Supabase REST v1 endpoint: https://<PROJECT_URL>.supabase.co/rest/v1/
 */
export function normalizeSupabaseRestEndpoint(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return 'https://YOUR_PROJECT_URL.supabase.co/rest/v1/';
  }

  // Strip protocol if present
  let clean = trimmed.replace(/^https?:\/\//i, '');
  // Strip trailing path if present
  clean = clean.split('/')[0] || clean;
  // Strip .supabase.co if present so we can reconstruct deterministically
  clean = clean.replace(/\.supabase\.co$/i, '');

  return `https://${clean}.supabase.co/rest/v1/`;
}

export function isPlaceholderProject(project: Pick<SupabaseProjectConfig, 'projectUrlOrRef' | 'anonKey'>): boolean {
  const url = (project.projectUrlOrRef || '').trim();
  const key = (project.anonKey || '').trim();
  if (!url || !key) return true;
  if (/YOUR_PROJECT_URL/i.test(url) || /YOUR_ANON_KEY/i.test(key)) return true;
  if (url === '<PROJECT_URL>' || key === '<ANON_KEY>') return true;
  return false;
}

export function generateCurlCommand(project: Pick<SupabaseProjectConfig, 'projectUrlOrRef' | 'anonKey'>): string {
  const endpoint = normalizeSupabaseRestEndpoint(project.projectUrlOrRef);
  const anonKey = (project.anonKey || 'YOUR_ANON_KEY').trim();
  return [
    `curl --fail --silent --show-error --location \\`,
    `  --request GET "${endpoint}" \\`,
    `  --header "apikey: ${anonKey}" \\`,
    `  --header "Authorization: Bearer ${anonKey}"`,
  ].join('\n');
}

export function generateGitHubActionsYaml(
  projects: SupabaseProjectConfig[],
  cronExpression = '0 10 * * *'
): string {
  const activeProjects = projects.length > 0 ? projects : getDefaultSupabaseProjects();

  const stepsYaml = activeProjects
    .map((proj, idx) => {
      const endpoint = normalizeSupabaseRestEndpoint(proj.projectUrlOrRef);
      const anonKey = (proj.anonKey || `YOUR_ANON_KEY_${idx + 1}`).trim();
      const stepTitle = proj.name || `Supabase Project ${idx + 1}`;
      return [
        `      - name: Ping ${stepTitle} REST API`,
        `        run: |`,
        `          curl --fail --silent --show-error --location \\`,
        `            --request GET "${endpoint}" \\`,
        `            --header "apikey: ${anonKey}" \\`,
        `            --header "Authorization: Bearer ${anonKey}"`,
      ].join('\n');
    })
    .join('\n\n');

  return [
    `name: Keep Supabase Projects Active`,
    ``,
    `on:`,
    `  schedule:`,
    `    # Runs daily at 10:00 AM UTC`,
    `    - cron: '${cronExpression}'`,
    `  workflow_dispatch: # Allows manual trigger from the GitHub UI`,
    ``,
    `jobs:`,
    `  ping-supabase:`,
    `    runs-on: ubuntu-latest`,
    ``,
    `    steps:`,
    stepsYaml,
    ``,
  ].join('\n');
}

export async function pingSupabaseProject(
  project: SupabaseProjectConfig,
  fetchImpl: typeof fetch = fetch
): Promise<{
  updatedProject: SupabaseProjectConfig;
  logEntry: SupabasePingLog;
}> {
  const endpoint = normalizeSupabaseRestEndpoint(project.projectUrlOrRef);
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // If still using placeholder credentials, simulate a verified dry-run ping so the user can test the workflow UI immediately
  if (isPlaceholderProject(project)) {
    const simulatedLatency = 42;
    const message = 'Dry-Run OK (Replace YOUR_PROJECT_URL & YOUR_ANON_KEY for live DB ping)';
    const logEntry: SupabasePingLog = {
      id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: project.id,
      projectName: project.name,
      endpoint,
      timestamp,
      status: 'simulated',
      httpCode: 200,
      latencyMs: simulatedLatency,
      message,
    };
    return {
      updatedProject: {
        ...project,
        lastPingAt: timestamp,
        lastStatus: 'simulated',
        lastHttpCode: 200,
        lastLatencyMs: simulatedLatency,
        lastMessage: message,
      },
      logEntry,
    };
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        apikey: project.anonKey.trim(),
        Authorization: `Bearer ${project.anonKey.trim()}`,
      },
    });
    const latencyMs = Math.max(1, Date.now() - startTime);
    const isOk = response.status >= 200 && response.status < 300;
    const message = isOk
      ? `HTTP ${response.status} OK — Supabase REST API Active`
      : `HTTP ${response.status} ${response.statusText || 'Response'}`;

    const logEntry: SupabasePingLog = {
      id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: project.id,
      projectName: project.name,
      endpoint,
      timestamp,
      status: isOk ? 'ok' : 'error',
      httpCode: response.status,
      latencyMs,
      message,
    };

    return {
      updatedProject: {
        ...project,
        lastPingAt: timestamp,
        lastStatus: isOk ? 'ok' : 'error',
        lastHttpCode: response.status,
        lastLatencyMs: latencyMs,
        lastMessage: message,
      },
      logEntry,
    };
  } catch (err: any) {
    const latencyMs = Math.max(1, Date.now() - startTime);
    const message = err?.message || 'Network or CORS error while pinging Supabase REST API';
    const logEntry: SupabasePingLog = {
      id: `ping-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: project.id,
      projectName: project.name,
      endpoint,
      timestamp,
      status: 'error',
      httpCode: 0,
      latencyMs,
      message,
    };

    return {
      updatedProject: {
        ...project,
        lastPingAt: timestamp,
        lastStatus: 'error',
        lastHttpCode: 0,
        lastLatencyMs: latencyMs,
        lastMessage: message,
      },
      logEntry,
    };
  }
}

export function loadStoredSupabaseProjects(): SupabaseProjectConfig[] {
  try {
    const raw = localStorage.getItem(SUPABASE_KEEPALIVE_STORAGE_KEY);
    if (!raw) return getDefaultSupabaseProjects();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return getDefaultSupabaseProjects();
}

export function saveStoredSupabaseProjects(projects: SupabaseProjectConfig[]): void {
  try {
    localStorage.setItem(SUPABASE_KEEPALIVE_STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // ignore
  }
}

export function loadStoredSupabasePingLogs(): SupabasePingLog[] {
  try {
    const raw = localStorage.getItem(SUPABASE_KEEPALIVE_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredSupabasePingLogs(logs: SupabasePingLog[]): void {
  try {
    localStorage.setItem(SUPABASE_KEEPALIVE_LOGS_KEY, JSON.stringify(logs.slice(0, 30)));
  } catch {
    // ignore
  }
}
