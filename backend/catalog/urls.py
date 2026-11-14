from django.urls import path

from catalog import views

urlpatterns = [
    path("categories", views.categories),
    path("feed", views.feed),
    path("feed/trending", views.trending_feed),
    path("trends", views.trends),
    path("search", views.search),
    path("events/<str:event_id>/related", views.related_events),
    path("event/<str:event_id>/related", views.related_events),
    path("events/<str:event_id>", views.event_detail),
    path("event/<str:event_id>", views.event_detail),
]
