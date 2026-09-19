export type Job = {
  id: string; employer: string; title: string; location: string; workplace: "Remote" | "Hybrid" | "On-site" | "Unclear";
  experience: "Early" | "Mid" | "Senior" | "Lead" | "Unclear"; vendorTags: string[]; postedAt: string | null;
  lastVerifiedAt: string; url: string; summary: string; source: "Greenhouse" | "Lever" | "Curated";
};
export type RadarData = { version: string; generatedAt: string; methodology: string; jobs: Job[] };
