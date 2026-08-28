# Tracer Intelligence — complete reference

Exhaustive companion to [ARCHITECTURE.md](ARCHITECTURE.md). That document is the
map ("which file do I open?"). This one is the territory: every file, every
table, every endpoint, every threshold, and every reason a thing is the way it
is.

Written 2026-08-15 against the state of `main` at commit `1492b7e`.

---

## Table of contents

1. [System overview](#1-system-overview)
2. [Repository inventory](#2-repository-inventory)
3. [The database](#3-the-database)
4. [Ingestion — the Python side](#4-ingestion--the-python-side)
5. [Operations runbook](#5-operations-runbook)
6. [SQL maintenance scripts](#6-sql-maintenance-scripts)
7. [The API layer — all 18 routes](#7-the-api-layer--all-18-routes)
8. [The front end](#8-the-front-end)
9. [Cross-cutting invariants](#9-cross-cutting-invariants)
10. [Every tunable constant](#10-every-tunable-constant)
11. [Known gaps and landmines](#11-known-gaps-and-landmines)
12. [Glossary](#12-glossary)

---

## 1. System overview

Tracer Intelligence scrapes three Bangladeshi job boards into a single Postgres
table and publishes analysis of that data as a Next.js site.

```
   SOURCES                  INGEST                 STORE            SERVE
   ───────                  ──────                 ─────            ─────

   bdjobs.com    ──►  bdjobs.py (scrapy) ──┐
                                           ├──► pipelines.py ──┐
   skill.jobs    ──►  skilljobs.py (scrapy)┘    (upsert)       │
                                                               ├──► job_postings
   shomvob.co    ──►  shomvob.py (playwright, own writer) ─────┘         │
                                                                          │
                      link_checker.py  ──► corrects link_dead ────────────┤
                      skill_extractor.py ──► job_skills ───────────────────┤
                      backfill_geo.py  ──► district / hub ─────────────────┤
                      dedupe_same_source.sql ──► duplicate_of ─────────────┤
                                                                          │
                                                                          ▼
                                                       dashboard/app/api/** (18 routes)
                                                                          │
                                                     ┌────────────────────┴───────────────┐
                                                     ▼                                    ▼
                                          (story) — "/" horizontal      (site) — vertical detail pages
```

**Runtime topology.** Three separate execution contexts:

| Context | What runs | Trigger |
|---|---|---|
| GitHub Actions | `bdjobs` spider, `link_checker.py` | Daily cron `0 17 * * *`, or manual dispatch |
| Your machine | `skilljobs` spider, `shomvob.py`, `skill_extractor.py` | `python run_local.py`, by hand |
| Vercel (or wherever the dashboard is deployed) | Next.js server routes | Per HTTP request |

All three talk to the same Postgres instance via `DATABASE_URL`.

**Why the split exists.** Skill.jobs and Shomvob both return HTTP 403 to
datacenter IP ranges. Confirmed 2026-07-31: a bare 403 on the first request
from an Azure-hosted GitHub runner, while identical code returns 200 from a
residential connection. Skill.jobs *did* work from CI between 2026-07-11 and
2026-07-21, then the site tightened its Cloudflare configuration. This is
documented at the top of `.github/workflows/scrape.yml` and is the single most
consequential operational constraint in the project.

---

## 2. Repository inventory

103 tracked files. Excluding `package-lock.json`, `Home.pdf`, and
`node_modules`, this is all of them.

### Root

| Path | Purpose |
|---|---|
| `schema.sql` | Full DDL, verified against production |
| `Home.pdf` | 519KB binary, **referenced by nothing** |
| `.gitignore` | Ignores `__pycache__`, `*.pyc`, `.env`, `node_modules`, `.next`, `*.log`, `.claude/` |
| `.github/workflows/scrape.yml` | The daily CI job |
| `sql/dedupe_same_source.sql` | Populates `duplicate_of` |
| `sql/repair_link_dead_2026_08_04.sql` | One-off repair, kept as a record |

### `tracer_intelligence/` — the scraper project

| Path | Lines | Purpose |
|---|---:|---|
| `scrapy.cfg` | — | Scrapy project pointer |
| `run_local.py` | 115 | Orchestrates the three non-CI steps |
| `shomvob.py` | 159 | Playwright scraper, standalone, own DB writer |
| `link_checker.py` | 195 | Dead-link detection with self-distrust guard |
| `skill_extractor.py` | 205 | Dictionary skill matching for bdjobs + shomvob |
| `backfill_geo.py` | 39 | Re-resolve district/hub for all rows |
| `probe.py` | 17 | **Scratch debug script.** No docstring, hardcoded `LIMIT 3` |
| `geo/location_coverage.py` | 60 | Validation report for the location map |
| `tax/load_skill_map.py` | 82 | Loads `skill_map_seed.csv` → `skill_map` |
| `tax/skill_map_seed.csv` | 239 | Raw tag → canonical skill, 238 mappings |
| `tracer_intelligence/settings.py` | 104 | Scrapy config |
| `tracer_intelligence/items.py` | 17 | `JobPostingItem` field list |
| `tracer_intelligence/pipelines.py` | 97 | `PostgresPipeline` — the upsert |
| `tracer_intelligence/middlewares.py` | 100 | **Untouched Scrapy boilerplate, not enabled** |
| `tracer_intelligence/location_map.py` | 208 | Location → district + hub |
| `tracer_intelligence/spiders/bdjobs.py` | 258 | Bdjobs API spider |
| `tracer_intelligence/spiders/skilljobs.py` | 192 | Skill.jobs API spider |

### `dashboard/` — the Next.js app

- `app/api/**/route.ts` — 18 endpoints
- `app/(story)/` — page + 16 panel files
- `app/(site)/` — layout + 6 pages + `loading.tsx`
- `app/components/` — 15 shared components
- `app/data/bd-districts.json` — GeoJSON for the 64 districts
- `app/globals.css` — Tailwind v4 theme + custom classes
- `app/layout.tsx` — fonts + metadata only
- `lib/db.ts` — the `pg` Pool
- `lib/chartTheme.ts` — chart colour tokens
- `public/` — **five unused create-next-app SVGs**
- `README.md` — **untouched create-next-app boilerplate**

---

## 3. The database

Postgres with the `pg_trgm` extension. Four tables in `schema.sql`, plus one
that exists only in production.

### `job_postings` — the spine

One row per (source, listing). Column order matches production.

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGSERIAL PK` | |
| `source` | `TEXT NOT NULL` | `'bdjobs'` / `'skilljobs'` / `'shomvob'` |
| `source_url` | `TEXT NOT NULL` | |
| `dedupe_key` | `TEXT NOT NULL UNIQUE` | `'<source>_<listingid>'`. **The upsert conflict target.** |
| `title` | `TEXT NOT NULL` | |
| `company` | `TEXT NOT NULL` | |
| `location` | `TEXT` | Free text as the board wrote it |
| `category` | `TEXT` | Sector. Shared vocabulary across sources |
| `salary_raw` | `TEXT` | |
| `salary_min` / `salary_max` | `INTEGER` | |
| `description` | `TEXT` | May contain HTML |
| `deadline` | `DATE` | |
| `posted_at` | `DATE` | |
| `scraped_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` | First insert only |
| `is_confidential` | `BOOLEAN NOT NULL DEFAULT FALSE` | Placeholder employer name |
| `duplicate_of` | `BIGINT REFERENCES job_postings(id)` | NULL = canonical |
| `last_seen_at` | `TIMESTAMP` | Bumped every run the listing is still live |
| `link_dead` | `BOOLEAN NOT NULL DEFAULT FALSE` | Reversible |
| `link_checked_at` | `TIMESTAMP` | Last `link_checker.py` visit |
| `link_404_streak` | `INTEGER NOT NULL DEFAULT 0` | 2 = dead |
| `district` | `TEXT` | From `location_map.py`. NULL = unmapped/national/overseas |
| `hub` | `TEXT` | Analytical industrial cluster |

**Type quirks recorded in the schema, present in production:**

- `scraped_at` is `TIMESTAMPTZ`; `last_seen_at` and `link_checked_at` are plain
  `TIMESTAMP`.
- `job_skills.posting_id` is `INTEGER` while `job_postings.id` is `BIGINT`.

### `job_skills`

```sql
posting_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE
skill      TEXT    NOT NULL
UNIQUE (posting_id, skill)
```

Raw tags. Two different populations live here:

- **Skill.jobs rows** — employer-tagged, written by the spider through the
  pipeline from `item["skills"]`.
- **Bdjobs + Shomvob rows** — dictionary-matched by `skill_extractor.py`, which
  **deletes and rebuilds every bdjobs/shomvob row** on each `--write` run.

### `skill_map`

```sql
raw_skill       TEXT NOT NULL
canonical_skill TEXT NOT NULL   -- 'DROP' = filler, excluded from analytics
PRIMARY KEY (raw_skill, canonical_skill)
```

Composite PK, so one raw tag can fan out to several canonical skills — e.g.
`"Adobe Photoshop & Illustrator"` maps to `Graphic Design`, `Illustrator`, *and*
`Photoshop`. Analytics join **through** this map with
`COALESCE(sm.canonical_skill, js.skill)`, so unmapped tags fall back to
themselves rather than disappearing.

### `bdjobs_categories`

Live but **unused** — `bdjobs.py` hardcodes the `CATEGORIES` dict instead.

### `title_map` — ⚠️ production only

Columns `raw_title` → `en_title`. Maps Bangla titles to English. **There is no
loader for this table in the repository.** `/api/stats/top-roles` and
`/api/stats/portability` both `LEFT JOIN` it, so on a clean checkout both
endpoints return degraded results (the LEFT JOIN means they won't error — titles
just never get Bangla→English normalisation).

### Indexes

Base: `source`, `company`, `posted_at`, `scraped_at`.
Trigram GIN: `title`, `company`, `description` — these back the `ILIKE` search.
Later: `last_seen_at`, `category`, `district`, `duplicate_of`,
`job_skills.posting_id`.

---

## 4. Ingestion — the Python side

### 4.1 Scrapy configuration (`settings.py`)

| Setting | Value | Why |
|---|---|---|
| `ROBOTSTXT_OBEY` | `False` | |
| `CONCURRENT_REQUESTS_PER_DOMAIN` | `1` | Politeness |
| `DOWNLOAD_DELAY` | `2` | Politeness |
| `RETRY_TIMES` | `5` | Above default 2 — a lost page is 50 lost postings |
| `RETRY_HTTP_CODES` | `500,502,503,504,522,524,408,429,403` | **403 and 429 included deliberately** — often transient rate-limiting. Skill.jobs' datacenter 403 is *not* transient, so retrying costs a few wasted seconds; accepted for Bdjobs' benefit |
| `DOWNLOAD_TIMEOUT` | `30` | |
| `AUTOTHROTTLE_ENABLED` | `True` | start 5s, max 60s, target concurrency 1.0 |
| `ITEM_PIPELINES` | `PostgresPipeline: 300` | The only pipeline |
| `USER_AGENT` | Chrome 125 on Windows | |

Both middleware classes in `middlewares.py` are commented out of the settings —
that file is pure scaffolding.

### 4.2 `items.py`

`JobPostingItem` fields: `source`, `source_url`, `dedupe_key`, `title`,
`company`, `is_confidential`, `location`, `category`, `salary_raw`, `salary_min`,
`salary_max`, `description`, `deadline`, `posted_at`, `skills`.

`skills` is a list of strings and is only ever populated by the Skill.jobs
spider.

### 4.3 `pipelines.py` — `PostgresPipeline`

The single write path for both Scrapy spiders.

- `open_spider` — connect, raise if `DATABASE_URL` is unset.
- `process_item` — resolve `district` (via `_clean_district`, which nulls out the
  `NATIONAL`/`OVERSEAS`/`UNKNOWN` sentinels) and `hub`, then upsert. On
  `psycopg2.Error` it **rolls back and skips just that row**, so one bad record
  can't poison the rest of the run.
- `_upsert` — `INSERT … ON CONFLICT (dedupe_key) DO UPDATE SET`:
  - `last_seen_at = NOW()` — **this is the mechanism the whole "active" concept
    rests on**
  - `description`, `category` — `COALESCE(NULLIF(EXCLUDED.x, ''), job_postings.x)`,
    so a later blank scrape never wipes good data
  - `district`, `hub` — `COALESCE(EXCLUDED.x, job_postings.x)`
  - Returns `id`, then bulk-inserts `skills` with `ON CONFLICT DO NOTHING`
- Commits per item.

### 4.4 `spiders/bdjobs.py`

**Endpoint:** `https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch?pg={page}&rpp=50&isPro=0&ToggleJobs=true&isFresher=false`

**Pagination is fanned out, not chained.** This is the most important structural
fact about this spider. It used to chain — each page's callback yielded the
request for the next — so one dropped request silently ended the entire crawl
while the spider still exited 0 and CI still went green. Measured depth per run:

| Date | Page reached |
|---|---|
| 2026-08-01 | 116 (complete) |
| 2026-08-03 | 88 |
| 2026-08-05 | 80 |
| 2026-08-07 | 7 |
| 2026-08-08 | 71 |

~2,270 of 5,767 live postings were never re-seen and aged out of the 3-day
active window while still sitting on the board. The *varying* stop point is what
ruled out a rate limit. Now `_plan_remaining_pages` reads `common.totalpages`
off page 1 and requests pages 2..N up front, so a dropped request costs one page.
Wire behaviour is unchanged (still one request at a time, 2s apart) — the gain
is failure isolation, not speed.

If `common.totalpages` is missing or unparseable, it falls back to `chain_mode`
rather than collecting a single page.

**`premiumData`.** The response has both `data` and `premiumData`. Featured ads
are not reliably in `data` — of 48 distinct premium ads on 2026-08-08, 2 appeared
nowhere in `data`. Both arrays are processed, and `self.seen_keys` dedupes,
because premium ads repeat across early pages.

**Item construction (`_build_item`):**

- Skips rows with no `Jobid`; skips keys already in `seen_keys`.
- `title` / `company` use `or ""` rather than a `.get` default — the API sends
  explicit nulls, and both columns are `NOT NULL`.
- `is_confidential` = `CONFIDENTIAL_PATTERN.match(company)`, where the pattern is
  `^(a reputed|a group of compan|posted by anonymous)`, case-insensitive.
- `category` = `CATEGORIES.get(cat_id, "Uncategorized")`. **Two parallel ID
  ranges:** 1–29 white-collar and 61–92 blue-collar, plus −10 "Others" and −11
  "Other Special Skilled Jobs". The overlap between these ranges is what
  `/api/stats/portability`'s `SECTOR_ALIASES` exists to merge.
- Salary: reads the `Salary` dict; if min and max are both absent but
  `salary_raw` exists, falls back to regex on `Tk. 10,000 - 20,000 (Monthly)`
  and `Tk. 15,000 (Monthly)`.
- `deadline` / `posted_at` = first 10 chars of `deadlineDB` / `publishDate`.

**`closed(reason)`** logs collected vs `common.total_records_found`, and logs at
ERROR level if the share is below `COVERAGE_FLOOR = 0.90`.

**CI double-checks this independently.** The workflow writes items to
`/tmp/bdjobs.jl`, re-queries the board for `total_records_found`, and fails the
step if items are below 90% of it. "Not zero" was too weak — a truncated file is
not an empty one.

### 4.5 `spiders/skilljobs.py`

**Endpoints:** list `https://studio.skill.jobs/api/job_search/?limit=25&offset={offset}`,
detail `https://studio.skill.jobs/api/job_search/{slug}/`.

`custom_settings`: `DOWNLOAD_DELAY: 2`, `AUTOTHROTTLE_ENABLED: True`.

**Self-backfilling enrichment skip-set.** On first `parse()`, `_load_enriched_keys`
queries for `skilljobs` rows that have *both* skills and a real sector category
(`category NOT IN EMPLOYMENT_TYPES`). Those get their detail request skipped.

`EMPLOYMENT_TYPES` = `Full Time, Part Time, Contractual, Internship, Freelance,
Temporary` — these are values the listing's `type` field leaks into `category`. A
row still showing one hasn't had its real sector captured, so it gets re-fetched
once and then heals into the skip set. If the query fails, it detail-fetches
everything rather than skipping.

**`category` is deliberately not set in `parse()`** — the listing's `type` is
employment type, not sector. Leaving it unset means the pipeline's `COALESCE`
preserves whatever sector is already stored on skipped rows. Real sector comes
from `parse_detail` via `industry_list[0]`, mapped through
`SKILLJOBS_CATEGORY_MAP` (18 entries) into the shared Bdjobs vocabulary.
Unmapped values keep their raw string so nothing is lost.

**`parse_detail`** builds `description` from `workplace | level` plus
`position_summary`, `job_responsibility`, `qualification`; and populates
`item["skills"]` from `skills_list`, stripped and case-insensitively deduped.

Dates parse from `%b %d, %Y` (e.g. `Aug 15, 2026`), returning `None` on failure.

Pagination is a simple offset walk, +25 while `next_offset < total`.

### 4.6 `shomvob.py`

Standalone Playwright script — **not** a Scrapy spider, and it writes to
Postgres itself rather than going through `pipelines.py`.

- Launches headless Chromium, navigates to `https://app.shomvob.co/all-jobs/`,
  and **intercepts the XHR response** matching `get-active-job-list-guest`
  rather than parsing the DOM.
- Uses `page.expect_response(..., timeout=45000)` with `goto(timeout=60000)`
  instead of a fixed sleep — CI's network path to this site is much slower than
  local, and the earlier `networkidle` attempt took >60s and silently returned
  zero jobs.
- `CATEGORY_MAP` (17 entries) normalises Shomvob's sector names to the shared
  vocabulary.
- Its upsert mirrors the pipeline's but **does not set `is_confidential`**.
- **Exits non-zero on zero jobs** — Shomvob always has hundreds live, so zero
  means the fetch failed, and a silent fake-green is the failure mode this
  project keeps designing against.

`sys.path.insert` at the top makes `tracer_intelligence.location_map` importable
when the script is run directly from the `tracer_intelligence/` directory.

### 4.7 `link_checker.py`

Feeds `link_dead`, which every dashboard figure filters on.

**The incident.** On 2026-08-04 one run flagged 4,043 postings dead. A 150-row
random sample re-checked on 2026-08-09 through the same code path returned HTTP
200 for **all 150** — full-size pages, no soft-404s, 130 with deadlines still in
the future. 2,736 of the batch were still being scraped off the board daily. The
old selection query required `link_dead = FALSE`, so nothing ever revisited them.
The site reported 1,495 active postings against ~6,000 live — three quarters of
the board gone.

**Three defences, none of which depend on knowing what Bdjobs served that day:**

1. **Dead is not permanent.** Dead-flagged rows are re-checked every
   `RECHECK_DEAD_AFTER` (7 days) for as long as the scraper still sees them on
   the board. Any non-404 revives them. A wrong flag costs days, not forever.
2. **One 404 is not proof.** `STRIKES_TO_DECLARE_DEAD = 2` consecutive 404s,
   tracked in `link_404_streak`, before flagging.
3. **The run distrusts itself.** Past `MIN_CHECKS_BEFORE_GUARD = 50` checks, if
   more than `MAX_DEAD_RATIO = 0.20` of them 404, **every row this run touched
   with a 404 is rolled back** — not just those that reached two strikes, because
   a row left on strike 1 by a run you've decided to disbelieve is a land mine —
   and the process exits 1. The Aug-4 event would have tripped this after 50
   checks instead of running to 4,043.

**Selection.** Only rows the scraper still sees (`last_seen_at >= NOW() - 3
days`), canonical only, live rows due after `RECHECK_LIVE_AFTER` (20 hours) and
dead rows after 7 days. Ordered `link_checked_at ASC NULLS FIRST` so a run cut
short still makes progress on the stalest.

**Failed requests** (timeout, connection error) deliberately touch neither
`link_checked_at` nor the streak — retried next run rather than counted as
evidence either way.

Commits every 25 checks. `REQUEST_DELAY = 1.5s`, `TIMEOUT = 10s`.

### 4.8 `skill_extractor.py`

Dictionary matching over `description` for **bdjobs and shomvob only**
(Skill.jobs skills are employer-tagged by its spider).

- `SKILLS` — ~65 canonical skills with alias lists, in five groups: programming/
  tech, business/office, design, trade/technical, languages.
- `build_patterns` compiles one boundary-aware regex per alias:
  `(?<![A-Za-z0-9])alias(?![A-Za-z0-9])`. This is why `"java"` does not match
  inside `"javascript"` and `"c++"` matches cleanly.
- `strip_html` drops markdown code fences, then tags, then unescapes entities,
  then collapses whitespace.
- **Dry run by default.** Prints coverage and the top 30 skills, writes nothing.
  `--write` creates the table if needed, **`DELETE`s every bdjobs/shomvob row in
  `job_skills`**, and re-inserts. Idempotent, but it is the one destructive step
  in the local routine.

Skill coverage decays without this: active Bdjobs coverage had fallen from 7.8%
to 5.7% over four days; one run restored it to 12.4%.

### 4.9 `location_map.py`

Two independent rollups from the free-text `location` field.

**Sentinels** — returned instead of a district so non-places can be excluded from
the map honestly:

| Sentinel | Matches |
|---|---|
| `__NATIONAL__` | "anywhere in bangladesh", "nationwide", "remote", "work from home", … |
| `__OVERSEAS__` | "saudi arabia", "uae", "qatar", "malaysia", "dubai", … |
| `__UNKNOWN__` | "n/a", "na", "", "-", "tba" |

**`map_district(location)`** resolution order:

1. Normalise whitespace, lowercase.
2. Exact match against the three sentinel key sets.
3. Exact match in `TO_DISTRICT` (built by `_add()` calls — hundreds of
   neighbourhood, upazila, EPZ and spelling variants rolling up to 64 official
   districts; Dhaka alone has ~130 entries).
4. If the string contains a comma, retry all of the above on the first token.
5. Structural fallback: `"<X> Sadar"` → district X.
6. `None` — unmapped, surfaces for review.

Note the map handles both spellings of renamed districts (Chattogram/Chittagong,
Jashore/Jessore, Bogura/Bogra, Cumilla/Comilla, Barishal/Barisal).

**`hub_for(location)`** returns one of five analytical clusters, deliberately
**not** aligned to district lines:

- Savar–Ashulia RMG Belt
- Gazipur Industrial Corridor
- Narayanganj Textile Hub
- Chattogram Port & EPZ
- Dhaka Corporate Core

First hub wins on overlap (`setdefault`).

### 4.10 Maintenance scripts

| Script | What it does |
|---|---|
| `backfill_geo.py` | Re-resolves `district` + `hub` for every row with a location. Idempotent. Run after improving `location_map.py`. Prints how many rows got each field. |
| `geo/location_coverage.py` | Read-only report: % mapped to a real district, national/overseas/unknown shares, hub coverage, and the top 30 unmapped location strings. Deliberately imports the *same* map the live pipeline uses so it can't lie. **Run this before trusting any geography figure.** |
| `tax/load_skill_map.py` | `TRUNCATE`s and reloads `skill_map` from the CSV, then prints the top 20 canonical skills and the unmapped Skill.jobs tags queue. |
| `probe.py` | Scratch. Fetches `industry_list` for 3 Skill.jobs rows stuck on `category='Full Time'`. Ignore. |

---

## 5. Operations runbook

### Daily, automatic (GitHub Actions)

```
0 17 * * *  →  checkout → python 3.11 → pip install scrapy psycopg2-binary python-dotenv requests
            →  scrapy crawl bdjobs -O /tmp/bdjobs.jl   (+ 90% coverage assertion)
            →  link_checker.py                          (if: always())
```

`if: always()` on the link-check step means a failed scrape still gets its links
checked, rather than compounding one stale source with another.

Secrets: `DATABASE_URL`.

### Daily-ish, manual

```bash
cd tracer_intelligence
python run_local.py
```

Runs Skill.jobs → Shomvob → skill extraction, in that order (extraction last so
it picks up everything just inserted). Exits non-zero if any step comes back
empty, and prints the VPN/hotspot hint if Skill.jobs returned nothing.

### Weekly-ish, manual

```bash
psql "$DATABASE_URL" -f sql/dedupe_same_source.sql
```

**This must be run periodically, not once.** It can only flag what exists when it
runs. It last ran 2026-07-10 and by 2026-08-01 had accumulated 104 unflagged
duplicates, inflating the active count by ~68 (about 1%).

### After changing the location map

```bash
python tracer_intelligence/backfill_geo.py
python tracer_intelligence/geo/location_coverage.py
```

### After editing the skill taxonomy

```bash
python tracer_intelligence/tax/load_skill_map.py
```

---

## 6. SQL maintenance scripts

### `sql/dedupe_same_source.sql`

Populates `duplicate_of` — the column every dashboard read filters on.

**Flags, never deletes.** Sets `duplicate_of` to the id of the canonical
(earliest) row per cluster; canonical keeps `NULL`.

- **"Same job"** = identical normalised `(company, title, location)`, lowercased
  and trimmed.
- **New cluster** = a gap of more than **14 days** between consecutive postings —
  a genuine re-advertisement rather than a repost.
- Implemented as a gaps-and-islands query: `LAG` → island id via a running
  `SUM` → `MIN(id) OVER (...)` as canonical.
- Only considers rows with `is_confidential = FALSE` and a non-null `posted_at`.
- **`source` is in every `PARTITION BY`**, so cross-source dedup never happens —
  a Bdjobs listing can never be flagged as a duplicate of a Skill.jobs one.
- Idempotent.

Includes a commented diagnostic for finding and terminating a stuck
`idle in transaction` backend if the `UPDATE` ever hangs.

### `sql/repair_link_dead_2026_08_04.sql`

One-off repair for the incident described in §4.7. Adds `link_404_streak` if
missing, then clears `link_dead` for rows where
`link_checked_at::date = '2026-08-04'`, setting `link_checked_at = NULL` so they
sort first in the checker's queue and get re-judged on the two-strike rule.

Deliberately scoped to that one date: two rows flagged on 07-27 and 07-29 were
flagged alone on days with no mass event, and are left alone as probably genuine.
Idempotent. Prints before/after counts.

---

## 7. The API layer — all 18 routes

All routes are Next.js App Router `GET` handlers using `pool` from
`@/lib/db` — a single `pg` Pool with `ssl: { rejectUnauthorized: false }`,
reading `DATABASE_URL` from runtime env. No ORM, no cache layer.

`next.config.js` is intentionally empty of an `env` block: that block inlines
values into build output, which would ship DB credentials to the browser.

### 7.1 `/api/stats/metrics`

Four counts. Returns `active_postings`, `postings_60d`, `companies_hiring`,
`total_companies`.

`active_postings` uses the canonical active predicate and is explicitly
commented as needing to match search, trending, and the company page. Company
counts exclude confidential rows — placeholder names and address-strings would
each count as a distinct company.

### 7.2 `/api/stats/overview`

Daily posting counts, last 60 days, canonical only. Returns `{date, jobs}[]`.

### 7.3 `/api/stats/categories`

Per-sector volume with a 30d-vs-prior-30d comparison. Excludes `category` of
NULL, `''`, or `'0'`. `LIMIT 20`. `change` is null when the prior period was
zero rather than reporting an infinite increase.

### 7.4 `/api/stats/opportunity`

Per-category market shape — drives the opportunity scatter and market
composition.

**Disclosure definition:** a range wider than 100% of its floor (e.g.
20,000–120,000) counts as **not** disclosed. A spread that wide communicates
nothing, and counting it would overstate transparency and drag the median.

**Thresholds:** `HAVING COUNT(*) >= 20` for the category to appear at all;
`median_pay` is only computed when `COUNT(pay) >= 20`, otherwise `null`. The
comment records why: Research/Consultancy had 3 disclosed salaries,
Pathologist 4, Nurse 7 — and Mechanic/Technician came out above IT on the
strength of 15. On a scatter those plot with the same visual confidence as a
median built from 543. A category below the threshold still carries volume,
employers and disclosure rate; it just gets no y-position rather than a
fabricated one.

### 7.5 `/api/stats/application-window`

`deadline - posted_at` percentiles per category — described in the code as the
one figure on the seekers panel that is *advice* rather than description, and
one no BD job board can show because none keep the history.

Guards: deadline must be ≥ posted_at; capped at 120 days (deadlines set years
out are data-entry noise); needs ≥15 windowed postings. Returns `coverage` —
what share of the category's postings even carry a deadline — so the panel can
state it rather than implying the median covers everything. Sorted by median
ascending (tightest windows first).

### 7.6 `/api/stats/geography`

Three parallel queries: district totals, district×sector, hub×sector.

Computes **Location Quotient** = (sector's share within the district) ÷ (sector's
share nationally), where "nationally" is the district-attributed universe.

- Specialisation grid: top 12 districts by volume, each keeping sectors with
  **LQ ≥ 1.3 and count ≥ 3**, top 4 shown.
- **Dhaka is excluded from that grid** — it *is* the national baseline, so
  everything comes out ~1× and its card is noise beside real outliers. It still
  leads the map payload and the hub view.
- Hubs: total plus top 5 sectors by share.

Returns `{ map, districts, hubs }`.

### 7.7 `/api/stats/market-signals`

Two queries.

- **Salary:** p25/p50/p75 of `(salary_min + COALESCE(salary_max, salary_min))/2`
  per sector, last 60 days, `HAVING disclosed >= 15`, `LIMIT 12`. Returns
  `disclosed` alongside `total` so the number carries its own coverage caveat.
- **Confidential:** share of anonymous postings per sector, active cohort,
  `HAVING COUNT(*) >= 30`, `LIMIT 12`. **This query omits `is_confidential`
  from its filter on purpose — it is counting confidential postings.**

### 7.8 `/api/stats/lifespan`

Survival curves for the **closed** cohort (`last_seen_at < NOW() - 3 days`) —
the inverse of the active predicate, and intentional.

`days_alive = last_seen_at::date - posted_at`, capped at 120, requires
`last_seen_at::date >= posted_at`. Explicitly described as descriptive of the
closed cohort's shelf life, **not** a censored Kaplan–Meier estimate.

**Reliability gate:** `MIN_DISTINCT_CLOSE_DATES = 5`. A crawl gap freezes
`last_seen_at` for everything live at the time, so unrelated postings all appear
to close on one date once they cross the 3-day threshold — a batch artifact. A
source whose closures don't span ≥5 distinct dates returns `null` curves and
`reliable: false` rather than a fake curve.

Curves run day 0..60. Returns `{ curves, medians, counts, reliable }`.

### 7.9 `/api/stats/sector-momentum` — the most defensive endpoint

Sector movement published *with* its own unreliability, because continuous daily
crawling is young and there was a long gap before it. Everything posted during
that gap was captured retroactively in one catch-up run, so only postings still
alive that day survived — anything that opened and closed inside the gap is gone
forever, making any comparison spanning it a survivorship artifact.

**How the window is derived** (not assumed, so it grows on its own):

1. Read the crawl log — `scraped_at::date` grouped, cast to text **in SQL**.
   `node-postgres` returns a DATE as local midnight, so
   `new Date(r.day).toISOString()` shifted every crawl day one back in any
   timezone east of UTC — invisible on Vercel (UTC), but it made local runs name
   the wrong missing day.
2. Find the last gap longer than `GAP_TOLERANCE_DAYS = 1`. Everything before it
   is discarded.
3. Drop the first post-gap day — it carries the backlog and would inflate the
   first block.
4. Need ≥ `MIN_CLEAN_DAYS = 4`, else return `usable: false` **with the history
   payload still attached**. (An earlier version dropped it, which is why the
   coverage panel once read "collecting since —" and "a 0-day hole in it": the
   figures existed, the payload just withheld them.)
5. Split remaining days into two equal blocks; an odd count drops the middle day
   rather than giving one block extra volume.

**Why one-day holes are tolerated:** any missing day used to discard all history
before it, so one failed run blanked the panel for five days and threw away a
month. A 28-day hole genuinely destroys comparability; one missing day loses
only adverts that opened *and* closed within it — a small fraction on a board
where the median advert runs 30 days. The cost is that the window isn't literally
unbroken, so missing days are counted and returned in `caveats.missing_days` to
be named outright.

**The repair asymmetry** — the caveat that actually threatens the comparison. A
catch-up crawl can only recover adverts still live when it runs, so it tops up
the *recent* half while the earlier half's missed adverts have already expired.
That biases toward showing growth. So it is measured, under the same filters as
the chart: postings recorded more than `LATE_RECORD_DAYS = 2` after
`posted_at` are counted per half, and both `delta_all` and
`delta_excluding_late` are returned — the headline both ways, rather than asking
the reader to take "small" on trust.

**Sector filter:** `earlier + recent >= 40`, else it's noise dressed as a trend.

**`one_directional`** — set when `rising <= 2` or `rising >= sector_count - 2`.
The tell: if nearly every sector moves the same way, the cause is the collection
window, not the labour market.

### 7.10 `/api/stats/portability`

How far a job title travels between industries — the switcher's question.

**Deliberately not built on skills:** cross-source skill overlap is unvalidated
and the dictionary extraction behind bdjobs/shomvob skills hasn't been checked.
Title, sector and employer are all first-party fields.

**Window is 120 days, not the active cohort** — portability is a structural
property of a job, not a statement about what's open today, and the active
cohort alone is too thin to measure breadth.

**`SECTOR_ALIASES`** merges 20 unambiguous pairs across Bdjobs' two parallel
category systems (white-collar 1–29, blue-collar 61–92). Breadth is a count of
DISTINCT sectors, so leaving them split would inflate exactly the number this
endpoint reports. Anything requiring a judgement call is left alone.

**Title normalisation** is the same four-step pipeline as `/top-roles` (below).

**Thresholds:** a sector only counts toward breadth at `n >= 3` postings —
without it, one stray advert reads as "this industry hires you"; office assistant
looked like 11 sectors, 8 of them a single posting. Roles need `SUM(n) >= 20`.
`WIDEST_LIMIT = 6` is shared between the widest-roles list and its sector
breakdown (they were once 6 and 3, so roles 4–6 came back with `breakdown: []`).

Five parallel queries: breadth distribution, widest roles, single-sector
("locked") roles, sector breakdown for the widest, and two named examples per
breadth band — because "26 titles" is an abstraction while
"teacher — Education/Training" is checkable against the reader's own job.

### 7.11 `/api/stats/top-roles`

Most-posted roles with seniority preserved as its own dimension. **Order
matters:**

1. Map Bangla → English via `title_map`, so ড্রাইভার merges with driver. The
   bracket is handed through intact — Bangla brackets carry the role the same
   way English ones do ("অফিস সহায়ক (পিয়ন)" states the job is peon), and
   stripping it before lookup would discard exactly the wanted information.
2. Extract seniority into its own field rather than discarding it (normalising
   `sr`/`sr.` → senior, `asst`/`asst.` → assistant, …; default `'standard'`).
3. Strip brackets, dash suffixes, and gender/shift qualifiers.
4. If what remains is only a generic rank, promote the qualifier in front of it —
   so "Assistant Manager (Accounts)" becomes "accounts manager" rather than
   collapsing into "manager". Requires a qualifier of ≤3 words that isn't itself
   a rank abbreviation.

Steps 2 and 4 exist because BD job titles are rank-first with the function in a
bracket or after a dash. Naive normalisation keeps the rank and throws away the
job — at one point "executive" absorbed **676 distinct titles**.

Bare ranks with no recoverable function (`executive`, `manager`, `officer`,
`assistant`, `associate`) are omitted rather than presented as roles.

**The four seniority buckets must cover every value the extractor can produce**,
or the parts stop summing to the whole. `'assistant'` was initially missed, which
silently dropped 31 of 39 teacher postings out of the breakdown while leaving
them in the total. `LIMIT 8`.

### 7.12 `/api/stats/skills`

Per-source canonical skill demand. A posting belongs to exactly one source, so
per-source distinct counts sum cleanly to the total without double counting.

Joins through `skill_map` with `COALESCE`, excludes `'DROP'`. Pivots to one row
per skill with a column per source.

**`?withCoverage=1`** is opt-in: the default response is a bare array (which the
existing `/skills` page consumes), and only callers that ask get the wrapper with
`coverage`, `total_active`, `total_with_skills`, `overall_pct`. The story panel
asks, because it has to disclose that skills for bdjobs and shomvob come from a
fixed dictionary — anything outside that word list is invisible, and most
postings match nothing at all.

`?limit=` defaults to 25. The story requests 10; `/skills` requests 50.

### 7.13 `/api/stats/skill-cooccurrence`

Top 18 canonical skills as matrix axes, plus pairwise co-occurrence computed with
a self-join on `a.skill < b.skill` (so each pair appears once), filtered to pairs
where both endpoints are top skills.

### 7.14 `/api/stats/source-matrix`

Active postings per sector per source, pivoted, plus **% share within each
source** so columns are comparable — Bdjobs is roughly 10× the others. Sectors
ordered by total volume. `Uncategorized` excluded: it's unrecoverable expired
Skill.jobs rows, not a real sector.

### 7.15 `/api/jobs/search`

The only route with meaningful input handling.

Params: `keyword`, `location`, `district`, `category`, `source`, `dateFrom`,
`dateTo`, `salaryMin`, `salaryMax`, `limit`.

- `limit` is clamped to 1..100, default 20, `Number.isFinite` guarded.
- All values go through parameterised placeholders — no interpolation.
- `keyword` searches `title`, `description`, `company` with `ILIKE %kw%` (backed
  by the trigram indexes).
- Salary filtering is **overlap semantics**: `salaryMin` filters
  `salary_max >= x` and `salaryMax` filters `salary_min <= y`, so a job whose
  range straddles the bound still matches.
- Returns `{ total, jobs }` — the count runs on the same WHERE clause before the
  limit is appended.

### 7.16 `/api/jobs/recent`

Canonical active, ordered `posted_at DESC, scraped_at DESC`, `?limit=` default 20.

### 7.17 `/api/companies/trending`

Companies with the most currently-active openings. Uses the canonical active
predicate explicitly so the count reconciles with what the user sees on click-through.
`?limit=` default 10.

### 7.18 `/api/companies/[name]/jobs`

Full history for one company, matched on `lower(trim(company))`. Excludes
confidential and duplicates, but **deliberately does not filter `link_dead` or
`last_seen_at`** — it selects both as display columns, because the company page
shows history including expired postings. Async `params` (Next 15+ convention).

---

## 8. The front end

Next.js 16.2, React 19.2, Tailwind v4, Recharts 3.9, GSAP 3.15, d3-geo 3.1.
TypeScript with `@/*` → `./*` path alias.

> `postgres` (v3.4.9) is in `dependencies` but imported nowhere — `lib/db.ts`
> uses `pg`. Unused dependency.

### 8.1 Routing

Two route groups, so neither has to know about the other:

- **`(story)`** → `/` — the horizontal scroll narrative. No layout file; the page
  supplies its own nav.
- **`(site)`** → `/search`, `/skills`, `/sources`, `/insights`, `/geography`,
  `/companies/[name]` — ordinary vertical pages wrapped by `(site)/layout.tsx`,
  which renders `SiteNav`.

The route group is what stops the two navs doubling up. Previously a client
component read the pathname and returned `null`; the group does it structurally.

`app/layout.tsx` carries only fonts (IBM Plex Sans, IBM Plex Mono, Fraunces) and
metadata. Fraunces loads weights 300/500/700 — with only 700 the browser fakes
the lighter weights and every wordmark renders the same heaviness.

`(site)/loading.tsx` is a route-transition skeleton mirroring the house card
layout, so content lands without a visual jump. No spinner, no fixed duration.

### 8.2 The story page (`(story)/page.tsx`)

**Data fetching.** All 18 endpoints in parallel on mount, into a keyed object.
Endpoints are named (`ENDPOINTS.metrics`) rather than indexed, so reordering
can't silently break a panel. `safeFetch` catches per-endpoint: a non-ok status,
bad JSON, or empty body yields `null` for that key instead of rejecting the whole
batch and blanking the page.

**`PANELS`** — 12 entries, in order. `Component: null` renders a numbered
placeholder, so a panel can be declared before it is built. Nothing currently
uses it.

| # | id | Nav label | nav | Component |
|---:|---|---|---|---|
| 1 | `hero` | Home | ✓ | HeroPanel |
| 2 | `seekers-intro` | For seekers | ✓ | SeekersIntroPanel |
| 3 | `seekers-pay` | For seekers | | SeekersPayPanel |
| 4 | `seekers-market` | For seekers | | SeekersMarketPanel |
| 5 | `switchers-intro` | For switchers | ✓ | SwitchersIntroPanel |
| 6 | `switchers-portability` | For switchers | | SwitchersPortabilityPanel |
| 7 | `switchers` | For switchers | | SwitchersPanel |
| 8 | `skills` | Skills | ✓ | SkillsPanel |
| 9 | `insights` | Insights | ✓ | InsightsPanel |
| 10 | `geography-intro` | Geography | ✓ | GeographyIntroPanel |
| 11 | `geography` | Geography | | GeographyPanel |
| 12 | `coverage` | Coverage & Method | ✓ | CoveragePanel |

Portability comes **before** momentum deliberately: it stands on 120 days of
first-party fields, so the section leads with what holds and follows with the
measurement that still needs four caveats.

**`NAV_SECTIONS`** is derived: each nav item owns panels from its index up to
(excluding) the next nav item's. "For seekers" owns three, so its pill fills in
thirds; "Skills" owns one and fills in a single step.

**The horizontal mechanic — ≥768px only.** Everything is inside
`gsap.matchMedia("(min-width: 768px)")`, so on a phone the pin, scrub, snapping
and entrance triggers are never created. This is structural, not cosmetic: the
pin forces every panel to exactly viewport height, and a panel laid out for
1280×720 cannot fit 375×812 — **up to 1,664px of content was being cropped off
the bottom of a single panel.** `matchMedia` also handles boundary crossings,
reverting and rebuilding so neither layout inherits the other's inline styles.

**`--panel-w`** is set from `document.body.clientWidth`. There is no pure-CSS
unit for this: `100vw` counts the scrollbar, and a container query would have to
sit on the pinned element whose size GSAP freezes at pin time. It is measured
from `<body>` (stable because `html { scrollbar-gutter: stable }`) and
deliberately *not* inside ScrollTrigger's refresh, which alters the scroller's
overflow while measuring and reports a width one scrollbar too wide.

**Snapping** applies to `seekers-pay`, `seekers-market`, `switchers` only.
Snapping the whole track was tried and rejected — it made the scroll feel
controlling. These three are dense charts that are unreadable half-shown.
`snapTo` returns the nearest opted-in panel if within half a panel, else the
value untouched (a no-op).

**Nav fill is written straight to the DOM** as a CSS variable, not through React
state. It used to `setActive` every frame, which re-rendered the page on every
scroll tick — including the 64-path map and the Recharts scatter — and was the
source of stutter at panel boundaries. Now nothing re-renders on scroll.
`panelEls` is `useMemo`'d on `[data]` for the same reason.

**Overview** gets a pill too, but its fill comes from its own ScrollTrigger
measuring vertical progress through the section, since it isn't one of the
panels. Same visual language, honestly sourced.

**Entrance animations** pass `containerAnimation: tween` — without it these
elements never move vertically, so ScrollTrigger would treat them as permanently
in view and fire everything at once. Only opacity and transform are animated
(both GPU-composited). `scrub: 0.6` rather than `true`, to match the eased feel
of the track's `scrub: 1`; rigid 1:1 binding reads as twitchy against a smoothed
container.

**Navigation.** With a track, panel *i* sits at
`st.start + (st.end - st.start) * (i / (panels - 1))`. Without one (below md),
it scrolls to the section element with `NAV_OFFSET = 56` to clear the fixed nav.

### 8.3 Panels

| Panel | Consumes | Notes |
|---|---|---|
| `HeroPanel` | `metrics`, `geography` | **Defines the `SiteData` type** imported by page.tsx |
| `SeekersIntroPanel` | — | Section opener |
| `SeekersPayPanel` | `categories`, `opportunity` | Split out from a four-visual panel — four visuals read as noise |
| `SeekersMarketPanel` | `applicationWindow`, `opportunity`, `topRoles` | |
| `SwitchersIntroPanel` | — | |
| `SwitchersPortabilityPanel` | `portability` | |
| `SwitchersPanel` | `momentum` | Renders the caveat payload, including the repair asymmetry |
| `SkillsPanel` | `skills` | Discloses dictionary coverage per source |
| `InsightsPanel` | `marketSignals` | |
| `GeographyIntroPanel` / `GeographyPanel` | `geography` | |
| `CoveragePanel` | `momentum`, `sourceMatrix` | Explains what each board is for; three sectors per board (nine rows fits 720px) |
| `OverviewSection` | `metrics`, `overview`, `categories`, `trending`, `recentJobs` | The old homepage, now the vertical tail |

**Shared panel helpers:**

- `PanelHeader` — audience / question / optional note. Every panel opens with it;
  without it a panel is charts arriving with no context. The note is `shrink-0`
  from md up only — left on at 375px it refused to narrow and pushed 123px off
  the side of the page.
- `ScatterLegend` — the scatter carries four encodings (x, y, size, colour);
  showing them is faster than a sentence asking the reader to hold four mappings.
- `sectorNames.ts` — `SECTOR_PLAIN`, 34 entries. Board category names aren't
  everyday language ("Commercial" → "import, export and trade paperwork").
  Shared so two panels can't describe the same sector differently.
- `BangladeshMap` — see below.

### 8.4 `BangladeshMap`

Renders `app/data/bd-districts.json` with `geoMercator().fitSize()`. District
names in the GeoJSON were **rewritten to match `location_map.py` exactly** (nine
colonial spellings changed), so no lookup layer is needed.

- Portrait 420×520 — Bangladesh spans ~4.7° longitude but ~5.9° latitude.
- Projection and 64 path strings are `useMemo`'d; recomputing them per hover was
  what made it sluggish. Sorted north→south so the entrance reads as a sweep.
- **Log fill scale**, not linear: Dhaka dwarfs everything, and a linear ramp
  renders the other 63 districts as effectively the same empty shade.
- Fill is set via `style`, not the SVG attribute — CSS transitions only apply to
  the property, so an attribute would snap rather than ease.
- Hover uses `onMouseEnter` only, no `onMouseMove`, so there's no re-render storm.
- The hovered district is **redrawn last** — SVG has no z-index, and without this
  neighbouring shapes paint over the highlight on about half the districts.
- Tooltip is pinned to the district centroid, not the cursor, so it lands in one
  place instead of jittering.
- `ENTRANCE_DELAY = 1.9s` — the BrandLoader covers the page for ~1.4s plus a 0.5s
  fade, so anything earlier plays behind it.

### 8.5 Components

| Component | Used by |
|---|---|
| `ChartTooltip` | CategoryChart, CompanyHistoryChart, JobsChart, LifespanChart, SkillsChart |
| `MetricCard`, `JobsChart`, `CategoryChart` | OverviewSection |
| `BrandLoader` | (story)/page.tsx |
| `SiteNav` | (site)/layout.tsx |
| `SkillsChart` | /skills |
| `SourceMatrix` | /sources |
| `LifespanChart`, `ConfidentialIndex`, `SalaryBySector`, `SkillCooccurrence` | /insights |
| `DistrictSpecialization`, `HubCards` | /geography |
| `CompanyHistoryChart` | /companies/[name] |

`SalaryBySector` and `ConfidentialIndex` are plain server-rendered divs, not
Recharts.

`BrandLoader` reveals "Tracer" then sweeps the letters of "Intelligence".
`MIN_MS = 1400` guarantees the reveal completes rather than flashing for 200ms on
a fast fetch; it exits only when *both* the minimum has passed and `ready` is
true. Honours `prefers-reduced-motion`.

`SiteNav` uses the same pill language as the story nav — the difference is what
the fill means (progress there, current page here). Its back button uses
`window.history.length > 1 ? router.back() : router.push("/")` — never
`window.close()`, which is startling when unrequested.

### 8.6 Styling

Tailwind v4 via `@theme` in `globals.css`. Tokens: `brand #534AB7`,
`brand-strong #3F369A`, `brand-soft #EEEDF9`, `ink #17172A`, `muted #6C6C7E`,
`line #E7E6F1`, `canvas #F7F7FB`, `surface #FFFFFF`.

`lib/chartTheme.ts` holds source colours: bdjobs `#534AB7`, skilljobs `#0E9384`,
shomvob `#C2683C`. The teal replaced `#2F8F87`, which failed the palette chroma
floor and read as gray next to indigo/terracotta; `#0E9384` passes all six
palette checks (CVD ΔE 10.4, contrast ≥ 3:1).

Custom classes:

- `html { scrollbar-gutter: stable }` — stops sideways shift when a page gains a
  scrollbar, **and** makes `documentElement.clientWidth` a stable measurement.
- `body` font-family is set **in CSS, not as an inline style prop** in
  `layout.tsx`: React 19 serialises that prop as `font-family` on the server but
  compares it as `fontFamily` on the client, and the mismatch aborted hydration
  of everything below `<body>` — no effects ran, so the story never fetched.
- `.nums` — tabular monospace figures, the "verified ledger" treatment.
- `.nav-pill` — `--fill` gradient with a soft 18% blend either side of the edge,
  so it doesn't read as a hard progress bar.
- `.story-panel` — `width: 100%` below 768px, `var(--panel-w, 100vw)` above.
- `.no-scrollbar` — the phone pill row scrolls rather than wrapping, so the nav
  stays one line tall.
- `.live-dot` — pulse, disabled under `prefers-reduced-motion`.

---

## 9. Cross-cutting invariants

### 9.1 The canonical active predicate

```sql
duplicate_of IS NULL
AND is_confidential = FALSE
AND link_dead = FALSE
AND last_seen_at >= NOW() - INTERVAL '3 days'
```

*A job that is really open right now.* Used verbatim by `metrics`, `trending`,
`jobs/recent`, `jobs/search`, `application-window`, `opportunity`,
`source-matrix`, `top-roles`, and `geography` (as `const ACTIVE`).

**Deviations, all intentional:**

| Route | Deviation | Why |
|---|---|---|
| `lifespan` | `last_seen_at <` threshold | Wants the closed cohort |
| `categories`, `overview` | `posted_at` window, no active filter | Historical trend |
| `sector-momentum` | Derived window on `posted_at` | Measures change over time |
| `market-signals` (salary) | 60-day `posted_at`, no active filter | Pay is a 60-day picture |
| `market-signals` (confidential) | Omits `is_confidential` | It is counting them |
| `portability` | 120 days, no `link_dead`/`last_seen_at` | Structural property, not current state |
| `skills` (demand) | `duplicate_of` only | Skill demand spans history |
| `companies/[name]/jobs` | No `link_dead`/`last_seen_at` | Shows full company history |

`REAL_SECTOR` — `category IS NOT NULL AND category <> '' AND category <>
'Uncategorized'` — is defined locally in both `geography` and `market-signals`.

### 9.2 Date handling

Postgres `DATE` comes back from `node-postgres` as a JS `Date` at **local**
midnight. Two patterns in use:

- `r.x instanceof Date ? r.x.toISOString().slice(0, 10) : r.x` — in
  `companies/[name]/jobs`, `jobs/recent`, `jobs/search`, `overview`.
- `::date::text` **cast in SQL** — in `sector-momentum`, because that endpoint
  prints dates to the reader and the JS round-trip shifted them one day back in
  any timezone east of UTC.

The SQL cast is the safer pattern.

### 9.3 The recurring design principle

Figures ship **with their own caveat computed and attached**, rather than being
withheld or presented bare. Concretely:

- `opportunity` returns `median_pay: null` below 20 disclosed salaries, but still
  returns volume, employers and disclosure rate.
- `application-window` returns `coverage` — what share even has a deadline.
- `skills?withCoverage=1` returns per-source dictionary coverage.
- `lifespan` returns `reliable: {}` per source.
- `sector-momentum` returns `usable`, `missing_days`, and both `delta_all` and
  `delta_excluding_late`.
- `market-signals` returns `disclosed` alongside `total`.

Caveats are **computed rather than written down**, so they can't drift out of
date.

---

## 10. Every tunable constant

### Ingestion

| Constant | Value | File |
|---|---|---|
| `rpp` (page size) | 50 | `bdjobs.py` |
| `COVERAGE_FLOOR` | 0.90 | `bdjobs.py` |
| CI coverage floor | 90% of `total_records_found` | `scrape.yml` |
| List page size | 25 | `skilljobs.py` |
| `DOWNLOAD_DELAY` | 2s | `settings.py` |
| `CONCURRENT_REQUESTS_PER_DOMAIN` | 1 | `settings.py` |
| `RETRY_TIMES` | 5 | `settings.py` |
| `DOWNLOAD_TIMEOUT` | 30s | `settings.py` |
| `AUTOTHROTTLE` start / max | 5s / 60s | `settings.py` |
| API-response wait | 45s | `shomvob.py` |
| `goto` timeout | 60s | `shomvob.py` |
| `STRIKES_TO_DECLARE_DEAD` | 2 | `link_checker.py` |
| `RECHECK_DEAD_AFTER` | 7 days | `link_checker.py` |
| `RECHECK_LIVE_AFTER` | 20 hours | `link_checker.py` |
| `MAX_DEAD_RATIO` | 0.20 | `link_checker.py` |
| `MIN_CHECKS_BEFORE_GUARD` | 50 | `link_checker.py` |
| `REQUEST_DELAY` / `TIMEOUT` | 1.5s / 10s | `link_checker.py` |
| Commit interval | 25 rows | `link_checker.py` |
| Repost cluster gap | 14 days | `dedupe_same_source.sql` |

### API thresholds

| Constant | Value | Route |
|---|---|---|
| Active window | 3 days | everywhere |
| Category min postings | 20 | `opportunity` |
| Median min disclosed | 20 | `opportunity` |
| Max salary spread for "disclosed" | 100% of floor | `opportunity` |
| Window cap / min sample | 120 days / 15 | `application-window` |
| Salary min disclosed / limit | 15 / 12 | `market-signals` |
| Confidential min postings / limit | 30 / 12 | `market-signals` |
| `MIN_DISTINCT_CLOSE_DATES` | 5 | `lifespan` |
| Lifespan cap / curve length | 120 / 60 days | `lifespan` |
| `MIN_CLEAN_DAYS` | 4 | `sector-momentum` |
| `GAP_TOLERANCE_DAYS` | 1 | `sector-momentum` |
| `LATE_RECORD_DAYS` | 2 | `sector-momentum` |
| Sector min volume | 40 | `sector-momentum` |
| `one_directional` margin | ≤2 or ≥n−2 | `sector-momentum` |
| Portability window | 120 days | `portability` |
| Sector counts toward breadth | n ≥ 3 | `portability` |
| Role min postings | 20 | `portability` |
| `WIDEST_LIMIT` / locked limit | 6 / 6 | `portability` |
| Role limit | 8 | `top-roles` |
| Skills default / story / page limit | 25 / 10 / 50 | `skills` |
| Matrix axes | 18 | `skill-cooccurrence` |
| Category limit | 20 | `categories` |
| LQ threshold / min count | 1.3 / 3 | `geography` |
| Districts / sectors / hub sectors | 12 / 4 / 5 | `geography` |
| Search limit clamp | 1..100, default 20 | `jobs/search` |

### Front end

| Constant | Value | File |
|---|---|---|
| Horizontal breakpoint | 768px | `page.tsx`, `globals.css` |
| `NAV_OFFSET` | 56px | `page.tsx` |
| Track scrub | 1 | `page.tsx` |
| Snap duration / delay | 0.15–0.45s / 0.06s | `page.tsx` |
| Entrance scrub / stagger / y | 0.6 / 0.4 / 28px | `page.tsx` |
| Entrance range | left 85% → left 25% | `page.tsx` |
| Map viewBox | 420 × 520 | `BangladeshMap.tsx` |
| `ENTRANCE_DELAY` | 1.9s | `BangladeshMap.tsx` |
| Fill alpha floor / range | 0.15 / 0.85 (log) | `BangladeshMap.tsx` |
| `MIN_MS` | 1400ms | `BrandLoader.tsx` |

---

## 11. Known gaps and landmines

**Landmines — things that will bite:**

1. **`title_map` has no loader in this repo.** `/top-roles` and `/portability`
   both depend on it. On a clean database they degrade silently (LEFT JOIN, so no
   error) — Bangla titles simply never normalise.
2. **Do not re-add Skill.jobs or Shomvob to CI.** Documented at the top of
   `scrape.yml`. It will only turn the workflow red.
3. **`dedupe_same_source.sql` must be run periodically.** It last ran 2026-07-10
   and by 2026-08-01 had accumulated 104 unflagged duplicates.
4. **`skill_extractor.py --write` deletes and rebuilds** every bdjobs/shomvob row
   in `job_skills`. Idempotent, but destructive.
5. **`link_checker.py`'s two-strike rule and self-distrust guard are
   load-bearing.** Loosening either re-opens the 2026-08-04 failure mode.
6. **`bdjobs.py` pagination must stay fanned out.** Reverting to chaining
   reintroduces silent truncation that still exits 0.
7. **The `md:` breakpoint in the story is structural, not cosmetic.** Creating the
   pin below 768px crops panel content.
8. **Don't set `body` font-family as an inline style prop** in `layout.tsx` —
   React 19 hydration mismatch kills every effect below `<body>`.

**Gaps — things simply not done:**

- `bdjobs_categories` table is live but unused.
- `middlewares.py` is untouched Scrapy boilerplate, not enabled.
- `probe.py` is a scratch script.
- `dashboard/README.md` is create-next-app boilerplate.
- `Home.pdf` (519KB) and five `public/*.svg` starter files are tracked but
  unreferenced.
- `postgres` npm package is a dependency but unused (`pg` is what's imported).
- Skill extraction is not scheduled anywhere — only `run_local.py`.
- No tests, anywhere.
- The active predicate is copy-pasted rather than shared from one module.

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **Active** | `duplicate_of IS NULL AND NOT is_confidential AND NOT link_dead AND last_seen_at >= NOW() - 3 days` |
| **Canonical row** | A posting with `duplicate_of IS NULL` |
| **Confidential** | Employer used a placeholder name ("A Reputed Group") |
| **`dedupe_key`** | `<source>_<listingid>` — the upsert conflict target |
| **District** | One of Bangladesh's 64 official districts |
| **Hub** | Analytical industrial cluster, deliberately *not* aligned to district lines |
| **LQ (Location Quotient)** | (sector's share in a district) ÷ (its share nationally). >1 = over-indexed |
| **Portability** | How many distinct sectors advertise a given role |
| **Breadth** | Count of distinct sectors for a role, each with ≥3 postings |
| **Repair / late record** | A posting recorded >2 days after `posted_at` — recovered, not seen live |
| **One-directional** | Nearly all sectors moving the same way — a collection artifact, not a market signal |
| **DROP** | `canonical_skill` value marking a filler tag, excluded from analytics |
| **Reliable (lifespan)** | A source whose closed cohort spans ≥5 distinct close dates |
| **Clean days** | Crawl days after the last disqualifying gap, minus the catch-up day |
