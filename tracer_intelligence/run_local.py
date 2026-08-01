"""
run_local.py — everything the daily CI run cannot do.

Three steps, in order:
  1. Skill.jobs scrape   — blocked from datacenter IPs, needs a home connection
  2. Shomvob scrape      — same
  3. Skill extraction    — not in CI at all; skills decay without it

Skill.jobs and Shomvob both return 403 to GitHub's runners (confirmed
2026-07-31: a bare 403 on the first request from an Azure host, while the
identical code returns 200 from a residential connection). Skill extraction is
simply not wired into any schedule, so it has to live somewhere.

    python run_local.py

Exits non-zero if any step comes back empty or fails, matching the guard the
CI workflow applies to Bdjobs — a silent no-op is the failure mode this whole
arrangement exists to prevent.

Still NOT automated, and deliberately separate because it is far less
frequent (~weekly is enough):

    psql "$DATABASE_URL" -f ../sql/dedupe_same_source.sql
"""

import subprocess
import sys
import os
import json
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def run_skilljobs():
    """Scrapy writes a feed file so we can count what was actually scraped."""
    out = os.path.join(tempfile.gettempdir(), "skilljobs_local.jl")
    if os.path.exists(out):
        os.remove(out)

    print("\n=== Skill.jobs ===")
    proc = subprocess.run(
        [sys.executable, "-m", "scrapy", "crawl", "skilljobs", "-O", out],
        cwd=HERE,
    )

    count = 0
    if os.path.exists(out):
        with open(out, encoding="utf-8") as fh:
            count = sum(1 for line in fh if line.strip())

    if proc.returncode != 0:
        print(f"Skill.jobs: scrapy exited {proc.returncode}")
    print(f"Skill.jobs: {count} items")
    return count


def run_shomvob():
    """shomvob.py already exits non-zero on zero jobs, so trust its code."""
    print("\n=== Shomvob ===")
    proc = subprocess.run([sys.executable, "shomvob.py"], cwd=HERE)
    ok = proc.returncode == 0
    print(f"Shomvob: {'ok' if ok else 'FAILED'}")
    return ok


def run_skill_extraction():
    """
    Bdjobs and Shomvob skills come from dictionary matching over the advert
    text, not from the spiders — so every scrape adds postings with no skills
    until this runs. Left out of the daily routine it decays quietly: active
    Bdjobs coverage had fallen from 7.8% to 5.7% over four days, and one run
    restored it to 12.4%.

    NB this DELETEs and rebuilds every bdjobs/shomvob row in job_skills. That
    is by design and idempotent, but it is the one destructive step here.
    Skill.jobs rows are untouched — those are employer-tagged by the spider.
    """
    print("\n=== Skill extraction (bdjobs + shomvob) ===")
    proc = subprocess.run(
        [sys.executable, "skill_extractor.py", "--write"], cwd=HERE
    )
    ok = proc.returncode == 0
    print(f"Skill extraction: {'ok' if ok else 'FAILED'}")
    return ok


if __name__ == "__main__":
    skill_count = run_skilljobs()
    shomvob_ok = run_shomvob()
    # after both scrapes, so it picks up everything just inserted
    extraction_ok = run_skill_extraction()

    print("\n=== summary ===")
    print(f"  Skill.jobs       : {skill_count} items")
    print(f"  Shomvob          : {'ok' if shomvob_ok else 'FAILED'}")
    print(f"  Skill extraction : {'ok' if extraction_ok else 'FAILED'}")

    problems = []
    if skill_count == 0:
        problems.append("Skill.jobs returned nothing")
    if not shomvob_ok:
        problems.append("Shomvob failed")
    if not extraction_ok:
        problems.append("Skill extraction failed")

    if problems:
        print("\nProblems: " + "; ".join(problems))
        print(
            "If Skill.jobs returned nothing, check you are not on a VPN or "
            "hotspot — it 403s anything that looks like a datacenter."
        )
        sys.exit(1)

    print("\nBoth sources updated.")
