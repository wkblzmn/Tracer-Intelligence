import scrapy
import json
from tracer_intelligence.items import JobPostingItem

API_URL = (
    "https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch"
    "?pg={page}&rpp=50&isPro=0&ToggleJobs=true&isFresher=false"
)

class BdjobsSpider(scrapy.Spider):
    name = "bdjobs"
    start_urls = [API_URL.format(page=1)]

    def parse(self, response):
        data = json.loads(response.text)
        jobs = data.get("data", [])

        if not jobs:
            self.logger.info("No more jobs, stopping.")
            return

        page = int(response.url.split("pg=")[1].split("&")[0])
        self.logger.info(f"Page {page}: found {len(jobs)} jobs")

        for job in jobs:
            item = JobPostingItem()
            item["source"]      = "bdjobs"
            item["source_url"]  = f"https://bdjobs.com/h/details/{job['Jobid']}"
            item["dedupe_key"]  = f"bdjobs_{job['Jobid']}"
            item["title"]       = job.get("jobTitle", "")
            item["company"]     = job.get("companyName", "")
            item["location"]    = job.get("location", "")
            item["category"]    = str(job.get("Cat_id", ""))
            item["description"] = job.get("jobDescription", "")

            salary = job.get("Salary", {})
            if isinstance(salary, dict):
                item["salary_raw"] = salary.get("SalaryRange") or ""
                item["salary_min"] = salary.get("MinSalary") or None
                item["salary_max"] = salary.get("MaxSalary") or None
            else:
                item["salary_raw"] = str(salary) if salary else ""
                item["salary_min"] = None
                item["salary_max"] = None

            raw_deadline = job.get("deadlineDB", "")
            item["deadline"] = raw_deadline[:10] if raw_deadline else None

            raw_posted = job.get("publishDate", "")
            item["posted_at"] = raw_posted[:10] if raw_posted else None

            yield item

        yield scrapy.Request(
            url=API_URL.format(page=page + 1),
            callback=self.parse
        )