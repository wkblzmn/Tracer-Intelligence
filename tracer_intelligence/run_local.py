"""
run_local.py — the two scrapers that cannot run in CI.

Skill.jobs and Shomvob both block datacenter IPs, so GitHub Actions gets a
403 and nothing else. They have to be run from a residential connection.
This is here so that is one command instead of two remembered ones, and so a
silent zero-item run is reported rather than shrugged off.

    python run_local.py

Exits non-zero if either source came back empty, matching the guard the CI
workflow applies to Bdjobs.
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


if __name__ == "__main__":
    skill_count = run_skilljobs()
    shomvob_ok = run_shomvob()

    print("\n=== summary ===")
    print(f"  Skill.jobs : {skill_count} items")
    print(f"  Shomvob    : {'ok' if shomvob_ok else 'FAILED'}")

    problems = []
    if skill_count == 0:
        problems.append("Skill.jobs returned nothing")
    if not shomvob_ok:
        problems.append("Shomvob failed")

    if problems:
        print("\nProblems: " + "; ".join(problems))
        print(
            "If Skill.jobs returned nothing, check you are not on a VPN or "
            "hotspot — it 403s anything that looks like a datacenter."
        )
        sys.exit(1)

    print("\nBoth sources updated.")
