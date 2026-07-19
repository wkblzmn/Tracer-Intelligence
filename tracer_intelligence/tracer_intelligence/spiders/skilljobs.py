import os
import scrapy
import json
from datetime import datetime

import psycopg2
from dotenv import load_dotenv

from tracer_intelligence.items import JobPostingItem

load_dotenv()

LIST_URL   = "https://studio.skill.jobs/api/job_search/?limit=25&offset={offset}"
DETAIL_URL = "https://studio.skill.jobs/api/job_search/{slug}/"


def parse_skilljobs_date(raw):
    if not raw:
        return None
    try:
        return datetime.strptime(raw, '%b %d, %Y').strftime('%Y-%m-%d')
    except ValueError:
        return None


class SkilljobsSpider(scrapy.Spider):
    name = "skilljobs"
    start_urls = [LIST_URL.format(offset=0)]

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "AUTOTHROTTLE_ENABLED": True,
    }

    enriched_keys = None  # loaded lazily on first parse()

    def _load_enriched_keys(self):
        # dedupe_keys of skilljobs postings that ALREADY have skills captured,
        # so we only spend a detail request on jobs we haven't enriched yet.
        # Self-backfilling: old rows without skills get fetched once, new rows
        # get fetched once, everything after is skipped.
        keys = set()
        db_url = os.environ.get("DATABASE_URL")
        if db_url:
            try:
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                cur.execute("""
                    SELECT jp.dedupe_key
                    FROM job_postings jp
                    WHERE jp.source = 'skilljobs'
                      AND EXISTS (SELECT 1 FROM job_skills js WHERE js.posting_id = jp.id)
                """)
                keys = {r[0] for r in cur.fetchall()}
                cur.close(); conn.close()
                self.logger.info(f"Loaded {len(keys)} already-enriched skilljobs keys")
            except Exception as e:
                self.logger.error(f"Could not load enriched keys (will detail-fetch all): {e}")
        return keys

    def parse(self, response):
        if self.enriched_keys is None:
            self.enriched_keys = self._load_enriched_keys()

        data = json.loads(response.text)
        jobs = data.get("results", [])
        total = data.get("count", 0)

        offset = int(response.url.split("offset=")[1]) if "offset=" in response.url else 0
        self.logger.info(f"Offset {offset}: found {len(jobs)} jobs (total: {total})")

        for job in jobs:
            company = job.get("company_info", {}) or {}
            item = JobPostingItem()
            item["source"]      = "skilljobs"
            item["source_url"]  = f"https://skill.jobs/jobs/{job.get('slug', job['id'])}"
            item["dedupe_key"]  = f"skilljobs_{job['id']}"
            item["title"]       = job.get("title", "")
            item["company"]     = company.get("name", "") or job.get("company_name", "")
            item["location"]    = job.get("location", "")
            item["category"]    = job.get("type", "")

            min_sal = job.get("min_salary", 0)
            max_sal = job.get("max_salary", 0)
            item["salary_raw"]  = "" if job.get("isNegotiable") or (not min_sal and not max_sal) else f"{min_sal}-{max_sal}"
            item["salary_min"]  = int(min_sal) if min_sal else None
            item["salary_max"]  = int(max_sal) if max_sal else None

            item["deadline"]    = parse_skilljobs_date(job.get("end_date", ""))
            item["posted_at"]   = parse_skilljobs_date(job.get("created_at", ""))

            if item["dedupe_key"] in self.enriched_keys:
                # Already enriched — skip the detail request. Empty description
                # tells the pipeline to keep the rich text already stored.
                item["description"] = ""
                yield item
            else:
                slug = job.get("slug")
                if not slug:
                    item["description"] = ""
                    yield item
                    continue
                yield scrapy.Request(
                    url=DETAIL_URL.format(slug=slug),
                    callback=self.parse_detail,
                    meta={"item": item, "job": job},
                )

        next_offset = offset + 25
        if next_offset < total:
            yield scrapy.Request(LIST_URL.format(offset=next_offset), callback=self.parse)

    def parse_detail(self, response):
        item = response.meta["item"]
        job = response.meta["job"]
        d = json.loads(response.text)

        # Combined description: listing metadata + the three real text blocks.
        meta_bit = f"{job.get('workplace', '')} | {job.get('level', '')}".strip(" |")
        parts = [
            meta_bit,
            d.get("position_summary") or "",
            d.get("job_responsibility") or "",
            d.get("qualification") or "",
        ]
        item["description"] = "\n".join(p for p in parts if p and p.strip())

        # Employer-tagged skills, straight from the source. Strip + dedupe.
        raw_skills = d.get("skills_list") or []
        seen = set()
        skills = []
        for s in raw_skills:
            s = (s or "").strip()
            if s and s.lower() not in seen:
                seen.add(s.lower())
                skills.append(s)
        item["skills"] = skills

        yield item