from django.urls import path

from notifications import views

urlpatterns = [
    path("", views.notifications),
    path("unread", views.unread_count),
    path("read-all", views.mark_all_as_read),
    path("preferences", views.notification_preferences),
    path("preferences/", views.notification_preferences),
    path("<int:notification_id>/read", views.mark_as_read),
    path("<int:notification_id>", views.delete_notification),
]
