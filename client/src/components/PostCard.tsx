import type { CSSProperties } from 'react';
import { ArrowUpRight, Instagram, Layers, Palette, Play, Plus, Sparkles } from 'lucide-react';
import type { ContentTemplate, Platform } from '../data/content';
import type { BrandKit } from '@shared/studio';
import { artworkColors,hungryBrand,safeFont } from '../lib/brand';
import { mediaProxyURL,useMediaSource } from '../lib/media';

export function PlatformIcon({platform,size=16}:{platform:Platform;size?:number}) {
  if(platform==='instagram') return <Instagram size={size} />;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="TikTok"><path d="M16.6 1c.3 3.1 2 5 5 5.2v4.1a10 10 0 0 1-5-1.4v8a7 7 0 1 1-6-6.9v4.2a2.8 2.8 0 1 0 2 2.7V1z" /></svg>;
}
export function PostArtwork({template,compact=false,brand=hungryBrand}:{template:ContentTemplate;compact?:boolean;brand?:BrandKit}) {
  const media=useMediaSource(template.image);
  const logo=useMediaSource(brand.logo);
  const colors=artworkColors(brand,template.tone);
  const style={background:colors.background,color:colors.text,borderRadius:brand.radius,'--art-accent':colors.accent,'--art-heading':`"${safeFont(brand.headingFont)}", sans-serif`,'--art-body':`"${safeFont(brand.bodyFont)}", sans-serif`,'--art-case':brand.uppercase?'uppercase':'none'} as CSSProperties;
  const logoFilter=brand.logo==='/brand/logo.png' ? (colors.text.toLowerCase()==='#ffffff'?'none':'brightness(0)') : 'none';
  return <div className={`post-artwork branded-art style-${brand.style} ${compact?'compact-art':''} ${!media?'text-only-art':''}`} style={style}>
    {media && (template.mediaKind==='video' ? <video className="art-media" src={mediaProxyURL(media)} muted playsInline preload="metadata" aria-label={template.title} /> : <img className="art-media" src={mediaProxyURL(media)} alt={template.title} loading="lazy" onError={e=>{e.currentTarget.style.opacity='0';}} />)}
    <div className="art-top">{logo ? <img className="art-logo" src={mediaProxyURL(logo)} alt={brand.name} style={{filter:logoFilter}} />:<span className="art-brand-name">{brand.name}</span>}<span className="art-top-tag">{brand.style==='bold'?'THE NEXT MOVE':'MADE FOR YOUR MOMENT'}</span></div>
    <div className="art-bottom"><span className="art-accent-rule" /><strong>{template.headline}</strong><span>{brand.tagline}</span></div>
    {template.format==='Video' && <span className="video-play"><Play size={19} fill="currentColor" /></span>}
    {template.format==='Carousel' && <span className="carousel-mark"><Layers size={16} /></span>}
  </div>;
}
export default function PostCard({template,onOpen,compact=false,onPlan,onOpenStudio,brand=hungryBrand}:{template:ContentTemplate;onOpen:(t:ContentTemplate)=>void;compact?:boolean;onPlan?:(t:ContentTemplate)=>void;onOpenStudio?:(t:ContentTemplate)=>void;brand?:BrandKit}) {
  return <article className={`post-card ${compact?'compact-card':''}`}>
    <button className="art-button" onClick={()=>onOpen(template)} aria-label={`Preview ${template.title}`}><PostArtwork template={template} compact={compact} brand={brand} /></button>
    <div className="post-card-content"><div className="post-card-tags"><span>{template.format==='Video'?'REEL / TIKTOK':template.format.toUpperCase()}</span><div>{template.platforms.map(p=><PlatformIcon key={p} platform={p} size={14} />)}</div></div><button className="post-title-button" onClick={()=>onOpen(template)}>{template.title}<ArrowUpRight size={16} /></button><p>{template.theme}</p>{!compact&&<div className="card-buttons-flex">{onOpenStudio&&<button className="card-studio-button" onClick={()=>onOpenStudio(template)}><Palette size={13}/>Studio</button>}<button className="card-plan-button" style={{flex:1,marginTop:0}} onClick={()=>onPlan?.(template)}><Plus size={14} />Calendar</button></div>}</div>
  </article>;
}
