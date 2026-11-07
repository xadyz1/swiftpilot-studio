import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Instagram, Link2, Loader2, RefreshCw, Send, Settings2 } from 'lucide-react';
import type { SiteProject } from '@shared/studio';
import type { ContentTemplate, Platform } from '../data/content';
import type { PlannedPost } from '../lib/planner';
import { PlatformIcon } from './PostCard';

type Integration = { id:string; name:string; identifier:string; picture?:string; disabled?:boolean; profile?:string };
type Props = { project:SiteProject; posts:PlannedPost[]; templates:ContentTemplate[] };
const keyFor=(projectId:string)=>`swiftpilot-postiz-channels-${projectId}`;
function readMapping(projectId:string): Record<string,string> { try { return JSON.parse(localStorage.getItem(keyFor(projectId)) || '{}'); } catch { return {}; } }
export default function PostizPublisher({project,posts,templates}:Props) {
  const [configured,setConfigured]=useState<boolean|null>(null);
  const [baseHost,setBaseHost]=useState('');
  const [integrations,setIntegrations]=useState<Integration[]>([]);
  const [mapping,setMapping]=useState<Record<string,string>>(()=>readMapping(project.id));
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [mode,setMode]=useState<'draft'|'schedule'>('schedule');
  const [selected,setSelected]=useState<string[]>([]);
  const eligible=useMemo(()=>posts.filter(post=>post.status!=='published' && (post.platform==='instagram'||post.platform==='tiktok')), [posts]);
  const contentFor=(post:PlannedPost)=>post.content ?? templates.find(t=>t.id===post.templateId);
  useEffect(()=>{setMapping(readMapping(project.id));setSelected([]);void refresh();},[project.id]);
  async function refresh(){
    setBusy(true);setError('');setMessage('');
    try { const status=await fetch('/api/postiz/status'); const data=await status.json(); setConfigured(Boolean(data.configured));setBaseHost(data.baseHost||''); if(data.configured){const response=await fetch('/api/postiz/integrations');const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not load Postiz channels.');setIntegrations(body.integrations||[]);} }
    catch(cause){setConfigured(false);setError(cause instanceof Error?cause.message:'Postiz status could not be loaded.');} finally {setBusy(false);}
  }
  function setChannel(platform:Platform,id:string){const next={...mapping,[platform]:id};setMapping(next);localStorage.setItem(keyFor(project.id),JSON.stringify(next));}
  async function connect(provider:'instagram'|'tiktok'){try{setBusy(true);const response=await fetch(`/api/postiz/connect/${provider}`);const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not create the Postiz connection link.');window.open(body.url,'_blank','noopener,noreferrer');setMessage('Postiz opened in a new tab. Finish the provider connection there, then refresh channels.');}catch(cause){setError(cause instanceof Error?cause.message:'Could not connect this channel.');}finally{setBusy(false);}}
  async function publish(){
    setBusy(true);setError('');setMessage('');
    try {
      if(!selected.length) throw new Error('Select at least one planned post.');
      const items=selected.map(id=>eligible.find(post=>post.id===id)).filter(Boolean) as PlannedPost[];
      const payloadPosts=[] as Record<string,unknown>[];
      for(const post of items){
        const template=contentFor(post);if(!template)continue;
        const integrationId=mapping[post.platform];if(!integrationId)throw new Error(`Connect a Postiz ${post.platform} channel for this project first.`);
        const variant=template.variants[post.platform];
        const value:{content:string;image?:{id:string;path:string}[]}={content:`${variant.caption}\n\n${variant.cta}\n\n${variant.hashtags}`};
        const source=template.image && /^https?:\/\//i.test(template.image)?template.image:undefined;
        if(source){
          const upload=await fetch('/api/postiz/upload-from-url',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:source,adjust:true})});
          const uploaded=await upload.json();
          if(!upload.ok||typeof uploaded?.id!=='string'||typeof uploaded?.path!=='string')throw new Error(uploaded?.error||`Postiz could not prepare media for “${template.title}”.`);
          value.image=[{id:uploaded.id,path:uploaded.path}];
        }
        payloadPosts.push({integration:{id:integrationId},value,settings:post.platform==='instagram'?{__type:'instagram',post_type:'post'}:{__type:'tiktok',privacy_level:'PUBLIC_TO_EVERYONE',content_posting_method:'DIRECT_POST'}});
      }
      if(!payloadPosts.length)throw new Error('The selected posts have no usable content.');
      const response=await fetch('/api/postiz/posts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:mode,date:new Date(`${items[0].date}T${items[0].time}:00`).toISOString(),shortLink:false,tags:[],posts:payloadPosts})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||'Postiz rejected the post batch.');setMessage(`${payloadPosts.length} post${payloadPosts.length===1?'':'s'} sent to Postiz as ${mode === 'draft'?'drafts':'scheduled posts'}. Verify the result in Postiz.`);setSelected([]);
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not send posts to Postiz.');}finally{setBusy(false);}
  }
  const instagram=integrations.filter(item=>item.identifier==='instagram'||item.identifier==='instagram-standalone');
  const tiktok=integrations.filter(item=>item.identifier==='tiktok');
  return <section className="settings-panel postiz-panel"><div className="panel-header"><div><span className="eyebrow">POSTIZ PUBLISHING</span><h2>Connect your channels</h2><p>Postiz stays responsible for OAuth, queues, and platform delivery. SwiftPilot sends only the selected project’s reviewed posts.</p></div><button className="icon-button" onClick={refresh} aria-label="Refresh Postiz channels" disabled={busy}>{busy?<Loader2 className="spin" size={18}/>:<RefreshCw size={18}/>}</button></div>
    {configured===false&&<div className="postiz-setup-note"><Settings2 size={18}/><div><strong>Postiz is not configured on this server yet.</strong><p>Set <code>POSTIZ_BASE_URL</code> to your self-hosted URL and <code>POSTIZ_API_KEY</code> as a server secret, then restart the studio. The base URL should look like <code>https://your-postiz-domain/api/public/v1</code>. Never paste the API key into this browser form.</p></div></div>}
    {configured&&<><div className="postiz-status"><CheckCircle2 size={17}/>Connected to {baseHost || 'your Postiz instance'}<button className="text-button" onClick={refresh}>Refresh channels</button></div><div className="postiz-channel-grid"><div><h3><Instagram size={16}/>Instagram</h3><select value={mapping.instagram||''} onChange={e=>setChannel('instagram',e.target.value)}><option value="">Choose connected channel…</option>{instagram.map(i=><option key={i.id} value={i.id}>{i.name}{i.profile?` · @${i.profile}`:''}</option>)}</select><button className="text-button" onClick={()=>connect('instagram')}><Link2 size={14}/>Connect Instagram in Postiz</button></div><div><h3><PlatformIcon platform="tiktok" size={16}/>TikTok</h3><select value={mapping.tiktok||''} onChange={e=>setChannel('tiktok',e.target.value)}><option value="">Choose connected channel…</option>{tiktok.map(i=><option key={i.id} value={i.id}>{i.name}{i.profile?` · @${i.profile}`:''}</option>)}</select><button className="text-button" onClick={()=>connect('tiktok')}><Link2 size={14}/>Connect TikTok in Postiz</button></div></div><div className="postiz-queue"><div className="postiz-queue-head"><div><h3>Send planned posts</h3><p>{eligible.length} unpublished Instagram/TikTok entries in this project.</p></div><select value={mode} onChange={e=>setMode(e.target.value as 'draft'|'schedule')}><option value="schedule">Schedule in Postiz</option><option value="draft">Save as Postiz drafts</option></select></div><div className="postiz-post-list">{eligible.slice(0,30).map(post=>{const template=contentFor(post);return <label key={post.id}><input type="checkbox" checked={selected.includes(post.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,post.id]:current.filter(id=>id!==post.id))}/><span>{post.date} · {post.time}</span><strong>{template?.title||post.templateId}</strong><PlatformIcon platform={post.platform} size={14}/></label>})}</div><button className="button primary" onClick={publish} disabled={busy||!selected.length}><Send size={16}/>{busy?'Sending…':`Send ${selected.length||''} to Postiz`}</button></div></>}
    {message&&<p className="form-success" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}<p className="inline-note">Postiz uses “integration” for a connected channel. Instagram requires media for many post types; local browser uploads must first be uploaded to Postiz’s media library before they can be published.</p><a className="inline-link" href="https://docs.postiz.com/public-api/introduction.md" target="_blank" rel="noreferrer">Read the Postiz API documentation <ExternalLink size={13}/></a>
  </section>;
}
