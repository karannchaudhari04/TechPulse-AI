from django.urls import path

from assistant import views

urlpatterns = [
    path("chat", views.chat),
    path("feedback", views.feedback),
    path("regenerate", views.regenerate),
    path("history", views.history),
]
