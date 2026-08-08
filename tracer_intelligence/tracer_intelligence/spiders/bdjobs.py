import scrapy
import json
from tracer_intelligence.items import JobPostingItem

CATEGORIES = {
    -11: "Other Special Skilled Jobs",
    -10: "Others",
    1: "Accounting/Finance",
    2: "Bank/Non-Bank Fin. Institution",
    3: "Supply Chain/Procurement",
    4: "Education/Training",
    5: "Engineer/Architect",
    6: "Garments/Textile",
    7: "General Management/Admin",
    8: "IT/Telecommunication",
    9: "Marketing/Sales",
    10: "Media/Advertisement/Event Mgt.",
    11: "Healthcare/Medical",
    12: "NGO/Development",
    13: "Research/Consultancy",
    14: "Receptionist/PS",
    15: "Data Entry/Operator/BPO",
    16: "Customer Service/Call Centre",
    17: "HR/Org. Development",
    18: "Design/Creative",
    19: "Production/Operation",
    20: "Hospitality/Travel/Tourism",
    21: "Beauty Care/Health & Fitness",
    22: "Law/Legal",
    23: "Electrician/Construction/Repair",
    24: "Security/Support Service",
    25: "Driving/Motor Technician",
    26: "Agro (Plant/Animal/Fisheries)",
    27: "Commercial",
    28: "Company Secretary/Regulatory affairs",
    29: "Pharmaceutical",
    61: "Data Entry/Computer Operator",
    62: "Mechanic/Technician",
    63: "Nurse",
    64: "Waiter/Waitress",
    65: "Pathologist/Lab Assistant",
    66: "Electrician/Electronics Technician",
    67: "Driver",
    68: "Chef/Cook",
    69: "Housekeeper",
    70: "Security Guard",
    71: "Graphic Designer",
    72: "Welder",
    73: "Plumber/Pipe fitting",
    74: "Sewing machine operator",
    75: "Mason/Construction worker",
    76: "CAD Operator",
    77: "Delivery Man",
    78: "Garments technician/Machine operator",
    79: "Peon",
    80: "Cleaner",
    81: "Gardener",
    82: "Carpenter",
    83: "Showroom Assistant/Salesman",
    84: "Sales Representative (SR)",
    85: "Imam/Khatib/Muezzin",
    86: "Gym/Fitness Trainer",
    87: "Interpreter",
    88: "Beautician/Salon worker",
    89: "Fire Safety/Firefighter",
    90: "Boiler Operator",
    91: "Caregiver/Nanny",
    92: "Physiotherapist",
}

import re

CONFIDENTIAL_PATTERN = re.compile(r'^(a reputed|a group of compan|posted by anonymous)', re.IGNORECASE)

API_URL = (
    "https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch"
    "?pg={page}&rpp=50&isPro=0&ToggleJobs=true&isFresher=false"
)

# Below this share of common.total_records_found, the run is treated as
# truncated rather than complete. See the coverage note in closed().
COVERAGE_FLOOR = 0.90


