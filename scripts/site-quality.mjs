#!/usr/bin/env node
/** Zero-dependency static quality gate for The Mobley Group. */
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const root=process.cwd();
const pages=['index.html','services.html','catalog.html','products.html','showroom.html','about.html','las-vegas.html','small-business-missed-call-guide.html','ai-voice-receptionist.html','missed-call-recovery.html','website-builds.html','workflow-automation.html'];
const findings=[];
const err=(p,m)=>findings.push(p+': '+m);
const matches=(s,r)=>[...s.matchAll(r)];
for(const p of pages){
  if(!existsSync(resolve(root,p))){err(p,'Missing page');continue}
  const s=readFileSync(resolve(root,p),'utf8');
  if(matches(s,/<h1(?:\s|>)/gi).length!==1)err(p,'Expected one h1');
  if(matches(s,/<main(?:\s|>)/gi).length!==1)err(p,'Expected one main landmark');
  if(!/<html\b[^>]*\blang=/i.test(s))err(p,'Missing page language');
  if(!/<meta\b[^>]*name="viewport"/i.test(s))err(p,'Missing viewport');
  if(!/<title>[^<]+<\/title>/i.test(s))err(p,'Missing title');
  if(!/<meta\b[^>]*name="description"\s+content="[^"]+"/i.test(s))err(p,'Missing description');
  if(!/<link\b[^>]*rel="canonical"\s+href="https:\/\/themobleygroup\.com\//i.test(s))err(p,'Missing canonical');
  const ids=matches(s,/\bid="([^"]+)"/g).map(m=>m[1]);
  const hrefs=matches(s,/\bhref="([^"]+)"/g).map(m=>m[1].replaceAll('&amp;','&'));
  for(const h of hrefs){
    if(!h||/^(https?:|mailto:|tel:|data:|javascript:)/i.test(h))continue;
    if(h.startsWith('#')){
      if(h.length>1&&!ids.includes(h.slice(1))&&p!=='showroom.html')err(p,'Broken anchor '+h);
    }else if(!h.includes('$'+'{')){
      const relative=h.split(/[?#]/)[0];
      if(!relative)continue;
      const dest=resolve(root,dirname(p),relative);
      if(dest.startsWith(root+'/')&&!existsSync(dest))err(p,'Missing linked file '+h);
    }
  }
  for(const [i,m] of matches(s,/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi).entries()){
    try{JSON.parse(m[1])}catch{err(p,'Invalid JSON-LD block '+(i+1))}
  }
}
const sitemap='sitemap.xml';
if(!existsSync(resolve(root,sitemap)))err(sitemap,'Missing sitemap');
else{
  const xml=readFileSync(resolve(root,sitemap),'utf8');
  const entries=matches(xml,/<loc>([^<]+)<\/loc>/g).map(m=>m[1]),seen=new Set();
  for(const url of entries){
    if(seen.has(url))err(sitemap,'Duplicate URL '+url);
    seen.add(url);
    const prefix='https://themobleygroup.com/';
    if(!url.startsWith(prefix)){err(sitemap,'Off-domain URL '+url);continue}
    const local=url.slice(prefix.length)||'index.html';
    if(!existsSync(resolve(root,local)))err(sitemap,'Missing page '+local);
  }
  if(!seen.has('https://themobleygroup.com/small-business-missed-call-guide.html'))err(sitemap,'Missing buyer guide');
}
if(findings.length){console.error('FAIL: '+findings.length+' finding(s)');for(const f of findings)console.error(' - '+f);process.exitCode=1}
else console.log('PASS: '+pages.length+' key pages, metadata, links, structured data and sitemap. Does not assert rankings, traffic or rendered layout.');
