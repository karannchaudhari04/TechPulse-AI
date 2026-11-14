from django.db import models
from django.utils import timezone


class UserSavedEvent(models.Model):
    pk = models.CompositePrimaryKey("user_id", "event_id")
    user_id = models.BigIntegerField()
    event_id = models.CharField(max_length=36)
    saved_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "user_saved_event"


class UserCollection(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=500, null=True, blank=True)
    is_auto_updating = models.BooleanField(default=False, null=True, blank=True)
    query_criteria_json = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "user_collection"


class CollectionEvent(models.Model):
    pk = models.CompositePrimaryKey("collection_id", "event_id")
    collection_id = models.BigIntegerField()
    event_id = models.CharField(max_length=36)
    added_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "collection_event"


class InteractionLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    event_id = models.CharField(max_length=36)
    interaction_type = models.CharField(max_length=50)
    interaction_value = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "interaction_log"
        indexes = [models.Index(fields=["user_id", "interaction_type", "created_at"], name="idx_user_interaction_type")]


class UserHistoryLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    event_id = models.CharField(max_length=36)
    last_opened = models.DateTimeField(default=timezone.now, null=True, blank=True)
    reading_duration_sec = models.IntegerField(default=0, null=True, blank=True)
    completion_percentage = models.IntegerField(default=0, null=True, blank=True)

    class Meta:
        db_table = "user_history_log"
        constraints = [
            models.UniqueConstraint(fields=["user_id", "event_id"], name="uq_user_event_history")
        ]


class RecommendationHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    event_id = models.CharField(max_length=36)
    score = models.FloatField()
    shown_at = models.DateTimeField(default=timezone.now, null=True, blank=True)
    is_clicked = models.BooleanField(default=False, null=True, blank=True)
    is_read = models.BooleanField(default=False, null=True, blank=True)

    class Meta:
        db_table = "recommendation_history"


class SearchHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    query_text = models.CharField(max_length=500)
    searched_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "search_history"
