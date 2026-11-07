import type { ContentTemplate,Platform } from '../data/content';
import type { BrandKit } from '@shared/studio';
import { artworkColors,hungryBrand,loadBrandFonts,safeFont,siteDomain } from './brand';
import { downloadableMediaURL } from './media';

export type CreativeFormat = 'square' | 'portrait' | 'vertical' | 'landscape';

async function loadImage(source:string):Promise<HTMLImageElement> {
  const src=await downloadableMediaURL(source);
  return new Promise((resolve,reject)=>{
    const image=new Image();
    const timer=setTimeout(()=>reject(new Error('Media took too long to load. Try uploading a local copy.')),15000);
    image.onload=()=>{clearTimeout(timer);resolve(image);};
    image.onerror=()=>{clearTimeout(timer);reject(new Error('This image could not be loaded. Choose another asset or upload a local copy.'));};
    image.src=src;
  });
}
async function videoFrame(source:string):Promise<HTMLVideoElement> {
  const src=await downloadableMediaURL(source);
  return new Promise((resolve,reject)=>{
    const video=document.createElement('video'); video.muted=true; video.playsInline=true;video.preload='auto';
    const timer=setTimeout(()=>reject(new Error('Could not extract a cover from this video. Choose an image for your cover.')),15000);
    video.onloadeddata=()=>{
      if(video.duration>1) video.currentTime=1;
      else {clearTimeout(timer);resolve(video);}
    };
    video.onseeked=()=>{clearTimeout(timer);resolve(video);};
    video.onerror=()=>{clearTimeout(timer);reject(new Error('This video format is not supported by your browser. Use MP4 or a separate cover image.'));};
    video.src=src;
  });
}
export async function downloadCreative(template:ContentTemplate,platform:Platform,brand:BrandKit=hungryBrand,website='https://hungrypockets.eu/',format?:CreativeFormat):Promise<void> {
  loadBrandFonts(brand);
  await document.fonts.ready;
  if(document.fonts.load) await Promise.all([document.fonts.load(`700 48px "${safeFont(brand.headingFont)}"`),document.fonts.load(`500 24px "${safeFont(brand.bodyFont)}"`)]);
  const media=template.image ? (template.mediaKind==='video'?await videoFrame(template.image):await loadImage(template.image)) : undefined;
  const width = format === 'landscape' ? 1920 : 1080;
  const height = format === 'square' ? 1080 : format === 'landscape' ? 1080 : format === 'vertical' || (!format && (platform === 'tiktok' || template.format === 'Video')) ? 1920 : 1350;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx) throw new Error('Your browser does not support graphics export.');
  const colors=artworkColors(brand,template.tone);
  ctx.fillStyle=colors.background;ctx.fillRect(0,0,width,height);
  ctx.fillStyle=colors.accent;ctx.fillRect(0,0,width,18);
  if(media){
    const iw=template.mediaKind==='video'?(media as HTMLVideoElement).videoWidth:(media as HTMLImageElement).width;
    const ih=template.mediaKind==='video'?(media as HTMLVideoElement).videoHeight:(media as HTMLImageElement).height;
    const area={x:50,y:250,w:980,h:height-640},scale=Math.min(area.w/iw,area.h/ih);
    ctx.drawImage(media,area.x+(area.w-iw*scale)/2,area.y+(area.h-ih*scale)/2,iw*scale,ih*scale);
  }
  ctx.fillStyle=colors.text;
  const headingFont=safeFont(brand.headingFont),bodyFont=safeFont(brand.bodyFont);
  const text=(value:string)=>brand.uppercase?value.toUpperCase():value;
  let drewLogo=false;
  if(brand.logo){
    try{
      const logo=await loadImage(brand.logo);
      const scale=Math.min(460/logo.width,90/logo.height);
      if(brand.logo==='/brand/logo.png'&&colors.text.toLowerCase()!=='#ffffff') ctx.filter='brightness(0)';
      ctx.drawImage(logo,66,65,logo.width*scale,logo.height*scale);ctx.filter='none';drewLogo=true;
    }catch{/* A missing logo must not prevent exporting the post. */}
  }
  if(!drewLogo){ctx.font=`700 50px "${headingFont}",Arial,sans-serif`;ctx.fillText(text(brand.name),66,113,950);}
  ctx.font=`500 22px "${bodyFont}",Arial,sans-serif`;ctx.fillText(text(brand.tagline),66,192,950);
  ctx.strokeStyle=colors.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(66,216);ctx.lineTo(1014,216);ctx.stroke();
  const headline=text(template.headline);
  let fontSize=100;ctx.font=`700 ${fontSize}px "${headingFont}",Arial,sans-serif`;
  while(ctx.measureText(headline).width>950&&fontSize>36){fontSize-=2;ctx.font=`700 ${fontSize}px "${headingFont}",Arial,sans-serif`;}
  ctx.fillStyle=colors.accent;ctx.fillRect(66,height-318,105,9);
  ctx.fillStyle=colors.text;ctx.fillText(headline,66,height-215,950);
  ctx.font=`500 25px "${bodyFont}",Arial,sans-serif`;
  const supportingCopy=text(template.supportingCopy ?? template.variants[platform].caption);
  ctx.fillText(supportingCopy,66,height-153,950);
  ctx.font=`500 24px "${bodyFont}",Arial,sans-serif`;ctx.fillText(siteDomain(website),66,height-72,650);
  ctx.fillStyle=colors.accent;ctx.textAlign='right';ctx.fillText(text(template.cta ?? template.variants[platform].cta),1014,height-72,450);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('The image export failed. Please try again.')),'image/png'));
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`swiftpilot-${template.id}-${platform}-${width}x${height}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
