from __future__ import annotations

from celery import shared_task

from notifications import push


@shared_task(name="notifications.tasks.send_daily_cs_digest")
def send_daily_cs_digest():
    push.send_daily_cs_digest()
    return {"sent": True}
