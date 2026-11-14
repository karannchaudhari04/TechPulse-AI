import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("techpulse")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "news-ingestion-every-8h": {
        "task": "ingestion.tasks.scheduled_ingest",
        "schedule": crontab(minute=0, hour="*/8"),
    },
    "prune-raw-ingestions-midnight": {
        "task": "ingestion.tasks.prune_raw_ingestions",
        "schedule": crontab(minute=0, hour=0),
    },
    "daily-cs-digest-9am": {
        "task": "notifications.tasks.send_daily_cs_digest",
        "schedule": crontab(minute=0, hour=9),
    },
}
