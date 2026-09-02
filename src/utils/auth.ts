'use client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const STORAGE_KEY = 'vrsbueno_session';

export interface Session {
  access_token: string;
  refresh_token: string;
  user: { email: string };
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function login(email: string, password: string): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error_description || data.msg || 'Falha no login' };
  }
  const session: Session = { access_token: data.access_token, refresh_token: data.refresh_token, user: { email: data.user?.email || email } };
  saveSession(session);
  return { ok: true, session };
}

export function logout() {
  clearSession();
}

// Header de autorização a usar em requisições que precisam de sessão autenticada
// (insert/update/delete). Sem sessão, cai para a anon key (só leitura permitida pela RLS).
export function authHeaders(): Record<string, string> {
  const session = getSession();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
  };
}
