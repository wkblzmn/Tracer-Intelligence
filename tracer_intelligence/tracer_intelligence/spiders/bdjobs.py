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
            item['company']     = job.get('companyName', '')
            item['is_confidential'] = bool(CONFIDENTIAL_PATTERN.match(item['company']))
            item["location"]    = job.get("location", "")

            cat_id = job.get("Cat_id", 0)
            try:
                cat_id = int(cat_id)
            except (TypeError, ValueError):
                cat_id = 0
            item["category"]    = CATEGORIES.get(cat_id, "Uncategorized")

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

            raw_deadline = job.get("deadlineDB", "")
            item["deadline"]    = raw_deadline[:10] if raw_deadline else None

            raw_posted = job.get("publishDate", "")
            item["posted_at"]   = raw_posted[:10] if raw_posted else None

            yield item

        yield scrapy.Request(
            url=API_URL.format(page=page + 1),
            callback=self.parse,
        )