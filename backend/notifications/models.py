from django.db import models
from django.utils import timezone


class NotificationRule(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    trigger_type = models.CharField(max_length=50)
    trigger_value = models.CharField(max_length=255, null=True, blank=True)
    priority = models.CharField(max_length=20, default="MEDIUM", null=True, blank=True)
    is_enabled = models.BooleanField(default=True, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "notification_rule"


class NotificationEvent(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(max_length=20)
    is_read = models.BooleanField(default=False, null=True, blank=True)
    event_id = models.CharField(max_length=36, null=True, blank=True)
    sent_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "notification_event"
