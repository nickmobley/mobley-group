#!/usr/bin/env node
/** Read-only audit of the LIVE site. Fetches every sitemap URL, checks status,
 *  same-site anchors and outbound links (purchase, booking, social), and
 *  writes live-audit-report.md. It changes nothing and sends nothing. */
import {writeFileSync} from 'node:fs';
const base=process.env.SITE_URL||'https://themobleygroup.com/';
const UA='Mozilla/5.0 (compatible; TMG-site-audit/1.0)';
const get=async(u,method='GET')=>{const t0=Date.now();try{const r=await fetch(u,{method,redirect:'follow',headers:{'user-agent':UA},signal:AbortSignal.timeout(20000)});const body=method==='GET'?await r.text():'';return{status:r.status,final:r.url,ms:Date.now()-t0,body}}catch(e){return{status:0,error:String(e.cause?.code||e.message),ms:Date.now()-t0,body:''}}};
const fails=[],warns=[],rows=[];
const sm=await get(new URL('sitemap.xml',base).href);
if(sm.status!==200){console.error('Sitemap unreachable: '+sm.status);process.exit(1)}
const urls=[...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const pages={},outbound=new Map(),anchors=[];
for(const u of urls){
  const r=await get(u);pages[u]=r;rows.push(`| ${u.replace(base,'/')} | ${r.status} | ${r.ms} ms |`);
  if(r.status!==200){fails.push(`${u} returned ${r.status||r.error}`);continue}
  if(r.ms>3000)warns.push(`${u} took ${r.ms} ms`);
  for(const m of r.body.matchAll(/\bhref="([^"]+)"/g)){
    const h=m[1].replaceAll('&amp;','&');if(/^(mailto:|tel:|javascript:|data:)/i.test(h)||h.includes('${'))continue;
    let a;try{a=new URL(h,u)}catch{continue}
    if(a.origin===new URL(base).origin){if(a.hash)anchors.push({from:u,to:a.origin+a.pathname,frag:decodeURIComponent(a.hash.slice(1))})}
    else{a.hash='';a.search='';const k=a.href;if(!outbound.has(k))outbound.set(k,new Set());outbound.get(k).add(u.replace(base,'/'))}
  }
}
const idCache={};
for(const {from,to,frag} of anchors){
  const key=to.endsWith('/')?to:to;
  if(!(key in idCache)){const r=pages[key]||pages[key.replace(/index\.html$/,'')]||await get(key);idCache[key]=r.status===200?new Set([...r.body.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])):null}
  if(idCache[key]&&!idCache[key].has(frag))fails.push(`${from} links to ${to}#${frag}, which has no such anchor`);
}
// Outbound: purchase and booking links must work. Social sites often block bots, so they only warn.
const strict=/gumroad\.com|calendly\.com/i, skip=/threads\.com|instagram\.com|snapchat\.com|linkedin\.com/i;
for(const [u,from] of outbound){
  if(skip.test(u))continue;
  const r=await get(u);
  const where=[...from].slice(0,3).join(', ');
  if(r.status>=200&&r.status<400)continue;
  if(r.status===429){warns.push(`${u} rate-limited the check (429)`);continue}
  (strict.test(u)?fails:warns).push(`${u} returned ${r.status||r.error} (linked from ${where})`);
}
const stamp=new Date().toISOString();
const md=[`# Live site audit, ${stamp}`,'',`Site: ${base}`,`Pages in sitemap: ${urls.length} · Outbound links checked: ${outbound.size}`,'',
 `## Failures (${fails.length})`,...(fails.length?fails.map(f=>'- '+f):['- none']),'',`## Warnings (${warns.length})`,...(warns.length?warns.map(w=>'- '+w):['- none']),'',
 '## Pages','| Page | Status | Time |','|---|---|---|',...rows,'','Read-only: this audit changed nothing on the site.'].join('\n');
writeFileSync('live-audit-report.md',md);
if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,md);
console.log(md);
if(fails.length)process.exitCode=1;
