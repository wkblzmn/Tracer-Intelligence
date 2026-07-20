import requests, psycopg2, os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("""
    SELECT source_url FROM job_postings
    WHERE source='skilljobs' AND category='Full Time'
    LIMIT 3
""")
for (url,) in cur.fetchall():
    slug = url.rstrip('/').split('/')[-1]
    r = requests.get(f"https://studio.skill.jobs/api/job_search/{slug}/", timeout=10)
    il = r.json().get("industry_list") if r.status_code == 200 else None
    print(r.status_code, "| industry:", il, "|", slug[:40])
cur.close()
conn.close()