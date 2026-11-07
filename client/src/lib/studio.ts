import type { StudioState, SiteProject, BrandKit, CrawlResult, MediaAsset, SourcePage } from '@shared/studio';
import type { ContentTemplate } from '../data/content';
import { templates } from '../data/content';
import { loadPlanner,dateKey } from './planner';
import { hungryBrand,defaultBrand } from './brand';
import seedSites from '../data/sites.json';

export const STUDIO_KEY='swiftpilot-social-studio-v2';
export function initialStudio(): StudioState {
  const projects: SiteProject[] = seedSites.map(seed => {
    const hungry = seed.id==='hungrypockets';
    const brand = hungry ? {...defaultBrand(seed.name),...seed.brand,...hungryBrand} : {...defaultBrand(seed.name),...seed.brand};
    const allTemplates = hungry ? templates : seed.templates as ContentTemplate[];
    const media = seed.media as MediaAsset[];
    const sources = seed.pages as SourcePage[];
    const planner = hungry ? loadPlanner() : {posts:[],edits:{}};
    return {id:seed.id,name:seed.name,url:seed.url,description:seed.description || seed.summary || '',brand:brand as BrandKit,media,sources,templates:allTemplates,planner,importWarnings:seed.warnings ?? [],importedAt:sources.length ? new Date().toISOString():undefined};
  });
  return {version:2,activeProjectId:'hungrypockets',projects};
}
export function loadStudio(): StudioState {
  try {
    const raw=localStorage.getItem(STUDIO_KEY);
    if(raw) {
      const state=JSON.parse(raw) as StudioState;
      if(state.version===2 && Array.isArray(state.projects) && state.projects.length && state.projects.every(p=>p.id&&p.brand&&Array.isArray(p.templates)&&Array.isArray(p.media)&&Array.isArray(p.sources)&&Array.isArray(p.planner?.posts))) {
        if(!state.projects.some(p=>p.id===state.activeProjectId)) state.activeProjectId=state.projects[0].id;
        const hp = state.projects.find(p => p.id === 'hungrypockets');
        if (hp) {
          for (const t of templates) {
            if (!hp.templates.some(existing => existing.id === t.id)) {
              hp.templates.push(t);
            }
          }
        }
        return state;
      }
    }
  } catch { /* Preserve the legacy workspace as the safe starting point. */ }
  return initialStudio();
}
export function saveStudio(state: StudioState): boolean {
  try { localStorage.setItem(STUDIO_KEY,JSON.stringify(state)); return true; }
  catch {return false;}
}
export function createProject(name:string,url:string): SiteProject {
  const parsed=new URL(url.startsWith('http') ? url : `https://${url}`);
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password) throw new Error('Use a public HTTP or HTTPS website URL.');
  const cleanName=name.trim() || parsed.hostname.replace(/^www\./,'');
  return {id:crypto.randomUUID(),name:cleanName,url:parsed.href,description:'',brand:defaultBrand(cleanName),media:[],sources:[],templates:[],planner:{posts:[],edits:{}},importWarnings:[]};
}
export function applyWebsiteImport(project:SiteProject,result:CrawlResult,applyBrand:boolean): SiteProject {
  const mergedMedia = [...project.media];
  for(const asset of result.media) if(!mergedMedia.some(existing=>existing.url===asset.url)) mergedMedia.push(asset);
  const suggestions=Object.fromEntries(Object.entries(result.brand).filter(([,value])=>value!==undefined&&value!==''));
  // Owner supplied Hungry Pockets identity always wins automatic detection.
  const brand=applyBrand ? {...project.brand,...suggestions,...(project.id==='hungrypockets'?{headingFont:'Oswald',bodyFont:'Oswald',uppercase:true,primary:project.brand.primary,secondary:project.brand.secondary}: {})} : project.brand;
  return {...project,description:result.description || project.description,sources:result.pages,media:mergedMedia,brand,importedAt:result.fetchedAt,importWarnings:result.warnings};
}
export function plannedSuggestions(contents:ContentTemplate[],startDate:string,daysBetween:number,time:string) {
  const start=new Date(`${startDate}T12:00:00`);
  if(Number.isNaN(start.getTime())) throw new Error('Choose a valid start date.');
  return contents.map((content,index)=>{
    const date=new Date(start); date.setDate(start.getDate()+index*daysBetween);
    const platform=index%2===1&&content.platforms.includes('tiktok')?'tiktok':content.platforms[0];
    return {id:crypto.randomUUID(),templateId:content.id,platform,date:dateKey(date),time,status:'scheduled' as const,content};
  });
}
