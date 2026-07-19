"""
skill_extractor.py  —  Tracer Intelligence  (v1, dictionary matching)

Runs over Bdjobs job descriptions, strips HTML, matches a curated skill
dictionary, and (optionally) writes results to a job_skills table.

DEFAULT = DRY RUN: prints coverage + top skills, writes NOTHING.
  python skill_extractor.py            -> dry run (validate first)
  python skill_extractor.py --write    -> create job_skills + insert

Runs on dictionary-extraction sources (bdjobs + shomvob). Skill.jobs is
real description text right now.
"""

import os
import re
import sys
import html
from collections import Counter

import psycopg2
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# SKILL DICTIONARY  —  canonical name : [aliases matched in text]
# Start focused; expand after the dry run shows real coverage + gaps.
# Everything is matched case-insensitively with token boundaries, so
# "java" will NOT match inside "javascript", and "c++" matches cleanly.
# ---------------------------------------------------------------------------
SKILLS = {
    # --- programming / tech ---
    "Python":            ["python"],
    "SQL":               ["sql"],
    "JavaScript":        ["javascript"],
    "TypeScript":        ["typescript"],
    "React":             ["react", "react.js", "reactjs"],
    "Node.js":           ["node.js", "nodejs", "node js"],
    "PHP":               ["php"],
    "Laravel":           ["laravel"],
    "Java":              ["java"],
    "C#":                ["c#", "c sharp"],
    "C++":               ["c++"],
    ".NET":              [".net", "dotnet", "asp.net"],
    "Django":            ["django"],
    "HTML":              ["html", "html5"],
    "CSS":               ["css", "css3"],
    "MongoDB":           ["mongodb", "mongo"],
    "MySQL":             ["mysql"],
    "PostgreSQL":        ["postgresql", "postgres"],
    "Git":               ["git", "github", "gitlab"],
    "Docker":            ["docker"],
    "AWS":               ["aws", "amazon web services"],
    "Linux":             ["linux"],
    "Machine Learning":  ["machine learning"],
    "Data Analysis":     ["data analysis", "data analytics"],
    "Power BI":          ["power bi", "powerbi"],
    "Tableau":           ["tableau"],
    "WordPress":         ["wordpress"],

    # --- business / office ---
    "MS Excel":          ["excel", "ms excel", "microsoft excel"],
    "MS Office":         ["ms office", "microsoft office"],
    "MS Word":           ["ms word", "microsoft word"],
    "PowerPoint":        ["powerpoint", "ms powerpoint"],
    "Accounting":        ["accounting", "accounts"],
    "Tally":             ["tally"],
    "QuickBooks":        ["quickbooks"],
    "SAP":               ["sap"],
    "Bookkeeping":       ["bookkeeping"],
    "Digital Marketing": ["digital marketing"],
    "SEO":               ["seo", "search engine optimization"],
    "Social Media Marketing": ["social media marketing", "smm"],
    "Content Writing":   ["content writing", "copywriting"],
    "Sales":             ["sales"],
    "Customer Service":  ["customer service", "customer support"],
    "Project Management": ["project management"],
    "Communication":     ["communication skills", "communication skill"],

    # --- design ---
    "Photoshop":         ["photoshop", "adobe photoshop"],
    "Illustrator":       ["illustrator", "adobe illustrator"],
    "Graphic Design":    ["graphic design"],
    "AutoCAD":           ["autocad", "auto cad"],
    "UI/UX":             ["ui/ux", "ui / ux", "ux design", "ui design"],

    # --- trade / technical (common in Bdjobs blue/grey collar) ---
    "Mechanical":        ["mechanical"],
    "Electrical":        ["electrical"],
    "Electronics":       ["electronics"],
    "Welding":           ["welding"],
    "Plumbing":          ["plumbing"],
    "HVAC":              ["hvac"],
    "Refrigeration":     ["refrigeration"],
    "CNC":               ["cnc"],
    "Driving":           ["driving", "driving license"],

    # --- languages ---
    "English":           ["fluent in english", "english proficiency", "english communication"],
}


def build_patterns(skills):
    """Compile one boundary-aware regex per alias -> canonical."""
    compiled = []
    for canonical, aliases in skills.items():
        for alias in aliases:
            # boundary = not glued to another alphanumeric (so "java" won't
            # match inside "javascript", but "MongoDB." still matches).
            pat = r"(?<![A-Za-z0-9])" + re.escape(alias) + r"(?![A-Za-z0-9])"
            compiled.append((canonical, re.compile(pat, re.IGNORECASE)))
    return compiled


PATTERNS = build_patterns(SKILLS)

TAG_RE = re.compile(r"<[^>]+>")


def strip_html(raw):
    if not raw:
        return ""
    text = re.sub(r"`{3,}[a-zA-Z]*", " ", raw)  # drop markdown code fences (```html)
    text = TAG_RE.sub(" ", text)     # drop tags
    text = html.unescape(text)       # &amp; -> &, etc.
    text = re.sub(r"\s+", " ", text)  # collapse whitespace
    return text.strip()


def extract_skills(text):
    """Return the set of canonical skills found in a plain-text description."""
    found = set()
    for canonical, pattern in PATTERNS:
        if pattern.search(text):
            found.add(canonical)
    return found


def main():
    write = "--write" in sys.argv

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set in environment")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, description
        FROM job_postings
        WHERE source IN ('bdjobs', 'shomvob') AND description IS NOT NULL AND description <> ''
    """)
    rows = cur.fetchall()
    total = len(rows)

    skill_counter = Counter()
    rows_with_skills = 0
    to_insert = []

    for posting_id, raw in rows:
        text = strip_html(raw)
        skills = extract_skills(text)
        if skills:
            rows_with_skills += 1
            skill_counter.update(skills)
            for s in skills:
                to_insert.append((posting_id, s))

    # ---- report (always printed) ----
    print(f"\nRows with a description (bdjobs+shomvob): {total}")
    if total:
        pct = 100 * rows_with_skills / total
        print(f"Rows with >=1 skill matched   : {rows_with_skills} ({pct:.1f}%)")
    print(f"Total skill mentions           : {sum(skill_counter.values())}")
    print(f"Distinct skills seen           : {len(skill_counter)}\n")
    print("Top 30 skills:")
    for skill, n in skill_counter.most_common(30):
        print(f"  {n:>5}  {skill}")

    if not write:
        print("\n(DRY RUN — nothing written. Re-run with --write to populate job_skills.)")
        cur.close(); conn.close()
        return

    # ---- write path ----
    cur.execute("""
        CREATE TABLE IF NOT EXISTS job_skills (
            posting_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
            skill      TEXT    NOT NULL,
            UNIQUE (posting_id, skill)
        )
    """)
    cur.execute("DELETE FROM job_skills WHERE posting_id IN (SELECT id FROM job_postings WHERE source IN ('bdjobs', 'shomvob'))")
    cur.executemany(
        "INSERT INTO job_skills (posting_id, skill) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        to_insert,
    )
    conn.commit()
    print(f"\nWrote {len(to_insert)} skill rows to job_skills.")
    cur.close(); conn.close()


if __name__ == "__main__":
    main()