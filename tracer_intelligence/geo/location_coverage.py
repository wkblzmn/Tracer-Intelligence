"""
location_coverage.py — validate the location->district map against the LIVE data
before we build any map on top of it.

Prints: % of postings that map to a real district, national/overseas/unknown
shares, and the top unmapped location strings (what to add to the map next).

  python location_coverage.py
"""
import os
import sys
import psycopg2
from collections import Counter
from dotenv import load_dotenv

# Validate against the SAME map the live pipeline uses (the copy inside the
# scrapy package) — a stale local copy here would make this report lie.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from tracer_intelligence.location_map import map_district, hub_for, NATIONAL, OVERSEAS, UNKNOWN

load_dotenv()

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("""
    SELECT location, COUNT(*) n
    FROM job_postings
    WHERE duplicate_of IS NULL AND location IS NOT NULL AND location <> ''
    GROUP BY location
""")
rows = cur.fetchall()
cur.close(); conn.close()

total = sum(n for _, n in rows)
buckets = Counter()
unmapped = Counter()
district_postings = 0
hub_postings = 0

for loc, n in rows:
    d = map_district(loc)
    if d is None:
        buckets["unmapped"] += n
        unmapped[loc] += n
    elif d in (NATIONAL, OVERSEAS, UNKNOWN):
        buckets[d] += n
    else:
        buckets["district"] += n
        district_postings += n
    if hub_for(loc):
        hub_postings += n

pct = lambda x: f"{100*x/total:.1f}%"
print(f"total located postings : {total}")
print(f"mapped to a district   : {buckets['district']:>6}  ({pct(buckets['district'])})")
print(f"national scope         : {buckets[NATIONAL]:>6}  ({pct(buckets[NATIONAL])})")
print(f"overseas               : {buckets[OVERSEAS]:>6}  ({pct(buckets[OVERSEAS])})")
print(f"unknown/junk           : {buckets[UNKNOWN]:>6}  ({pct(buckets[UNKNOWN])})")
print(f"UNMAPPED (need review) : {buckets['unmapped']:>6}  ({pct(buckets['unmapped'])})")
print(f"fall in an industrial hub : {hub_postings} ({pct(hub_postings)})")
print(f"\nTop 30 unmapped locations (add these to the map):")
for loc, n in unmapped.most_common(30):
    print(f"  {n:>4}  {loc}")