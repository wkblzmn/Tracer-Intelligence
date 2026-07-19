"""
load_skill_map.py  —  Tracer Intelligence

Creates the skill_map table and (re)loads it from skill_map_seed.csv.
Idempotent: truncates + reloads, so you can edit the CSV and re-run any time.
Raw tags in job_skills are never touched. Analytics join THROUGH this map.

  python load_skill_map.py
"""
import os
import csv
import psycopg2
from dotenv import load_dotenv

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(HERE, "skill_map_seed.csv")


def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set in environment")

    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = [(r["raw_skill"], r["canonical_skill"]) for r in reader]

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS skill_map (
            raw_skill       TEXT NOT NULL,
            canonical_skill TEXT NOT NULL,   -- 'DROP' = filler/non-skill, excluded from analytics
            PRIMARY KEY (raw_skill, canonical_skill)
        )
    """)
    cur.execute("TRUNCATE skill_map")
    cur.executemany(
        "INSERT INTO skill_map (raw_skill, canonical_skill) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        rows,
    )
    conn.commit()
    print(f"Loaded {len(rows)} rows into skill_map.\n")

    # Unified canonical demand across ALL sources.
    # LEFT JOIN so Bdjobs skills (already canonical) and any not-yet-mapped tag
    # fall back to their own name; 'DROP' filler is excluded; DISTINCT posting.
    cur.execute("""
        SELECT COALESCE(sm.canonical_skill, js.skill) AS canonical, COUNT(DISTINCT jp.id) AS postings
        FROM job_skills js
        JOIN job_postings jp ON jp.id = js.posting_id
        LEFT JOIN skill_map sm ON js.skill = sm.raw_skill
        WHERE COALESCE(sm.canonical_skill, js.skill) <> 'DROP'
        GROUP BY COALESCE(sm.canonical_skill, js.skill)
        ORDER BY postings DESC
        LIMIT 20
    """)
    print("Top 20 canonical skills (all sources, distinct postings):")
    for skill, n in cur.fetchall():
        print(f"  {n:>5}  {skill}")

    # Tags that appear in job_skills but have no map row (future review queue).
    cur.execute("""
        SELECT js.skill, COUNT(*) FROM job_skills js
        JOIN job_postings jp ON jp.id = js.posting_id
        LEFT JOIN skill_map sm ON js.skill = sm.raw_skill
        WHERE jp.source = 'skilljobs' AND sm.raw_skill IS NULL
        GROUP BY js.skill ORDER BY COUNT(*) DESC
    """)
    unmapped = cur.fetchall()
    print(f"\nUnmapped Skill.jobs tags (add to CSV later): {len(unmapped)}")
    for s, n in unmapped[:15]:
        print(f"  {n:>3}  {s}")

    cur.close(); conn.close()


if __name__ == "__main__":
    main()
