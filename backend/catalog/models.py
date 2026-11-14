from django.db import models
from django.utils import timezone


class TechnologyEvent(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    title = models.CharField(max_length=255)
    categories_json = models.TextField(null=True, blank=True)
    credibility_score = models.FloatField(default=0.0, null=True, blank=True)
    importance_score = models.FloatField(default=0.0, null=True, blank=True)
    merge_confidence = models.FloatField(default=1.0, null=True, blank=True)
    first_seen = models.DateTimeField(null=True, blank=True)
    last_updated = models.DateTimeField(null=True, blank=True)
    fetched_at = models.DateTimeField(default=timezone.now, null=True, blank=True)
    lifecycle_status = models.CharField(max_length=50, null=True, blank=True)
    major_version = models.IntegerField(null=True, blank=True)
    minor_version = models.IntegerField(null=True, blank=True)
    patch_version = models.IntegerField(null=True, blank=True)
    version_string = models.CharField(max_length=50, null=True, blank=True)
    entities_json = models.TextField(null=True, blank=True)
    summary = models.TextField(null=True, blank=True)
    technical_impact = models.TextField(null=True, blank=True)
    developer_impact = models.TextField(null=True, blank=True)
    enterprise_impact = models.TextField(null=True, blank=True)
    migration_notes = models.TextField(null=True, blank=True)
    breaking_changes = models.TextField(null=True, blank=True)
    security_notes = models.TextField(null=True, blank=True)
    official_links_json = models.TextField(null=True, blank=True)
    image_url = models.CharField(max_length=512, null=True, blank=True)
    llm_model = models.CharField(max_length=50, null=True, blank=True)
    prompt_version = models.CharField(max_length=50, null=True, blank=True)
    response_schema_version = models.CharField(max_length=50, null=True, blank=True)
    summary_status = models.CharField(max_length=50, default="NEW", null=True, blank=True)
    prompt_tokens = models.IntegerField(default=0, null=True, blank=True)
    completion_tokens = models.IntegerField(default=0, null=True, blank=True)
    estimated_cost_usd = models.FloatField(default=0.0, null=True, blank=True)
    estimated_cost_inr = models.FloatField(default=0.0, null=True, blank=True)
    generation_latency = models.IntegerField(default=0, null=True, blank=True)
    summary_generated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "technology_event"


class EventTimeline(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    entity_name = models.CharField(max_length=150)
    event_id = models.CharField(max_length=36)
    lifecycle_type = models.CharField(max_length=50)
    version = models.CharField(max_length=50, null=True, blank=True)
    event_timestamp = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "event_timeline"
