from django.urls import path

from library import views

urlpatterns = [
    path("user/bookmarks", views.get_bookmarks),
    path("user/bookmark", views.add_bookmark),
    path("user/bookmark/<str:event_id>", views.delete_bookmark),
    path("user/history", views.history_endpoint),
    path("user/stats", views.get_stats),
    path("user/interaction", views.record_interaction),
    path("user/collections", views.collections_endpoint),
    path("user/collections/<int:collection_id>", views.collection_detail),
    path("user/collections/<int:collection_id>/events", views.add_collection_event),
    path(
        "user/collections/<int:collection_id>/events/<str:event_id>",
        views.remove_collection_event,
    ),
]
