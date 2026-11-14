from django.contrib import admin
from django.urls import include, path

from notifications import views as notification_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("core.urls")),
    path("api/v1/", include("catalog.urls")),
    path("api/v1/", include("library.urls")),
    path("api/v1/users/", include("accounts.urls")),
    path("api/v1/assistant/", include("assistant.urls")),
    path("api/v1/intelligence/", include("intelligence.urls")),
    # The mobile client calls /notifications without a trailing slash while the
    # nested notification routes use one; support both spellings.
    path("api/v1/notifications", notification_views.notifications),
    path("api/v1/notifications/", include("notifications.urls")),
    path("api/v1/admin/news/", include("ingestion.urls")),
]
