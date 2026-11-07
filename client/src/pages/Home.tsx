import { useEffect,useMemo,useRef,useState,type CSSProperties } from 'react';
import { format,isSameMonth } from 'date-fns';
import { ArrowDownToLine,ArrowRight,ArrowUpRight,BookOpen,CalendarDays,CheckCircle2,ChevronDown,ChevronsLeft,ChevronsRight,Clapperboard,CircleHelp,ExternalLink,Files,Filter,FolderHeart,Globe,ImagePlus,Instagram,LayoutGrid,Menu,Megaphone,Palette,Plus,Rocket,Search,Send,Settings,Sparkles,X,Users,LogOut,Mail } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentTemplate,Platform } from '../data/content';
import type { SiteProject,MediaAsset } from '@shared/studio';
import { dateKey,exportCSV,parseDate,type PlannedPost,downloadText } from '../lib/planner';
import { loadStudio,saveStudio,createProject,applyWebsiteImport,plannedSuggestions } from '../lib/studio';
import { loadBrandFonts,safeFont,siteDomain } from '../lib/brand';
import { useMediaSource,mediaProxyURL } from '../lib/media';
import { createBlankTemplate } from '../lib/studio-canvas';
import ContentCalendar from '../components/ContentCalendar';
import PostCard,{PlatformIcon} from '../components/PostCard';
import PostEditor from '../components/PostEditor';
import BrandKitEditor from '../components/BrandKitEditor';
import MediaLibrary from '../components/MediaLibrary';
import SourceImporter from '../components/SourceImporter';
import OnboardingWizard from '../components/OnboardingWizard';
import UsersAdmin from '../components/UsersAdmin';
import LeadsAdmin from '../components/LeadsAdmin';
import { fetchAuth, login as authLogin, logout as authLogout, loadServerState, saveServerState, type AuthState } from '../lib/auth';
import GenerateDialog from '../components/GenerateDialog';
import PostizPublisher from '../components/PostizPublisher';
import CreativeStudio from '../components/CreativeStudio';
import VisualStudio from '../components/VisualStudio';
import AISettingsPanel from '../components/AISettingsPanel';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '../components/ui/dialog';

