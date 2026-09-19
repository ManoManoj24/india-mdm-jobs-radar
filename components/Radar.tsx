"use client";
import { useEffect, useMemo, useState } from "react";
import type { Job, RadarData } from "@/data/types";

const prettyDate = (v: string | null) => v ? new Intl.DateTimeFormat("en-IN", { day:"numeric", month:"short" }).format(new Date(v)) : "Not published";
const ageDays = (v: string | null, now: string) => v ? Math.max(0, Math.floor((new Date(now).getTime()-new Date(v).getTime())/86400000)) : null;
const city = (location:string) => {
  const hit = ["Hyderabad","Bengaluru","Bangalore","Pune","Chennai","Gurugram","Gurgaon","Noida","Mumbai","Delhi","Kolkata"].find(v=>new RegExp(`\\b${v}\\b`,"i").test(location));
  return hit === "Bengaluru" ? "Bangalore" : hit || location.split(/[;,]/)[0].replace(/^India\s*[-–·]\s*/i,"").trim() || "Other";
};

export default function Radar({data}:{data:RadarData}) {
  const [query,setQuery]=useState(""); const [tag,setTag]=useState("All"); const [level,setLevel]=useState("All"); const [mode,setMode]=useState("All"); const [location,setLocation]=useState("All"); const [fresh,setFresh]=useState("All"); const [sort,setSort]=useState("newest"); const [dark,setDark]=useState(false);
  useEffect(()=>{ document.documentElement.dataset.theme=dark?"dark":"light"; },[dark]);
  const tags=useMemo(()=>["All",...Array.from(new Set(data.jobs.flatMap(j=>j.vendorTags))).sort()], [data.jobs]);
  const locations=useMemo(()=>["All",...Array.from(new Set(data.jobs.map(j=>city(j.location)))).sort()], [data.jobs]);
  const active=[query,tag!=="All",level!=="All",mode!=="All",location!=="All",fresh!=="All"].filter(Boolean).length;
  const jobs=useMemo(()=>data.jobs.filter(j=>{
    const hay=`${j.title} ${j.employer} ${j.location} ${j.vendorTags.join(" ")}`.toLowerCase(); const age=ageDays(j.postedAt,data.generatedAt);
    return (!query || hay.includes(query.toLowerCase())) && (tag==="All" || j.vendorTags.includes(tag)) && (level==="All" || j.experience===level) && (mode==="All" || j.workplace===mode) && (location==="All" || city(j.location)===location) && (fresh==="All" || (age!==null && age<=Number(fresh)));
  }).sort((a,b)=> sort==="employer" ? a.employer.localeCompare(b.employer) : (new Date(b.postedAt||0).getTime()-new Date(a.postedAt||0).getTime())),[data.jobs,data.generatedAt,query,tag,level,mode,location,fresh,sort]);
  const grouped=useMemo(()=>Object.entries(Object.groupBy(jobs,j=>j.employer)).sort(([a],[b])=>a.localeCompare(b)),[jobs]);
  const reset=()=>{setQuery("");setTag("All");setLevel("All");setMode("All");setLocation("All");setFresh("All");};
  return <main>
    <header className="hero">
      <div className="topline"><div className="eyebrow">Weekly signal · India</div><button className="theme" onClick={()=>setDark(v=>!v)} aria-label={`Switch to ${dark?"light":"dark"} mode`}>{dark?"☀ Light":"◐ Dark"}</button></div>
      <h1>MDM jobs radar</h1>
      <p className="lede">Specialist MDM, PIM, data governance and data quality roles. Direct employer links, checked weekly.</p>
      <div className="stats"><div><strong>{data.jobs.length}</strong><span>live roles</span></div><div><strong>{new Set(data.jobs.map(j=>j.employer)).size}</strong><span>employers</span></div><div><strong>{prettyDate(data.generatedAt)}</strong><span>last verified</span></div></div>
    </header>
    <section className="controls" aria-label="Job filters">
      <label className="search"><span>Search</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Role, employer, city..." /></label>
      <Filter label="Specialty" value={tag} set={setTag} options={tags}/><Filter label="Experience" value={level} set={setLevel} options={["All","Early","Mid","Senior","Lead"]}/><Filter label="Work style" value={mode} set={setMode} options={["All","Remote","Hybrid","On-site","Unclear"]}/><Filter label="Location" value={location} set={setLocation} options={locations}/>
      <Filter label="Posted within" value={fresh} set={setFresh} options={["All","7","14","30"]} render={v=>v==="All"?"Any time":`Last ${v} days`}/>
      <label><span>Sort</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest</option><option value="employer">Employer</option></select></label>
    </section>
    <div className="resultbar"><span><strong>{jobs.length}</strong> matching roles {active>0&&<b className="filterCount">{active} active</b>}</span>{active>0&&<button onClick={reset}>Clear all</button>}</div>
    {grouped.length ? <section className="groups">{grouped.map(([employer,list])=><Employer key={employer} name={employer} jobs={list||[]} generatedAt={data.generatedAt} applyTag={setTag}/>)}</section> : <section className="empty"><h2>No matching roles</h2><p>Try a broader specialty or clear the filters.</p><button onClick={reset}>Clear all</button></section>}
    <footer><p><strong>Radar, not a job board.</strong> Metadata and short summaries come from public employer feeds. Confirm requirements on the employer page before applying.</p><p>Data version {data.version} · Generated {new Date(data.generatedAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</p><p>{data.methodology}</p></footer>
  </main>
}
function Filter({label,value,set,options,render=(v:string)=>v}:{label:string,value:string,set:(v:string)=>void,options:string[],render?:(v:string)=>string}){return <label><span>{label}</span><select value={value} onChange={e=>set(e.target.value)}>{options.map(o=><option key={o} value={o}>{render(o)}</option>)}</select></label>}
function Employer({name,jobs,generatedAt,applyTag}:{name:string,jobs:Job[],generatedAt:string,applyTag:(v:string)=>void}){return <article className="employer"><div className="employerHead"><h2>{name}</h2><span>{jobs.length} {jobs.length===1?"role":"roles"}</span></div><div className="joblist">{jobs.map(j=>{const age=ageDays(j.postedAt,generatedAt);return <div className={`job ${age!==null&&age>45?"older":""}`} key={j.id}><div className="jobMain"><div className="chips">{age!==null&&age<=3&&<span className="new">New</span>}{j.vendorTags.slice(0,4).map(t=><button key={t} onClick={()=>{applyTag(t);scrollTo({top:0,behavior:"smooth"})}} aria-label={`Filter by ${t}`}>{t}</button>)}</div><h3>{j.title}</h3><p className="meta">{j.location} · {j.workplace} · {j.experience}</p><p className="summary">{j.summary}</p></div><div className="jobSide"><div><span className="label">Posted</span><strong>{prettyDate(j.postedAt)}</strong>{age!==null&&<small>{age}d ago</small>}</div><a href={j.url} target="_blank" rel="noreferrer">View role <span aria-hidden>↗</span></a></div></div>})}</div></article>}
