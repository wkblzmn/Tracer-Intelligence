import json
import os
import psycopg2
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

load_dotenv()

TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IlNob212b2JUZWNoQVBJVXNlciIsImlhdCI6MTY1OTg5NTcwOH0.IOdKen62ye0N9WljM_cj3Xffmjs3dXUqoJRZ_1ezd4Q"
API_URL = "https://backend-api.shomvob.co/api/v2/jobpost/get-active-job-list-guest"

CATEGORY_MAP = {
    "Sales/Marketing": "Marketing/Sales",
    "Call Center": "Customer Service/Call Centre",
    "Deliveryman": "Delivery Man",
    "Garments - Production/Operator/Technician": "Garments technician/Machine operator",
    "Education/Training/Consultant": "Education/Training",
    "Management Staff": "General Management/Admin",
    "Engineer": "Engineer/Architect",
    "Accounts/Finance/Audit": "Accounting/Finance",
    "Accounts & Finance": "Accounting/Finance",
    "Computer Operator/Data Entry Operator": "Data Entry/Operator/BPO",
    "Graphics/Video Editor": "Design/Creative",
    "Graphics": "Design/Creative",
    "Construction": "Electrician/Construction/Repair",
    "Transportation": "Driving/Motor Technician",
    "Human Resource Management (HR)": "HR/Org. Development",
    "Hospitality/ Travel/ Tourism": "Hospitality/Travel/Tourism",
    "Healthcare/Medical/Hospital": "Healthcare/Medical",
}


def fetch_jobs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # visible so we can see what happens
        context = browser.new_context()
        page = context.new_page()

        # Intercept the API response directly
        jobs_data = []

        def handle_response(response):
            if "get-active-job-list-guest" in response.url:
                try:
                    data = response.json()
                    jobs = data.get("data", [])
                    jobs_data.extend(jobs)
                    print(f"Intercepted {len(jobs)} jobs from API")
                except Exception as e:
                    print(f"Could not parse response: {e}")

        page.on("response", handle_response)

        # Navigate to jobs page — the browser will make the API call itself
        print("Loading Shomvob jobs page...")
        page.goto("https://app.shomvob.co/all-jobs/", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(5000)  # extra wait

        browser.close()
        return jobs_data


def save_jobs(jobs):
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set")

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    inserted = 0
    skipped = 0

    for job in jobs:
        salary_start = job.get("salary_start")
        salary_end = job.get("salary_end")
        deadline = job.get("application_deadline", "")
        posted = job.get("job_live_at", "")

        cursor.execute("""
            INSERT INTO job_postings (
                source, source_url, dedupe_key, title, company,
                location, category, salary_raw, salary_min, salary_max,
                description, deadline, posted_at, last_seen_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, NOW()
            )
            ON CONFLICT (dedupe_key) DO UPDATE SET last_seen_at = NOW()
        """, (
            "shomvob",
            f"https://app.shomvob.co/job-details/{job['id']}",
            f"shomvob_{job['id']}",
            job.get("job_title", "") or job.get("job_type_en", ""),
            job.get("company_name", ""),
            job.get("job_locations_en", ""),
            CATEGORY_MAP.get(job.get("main_category", ""), job.get("main_category", "")),
            job.get("salary_range", "") or "",
            int(salary_start) if salary_start else None,
            int(salary_end) if salary_end else None,
            (
                f"{job.get('employment_status_en', '')} | "
                f"{job.get('work_exp_en', '')} | "
                f"{job.get('education_en', '')}"
            ),
            deadline[:10] if deadline else None,
            posted[:10] if posted else None,
        ))
        if cursor.rowcount > 0:
            inserted += 1
        else:
            skipped += 1

    conn.commit()
    cursor.close()
    conn.close()
    return inserted, skipped


if __name__ == "__main__":
    print("Fetching Shomvob jobs...")
    jobs = fetch_jobs()
    print(f"Found {len(jobs)} jobs total")
    if jobs:
        inserted, skipped = save_jobs(jobs)
        print(f"Done — {inserted} inserted, {skipped} skipped (duplicates)")
    else:
        print("No jobs found — check if the page loaded correctly")