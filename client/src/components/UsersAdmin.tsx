import { useEffect, useState } from 'react';
import { ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { listAdminUsers, createAdminUser, patchAdminUser, type AdminUser } from '../lib/auth';

export default function UsersAdmin({ currentUserId }: { currentUserId?: number }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => listAdminUsers().then(setUsers).catch(e => toast.error(e.message));
  useEffect(() => { load(); }, []);

  async function add() {
    if (!email.trim()) return;
    setBusy(true);
    try { await createAdminUser(email.trim(), name.trim() || undefined, role, password || undefined); setPassword(''); setEmail(''); setName(''); await load(); toast.success('User added.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not add the user.'); }
    finally { setBusy(false); }
  }
  async function toggleRole(u: AdminUser) {
    try { await patchAdminUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' }); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Update failed.'); }
  }

  return (
    <section className="settings-panel">
      <header className="settings-header"><h2><ShieldCheck size={17} /> Users</h2><p className="helper-text">Manage who can sign in. The master account is <strong>ivandro.work@gmail.com</strong>.</p></header>
      <div className="setting-grid">
        <label className="field-label">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="person@email.com" /></label>
        <label className="field-label">Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Optional name" /></label>
        <label className="field-label">Role<select value={role} onChange={e => setRole(e.target.value as 'user' | 'admin')}><option value="user">Member</option><option value="admin">Admin</option></select></label>
        <label className="field-label">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Initial password (8+ chars)" /></label>
        <div className="field-label" style={{ alignSelf: 'end' }}><button type="button" className="button primary" onClick={add} disabled={busy || !email.trim()}><UserPlus size={15} /> Add user</button></div>
      </div>
      <div className="ua-list">
        {users.map(u => (
          <div key={u.id} className="ua-row">
            <div className="ua-ident"><strong>{u.name || '—'}</strong><span>{u.email}</span></div>
            <span className={`ua-role ${u.role}`}>{u.role}</span>
            <span className="ua-last">{u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : 'never'}</span>
            <button type="button" className="button secondary" onClick={() => toggleRole(u)} disabled={u.id === currentUserId}>{u.role === 'admin' ? 'Make member' : 'Make admin'}</button>
          </div>
        ))}
        {!users.length && <p className="helper-text">No users yet — add the first one above.</p>}
      </div>
    </section>
  );
}
