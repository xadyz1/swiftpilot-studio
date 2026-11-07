export interface SessionUser { id: number; name: string | null; email: string | null; role: 'user' | 'admin' }
export interface AuthState { authenticated: boolean; mode?: 'local' | 'server'; user?: SessionUser }

const post = (url: string, body?: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

export async function fetchAuth(): Promise<AuthState> {
  try { return await (await fetch('/api/studio/auth/me')).json(); } catch { return { authenticated: false }; }
}
export interface LoginResult { auth?: AuthState; needsPassword?: boolean }
export async function login(email: string, opts: { name?: string; password?: string; newPassword?: string } = {}): Promise<LoginResult> {
  const res = await post('/api/studio/auth/login', { email, ...opts });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? 'Sign-in failed.');
  if (body?.needsPassword) return { needsPassword: true };
  return { auth: { authenticated: true, mode: 'server', user: body.user } };
}
export async function logout(): Promise<void> { await post('/api/studio/auth/logout').catch(() => {}); }

export interface AdminUser { id: number; name: string | null; email: string | null; role: 'user' | 'admin'; loginMethod: string | null; lastSignedIn: number }
export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/studio/admin/users');
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? 'Could not load users.');
  return body.users;
}
export async function createAdminUser(email: string, name?: string, role?: 'user' | 'admin', password?: string): Promise<void> {
  const res = await post('/api/studio/admin/users', { email, name, role, password });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not add the user.');
}
export async function patchAdminUser(id: number, patch: { name?: string; role?: 'user' | 'admin' }): Promise<void> {
  const res = await fetch('/api/studio/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Could not update the user.');
}

export async function loadServerState(): Promise<unknown> {
  const res = await fetch('/api/studio/state');
  if (!res.ok) return null;
  return (await res.json().catch(() => null))?.payload ?? null;
}
export async function saveServerState(payload: unknown): Promise<void> {
  await fetch('/api/studio/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload }) }).catch(() => {});
}
