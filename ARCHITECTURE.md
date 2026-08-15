# Tracer Intelligence — how the whole thing fits together

A job-market intelligence system for Bangladesh. Three job boards get scraped
into one Postgres table; a Next.js site reads that table and tells the story of
what the data says.

This document is the map. It does not repeat what the code already explains
well — instead it tells you **which file to open** for any given question. The
in-file comments in this project are unusually good; the only thing missing was
an index into them.

---

## The 30-second version

```
  bdjobs.py ─┐
skilljobs.py ─┼─→ [ job_postings ] ─→ 18 API routes ─→ Next.js dashboard
  shomvob.py ─┘         │
                        └── job_skills ── skill_map
```

One table, `job_postings`, is the spine. Everything else in the system either
writes to it, corrects it, or reads from it.

---

## Part 1 — Getting data in (`tracer_intelligence/`)

### The three sources

| Source | File | Runs where | Why |
|---|---|---|---|
| Bdjobs | `tracer_intelligence/spiders/bdjobs.py` | **CI, daily 17:00 UTC** | Works fine from GitHub runners |
| Skill.jobs | `tracer_intelligence/spiders/skilljobs.py` | **Your machine, by hand** | 403s from datacenter IPs |
| Shomvob | `shomvob.py` | **Your machine, by hand** | Same; also needs Playwright |

The datacenter-IP block is the single most important operational fact in the
project, and it's why the pipeline is split in two. The full story — including
the date it started and what was tried — is at the top of
`.github/workflows/scrape.yml`. **Do not re-add the local spiders to CI**; that
comment exists because it will only turn the workflow red.

Bdjobs and Skill.jobs are Scrapy spiders. Shomvob is a standalone Playwright
script that does its own database writing.

### Running the local half

```bash
cd tracer_intelligence
python run_local.py
```

`run_local.py` is the one entry point you actually need to remember. It does the
three things CI cannot: Skill.jobs scrape → Shomvob scrape → skill extraction.
Its docstring explains each step.

### How rows get written

`tracer_intelligence/pipelines.py` — `PostgresPipeline`. Everything the Scrapy
spiders emit lands here. Key behaviours:

- **Upsert on `dedupe_key`** (`'<source>_<listingid>'`). Re-scraping a live
  listing bumps `last_seen_at` rather than inserting a second row. This is the
  mechanism the entire "is this job still open?" question rests on.
- **`COALESCE` on update** — a later scrape with a blank description will not
  wipe a good one.
- **Per-row rollback** on DB errors, so one bad row can't poison the run.
- Location → `district` + `hub` is resolved here, via `location_map.py`.

### Data quality machinery

These exist because specific things went wrong. Each file's header explains the
incident that caused it:

| File | What it fixes |
|---|---|
| `link_checker.py` | Marks `link_dead` when a URL 404s **twice running**. Read this header — the two-strike rule and the reversibility exist because an earlier version falsely killed 4,043 postings on 2026-08-04. |
| `location_map.py` | Free-text location → one of 64 districts, plus analytical `hub`. Uses sentinels (`__NATIONAL__`, `__OVERSEAS__`, `__UNKNOWN__`) so "Anywhere in Bangladesh" is never drawn on a map as if it were a place. |
| `skill_extractor.py` | Dictionary-matches skills out of descriptions into `job_skills`. **Dry run by default**; needs `--write`. |
| `tax/load_skill_map.py` | Loads `skill_map_seed.csv` → `skill_map`. Idempotent; edit the CSV and re-run. |
| `backfill_geo.py` | Re-resolves district/hub for every existing row. Run after improving `location_map.py`. |
| `geo/location_coverage.py` | Reports how much of the live data actually maps. Run before trusting any geography figure. |

`sql/` holds two one-off repair scripts, kept as a record of what was done.

`probe.py` is a scratch debugging script — no docstring, hardcoded `LIMIT 3`.
Ignore it.

---

## Part 2 — The database (`schema.sql`)

`schema.sql` is verified against production and well annotated. Read it directly.
The four things worth having in your head:

**`job_postings`** — one row per (source, listing). The columns that drive
almost every query:

- `duplicate_of` — NULL means this is the canonical row. Same-source reposts
  point at their canonical.
- `is_confidential` — employer is a placeholder like "A Reputed Group".
- `link_dead` — URL confirmed gone.
- `last_seen_at` — bumped on every scrape that still sees the listing.

**`job_skills`** — many skills per posting, raw tags.

**`skill_map`** — raw tag → canonical skill. `canonical_skill = 'DROP'` means
filler. Analytics join *through* this map rather than reading raw tags.

**Two live quirks recorded in the schema:** `job_skills.posting_id` is `INTEGER`
while `job_postings.id` is `BIGINT`; and `last_seen_at`/`link_checked_at` are
plain `timestamp` while `scraped_at` is `timestamptz`.

> ⚠️ **`title_map` exists in the live database only** — there is no loader for it
> in this repo. `/api/stats/top-roles` and `/api/stats/portability` both depend
> on it, so **neither works from a clean checkout.** This is the one thing that
> will confuse you badly if you rebuild from scratch and forget it.

---

## Part 3 — Reading data out (`dashboard/app/api/`)

18 routes, all the same shape: query Postgres via `lib/db.ts` (a single `pg`
Pool), return JSON. No ORM, no caching layer.

### The "active posting" predicate

This is the concept to hold on to. Roughly nine routes filter on:

```sql
duplicate_of IS NULL
AND is_confidential = FALSE
AND link_dead = FALSE
AND last_seen_at >= NOW() - INTERVAL '3 days'
```

That is the canonical definition of *a job that is really open right now*.
`stats/geography/route.ts` extracts it as a local `const ACTIVE` — the clearest
place to see it stated.

