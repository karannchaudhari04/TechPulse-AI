from django.urls import path

from core import views
from ingestion import views as ingestion_views

urlpatterns = [
    path("", views.index),
    path("actuator/health", views.actuator_health),
    path(".well-known/assetlinks.json", views.asset_links),
    path("bite/<str:event_id>", views.deep_link),
    # External-scheduler hook. It lives outside /api/v1 because a cron service
    # has no Firebase token; a shared secret in INGEST_TRIGGER_TOKEN guards it.
    path("internal/ingest", ingestion_views.internal_ingest),
]
