import os
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


def get_urls_to_check(cursor):
    cursor.execute("""
        SELECT id, source_url
        FROM job_postings
        WHERE source IN ('bdjobs', 'skilljobs', 'shomvob')
          AND duplicate_of IS NULL
          AND link_dead = FALSE
          AND last_seen_at >= NOW() - INTERVAL '3 days'
          AND (link_checked_at IS NULL OR link_checked_at < NOW() - INTERVAL '20 hours')
        ORDER BY last_seen_at DESC
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

    dead_count = 0
    checked_count = 0

    for job_id, url in rows:
        status = check_url(url)
        checked_count += 1

        if status == 404:
            cursor.execute(
                "UPDATE job_postings SET link_dead = TRUE, link_checked_at = NOW() WHERE id = %s",
                (job_id,)
            )
            dead_count += 1
            print(f"  DEAD (404): {url}")
        elif status is not None:
            cursor.execute(
                "UPDATE job_postings SET link_checked_at = NOW() WHERE id = %s",
                (job_id,)
            )
        # status is None means the request itself failed (timeout, connection error) —
        # deliberately NOT touching link_checked_at, so it's retried next run instead of
        # being wrongly marked dead due to a transient network hiccup

        if checked_count % 25 == 0:
            conn.commit()
            print(f"  ...{checked_count}/{len(rows)} checked, {dead_count} dead so far")

        time.sleep(REQUEST_DELAY)

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Done — {checked_count} checked, {dead_count} confirmed dead")


if __name__ == "__main__":
    main()