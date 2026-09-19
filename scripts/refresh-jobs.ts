import fs from "node:fs/promises";
import path from "node:path";
import { greenhouse, lever, workday } from "./sources";
import type { Job, RadarData } from "../data/types";

const now = new Date();
const stamp = now.toISOString();
const india = /\bindia\b|\bIN[_ -]|bengaluru|bangalore|hyderabad|pune|chennai|gurugram|gurgaon|noida|mumbai|delhi|kolkata/i;
const titleSpecialist = /\b(MDM|master data|PIM|product information|data governance|data [^|]{0,30}governance|data quality|data steward|SAP\s+MDG|Reltio|Stibo(?:\s+STEP)?|Collibra)\b/i;
const vendorSignal = /\b(Reltio|Stibo(?:\s+STEP)?|Informatica(?:\s+MDM)?|SAP\s+MDG|Collibra|Ataccama|Semarchy|Syndigo|Salsify)\b/i;
const governanceSignal = /\b(master data(?: management| governance)?|data governance|data quality|data stewardship|data steward|product information management|PIM)\b/i;
const relevantTitleShape = /architect|consultant|engineer|developer|administrator|specialist|steward|governance|data management|data strategy|data warehouse|data warehousing/i;
const negativeTitle = /\b(sales|account executive|recruiter|security|cyber|machine learning|data scientist|analytics|marketing|finance|clinical|regulatory)\b/i;
const decodeEntities = (s = "") => { let out=s; for(let i=0;i<3;i++){ const next=out.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,v)=>String.fromCodePoint(v[0].toLowerCase()==="x"?parseInt(v.slice(1),16):parseInt(v,10))).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi,m=>({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":"\"","&apos;":"'","&nbsp;":" "}[m.toLowerCase()]||m)); if(next===out) break; out=next; } return out; };
const clean = (s = "") => decodeEntities(s).replace(/<[^>]*>/g, " ").replace(/[\u00a0\u200b]/g," ").replace(/\s+/g, " ").trim();
const boilerplate = /^(?:career category|job description|about (?:the role|[a-z &]+)|who we are|company description|overview|role summary|job title|department|location|at [^.]{2,60})\s*[:\-–]?\s*/i;
const boilerplateSentence = /(?:amgen (?:harnesses|helped establish)|we discover, develop, manufacture|our shared mission|since 1980|beghou brings over|over three decades of experience|from developing go-to-market|equal opportunity|career category)/i;
const specialistSentence = /master data|MDM|PIM|product information|data governance|data quality|data steward|Reltio|Informatica|SAP MDG|Stibo|Collibra/i;
const sentenceSummary = (s:string) => { const c=clean(s); const parts=(c.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[]).map(v=>v.trim()).filter(v=>v.length>35 && !boilerplate.test(v) && !boilerplateSentence.test(v)); const ranked=[...parts].sort((a,b)=>Number(specialistSentence.test(b))-Number(specialistSentence.test(a))); const chosen=(ranked.some(v=>specialistSentence.test(v))?ranked:parts).slice(0,2); return (chosen.join(" ") || c.slice(0,260)).slice(0,420).trim(); };
const shorten = (s: string) => sentenceSummary(s);
const tags = (s: string) => [[/Stibo|STEP/i,"Stibo STEP"],[/Reltio/i,"Reltio"],[/Informatica/i,"Informatica"],[/SAP\s+MDG/i,"SAP MDG"],[/Collibra/i,"Collibra"],[/PIM|product information/i,"PIM"],[/data governance|data steward/i,"Data governance"],[/data quality/i,"Data quality"],[/\bMDM\b|master data/i,"MDM"]].filter(([r]) => (r as RegExp).test(s)).map(([,t]) => t as string);
const exp = (t: string): Job["experience"] => /director|head|principal|architect|lead|manager/i.test(t) ? "Lead" : /senior|sr\.?/i.test(t) ? "Senior" : /associate|junior|analyst|graduate/i.test(t) ? "Early" : "Mid";
const mode = (s: string): Job["workplace"] => /remote/i.test(s) ? "Remote" : /hybrid/i.test(s) ? "Hybrid" : india.test(s) ? "On-site" : "Unclear";
const relevant = (title: string, body: string, location: string) => {
  const titleHit = titleSpecialist.test(title);
  const bodyHit = governanceSignal.test(body.slice(0, 8000));
  const vendorHit = vendorSignal.test(`${title} ${body.slice(0, 8000)}`);
  return india.test(location) && !(negativeTitle.test(title) && !titleHit) && (titleHit || (relevantTitleShape.test(title) && (vendorHit || bodyHit)));
};
const workdayDate = (s?: string) => {
  if (!s) return null;
  const m = s.match(/(\d+)\+? Days? Ago/i);
  if (m) return new Date(now.getTime() - Number(m[1]) * 86400000).toISOString();
  if (/Yesterday/i.test(s)) return new Date(now.getTime() - 86400000).toISOString();
  return Number.isNaN(Date.parse(s)) ? null : new Date(s).toISOString();
};
const add = (job: Job) => jobs.push(job);
type GreenhouseJob = { id: number; title: string; location?: { name?: string }; content?: string; updated_at?: string; absolute_url: string };
type LeverJob = { id: string; text: string; categories?: { location?: string }; descriptionPlain?: string; additionalPlain?: string; workplaceType?: string; createdAt?: number; hostedUrl: string };
type WorkdayCard = { title: string; externalPath: string; locationsText?: string; postedOn?: string };
type WorkdayDetail = { jobPostingInfo?: { id?: string; title?: string; jobDescription?: string; location?: string; additionalLocations?: string[]; postedOn?: string; externalUrl?: string } };
const jobs: Job[] = [];

