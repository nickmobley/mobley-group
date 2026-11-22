#!/usr/bin/env node
/** Zero-dependency static quality gate for The Mobley Group.
 *  Checks every top-level .html page (not a hand-kept list), cross-page anchors,
 *  sitemap coverage, and the freshness of dated public claims. */
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
const root=process.cwd();
const findings=[],warnings=[];
const err=(p,m)=>findings.push(p+': '+m);
const warn=(p,m)=>warnings.push(p+': '+m);
const matches=(s,r)=>[...s.matchAll(r)];
const pages=readdirSync(root).filter(f=>f.endsWith('.html')).sort();
const src={},ids={};
for(const p of pages){src[p]=readFileSync(resolve(root,p),'utf8');ids[p]=new Set(matches(src[p],/\bid="([^"]+)"/g).map(m=>m[1]))}
const noindex=p=>/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(src[p]);
for(const p of pages){
  const s=src[p];
  if(matches(s,/<h1(?:\s|>)/gi).length!==1)err(p,'Expected one h1');
  if(matches(s,/<main(?:\s|>)/gi).length!==1)err(p,'Expected one main landmark');
  if(!/<html\b[^>]*\blang=/i.test(s))err(p,'Missing page language');
  if(!/<meta\b[^>]*name="viewport"/i.test(s))err(p,'Missing viewport');
  if(!/<title>[^<]+<\/title>/i.test(s))err(p,'Missing title');
  if(!/<meta\b[^>]*name="description"\s+content="[^"]+"/i.test(s))err(p,'Missing description');
  if(!/<link\b[^>]*rel="canonical"\s+href="https:\/\/themobleygroup\.com\//i.test(s))err(p,'Missing canonical');
  if(!/<meta\b[^>]*property="og:image"/i.test(s))warn(p,'Missing og:image');
  const title=(s.match(/<title>([^<]+)<\/title>/i)||[])[1]||'';
  if(title.length>65)warn(p,'Title is '+title.length+' chars (search results cut near 60)');
  for(const m of matches(s,/<img\b[^>]*>/gi))if(!/\balt=/i.test(m[0]))err(p,'Image without alt');
  const hrefs=matches(s,/\bhref="([^"]+)"/g).map(m=>m[1].replaceAll('&amp;','&'));
  for(const h of hrefs){
    if(!h||/^(https?:|mailto:|tel:|data:|javascript:)/i.test(h)||h.includes('$'+'{'))continue;
    const [pathPart,frag]=h.split('#');const file=pathPart.split('?')[0];
    let target=p;
    if(file){
      const dest=resolve(root,dirname(p),file);
      if(!dest.startsWith(root+'/'))continue;
      if(!existsSync(dest)){err(p,'Missing linked file '+h);continue}
      target=relative(root,dest);
    }
    if(frag&&ids[target]&&!ids[target].has(frag)&&!(target==='showroom.html'&&p==='showroom.html'))err(p,'Broken anchor '+h+' (no id="'+frag+'" in '+target+')');
  }
  for(const [i,m] of matches(s,/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi).entries()){
    try{JSON.parse(m[1])}catch{err(p,'Invalid JSON-LD block '+(i+1))}
  }
  for(const m of matches(s,/<script\b[^>]*\bsrc="([^"]+)"/gi)){const f=m[1];if(!/^https?:/i.test(f)&&!existsSync(resolve(root,dirname(p),f.split('?')[0])))err(p,'Missing script '+f)}
}
const prefix='https://themobleygroup.com/';
if(!existsSync(resolve(root,'sitemap.xml')))err('sitemap.xml','Missing sitemap');
else{
  const xml=readFileSync(resolve(root,'sitemap.xml'),'utf8');
  const entries=matches(xml,/<loc>([^<]+)<\/loc>/g).map(m=>m[1]),seen=new Set();
  for(const url of entries){
    if(seen.has(url))err('sitemap.xml','Duplicate URL '+url);
    seen.add(url);
    if(!url.startsWith(prefix)){err('sitemap.xml','Off-domain URL '+url);continue}
    const local=url.slice(prefix.length)||'index.html';
    if(!existsSync(resolve(root,local)))err('sitemap.xml','Missing page '+local);
  }
  for(const p of pages){
    const url=p==='index.html'?prefix:prefix+p;
    if(!noindex(p)&&!seen.has(url))err('sitemap.xml','Indexable page not listed: '+p);
  }
}
// Dated public claims: a page that promises a weekly update must show a date within 8 days.
const MONTHS='January|February|March|April|May|June|July|August|September|October|November|December';
const now=process.env.SITE_AUDIT_DATE?new Date(process.env.SITE_AUDIT_DATE):new Date();
for(const p of pages){
  if(!/updates weekly|revised every week/i.test(src[p]))continue;
  const dates=matches(src[p],new RegExp('\\b('+MONTHS+') (\\d{1,2}), (20\\d\\d)\\b','g')).map(m=>new Date(m[1]+' '+m[2]+', '+m[3]+' UTC'));
  const latest=dates.length?new Date(Math.max(...dates)):null;
  const age=latest?Math.floor((now-latest)/864e5):Infinity;
  if(age>8)warn(p,'Promises weekly updates but newest date is '+(latest?latest.toISOString().slice(0,10)+' ('+age+' days old)':'missing'));
}
for(const w of warnings)console.warn('WARN '+w);
if(findings.length){console.error('FAIL: '+findings.length+' finding(s)');for(const f of findings)console.error(' - '+f);process.exitCode=1}
else console.log('PASS: '+pages.length+' pages, metadata, links, anchors, structured data and sitemap ('+warnings.length+' warning(s)). Does not assert rankings, traffic or rendered layout.');
