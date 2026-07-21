import os
import psycopg2
from dotenv import load_dotenv
from itemadapter import ItemAdapter

from tracer_intelligence.location_map import (
    map_district, hub_for, NATIONAL, OVERSEAS, UNKNOWN,
)

load_dotenv()


def _clean_district(loc):
    d = map_district(loc)
    return None if d in (None, NATIONAL, OVERSEAS, UNKNOWN) else d


class PostgresPipeline:

    def open_spider(self, spider):
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL not set in environment")
        self.conn = psycopg2.connect(db_url)
        self.cursor = self.conn.cursor()
        spider.logger.info("Database connection opened")

    def close_spider(self, spider):
        self.conn.commit()
        self.cursor.close()
        self.conn.close()
        spider.logger.info("Database connection closed")

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        loc = adapter.get('location')
        district = _clean_district(loc)
        hub = hub_for(loc)

        try:
            self._upsert(adapter, loc, district, hub)
        except psycopg2.Error as e:
            # Roll back so the aborted transaction can't poison every
            # subsequent item in this run; skip just this row.
            self.conn.rollback()
            spider.logger.error(
                f"DB error for {adapter.get('dedupe_key')}: {e} — row skipped"
            )
        return item

    def _upsert(self, adapter, loc, district, hub):
        self.cursor.execute('''
            INSERT INTO job_postings (
                source, source_url, dedupe_key, title, company,
                is_confidential, location, category, salary_raw,
                salary_min, salary_max, description, deadline, posted_at,
                district, hub, last_seen_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, NOW()
            )
            ON CONFLICT (dedupe_key) DO UPDATE SET
                last_seen_at = NOW(),
                description = COALESCE(NULLIF(EXCLUDED.description, ''), job_postings.description),
                category = COALESCE(NULLIF(EXCLUDED.category, ''), job_postings.category),
                district = COALESCE(EXCLUDED.district, job_postings.district),
                hub = COALESCE(EXCLUDED.hub, job_postings.hub)
            RETURNING id
        ''', (
            adapter.get('source'),
            adapter.get('source_url'),
            adapter.get('dedupe_key'),
            adapter.get('title'),
            adapter.get('company'),
            adapter.get('is_confidential', False),
            loc,
            adapter.get('category'),
            adapter.get('salary_raw') or None,
            adapter.get('salary_min'),
            adapter.get('salary_max'),
            adapter.get('description'),
            adapter.get('deadline'),
            adapter.get('posted_at'),
            district,
            hub,
        ))
        posting_id = self.cursor.fetchone()[0]

        skills = adapter.get('skills')
        if skills:
            self.cursor.executemany(
                "INSERT INTO job_skills (posting_id, skill) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                [(posting_id, s) for s in skills],
            )

        self.conn.commit()