for (const [employer, slug] of greenhouse) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  try {
    const res = await fetch(url); if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json() as {jobs: GreenhouseJob[]};
    for (const j of json.jobs || []) {
      const loc = clean(j.location?.name || ""); const body = clean(j.content || "");
      if (!relevant(j.title, body, loc)) continue;
      add({ id:`gh-${slug}-${j.id}`, employer, title:clean(j.title), location:loc, workplace:mode(loc+" "+body.slice(0,600)), experience:exp(j.title), vendorTags:tags(`${j.title} ${body}`), postedAt:j.updated_at || null, lastVerifiedAt:stamp, url:j.absolute_url, summary:shorten(body), source:"Greenhouse" });
    }
  } catch (e) { console.warn(`Greenhouse ${employer}: ${e}`); }
}
for (const [employer, slug] of lever) {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  try {
    const res = await fetch(url); if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json() as LeverJob[];
    for (const j of json || []) {
      const loc = clean(j.categories?.location || ""); const body = clean(`${j.descriptionPlain || ""} ${j.additionalPlain || ""}`);
      if (!relevant(j.text, body, loc)) continue;
      add({ id:`lv-${slug}-${j.id}`, employer, title:clean(j.text), location:loc, workplace:mode(`${loc} ${j.workplaceType || ""}`), experience:exp(j.text), vendorTags:tags(`${j.text} ${body}`), postedAt:j.createdAt ? new Date(j.createdAt).toISOString() : null, lastVerifiedAt:stamp, url:j.hostedUrl, summary:shorten(body), source:"Lever" });
    }
  } catch (e) { console.warn(`Lever ${employer}: ${e}`); }
}
for (const [employer, tenant, shard, site] of workday) {
  const base = `https://${tenant}.${shard}.myworkdayjobs.com`;
  const api = `${base}/wday/cxs/${tenant}/${site}`;
  const candidates = new Map<string, WorkdayCard>();
  try {
    for (const searchText of ["master data", "data governance", "MDM", "Reltio", "SAP MDG", "Stibo", "PIM"]) {
      const res = await fetch(`${api}/jobs`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({appliedFacets:{}, limit:20, offset:0, searchText}) });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json() as { jobPostings?: WorkdayCard[] };
      for (const card of json.jobPostings || []) if (india.test(card.locationsText || "") && (titleSpecialist.test(card.title) || vendorSignal.test(card.title) || /governance|data management|data steward/i.test(card.title))) candidates.set(card.externalPath, card);
    }
    for (const card of candidates.values()) {
      const res = await fetch(`${api}${card.externalPath}`); if (!res.ok) { console.warn(`Workday ${employer} detail ${res.status}: ${card.externalPath}`); continue; }
      const info = ((await res.json()) as WorkdayDetail).jobPostingInfo; if (!info) continue;
      const title = clean(info.title || card.title); const loc = clean([info.location || card.locationsText || "", ...(info.additionalLocations || [])].filter(Boolean).join("; ")); const body = clean(info.jobDescription || "");
      if (!relevant(title, body, loc)) continue;
      const publicUrl = info.externalUrl || `${base}/en-US/${site}${card.externalPath}`;
      add({ id:`wd-${tenant}-${info.id || card.externalPath.split("_").pop()}`, employer, title, location:loc, workplace:mode(loc+" "+body.slice(0,600)), experience:exp(title), vendorTags:tags(`${title} ${body}`), postedAt:workdayDate(info.postedOn || card.postedOn), lastVerifiedAt:stamp, url:publicUrl, summary:shorten(body), source:"Workday" });
    }
  } catch (e) { console.warn(`Workday ${employer}: ${e}`); }
}
const deduped = [...new Map(jobs.map(j => [j.url.replace(/[?#].*$/, ""), j])).values()].sort((a,b) => a.employer.localeCompare(b.employer) || a.title.localeCompare(b.title));
const data: RadarData = { version: stamp.slice(0,10), generatedAt: stamp, methodology: "Direct employer Greenhouse, Lever and validated Workday CXS feeds only. India-located specialist roles are selected from title, location and description signals; obvious generic engineering, security, sales and unrelated roles are excluded. Requisition URL is the dedupe key.", jobs: deduped };
await fs.writeFile(path.join(process.cwd(), "data/jobs.json"), JSON.stringify(data, null, 2) + "\n");
console.log(`Wrote ${deduped.length} verified roles from ${new Set(deduped.map(j=>j.employer)).size} employers.`);
