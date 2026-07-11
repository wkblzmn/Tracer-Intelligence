import os
import psycopg2
from dotenv import load_dotenv
from itemadapter import ItemAdapter

load_dotenv()

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
        self.cursor.execute('''
            INSERT INTO job_postings (
                source, source_url, dedupe_key, title, company,
                is_confidential, location, category, salary_raw,
                salary_min, salary_max, description, deadline, posted_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
            ON CONFLICT (dedupe_key) DO NOTHING
        ''', (
            adapter.get('source'),
            adapter.get('source_url'),
            adapter.get('dedupe_key'),
            adapter.get('title'),
            adapter.get('company'),
            adapter.get('is_confidential', False),
            adapter.get('location'),
            adapter.get('category'),
            adapter.get('salary_raw') or None,
            adapter.get('salary_min'),
            adapter.get('salary_max'),
            adapter.get('description'),
            adapter.get('deadline'),
            adapter.get('posted_at'),
        ))
        self.conn.commit()
        return item