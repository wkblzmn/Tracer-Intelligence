import scrapy
import json
from datetime import datetime
from tracer_intelligence.items import JobPostingItem

BASE_URL = "https://studio.skill.jobs/api/job_search/?limit=25&offset={offset}"


class SkilljobsSpider(scrapy.Spider):
    name = "skilljobs"
    start_urls = [BASE_URL.format(offset=0)]

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "AUTOTHROTTLE_ENABLED": True,
    }

    def parse(self, response):
        data = json.loads(response.text)
        jobs = data.get("results", [])
        total = data.get("count", 0)

        current_url = response.url
        offset = int(current_url.split("offset=")[1]) if "offset=" in current_url else 0

        self.logger.info(f"Offset {offset}: found {len(jobs)} jobs (total: {total})")

        for job in jobs:
            company = job.get("company_info", {}) or {}
            item = JobPostingItem()
            item["source"]      = "skilljobs"
            item["source_url"]  = f"https://skill.jobs/job/{job.get('slug', job['id'])}"
            item["dedupe_key"]  = f"skilljobs_{job['id']}"
            item["title"]       = job.get("title", "")
            item["company"]     = company.get("name", "") or job.get("company_name", "")
            item["location"]    = job.get("division", "")
            item["category"]    = job.get("type", "")

            min_sal = job.get("min_salary", 0)
            max_sal = job.get("max_salary", 0)
            item["salary_raw"]  = "" if job.get("isNegotiable") else f"{min_sal}-{max_sal}"
            item["salary_min"]  = int(min_sal) if min_sal else None
            item["salary_max"]  = int(max_sal) if max_sal else None

            item["description"] = f"{job.get('workplace', '')} | {job.get('level', '')}"

            def parse_skilljobs_date(raw):
                if not raw:
                    return None
                try:
                    return datetime.strptime(raw, '%b %d, %Y').strftime('%Y-%m-%d')
                except ValueError:
                    return None

            item['deadline']    = parse_skilljobs_date(job.get('end_date', ''))
            item['posted_at']   = parse_skilljobs_date(job.get('created_at', ''))

            yield item

        next_offset = offset + 25
        if next_offset < total:
            yield scrapy.Request(
                url=BASE_URL.format(offset=next_offset),
                callback=self.parse,
            )