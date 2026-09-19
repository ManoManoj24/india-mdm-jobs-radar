import fs from "node:fs/promises";
import path from "node:path";
import { greenhouse, lever } from "./sources";
import type { Job, RadarData } from "../data/types";

const now = new Date();
const stamp = now.toISOString();
const india = /india|bengaluru|bangalore|hyderabad|pune|chennai|gurugram|gurgaon|noida|mumbai|delhi|kolkata|remote[^a-z]+india/i;
const titleSpecialist = /\b(MDM|master data|PIM|product information|data governance|data quality|Stibo(?:\s+STEP)?|Reltio|Informatica(?:\s+MDM)?|SAP\s+MDG)\b/i;
const specialistShape = /consultant|architect|customer engineer|forward deployed|advisory|implementation|solution/i;
const bodySpecialist = /\b(MDM|master data|PIM|product information management|data governance|data quality|Stibo(?:\s+STEP)?|Informatica(?:\s+MDM)?|SAP\s+MDG)\b/i;
const negative = /\b(sales|account executive|security|cyber|data engineer|machine learning engineer)\b/i;
const clean = (s = "") => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const shorten = (s: string) => { const c = clean(s); const m = c.match(/^(.{80,260}?[.!?])(?:\s|$)/); return (m?.[1] || c.slice(0, 220)).trim(); };
const tags = (s: string) => [[/Stibo|STEP/i,"Stibo STEP"],[/Reltio/i,"Reltio"],[/Informatica/i,"Informatica"],[/SAP\s+MDG/i,"SAP MDG"],[/PIM|product information/i,"PIM"],[/data governance/i,"Data governance"],[/data quality/i,"Data quality"],[/\bMDM\b|master data/i,"MDM"]].filter(([r]) => (r as RegExp).test(s)).map(([,t]) => t as string);
const exp = (t: string): Job["experience"] => /director|head|principal|architect|lead|manager/i.test(t) ? "Lead" : /senior|sr\.?/i.test(t) ? "Senior" : /associate|junior|analyst|graduate/i.test(t) ? "Early" : "Mid";
const mode = (s: string): Job["workplace"] => /remote/i.test(s) ? "Remote" : /hybrid/i.test(s) ? "Hybrid" : /bengaluru|bangalore|hyderabad|pune|chennai|gurugram|gurgaon|noida|mumbai|delhi|kolkata/i.test(s) ? "On-site" : "Unclear";
const relevant = (title: string, body: string, location: string) => india.test(location) && !(/data warehous/i.test(title) && !titleSpecialist.test(title)) && (titleSpecialist.test(title) || (specialistShape.test(title) && bodySpecialist.test(body.slice(0,5000)))) && !(negative.test(title) && !titleSpecialist.test(title));
type GreenhouseJob = { id: number; title: string; location?: { name?: string }; content?: string; updated_at?: string; absolute_url: string };
type LeverJob = { id: string; text: string; categories?: { location?: string }; descriptionPlain?: string; additionalPlain?: string; workplaceType?: string; createdAt?: number; hostedUrl: string };
const jobs: Job[] = [];
for (const [employer, slug] of greenhouse) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  try {
    const res = await fetch(url); if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json() as {jobs: GreenhouseJob[]};
    for (const j of json.jobs || []) {
      const loc = clean(j.location?.name || "India"); const body = clean(j.content || "");
      if (!relevant(j.title, body, loc)) continue;
      const all = `${j.title} ${body}`;
      jobs.push({ id:`gh-${slug}-${j.id}`, employer, title:clean(j.title), location:loc, workplace:mode(loc+" "+body.slice(0,600)), experience:exp(j.title), vendorTags:tags(all), postedAt:j.updated_at || null, lastVerifiedAt:stamp, url:j.absolute_url, summary:shorten(body), source:"Greenhouse" });
    }
  } catch (e) { console.warn(`Greenhouse ${employer}: ${e}`); }
}
for (const [employer, slug] of lever) {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  try {
    const res = await fetch(url); if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json() as LeverJob[];
    for (const j of json || []) {
      const loc = clean(j.categories?.location || "India"); const body = clean(`${j.descriptionPlain || ""} ${j.additionalPlain || ""}`);
      if (!relevant(j.text, body, loc)) continue;
      const all = `${j.text} ${body}`;
      jobs.push({ id:`lv-${slug}-${j.id}`, employer, title:clean(j.text), location:loc, workplace:mode(`${loc} ${j.workplaceType || ""}`), experience:exp(j.text), vendorTags:tags(all), postedAt:j.createdAt ? new Date(j.createdAt).toISOString() : null, lastVerifiedAt:stamp, url:j.hostedUrl, summary:shorten(body), source:"Lever" });
    }
  } catch (e) { console.warn(`Lever ${employer}: ${e}`); }
}
const deduped = [...new Map(jobs.map(j => [j.url.replace(/[?#].*$/, ""), j])).values()].sort((a,b) => a.employer.localeCompare(b.employer) || a.title.localeCompare(b.title));
const data: RadarData = { version: stamp.slice(0,10), generatedAt: stamp, methodology: "Direct employer Greenhouse and Lever feeds only. India-located specialist roles are selected using title, location and description signals; generic data engineering, security and sales roles are excluded. Requisition URL is the dedupe key.", jobs: deduped };
await fs.writeFile(path.join(process.cwd(), "data/jobs.json"), JSON.stringify(data, null, 2) + "\n");
console.log(`Wrote ${deduped.length} verified roles from ${new Set(deduped.map(j=>j.employer)).size} employers.`);
