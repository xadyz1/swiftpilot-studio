import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Lead { id: number; name: string; email: string; brands: number; notes: string | null; createdAt: number }

export default function LeadsAdmin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  useEffect(() => {
    fetch('/api/studio/leads').then(r => r.json()).then(d => setLeads(d.leads ?? [])).catch(e => toast.error(e.message));
  }, []);
  return (
    <section className="settings-panel">
      <header className="settings-header"><h2><Mail size={17} /> Quote requests</h2><p className="helper-text">Leads captured on the landing page "Pedir Orçamento" form.</p></header>
      <div className="ua-list">
        {leads.map(l => (
          <div key={l.id} className="ua-row">
            <div className="ua-ident"><strong>{l.name}</strong><span>{l.email}</span></div>
            <span className="ua-role">{l.brands} {l.brands === 1 ? 'site' : 'sites'}</span>
            <span className="ua-last">{new Date(l.createdAt).toLocaleDateString()}</span>
            {l.notes && <span className="ua-notes" title={l.notes}>{l.notes}</span>}
          </div>
        ))}
        {!leads.length && <p className="helper-text">No leads yet — they appear here when someone submits the landing form.</p>}
      </div>
    </section>
  );
}
