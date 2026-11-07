import type { BrandKit } from '@shared/studio';

export const FONT_CHOICES = ['Oswald','Inter','DM Sans','Space Grotesk','Roboto','Montserrat','Poppins','Bebas Neue','Playfair Display','Arial','Georgia'];
export const hungryBrand: BrandKit = {
  name:'HUNGRY POCKETS',logo:'/brand/logo.png',headingFont:'Oswald',bodyFont:'Oswald',primary:'#E52428',secondary:'#155DFC',background:'#FFFFFF',text:'#090909',uppercase:true,style:'bold',radius:0,tagline:'ALWAYS STARVING SINCE 2014',voice:'Uppercase, direct, driven streetwear. Black and white, red highlights, occasional blue. Short confident lines; no false scarcity.',audience:'Streetwear fans, independent creators, and people driven to grow.',instagram:'https://instagram.com/hungrypockets',tiktok:'https://tiktok.com/@hungrypockets',linkedin:'',
};
export function defaultBrand(name: string): BrandKit {
  return {...hungryBrand,name,logo:'',headingFont:'Inter',bodyFont:'DM Sans',primary:'#4F46E5',secondary:'#06B6D4',background:'#FFFFFF',text:'#111827',uppercase:false,style:'minimal',radius:10,tagline:'',voice:'Clear, useful, confident. Only verified project details.',audience:'',instagram:'',tiktok:'',linkedin:''};
}
export function safeFont(value: string): string {
  return value.replace(/[^a-zA-Z0-9 _-]/g,'').trim().slice(0,70) || 'Arial';
}
const loaded = new Set<string>();
export function loadBrandFonts(brand: BrandKit): void {
  if (typeof document === 'undefined' || !document.head || typeof document.createElement !== 'function') return;
  for (const font of [brand.headingFont,brand.bodyFont].map(safeFont)) {
    if (loaded.has(font) || ['Arial','Georgia'].includes(font)) continue;
    loaded.add(font);
    const link=document.createElement('link'); link.rel='stylesheet';
    link.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g,'+')}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
}
export function artworkColors(brand: BrandKit,tone: string): { background:string; text:string; accent:string } {
  if(tone==='lavender') return {background:brand.text,text:brand.background,accent:brand.primary};
  if(tone==='peach') return {background:brand.background,text:brand.text,accent:brand.secondary};
  return {background:brand.background,text:brand.text,accent:brand.primary};
}
export function siteDomain(url: string): string { try { return new URL(url).hostname; } catch { return url; } }