class BdjobsSpider(scrapy.Spider):
    """
    Pagination is FANNED OUT from page 1, not chained page-to-page.

    It used to chain: each page's callback yielded the request for the next.
    One failed request therefore ended the entire crawl, silently — the spider
    still exited 0 and CI still went green. Measured against the live board on
    2026-08-08, the depth each run actually reached was:

        2026-08-01  page 116  (complete)
        2026-08-03  page  88
        2026-08-05  page  80
        2026-08-07  page   7
        2026-08-08  page  71

    so ~2,270 of 5,767 live postings were never re-seen and aged out of the
    dashboard's 3-day active window while still sitting on the board. The
    varying stop point is what rules out a fixed rate limit: the same code
    completed all 116 pages from CI on 2026-08-01 and completes locally every
    time. These are one-off dropped requests breaking the chain.

    Fanned out, every page is an independent request, so a dropped one costs
    that page only. Politeness is unchanged — CONCURRENT_REQUESTS_PER_DOMAIN is
    still 1 and DOWNLOAD_DELAY still 2, so the wire behaviour is the same
    sequential trickle. The gain is failure isolation, not speed.
    """

    name = "bdjobs"
    start_urls = [API_URL.format(page=1)]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # One posting can arrive twice: premiumData repeats featured ads across
        # the first pages. Deduping here keeps item_scraped_count equal to the
        # number of distinct ads, which is what the CI coverage check compares.
        self.seen_keys = set()
        self.expected_records = None
        self.pages_seen = set()
        self.chain_mode = False

    def parse(self, response):
        data = json.loads(response.text)
        jobs = data.get("data") or []
        # premiumData holds featured ads. They are not reliably present in
        # `data` — of 48 distinct premium ads on 2026-08-08, 2 appeared nowhere
        # in `data` and were absent from the database entirely.
        premium = data.get("premiumData") or []

        page = int(response.url.split("pg=")[1].split("&")[0])
        self.pages_seen.add(page)
        self.logger.info(
            f"Page {page}: found {len(jobs)} jobs, {len(premium)} premium"
        )

        for job in jobs + premium:
            item = self._build_item(job)
            if item is not None:
                yield item

        if page == 1:
            yield from self._plan_remaining_pages(data)
        elif self.chain_mode and jobs:
            yield scrapy.Request(API_URL.format(page=page + 1), callback=self.parse)

    def _plan_remaining_pages(self, data):
        """Read the page count off page 1 and request every page up front."""
        common = data.get("common") or {}
        self.expected_records = common.get("total_records_found")
        total_pages = common.get("totalpages")

        try:
            total_pages = int(total_pages)
        except (TypeError, ValueError):
            total_pages = 0

        if total_pages < 1:
            # No page count in the response — fall back to the old chained walk
            # so a changed payload degrades instead of collecting one page.
            self.chain_mode = True
            self.logger.warning(
                "common.totalpages missing — falling back to chained pagination"
            )
            yield scrapy.Request(API_URL.format(page=2), callback=self.parse)
            return

        self.logger.info(
            f"Board reports {self.expected_records} records across "
            f"{total_pages} pages — requesting pages 2-{total_pages} up front"
        )
        for pg in range(2, total_pages + 1):
            yield scrapy.Request(API_URL.format(page=pg), callback=self.parse)

    def _build_item(self, job):
        job_id = job.get("Jobid")
        if not job_id:
            return None

        dedupe_key = f"bdjobs_{job_id}"
        if dedupe_key in self.seen_keys:
            return None
        self.seen_keys.add(dedupe_key)

        item = JobPostingItem()
        item["source"]      = "bdjobs"
        item["source_url"]  = f"https://bdjobs.com/h/details/{job_id}"
        item["dedupe_key"]  = dedupe_key
        # `or ""` not a .get default: the API sends explicit nulls, and a null
        # company would blow up the regex below (title/company are NOT NULL).
        item["title"]       = job.get("jobTitle") or ""
        item['company']     = job.get('companyName') or ''
        item['is_confidential'] = bool(CONFIDENTIAL_PATTERN.match(item['company']))
        item["location"]    = job.get("location") or ""

        cat_id = job.get("Cat_id", 0)
        try:
            cat_id = int(cat_id)
        except (TypeError, ValueError):
            cat_id = 0
        item["category"]    = CATEGORIES.get(cat_id, "Uncategorized")

        item["description"] = job.get("jobDescription") or ""

        salary = job.get("Salary", {})
        if isinstance(salary, dict):
            item["salary_raw"] = salary.get("SalaryRange") or ""
            item["salary_min"] = salary.get("MinSalary") or None
            item["salary_max"] = salary.get("MaxSalary") or None
        else:
            item["salary_raw"] = str(salary) if salary else ""
            item["salary_min"] = None
            item["salary_max"] = None

        if item["salary_min"] is None and item["salary_max"] is None and item["salary_raw"]:
            range_match = re.match(r'^Tk\.\s*([\d,]+)\s*-\s*([\d,]+)\s*\(Monthly\)$', item["salary_raw"])
            single_match = re.match(r'^Tk\.\s*([\d,]+)\s*\(Monthly\)$', item["salary_raw"])
            if range_match:
                item["salary_min"] = int(range_match.group(1).replace(",", ""))
                item["salary_max"] = int(range_match.group(2).replace(",", ""))
            elif single_match:
                val = int(single_match.group(1).replace(",", ""))
                item["salary_min"] = val
                item["salary_max"] = val

        raw_deadline = job.get("deadlineDB") or ""
        item["deadline"]    = raw_deadline[:10] if raw_deadline else None

        raw_posted = job.get("publishDate") or ""
        item["posted_at"]   = raw_posted[:10] if raw_posted else None

        return item

    def closed(self, reason):
        """
        Say plainly in the log whether the run covered the board. A truncated
        crawl is indistinguishable from a quiet day unless the count is checked
        against what the board itself reported.
        """
        collected = len(self.seen_keys)
        if not self.expected_records:
            self.logger.warning(
                f"Collected {collected} postings; board reported no record "
                f"count, so coverage is unverified"
            )
            return

        share = collected / self.expected_records
        message = (
            f"Collected {collected} distinct postings vs "
            f"{self.expected_records} reported by the board "
            f"({share:.1%}), across {len(self.pages_seen)} pages"
        )
        if share < COVERAGE_FLOOR:
            self.logger.error(f"TRUNCATED RUN — {message}")
        else:
            self.logger.info(message)