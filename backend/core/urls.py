from django.urls import path

from core import views

urlpatterns = [
    path("", views.index),
    path("actuator/health", views.actuator_health),
    path(".well-known/assetlinks.json", views.asset_links),
    path("bite/<str:event_id>", views.deep_link),
]
