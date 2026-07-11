import scrapy

class JobPostingItem(scrapy.Item):
    source      = scrapy.Field()
    source_url  = scrapy.Field()
    dedupe_key  = scrapy.Field()
    title       = scrapy.Field()
    company     = scrapy.Field()
    is_confidential = scrapy.Field()
    location    = scrapy.Field()
    category    = scrapy.Field()
    salary_raw  = scrapy.Field()
    salary_min  = scrapy.Field()
    salary_max  = scrapy.Field()
    description = scrapy.Field()
    deadline    = scrapy.Field()
    posted_at   = scrapy.Field()