**Routes that deviate do so on purpose**, and you should not "fix" them:

- `stats/lifespan` — wants the *closed* cohort (`last_seen_at <` the threshold).
- `stats/categories`, `stats/overview`, `stats/sector-momentum` — historical
  windows on `posted_at`, because they measure trend, not current state.
- `stats/market-signals` — omits `is_confidential` in one query because it is
  *counting* confidential postings.
- `companies/[name]/jobs` — deliberately shows a company's full history,
  dead links included.

### Route → what it answers

| Route | Answers |
|---|---|
| `stats/metrics` | Headline counts |
| `stats/overview` | Postings over time |
| `stats/categories` | Sector volumes, 30d vs prior 30d |
| `stats/geography` | District/hub totals + Location Quotient |
| `stats/market-signals` | Advertised pay per sector + disclosure rate |
| `stats/application-window` | Median days between posting and deadline |
| `stats/opportunity` | Sector opportunity scoring |
| `stats/top-roles` | Most-advertised titles *(needs `title_map`)* |
| `stats/portability` | Titles advertised across industries *(needs `title_map`)* |
| `stats/sector-momentum` | Sector growth/decline |
| `stats/lifespan` | How long postings stay open, by source |
| `stats/skills`, `stats/skill-cooccurrence` | Skill demand and pairings |
| `stats/source-matrix` | Source × sector coverage |
| `jobs/search`, `jobs/recent` | Job listings |
| `companies/trending`, `companies/[name]/jobs` | Employer views |

Several routes return **coverage/disclosure figures alongside the number** —
e.g. application-window returns how many postings even carry a deadline. That's
deliberate: figures ship with their own caveat attached rather than being
withheld.

---

## Part 4 — The front end (`dashboard/app/`)

Next.js App Router, Tailwind, Recharts, GSAP. **Two route groups**, which is the
structural idea to remember:

### `(story)` → `/` — the horizontal scroll narrative

`(story)/page.tsx` is the orchestrator (~530 lines, heavily commented). It:

1. Fetches all 18 endpoints in parallel, each failing independently into `null`
   so one bad endpoint can't blank the page.
2. Declares `PANELS` — 13 panels in order. `Component: null` renders a
   placeholder, which is why "For students" is a numbered blank.
3. Pins the container and scrubs the track sideways with GSAP — **only at
   ≥768px**, via `gsap.matchMedia`. Below that the panels are ordinary vertical
   sections. The comment at line 146 explains why in terms of actual cropped
   pixels; this is not cosmetic.
4. Drives the nav pill fill by writing a CSS variable straight to the DOM
   instead of through React state — this was the fix for scroll stutter.

**To add or fill a panel: edit the `PANELS` array. That's the one-line change.**

Panel → data it consumes:

| Panel | Prop |
|---|---|
| `HeroPanel` | `metrics`, `geography` — also **defines the `SiteData` type** for everything else |
| `SeekersPayPanel` | `categories`, `opportunity` |
| `SeekersMarketPanel` | `applicationWindow`, `opportunity`, `topRoles` |
| `SwitchersPortabilityPanel` | `portability` |
| `SwitchersPanel` | `momentum` |
| `SkillsPanel` | `skills` |
| `InsightsPanel` | `marketSignals` |
| `GeographyIntroPanel`, `GeographyPanel` | `geography` |
| `CoveragePanel` | `momentum`, `sourceMatrix` |
| `OverviewSection` | `metrics`, `overview`, `categories`, `trending`, `recentJobs` |

`OverviewSection` is the old homepage — it's now the vertical section that
follows the pinned track on the same route.

### `(site)` → the detail pages

Ordinary vertical pages, wrapped by `(site)/layout.tsx` which supplies
`SiteNav`. The route group exists so the story page's own nav and `SiteNav`
can't both render — handled structurally rather than by a pathname check.

| Page | Endpoint |
|---|---|
| `/search` | `jobs/search` |
| `/skills` | `stats/skills?limit=50` |
| `/geography` | `stats/geography` |
| `/insights` | `stats/lifespan`, `stats/market-signals`, `stats/skill-cooccurrence` |
| `/sources` | `stats/source-matrix` |
| `/companies/[name]` | `companies/[name]/jobs` |

### Components

All 15 in `app/components/` are in use. `ChartTooltip` is the most shared (5
call sites); `lib/chartTheme.ts` centralises chart styling.

---

## Part 5 — Where to start when you want to…

| Goal | Open |
|---|---|
| Understand the daily rhythm | `.github/workflows/scrape.yml`, then `run_local.py` |
| Add a data source | `spiders/bdjobs.py` as the template, then `pipelines.py` |
| Add a statistic | New folder in `app/api/stats/`, copy an existing `route.ts` |
| Put it on the story | `PANELS` array in `(story)/page.tsx` |
| Fix a wrong location | `location_map.py`, then run `backfill_geo.py` |
| Fix skill tagging | `tax/skill_map_seed.csv`, then `load_skill_map.py` |
| Understand why a number looks low | `link_checker.py` header, then `stats/lifespan/route.ts` |
| Rebuild the DB | `schema.sql` — **and remember `title_map` has no loader** |

## Known gaps

- `title_map` has no loader in this repo (breaks two endpoints on a fresh DB).
- `bdjobs_categories` table is live but unused — `bdjobs.py` hardcodes the
  `CATEGORIES` dict.
- The "For students" panel is declared but unbuilt.
- `dashboard/README.md` is still create-next-app boilerplate.
- `Home.pdf` (519KB) and five unused Next.js starter SVGs in `dashboard/public/`
  are tracked but referenced by nothing.