type Page='projects'|'calendar'|'library'|'visual-studio'|'brand'|'media'|'sources'|'publishing'|'reels'|'ads'|'settings'|'users'|'leads'|'guide';
function ProjectLogo({project}:{project:SiteProject}) {
  const logo=useMediaSource(project.brand.logo);
  return <span className="project-logo" style={{background:project.brand.background,color:project.brand.primary}}>{logo?<img src={mediaProxyURL(logo)} alt="" style={{filter:project.id==='hungrypockets'?'brightness(0)':'none'}} />:<strong>{project.name.slice(0,2).toUpperCase()}</strong>}</span>;
}
export default function Home() {
  const [studio,setStudio]=useState(loadStudio);
  const [page,setPage]=useState<Page>('calendar');
  const [storageWorks,setStorageWorks]=useState(true);
  const [date,setDate]=useState(new Date());
  const [view,setView]=useState<'month'|'week'>('month');
  const [query,setQuery]=useState('');
  const [platform,setPlatform]=useState('all');
  const [campaign,setCampaign]=useState('all');
  const [theme,setTheme]=useState('all');
  const [contentFormat,setContentFormat]=useState('all');
  const [statusFilter,setStatusFilter]=useState('all');
  const [showFilters,setShowFilters]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(()=>{try{return localStorage.getItem('sp-sidebar-collapsed')==='1';}catch{return false;}});
  const [planningDate,setPlanningDate]=useState<string|null>(null);
  const [editor,setEditor]=useState<{template:ContentTemplate;post?:PlannedPost;targetDate:string}|null>(null);
  const [creative,setCreative]=useState<ContentTemplate|null>(null);
  const [studioTemplate,setStudioTemplate]=useState<ContentTemplate|null>(null);
  const [studioPost,setStudioPost]=useState<PlannedPost|undefined>(undefined);
  const [reelTemplate,setReelTemplate]=useState<ContentTemplate|null>(null);
  const [generating,setGenerating]=useState(false);
  const [addingProject,setAddingProject]=useState(false);
  const [auth,setAuth]=useState<AuthState>({authenticated:false});
  const [authLoaded,setAuthLoaded]=useState(false);
  const [signingIn,setSigningIn]=useState(false);
  const [signInEmail,setSignInEmail]=useState('');
  const [signInName,setSignInName]=useState('');
  useEffect(()=>{fetchAuth().then(a=>{setAuth(a);setAuthLoaded(true);if(a.authenticated){loadServerState().then(payload=>{if(payload&&typeof payload==='object'&&(payload as {projects?:unknown}).projects)setStudio(payload as typeof studio);});}});},[]);
  
  
  const project=studio.projects.find(p=>p.id===studio.activeProjectId) ?? studio.projects[0];
  const state=project.planner;
  useEffect(()=>{setStorageWorks(saveStudio(studio));},[studio]);
  useEffect(()=>{loadBrandFonts(project.brand);document.title=`SwiftPilot Social Studio · ${project.name}`;},[project.brand,project.name]);
  const updateProject=(id:string,update:(previous:SiteProject)=>SiteProject)=>setStudio(prev=>({...prev,projects:prev.projects.map(p=>p.id===id?update(p):p)}));
  const updatePlanner=(update:(previous:typeof state)=>typeof state)=>updateProject(project.id,p=>({...p,planner:update(p.planner)}));
  const contents=useMemo(()=>project.templates.map(t=>state.edits[t.id]??t),[project.templates,state.edits]);
  const matchesTemplate=(t:ContentTemplate)=>(platform==='all'||t.platforms.includes(platform as Platform))&&(campaign==='all'||t.campaign===campaign)&&(theme==='all'||t.theme===theme)&&(contentFormat==='all'||t.format===contentFormat)&&`${t.title} ${t.theme} ${t.headline} ${t.campaign} ${t.variants.instagram.caption} ${t.variants.tiktok.caption}`.toLowerCase().includes(query.toLowerCase());
  const filteredTemplates=contents.filter(matchesTemplate);
  const filteredPosts=state.posts.filter(p=>{const content=p.content??contents.find(t=>t.id===p.templateId);return content&&matchesTemplate(content)&&(platform==='all'||p.platform===platform)&&(statusFilter==='all'||p.status===statusFilter);});
  const monthPosts=state.posts.filter(p=>isSameMonth(parseDate(p.date),date));
  const activeFilters=[campaign,theme,contentFormat,statusFilter].filter(f=>f!=='all').length;
  const clearFilters=()=>{setQuery('');setPlatform('all');setCampaign('all');setTheme('all');setContentFormat('all');setStatusFilter('all');};
  const go=(next:Page)=>{setPage(next);setMenuOpen(false);setPlanningDate(null);clearFilters();};
  const switchProject=(id:string,next:Page='calendar')=>{setStudio(prev=>({...prev,activeProjectId:id}));setEditor(null);setCreative(null);setReelTemplate(null);setStudioTemplate(null);setStudioPost(undefined);setGenerating(false);setDate(new Date());go(next);};
  const open=(template:ContentTemplate)=>setEditor({template,targetDate:planningDate??dateKey(new Date())});
  const openVisualStudio=(targetTemplate?:ContentTemplate,post?:PlannedPost)=>{
    const t = targetTemplate ? JSON.parse(JSON.stringify(targetTemplate)) : createBlankTemplate(project);
    setStudioTemplate(t);
    setStudioPost(post);
    setEditor(null);
    setCreative(null);
    go('visual-studio');
  };
  const planFor=(day:string)=>{setPlanningDate(day);setPage('library');clearFilters();};
  const openAdsStudio=()=>{const t=createBlankTemplate(project);t.aspectRatio='leaderboard';t.format='Image';t.headline=project.brand.tagline||project.name;t.cta='Learn more';openVisualStudio(t);};
  const save=(template:ContentTemplate,post:Omit<PlannedPost,'id'>,id?:string)=>{updateProject(project.id,p=>({...p,templates:p.templates.some(t=>t.id===template.id)?p.templates:[...p.templates,template],planner:{...p.planner,posts:id?p.planner.posts.map(existing=>existing.id===id?{...post,id,content:template}:existing):[...p.planner.posts,{...post,id:crypto.randomUUID(),content:template}]}}));setEditor(null);setPlanningDate(null);setPage('calendar');setDate(parseDate(post.date));toast.success(id?'Planned post updated.':'Added to the calendar. Publishing stays manual.');};
  const remove=(id:string)=>{const removed=state.posts.find(p=>p.id===id);const projectId=project.id;updatePlanner(prev=>({...prev,posts:prev.posts.filter(p=>p.id!==id)}));setEditor(null);toast('Post removed.',{action:{label:'Undo',onClick:()=>{if(removed) updateProject(projectId,p=>({...p,planner:{...p.planner,posts:[...p.planner.posts.filter(item=>item.id!==removed.id),removed]}}));}}});};
  const move=(id:string,day:string)=>{if(!state.posts.some(p=>p.id===id))return;updatePlanner(prev=>({...prev,posts:prev.posts.map(p=>p.id===id?{...p,date:day}:p)}));toast.success(`Moved to ${format(parseDate(day),'MMM d')}.`);};
  const createFromMedia=(asset:MediaAsset)=>{
    const t = createBlankTemplate(project);
    t.image = asset.url;
    t.mediaKind = asset.kind;
    t.title = `${asset.name.slice(0, 35)} Post`;
    t.headline = project.brand.tagline || project.name;
    openVisualStudio(t);
  };
  const pageNames={projects:'Your projects',calendar:'Content calendar',library:'Post library','visual-studio':'Visual Studio',brand:'Brand identity',media:'Media library',sources:'Website imports',publishing:'Postiz publishing',reels:'9:16 Reel generator',ads:'Ads channel',settings:'Settings',users:'Manage users',leads:'Quote requests',guide:'Studio guide'};
  const pageDescriptions={projects:'Different projects. One place to keep them moving.',calendar:'Make a plan. Keep your brand consistent.',library:'Source-grounded ideas, ready for your finishing touch.','visual-studio':'Shape posts in multiple aspect ratios with live preview, brand presets, and Retina export.',brand:'Your logo, your type, your colors. Applied to every creative.',media:'Upload your own assets or bring them in from your website.',sources:'Crawl public pages. Discover content, media, and brand cues.',publishing:'Connect Instagram and TikTok through your self-hosted Postiz instance.',reels:'Turn a post idea or imported video into a vertical Reel.',ads:'Design responsive campaign layouts and interactive ad exports.',settings:'Configure the AI endpoint used for future generation runs.',users:'Add teammates and control their roles.',leads:'People who asked for a quote on the landing page.',guide:'A reusable studio, with you in the pilot seat.'};
  const projectStyle={'--project-primary':project.brand.primary,'--project-secondary':project.brand.secondary,'--project-heading':`"${safeFont(project.brand.headingFont)}",sans-serif`,'--project-case':project.brand.uppercase?'uppercase':'none'} as CSSProperties;
  const syncRef=useRef<number|undefined>(undefined);
  useEffect(()=>{
    if(!auth.authenticated)return;
    window.clearTimeout(syncRef.current);
    syncRef.current=window.setTimeout(()=>{saveServerState({projects:studio.projects,activeProjectId:studio.activeProjectId});},1500);
    return ()=>window.clearTimeout(syncRef.current);
  },[studio,auth.authenticated]);
  const toggleCollapsed=()=>setCollapsed(prev=>{try{localStorage.setItem('sp-sidebar-collapsed',prev?'0':'1');}catch{}return !prev;});
  return <div className={`studio-shell swiftpilot-shell ${collapsed?'sidebar-collapsed':''}`} style={projectStyle}>
    {menuOpen&&<button className="sidebar-overlay" aria-label="Close navigation" onClick={()=>setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen?'mobile-open':''}`}>
      <div className="sidebar-head">
        <button className="swiftpilot-wordmark" onClick={()=>go('projects')} aria-label="SwiftPilot Social Studio"><img className="wordmark-mark" src="/landing/swiftpilot-mark-reference.jpeg" alt="SwiftPilot Social Studio"/></button>
        <button className="sidebar-collapse" onClick={toggleCollapsed} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} title={collapsed?'Expand sidebar':'Collapse sidebar'}>{collapsed?<ChevronsRight size={16}/>:<ChevronsLeft size={16}/>}</button>
      </div>
      <label className="project-switcher"><span className="nav-heading">ACTIVE PROJECT</span><div className="project-select-wrap"><ProjectLogo project={project}/><select aria-label="Switch project" value={project.id} onChange={e=>switchProject(e.target.value)}>{studio.projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><ChevronDown size={14}/></div></label>
      <nav className="main-nav"><button title="All projects" className={page==='projects'?'active':''} onClick={()=>go('projects')}><Globe size={18}/>All projects<span className="nav-count">{studio.projects.length}</span></button><div className="nav-divider compact-divider"/><button title="Content calendar" className={page==='calendar'?'active':''} onClick={()=>go('calendar')}><CalendarDays size={18}/>Content calendar</button><button title="Post library" className={page==='library'?'active':''} onClick={()=>go('library')}><LayoutGrid size={18}/>Post library<span className="nav-count">{contents.length}</span></button><button title="Visual Studio" className={page==='visual-studio'?'active':''} onClick={()=>openVisualStudio()}><Palette size={18}/>Visual Studio</button><button title="9:16 Reels" className={page==='reels'?'active':''} onClick={()=>go('reels')}><Clapperboard size={18}/>9:16 Reels</button><button title="Ad sizes in Visual Studio" className={page==='visual-studio'&&studioTemplate?.aspectRatio&&studioTemplate.aspectRatio!=='square'&&!['square','portrait','vertical','landscape'].includes(studioTemplate.aspectRatio)?'active':''} onClick={()=>openAdsStudio()}><Megaphone size={18}/>Ad sizes</button><button title="Postiz publishing" className={page==='publishing'?'active':''} onClick={()=>go('publishing')}><Send size={18}/>Postiz publishing</button><button title="Media library" className={page==='media'?'active':''} onClick={()=>go('media')}><ImagePlus size={18}/>Media library</button><button title="Brand identity" className={page==='brand'?'active':''} onClick={()=>go('brand')}><FolderHeart size={18}/>Brand identity</button><button title="Website imports" className={page==='sources'?'active':''} onClick={()=>go('sources')}><Globe size={18}/>Website imports</button><button title="Settings" className={page==='settings'?'active':''} onClick={()=>go('settings')}><Settings size={18}/>Settings</button>{auth.user?.role==='admin'&&<><button title="Manage users" className={page==='users'?'active':''} onClick={()=>go('users')}><Users size={18}/>Users</button><button title="Landing page leads" className={page==='leads'?'active':''} onClick={()=>go('leads')}><Mail size={18}/>Leads</button></>}{auth.authenticated&&<button title="Sign out" onClick={async()=>{await authLogout();setAuth({authenticated:false});toast.success('Signed out.');}}><LogOut size={18}/>Sign out</button>}</nav>
      <div className="sidebar-bottom"><div className="project-source-card"><span className="tiny-tag">YOUR PROJECT’S HOME</span><strong>{siteDomain(project.url)}</strong><a href={project.url} target="_blank" rel="noreferrer">Visit website<ArrowUpRight size={14}/></a></div><button className="guide-link" title="How the studio works" onClick={()=>go('guide')}><CircleHelp size={17}/>How the studio works<ArrowUpRight size={14}/></button><div className="workspace-footer"><div className="avatar">SP</div><div><strong>Personal workspace</strong><span>Projects saved on this device</span></div><span className="online-dot"/></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={()=>setMenuOpen(true)}><Menu size={22}/></button><span>{project.name}</span><span className="breadcrumb-slash">/</span><strong>{pageNames[page]}</strong></div><div className={`save-indicator ${storageWorks?'':'not-saved'}`}><span className="online-dot"/>{storageWorks?'Saved on this device':'Storage full — export a backup'}</div><button className="button primary top-create-post" style={{display:'inline-flex',alignItems:'center',gap:'6px',fontSize:'12px',padding:'6px 14px',height:'34px',fontWeight:600}} onClick={()=>openVisualStudio()} title="Create new post in Visual Studio"><Plus size={15}/><span>New Post</span></button><button className="top-add-project" onClick={()=>setAddingProject(true)} aria-label="Add project"><Plus size={17}/></button></header>
    <main className="main-content">{authLoaded&&auth.mode==='server'&&!auth.authenticated&&(
      <div className="signin-overlay"><div className="signin-card">
        <img src="/landing/swiftpilot-mark-reference.jpeg" alt="SwiftPilot" className="signin-logo"/>
        <h2>Sign in to SwiftPilot</h2>
        <p className="helper-text">Enter your email to open your workspace. The master account is ivandro.work@gmail.com.</p>
        <form onSubmit={async e=>{e.preventDefault();setSigningIn(true);try{const a=await authLogin(signInEmail.trim(),signInName.trim()||undefined);setAuth(a);const payload=await loadServerState();if(payload&&typeof payload==='object'&&(payload as {projects?:unknown}).projects)setStudio(payload as typeof studio);toast.success('Signed in.');}catch(err){toast.error(err instanceof Error?err.message:'Sign-in failed.');}finally{setSigningIn(false);}}}>
          <input type="email" required value={signInEmail} onChange={e=>setSignInEmail(e.target.value)} placeholder="you@email.com"/>
          <input value={signInName} onChange={e=>setSignInName(e.target.value)} placeholder="Your name (optional)"/>
          <button className="button primary" type="submit" disabled={signingIn}>{signingIn?'Signing in…':'Sign in'}</button>
        </form>
      </div></div>
    )}<div className="page-heading"><div><span className="eyebrow">{page==='projects'?'ONE STUDIO. EVERY BRAND.':`${project.name} / YOUR NEXT MOVE`}</span><h1>{pageNames[page]}<span className="heading-dot">.</span></h1><p>{pageDescriptions[page]}</p></div><div className="heading-actions">{page==='projects'?<button className="button primary" onClick={()=>setAddingProject(true)}><Plus size={17}/>Add project</button>:<><button className="button secondary" onClick={()=>go('sources')}><Globe size={15}/>Import website</button>{page!=='visual-studio'&&<button className="button primary" onClick={()=>openVisualStudio()}><Palette size={15}/>Open in Studio</button>}{['calendar','library'].includes(page)&&<button className="button secondary" onClick={()=>setGenerating(true)}><Sparkles size={16}/>Generate posts</button>}</>}</div></div>
      {page==='visual-studio'&&<VisualStudio key={studioTemplate?.id ?? project.id} project={project} template={studioTemplate ?? contents[0] ?? createBlankTemplate(project)} initialPost={studioPost} targetDate={planningDate ?? dateKey(new Date())} onSaveTemplate={updated=>{updateProject(project.id,p=>({...p,templates:p.templates.some(t=>t.id===updated.id)?p.templates.map(t=>t.id===updated.id?updated:t):[updated,...p.templates]}));setStudioTemplate(updated);}} onSchedulePost={(updated,postData,id)=>{save(updated,postData,id);}} onClose={()=>go('library')}/>}
      {page==='projects'&&<><div className="projects-overview-strip"><span><Rocket size={17}/>{studio.projects.length} projects in your flight deck</span><p>Brand kits and media stay separate. Your momentum stays together.</p></div><div className="projects-grid">{studio.projects.map(p=><article className="project-card" key={p.id}><div className="project-card-top"><ProjectLogo project={p}/><span className={`project-import-status ${p.sources.length?'imported':''}`}>{p.sources.length?'Content imported':'Import ready'}</span></div><h2>{p.name}</h2><a href={p.url} target="_blank" rel="noreferrer">{siteDomain(p.url)}<ArrowUpRight size={12}/></a><p>{p.description||'Add your brand details, import public website content, and build your first campaign.'}</p><div className="project-palette">{[p.brand.text,p.brand.background,p.brand.primary,p.brand.secondary].map((color,i)=><span key={i} style={{background:color}} title={color}/>)}</div><div className="project-card-counts"><span>{p.templates.length} posts</span><span>{p.media.length} assets</span><span>{p.planner.posts.length} planned</span></div><div className="project-card-actions"><button className="button secondary" onClick={()=>switchProject(p.id,'sources')}>Import content</button><button className="button primary" onClick={()=>switchProject(p.id)}>Open project<ArrowRight size={14}/></button></div></article>)}</div></>}
      {(page==='calendar'||page==='library')&&<><div className="stats-row">{page==='calendar'&&<div className="stat-card"><span className="stat-icon"><CalendarDays size={19}/></span><div><span>Planned this month</span><div className="stat-number">{monthPosts.filter(p=>p.status==='scheduled').length}<small>{monthPosts.filter(p=>p.status==='draft').length} drafts</small></div></div><span className="stat-label">{format(date,'MMM')}</span></div>}<div className="stat-card"><span className="stat-icon"><Files size={19}/></span><div><span>Ready-made ideas</span><div className="stat-number">{contents.length}<small>Only this project</small></div></div><span className="stat-label">READY</span></div><div className="stat-card"><span className="stat-icon"><CheckCircle2 size={19}/></span><div><span>Marked published</span><div className="stat-number">{monthPosts.filter(p=>p.status==='published').length}<small>Postiz can schedule selected entries</small></div></div><span className="stat-label">SYNC</span></div></div>
        {planningDate&&<div className="planning-banner"><CalendarDays size={18}/><span>Choose a post for <strong>{format(parseDate(planningDate),'EEEE, MMMM d')}</strong>.</span><button aria-label="Cancel date selection" onClick={()=>setPlanningDate(null)}><X size={16}/></button></div>}
        <div className="filter-toolbar"><div className="platform-filter"><button className={platform==='all'?'active':''} onClick={()=>setPlatform('all')}>All channels</button><button className={platform==='instagram'?'active':''} onClick={()=>setPlatform('instagram')}><Instagram size={15}/>Instagram</button><button className={platform==='tiktok'?'active':''} onClick={()=>setPlatform('tiktok')}><PlatformIcon platform="tiktok" size={14}/>TikTok</button></div><div className="search-filter"><label className="search-box"><Search size={16}/><input aria-label="Search posts" placeholder="Search this project…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={13}/></button>}</label><button className={`filter-button ${showFilters||activeFilters?'selected':''}`} onClick={()=>setShowFilters(!showFilters)}><Filter size={15}/>Filters{activeFilters>0&&<span>{activeFilters}</span>}</button><button className="filter-button" onClick={()=>exportCSV(state.posts,contents)} title="Export this project’s calendar"><ArrowDownToLine size={15}/><span className="export-text">Export</span></button></div></div>
        {page==='calendar'?<div className="calendar-workspace"><div className="calendar-column"><ContentCalendar date={date} view={view} posts={filteredPosts} templates={contents} onDateChange={setDate} onViewChange={setView} onSelect={p=>{const template=p.content??contents.find(t=>t.id===p.templateId);if(template)setEditor({template,post:p,targetDate:p.date});}} onAdd={planFor} onMove={move} brand={project.brand}/><div className="planner-note"><span><Sparkles size={15}/>Your plan. Your pace.</span><p>Use Postiz publishing when you are ready to send selected entries to Instagram or TikTok.</p></div></div><aside className="ready-panel"><div className="ready-heading"><div><span className="eyebrow">BUILT FOR {project.name}</span><h2>Ready to go<span>↗</span></h2></div><span className="ready-count">{filteredTemplates.length}</span></div><p className="ready-description">Your identity, applied to every idea.</p><div className="ready-posts">{filteredTemplates.slice(0,2).map(t=><PostCard key={t.id} template={t} onOpen={open} onOpenStudio={t=>openVisualStudio(t)} compact brand={project.brand}/>)}</div><button className="browse-library" onClick={()=>go('library')}>Explore this project’s posts<ArrowRight size={16}/></button><button className="text-button ready-brand-link" onClick={()=>go('brand')}><FolderHeart size={14}/>Edit the brand identity</button></aside></div>:<><div className="library-heading"><span><strong>{filteredTemplates.length}</strong> ready-made posts</span><span>{project.name} · {project.brand.headingFont}</span></div><div className="library-grid">{filteredTemplates.map(t=><PostCard key={t.id} template={t} onOpen={open} onPlan={open} onOpenStudio={t=>openVisualStudio(t)} brand={project.brand}/>)}</div>{filteredTemplates.length===0&&<div className="empty-state"><Sparkles size={32}/><h2>{contents.length?'No matching posts':'Your next campaign starts here'}</h2><p>{contents.length?'Try another keyword or clear your filters.':'Import your website, then generate ideas from your own content.'}</p><button className="button secondary" onClick={()=>contents.length?clearFilters():go('sources')}>{contents.length?'Clear filters':'Import website content'}</button></div>}</>}
      </>}
      {page==='publishing'&&<PostizPublisher project={project} posts={state.posts} templates={contents}/>} {page==='settings'&&<AISettingsPanel/>} {page==='users'&&auth.user?.role==='admin'&&<UsersAdmin currentUserId={auth.user?.id}/>} {page==='leads'&&auth.user?.role==='admin'&&<LeadsAdmin/>} {page==='reels'&&<section className="workspace-tool-page"><div className="tool-page-intro"><span className="eyebrow">VERTICAL VIDEO / 9:16</span><h2>Make the scroll stop<span>↗</span></h2><p>Choose an idea or imported video, edit the frame, preview the motion, and export a Reel-ready WebM.</p></div><div className="reel-picker-row"><label>Start from a post idea<select value={reelTemplate?.id??''} onChange={event=>setReelTemplate(contents.find(item=>item.id===event.target.value)??null)}><option value="">Choose a ready-made post…</option>{contents.map(item=><option value={item.id} key={item.id}>{item.title} · {item.format}</option>)}</select></label>{!reelTemplate&&<button className="button secondary" onClick={()=>setReelTemplate(contents[0]??null)} disabled={!contents.length}><Sparkles size={15}/>Use first idea</button>}</div>{reelTemplate?<CreativeStudio key={reelTemplate.id} template={reelTemplate} brand={project.brand} website={project.url} media={project.media} platform="tiktok" onChange={setReelTemplate} onSave={value=>{updateProject(project.id,p=>({...p,templates:p.templates.map(item=>item.id===value.id?value:item)}));toast.success('Reel edits saved to this project.');}}/>:<div className="empty-state tool-empty"><Clapperboard size={34}/><h3>Pick a post idea to start</h3><p>Imported videos and project media will appear in the visual Reel editor.</p><button className="button primary" onClick={()=>go('library')}><LayoutGrid size={15}/>Browse post library</button></div>}</section>} {page==='brand'&&<BrandKitEditor key={project.id} project={project} onSave={brand=>{updateProject(project.id,p=>({...p,brand,brandEdited:true}));toast.success('Brand identity saved. Previews and graphics now use your kit.');}}/>} {page==='media'&&<MediaLibrary key={project.id} project={project} onAdd={assets=>updateProject(project.id,p=>({...p,media:[...p.media,...assets.filter(a=>!p.media.some(item=>item.url===a.url))]}))} onRemove={id=>updateProject(project.id,p=>({...p,media:p.media.filter(a=>a.id!==id)}))} onUse={createFromMedia}/>} {page==='sources'&&<SourceImporter key={project.id} project={project} onImported={(result,applyBrand)=>{updateProject(project.id,p=>applyWebsiteImport(p,result,applyBrand));toast.success(`Imported ${result.pages.length} pages and ${result.media.length} media assets.`);if(result.pages.length)setGenerating(true);}}/>}
      {page==='guide'&&<div className="guide-page"><div className="guide-intro"><BookOpen size={26}/><h2>Every project. Its own identity.</h2><p>Switch projects, import source content, customize the brand kit, and generate a plan. SwiftPilot keeps your brands apart so your messages stay on target.</p><div className="guide-actions"><button className="button primary" onClick={()=>go('projects')}><Globe size={15}/>See your projects</button><button className="button secondary" onClick={()=>go('sources')}>Import a website</button></div></div>
        <div className="guide-steps">
          <section><span>01</span><div><h3>Add a project for each brand</h3><p>Create a project with a name and website URL. Every project keeps its own brand kit, media library, sources, and calendar — nothing leaks between brands.</p></div></section>
          <section><span>02</span><div><h3>Import your website</h3><p>From Website imports, crawl public pages to collect source text, media, and brand cues. Detected brand suggestions are only applied when you explicitly choose to.</p></div></section>
          <section><span>03</span><div><h3>Shape the brand identity</h3><p>Set the logo, fonts, colors, and voice in Brand identity, then upload or import assets in the Media library. Every preview and export uses this kit.</p></div></section>
          <section><span>04</span><div><h3>Generate and plan posts</h3><p>Use Generate posts on the calendar or library to draft ideas grounded in your imported sources, then schedule them on the days that fit your cadence.</p></div></section>
          <section><span>05</span><div><h3>Publish when you're ready</h3><p>Plans stay on this device. Copy captions, download branded graphics, or send selected entries through your Postiz instance — publishing is always your call.</p></div></section>
        </div>
        <div className="storage-note"><Files size={18}/><div><strong>Everything is stored in this browser.</strong><p>Calendars, brand kits, templates, and media uploads are saved locally on this device. Export CSV plans or download graphics to keep backups — clearing browser storage removes your workspace.</p></div></div>
      </div>}
    </main></div>
    {editor&&<PostEditor template={editor.template} brand={project.brand} website={project.url} media={project.media} post={editor.post} targetDate={editor.targetDate} onClose={()=>setEditor(null)} onSave={save} onSaveTemplate={updated=>{updateProject(project.id,p=>({...p,templates:p.templates.some(t=>t.id===updated.id)?p.templates.map(t=>t.id===updated.id?updated:t):[updated,...p.templates]}));setEditor(null);toast.success('Template saved to project library.');}} onRemove={remove} onOpenStudio={template=>openVisualStudio(template,editor.post)}/>}
    {addingProject&&<OnboardingWizard open onClose={()=>setAddingProject(false)} onCreated={p=>{if(studio.projects.some(x=>x.id!==p.id&&siteDomain(x.url)===siteDomain(p.url))){toast.error('That website already has a project. Select it from the project switcher.');return;}setStudio(prev=>({...prev,projects:[...prev.projects,p],activeProjectId:p.id}));setAddingProject(false);go('calendar');toast.success('Project created — posts are queued in your calendar.');}}/>}
    {creative&&<Dialog open onOpenChange={open=>{if(!open)setCreative(null)}}><DialogContent className="creative-dialog"><CreativeStudio template={creative} brand={project.brand} website={project.url} onClose={()=>setCreative(null)}/></DialogContent></Dialog>}
      {generating&&<GenerateDialog project={project} onClose={()=>setGenerating(false)} onGenerated={(items,plan)=>{const planned=plan.addToCalendar?plannedSuggestions(items,plan.startDate,plan.daysBetween,plan.time):[];updateProject(project.id,p=>({...p,templates:[...p.templates,...items],planner:{...p.planner,posts:[...p.planner.posts,...planned]}}));setGenerating(false);go('library');toast.success(`${items.length} ideas added to ${project.name}.`);}}/>}
  </div>;
}
