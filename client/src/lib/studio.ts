import type { StudioState, SiteProject, BrandKit, CrawlResult, MediaAsset, SourcePage } from '@shared/studio';
import type { ContentTemplate } from '../data/content';
import { templates } from '../data/content';
import { loadPlanner,dateKey } from './planner';
import { hungryBrand,defaultBrand } from './brand';
import seedSites from '../data/sites.json';
import { socialCampaigns } from '../data/socialCampaigns';

export const STUDIO_KEY='swiftpilot-social-studio-v2';
export function initialStudio(): StudioState {
  const projects: SiteProject[] = seedSites.map(seed => {
    const hungry = seed.id==='hungrypockets';
    const brand = hungry ? {...defaultBrand(seed.name),...seed.brand,...hungryBrand} : {...defaultBrand(seed.name),...seed.brand};
    const starterTemplates = socialCampaigns[seed.id] ?? [];
    const allTemplates = [...(hungry ? templates : seed.templates as ContentTemplate[]), ...starterTemplates];
    const media = seed.media as MediaAsset[];
    const sources = seed.pages as SourcePage[];
    const planner = hungry ? loadPlanner() : {posts:[],edits:{}};
    const firstTuesday = new Date();
    firstTuesday.setHours(12, 0, 0, 0);
    const untilTuesday = (2 - firstTuesday.getDay() + 7) % 7 || 7;
    firstTuesday.setDate(firstTuesday.getDate() + untilTuesday);
    const campaignPosts = starterTemplates.map((content, index) => {
      const date = new Date(firstTuesday);
      date.setDate(date.getDate() + Math.floor(index / 2) * 7 + (index % 2) * 2);
      return {
        id: `starter-${content.id}`,
        templateId: content.id,
        platform: 'instagram' as const,
        language: content.language,
        date: dateKey(date),
        time: '18:00',
        status: 'scheduled' as const,
        content,
      };
    });
    const plannedIds = new Set(planner.posts.map(post => post.id));
    const projectPlanner = {
      ...planner,
      posts: [...planner.posts, ...campaignPosts.filter(post => !plannedIds.has(post.id))],
    };
    return {
      id: seed.id,
      name: seed.name,
      url: seed.url,
      description: seed.description || seed.summary || '',
      brand: brand as BrandKit,
      media,
      sources,
      templates: allTemplates,
      planner: projectPlanner,
      importWarnings: seed.warnings ?? [],
      importedAt: sources.length ? new Date().toISOString() : undefined,
    };
  });
  return {version:2,activeProjectId:'hungrypockets',projects};
}

export function mergeSeedProjects(state: StudioState): StudioState {
  const seeded = initialStudio().projects;
  const projects = state.projects.map(project => {
    const seed = seeded.find(candidate => candidate.id === project.id);
    if (!seed) return project;
    const templatesToAdd = seed.templates.filter(template => !project.templates.some(existing => existing.id === template.id));
    const existingPostIds = new Set(project.planner.posts.map(post => post.id));
    const postsToAdd = seed.planner.posts.filter(post => !existingPostIds.has(post.id));
    return {
      ...project,
      description: project.description || seed.description,
      brand: project.brandEdited || project.sources.length ? project.brand : seed.brand,
      media: project.media.length ? project.media : seed.media,
      sources: project.sources.length ? project.sources : seed.sources,
      templates: [...project.templates, ...templatesToAdd],
      planner: {
        ...project.planner,
        posts: [...project.planner.posts, ...postsToAdd],
      },
      importWarnings: project.importWarnings.length ? project.importWarnings : seed.importWarnings,
      importedAt: project.importedAt || seed.importedAt,
    };
  });
  for (const seed of seeded) {
    if (!projects.some(project => project.id === seed.id)) projects.push(seed);
  }
  return { ...state, projects };
}

export function loadStudio(): StudioState {
  try {
    const raw=localStorage.getItem(STUDIO_KEY);
    if(raw) {
      const state=JSON.parse(raw) as StudioState;
      if(state.version===2 && Array.isArray(state.projects) && state.projects.length && state.projects.every(p=>p.id&&p.brand&&Array.isArray(p.templates)&&Array.isArray(p.media)&&Array.isArray(p.sources)&&Array.isArray(p.planner?.posts))) {
        if(!state.projects.some(p=>p.id===state.activeProjectId)) state.activeProjectId=state.projects[0].id;
        return mergeSeedProjects(state);
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
export function saveProjectTemplate(project: SiteProject, template: ContentTemplate): SiteProject {
  const templates = project.templates.some(existing => existing.id === template.id)
    ? project.templates.map(existing => existing.id === template.id ? template : existing)
    : [template, ...project.templates];
  return {
    ...project,
    templates,
    planner: {
      ...project.planner,
      edits: { ...project.planner.edits, [template.id]: template },
      posts: project.planner.posts.map(post => post.templateId === template.id ? { ...post, content: template } : post),
    },
  };
}
export function plannedSuggestions(contents:ContentTemplate[],startDate:string,daysBetween:number,time:string) {
  const start=new Date(`${startDate}T12:00:00`);
  if(Number.isNaN(start.getTime())) throw new Error('Choose a valid start date.');
  return contents.map((content,index)=>{
    const date=new Date(start); date.setDate(start.getDate()+index*daysBetween);
    const platform=index%2===1&&content.platforms.includes('tiktok')?'tiktok':content.platforms[0];
    return {id:crypto.randomUUID(),templateId:content.id,platform,language:content.language,date:dateKey(date),time,status:'scheduled' as const,content};
  });
}
