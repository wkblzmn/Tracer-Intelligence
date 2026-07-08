from fastapi import FastAPI
from database import get_connection
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Tracer Intelligence API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tracer-intelligence.vercel.app",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "Tracer Intelligence API is running"}

@app.get("/jobs/recent")
def recent_jobs(limit: int = 20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT title, company, location, posted_at, source_url
        FROM job_postings
        ORDER BY posted_at DESC, scraped_at DESC
        LIMIT %s
    """, (limit,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    jobs = []
    for row in rows:
        jobs.append({
            "title":      row[0],
            "company":    row[1],
            "location":   row[2],
            "posted_at":  str(row[3]) if row[3] else None,
            "source_url": row[4],
        })
    return jobs

@app.get("/companies/trending")
def trending_companies(days: int = 30, limit: int = 10):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT company, COUNT(*) as job_count
        FROM job_postings
        WHERE posted_at >= CURRENT_DATE - INTERVAL '%s days'
        GROUP BY company
        ORDER BY job_count DESC
        LIMIT %s
    """, (days, limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [{"company": row[0], "job_count": row[1]} for row in rows]


@app.get("/jobs/search")
def search_jobs(keyword: str, limit: int = 20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT title, company, location, posted_at, source_url
        FROM job_postings
        WHERE title ILIKE %s
           OR description ILIKE %s
           OR company ILIKE %s
        ORDER BY posted_at DESC
        LIMIT %s
    """, (f"%{keyword}%", f"%{keyword}%", f"%{keyword}%", limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "title":      row[0],
            "company":    row[1],
            "location":   row[2],
            "posted_at":  str(row[3]) if row[3] else None,
            "source_url": row[4],
        }
        for row in rows
    ]

@app.get("/companies/{company_name}/jobs")
def company_jobs(company_name: str, limit: int = 50):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT title, company, location, posted_at, source_url
        FROM job_postings
        WHERE company ILIKE %s
        ORDER BY posted_at DESC
        LIMIT %s
    """, (f"%{company_name}%", limit))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "title":      row[0],
            "company":    row[1],
            "location":   row[2],
            "posted_at":  str(row[3]) if row[3] else None,
            "source_url": row[4],
        }
        for row in rows
    ]

@app.get("/stats/overview")
def stats_overview():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT posted_at, COUNT(*) as count
        FROM job_postings
        WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'
        GROUP BY posted_at
        ORDER BY posted_at ASC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [{"date": str(row[0]), "jobs": row[1]} for row in rows]

@app.get("/stats/metrics")
def stats_metrics():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) FROM job_postings
        WHERE deadline >= CURRENT_DATE OR deadline IS NULL
    """)
    active = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*) FROM job_postings
        WHERE posted_at >= CURRENT_DATE - INTERVAL '7 days'
    """)
    this_week = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*) FROM job_postings
        WHERE posted_at >= CURRENT_DATE - INTERVAL '14 days'
        AND posted_at < CURRENT_DATE - INTERVAL '7 days'
    """)
    last_week = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(DISTINCT company) FROM job_postings
        WHERE posted_at >= CURRENT_DATE - INTERVAL '60 days'
    """)
    companies_hiring = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(DISTINCT company) FROM job_postings
    """)
    total_companies = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    week_change = round(((this_week - last_week) / last_week * 100), 1) if last_week > 0 else 0

    return {
        "active_postings": active,
        "new_this_week": this_week,
        "last_week": last_week,
        "week_change": week_change,
        "companies_hiring": companies_hiring,
        "total_companies": total_companies
    }

