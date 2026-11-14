from django.urls import path

from accounts import views

urlpatterns = [
    path("register-or-login", views.register_or_login),
    path("preferences", views.preferences),
    path("profile", views.profile),
    path("push-token", views.register_push_token),
    path("push-test", views.test_push_notifications),
]
