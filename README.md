# India MDM jobs radar

A zero-budget weekly radar for specialist MDM, PIM, data-governance and data-quality openings in India. Built with Next.js, TypeScript and versioned static JSON for Vercel Hobby.

## Run locally

```bash
npm install
npm run refresh
npm run check:data
npm run dev
```

## Data model and refresh

- `data/jobs.json` is the published, versioned snapshot used at build time.
- `npm run refresh` reads public employer Greenhouse and Lever feeds, keeps India-relevant specialist roles, writes a short factual summary, and deduplicates by canonical application URL.
- No full job descriptions, third-party board scraping or employer logos are stored.
- Failed sources are logged and do not erase successful results. Review the refresh output before committing a new weekly snapshot.
- Workday employers can be added tenant by tenant after validating each CXS endpoint. Do not guess tenant URLs.

## Vercel

Import the repository into Vercel. Framework preset: Next.js. No environment variables are required. The site is a static export. For the first release, refresh the data weekly in a local or CI job, commit `data/jobs.json`, and let Vercel rebuild from Git.

Vercel Hobby cron is intentionally not required for the MVP. A GitHub Actions workflow can later run `npm run refresh` weekly and open a reviewable data change, subject to repository credentials and workflow permission.
