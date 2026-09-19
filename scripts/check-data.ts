import data from "../data/jobs.json";
const seen = new Set<string>();
for (const j of data.jobs) {
  if (!j.id || !j.title || !j.employer || !j.url || !j.lastVerifiedAt) throw new Error(`Missing required field: ${JSON.stringify(j)}`);
  if (!j.url.startsWith("https://")) throw new Error(`Non-HTTPS URL: ${j.url}`);
  const key = j.url.replace(/[?#].*$/, ""); if (seen.has(key)) throw new Error(`Duplicate: ${key}`); seen.add(key);
}
console.log(`${data.jobs.length} jobs valid; ${seen.size} unique canonical URLs.`);
