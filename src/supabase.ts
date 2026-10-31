import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://tlutctwlfauwkwgnhgsa.supabase.co';
export const SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsdXRjdHdsZmF1d2t3Z25oZ3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNDkyOTcsImV4cCI6MjEwODYyNTI5N30.3NDrZdUR0l9cujtochXj6hHF-SHPXdhbrPfcWdAIvy4').replace(/\s+/g, '');

let supabaseInstance: SupabaseClient | null = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn('Failed to initialize Supabase client:', e);
}

export const supabase = supabaseInstance;

export async function checkSupabaseHealth(): Promise<{ ok: boolean; status: number; message: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (res.status === 200) {
      return { ok: true, status: 200, message: 'सुपाबेस से कनेक्शन ठीक है! अब लॉगिन / साइनअप कर सकते हैं।' };
    }
    return { ok: true, status: res.status, message: `सर्वर जवाब: HTTP ${res.status} — साइनअप/लॉगिन आज़माएँ।` };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      message: `नेटवर्क समस्या: ${err.message || 'कनेक्ट नहीं हो पा रहा है'}`,
    };
  }
}

export function translateSupabaseError(msg: string): string {
  if (!msg) return 'कुछ गड़बड़ हो गई।';
  if (msg.includes('Invalid login credentials')) return 'ईमेल या पासवर्ड गलत है।';
  if (msg.includes('Email not confirmed')) return 'ईमेल पुष्टि बाकी है — कृपया अपना इनबॉक्स देखें।';
  if (msg.includes('already registered')) return 'यह ईमेल पहले से पंजीकृत है — लॉगिन टैब से लॉगिन करें।';
  if (msg.includes('at least')) return 'पासवर्ड कम से कम 6 अक्षर का हो।';
  if (msg.includes('Failed to fetch')) return 'नेटवर्क समस्या — इंटरनेट कनेक्शन जांचें।';
  if (msg.includes('rate limit')) return 'बहुत कोशिशें हो गईं — कृपया 1 मिनट रुककर फिर आज़माएँ।';
  return msg;
}

export function getStoredUser(): { name: string; email: string } | null {
  try {
    const raw = localStorage.getItem('btd-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: { name: string; email: string } | null): void {
  try {
    if (user) {
      localStorage.setItem('btd-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('btd-user');
    }
  } catch {
    // ignore
  }
}
