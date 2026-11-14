from django.urls import path

from ingestion import views

urlpatterns = [
    path("health", views.health),
    path("daily-counts", views.daily_counts),
    path("trends", views.trends),
    path("run-benchmarks", views.run_benchmarks),
    path("ingest", views.trigger_ingest),
]
