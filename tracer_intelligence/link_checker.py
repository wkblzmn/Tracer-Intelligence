"""
link_checker.py — visit every live posting's URL and record which have really
gone. Feeds the `link_dead` flag that every dashboard figure filters on.

WHY THIS FILE IS SHAPED THE WAY IT IS
-------------------------------------
On 2026-08-04 a single run of the old version flagged 4,043 postings dead in
one pass. A 150-row random sample of that batch, re-checked on 2026-08-09
through this same code path, returned HTTP 200 for all 150 — full-size pages,
no soft-404s, 130 of them with deadlines still in the future. The flags were
simply wrong, and because the old selection query required `link_dead = FALSE`
they could never be revisited. Three quarters of the board vanished from the
site permanently: active postings read 1,495 when ~6,000 were live.

Three changes stop that recurring, and none of them relies on knowing what
bdjobs served that day:

  1. Dead is no longer permanent. Rows already flagged dead are re-checked on a
     slower cadence (RECHECK_DEAD_AFTER) for as long as the scraper still sees
     them on the board, and a 200 revives them. A wrong flag now costs days,
     not forever.

  2. One 404 is not proof. It takes STRIKES_TO_DECLARE_DEAD consecutive 404s,
     tracked in job_postings.link_404_streak, before a row is flagged. A single
     bad response — theirs or ours — no longer decides anything.

  3. A run that finds implausibly many dead links assumes the fault is at this
     end and undoes itself. Past MIN_CHECKS_BEFORE_GUARD checks, if more than
     MAX_DEAD_RATIO of them 404, every flag this run set is rolled back and the
     process exits non-zero. The Aug-4 event would have tripped this after 50
     checks instead of running to 4,043.
"""

import os
import sys
import time
import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

REQUEST_DELAY = 1.5  # seconds between requests — politeness, matches project's anti-ban discipline
TIMEOUT = 10

STRIKES_TO_DECLARE_DEAD = 2      # consecutive 404s before a row is believed dead
RECHECK_DEAD_AFTER = "7 days"    # how often to give a dead-flagged row another chance
RECHECK_LIVE_AFTER = "20 hours"  # normal cadence for healthy rows
MAX_DEAD_RATIO = 0.20            # above this, the run distrusts itself
MIN_CHECKS_BEFORE_GUARD = 50     # ...but only once there is enough to judge on


def get_urls_to_check(cursor):
    """
    Everything the scraper still sees on the board, due for a look. Dead rows
    are included on a slower cadence so a wrong flag can be undone; rows the
    board has dropped are left alone entirely — once it is gone we keep the
    record and stop asking.

    Ordered by staleness so a run cut short still makes progress on the oldest.
    """
    cursor.execute(f"""
        SELECT id, source_url, link_dead, COALESCE(link_404_streak, 0)
        FROM job_postings
        WHERE source IN ('bdjobs', 'skilljobs', 'shomvob')
          AND duplicate_of IS NULL
          AND last_seen_at >= NOW() - INTERVAL '3 days'
          AND (
                (link_dead = FALSE AND (link_checked_at IS NULL
                     OR link_checked_at < NOW() - INTERVAL '{RECHECK_LIVE_AFTER}'))
             OR (link_dead = TRUE  AND (link_checked_at IS NULL
                     OR link_checked_at < NOW() - INTERVAL '{RECHECK_DEAD_AFTER}'))
          )
        ORDER BY link_checked_at ASC NULLS FIRST
    """)
    return cursor.fetchall()


def check_url(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        return response.status_code
    except requests.RequestException as e:
        print(f"  Request failed (will retry next run): {e}")
        return None


def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set")

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    rows = get_urls_to_check(cursor)
    print(f"Checking {len(rows)} URLs...")

    checked_count = 0
    got_404 = 0
    newly_dead = []    # ids this run flagged dead
    struck = []        # ids this run recorded ANY 404 against
    revived = 0

    for job_id, url, was_dead, streak in rows:
        status = check_url(url)
        # A failed request (timeout, connection error) deliberately does not
        # touch link_checked_at or the streak, so it is retried next run rather
        # than counting as evidence either way.
        if status is None:
            time.sleep(REQUEST_DELAY)
            continue

        checked_count += 1

        if status == 404:
            got_404 += 1
            streak += 1
            struck.append(job_id)
            declare_dead = streak >= STRIKES_TO_DECLARE_DEAD
            cursor.execute(
                """UPDATE job_postings
                   SET link_404_streak = %s, link_dead = %s, link_checked_at = NOW()
                   WHERE id = %s""",
                (streak, declare_dead, job_id),
            )
            if declare_dead and not was_dead:
                newly_dead.append(job_id)
                print(f"  DEAD ({streak} consecutive 404s): {url}")
            elif not declare_dead:
                print(f"  404 strike {streak}/{STRIKES_TO_DECLARE_DEAD}, not yet dead: {url}")
        else:
            # Any answer that is not a 404 means the posting is reachable.
            if was_dead:
                revived += 1
                print(f"  REVIVED ({status}): {url}")
            cursor.execute(
                """UPDATE job_postings
                   SET link_404_streak = 0, link_dead = FALSE, link_checked_at = NOW()
                   WHERE id = %s""",
                (job_id,),
            )

        if checked_count % 25 == 0:
            conn.commit()
            print(f"  ...{checked_count}/{len(rows)} checked, {got_404} 404s so far")

        # The whole point of the guard: a 404 rate this high means the fault is
        # at this end — a block, a redirect wall, a changed URL scheme — not
        # thousands of jobs vanishing at once.
        ratio = got_404 / checked_count
        if checked_count >= MIN_CHECKS_BEFORE_GUARD and ratio > MAX_DEAD_RATIO:
            conn.commit()
            print(
                f"\n{ratio:.0%} of {checked_count} checks returned 404 "
                f"(limit {MAX_DEAD_RATIO:.0%}). Treating this as a fault at our "
                f"end, not {got_404} dead postings."
            )
            # Every row this run recorded a 404 against is reset, not just the
            # ones that reached two strikes. A row left sitting on strike 1 by
            # a run we have just decided to disbelieve is a land mine: the next
            # single 404, however transient, would be its second strike.
            if struck:
                cursor.execute(
                    """UPDATE job_postings
                       SET link_dead = FALSE, link_404_streak = 0, link_checked_at = NULL
                       WHERE id = ANY(%s)""",
                    (struck,),
                )
                conn.commit()
                print(
                    f"Rolled back {len(struck)} rows touched by this run "
                    f"({len(newly_dead)} of them had been flagged dead)."
                )
            cursor.close()
            conn.close()
            sys.exit(1)

        time.sleep(REQUEST_DELAY)

    conn.commit()
    cursor.close()
    conn.close()
    print(
        f"Done — {checked_count} checked, {len(newly_dead)} newly dead, "
        f"{revived} revived, {got_404} 404s total"
    )


if __name__ == "__main__":
    main()
