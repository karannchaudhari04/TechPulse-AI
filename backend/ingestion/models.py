from django.db import models
from django.utils import timezone


class RawIngestion(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    run_id = models.CharField(max_length=36)
    source_name = models.CharField(max_length=150)
    source_type = models.CharField(max_length=50)
    title = models.TextField()
    raw_content = models.TextField()
    url = models.CharField(max_length=512)
    canonical_url = models.CharField(max_length=512, null=True, blank=True)
    url_hash = models.CharField(max_length=64, unique=True, null=True, blank=True)
    title_hash = models.CharField(max_length=64, null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    image_url = models.CharField(max_length=512, null=True, blank=True)
    fetched_at = models.DateTimeField(default=timezone.now, null=True, blank=True)
    processing_status = models.CharField(max_length=50, default="NEW")
    event_id = models.CharField(max_length=36, null=True, blank=True)
    credibility_score = models.FloatField(default=0.0, null=True, blank=True)
    credibility_level = models.CharField(max_length=50, null=True, blank=True)
    credibility_confidence = models.FloatField(default=0.0, null=True, blank=True)
    score_baseline = models.FloatField(default=0.0, null=True, blank=True)
    score_official_bonus = models.FloatField(default=0.0, null=True, blank=True)
    score_agreement_bonus = models.FloatField(default=0.0, null=True, blank=True)
    score_clickbait_penalty = models.FloatField(default=0.0, null=True, blank=True)
    is_official = models.BooleanField(default=False, null=True, blank=True)
    importance_score = models.FloatField(default=0.0, null=True, blank=True)
    importance_level = models.CharField(max_length=50, null=True, blank=True)
    importance_confidence = models.FloatField(default=0.0, null=True, blank=True)
    importance_breakdown_json = models.TextField(null=True, blank=True)
    importance_reasons_json = models.TextField(null=True, blank=True)
    event_first_seen = models.DateTimeField(null=True, blank=True)
    event_last_updated = models.DateTimeField(null=True, blank=True)
    event_source_count = models.IntegerField(default=1, null=True, blank=True)
    retry_count = models.IntegerField(default=0, null=True, blank=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "raw_ingestion"
        indexes = [
            models.Index(fields=["run_id"], name="idx_raw_run_id"),
            models.Index(fields=["processing_status"], name="idx_raw_status"),
            models.Index(fields=["event_id"], name="idx_raw_event_id"),
            models.Index(fields=["canonical_url"], name="idx_raw_canonical_url"),
            models.Index(fields=["published_at"], name="idx_raw_published_at"),
            models.Index(fields=["fetched_at"], name="idx_raw_fetched_at"),
        ]


class NewsSource(models.Model):
    id = models.BigAutoField(primary_key=True)
    url = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = "news_sources"
