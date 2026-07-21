"""
backfill_geo.py — populate district + hub for every posting from `location`,
using location_map.py as the single source of truth. Idempotent: safe to re-run
after any map improvement to resync every row.

  python backfill_geo.py
"""
import os
import psycopg2
from dotenv import load_dotenv

from tracer_intelligence.location_map import (
    map_district, hub_for, NATIONAL, OVERSEAS, UNKNOWN,
)

load_dotenv()

def clean_district(loc):
    d = map_district(loc)
    if d in (None, NATIONAL, OVERSEAS, UNKNOWN):
        return None   # only real districts are stored; rest -> NULL
    return d

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("SELECT id, location FROM job_postings WHERE location IS NOT NULL AND location <> ''")
rows = cur.fetchall()

updates = [(clean_district(loc), hub_for(loc), pid) for pid, loc in rows]
cur.executemany("UPDATE job_postings SET district = %s, hub = %s WHERE id = %s", updates)
conn.commit()

# report
cur.execute("SELECT COUNT(*) FROM job_postings WHERE district IS NOT NULL")
d = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM job_postings WHERE hub IS NOT NULL")
h = cur.fetchone()[0]
print(f"updated {len(updates)} rows | district set: {d} | hub set: {h}")
cur.close(); conn.close()