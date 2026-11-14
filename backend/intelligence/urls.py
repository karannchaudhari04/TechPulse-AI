from django.urls import path

from intelligence import views

urlpatterns = [
    path("graph", views.graph),
    path("technology/<str:technology_id>", views.technology),
    path("company/<str:company_id>", views.company),
    path("release/<str:release_id>", views.release),
    path("timeline/<str:timeline_id>", views.timeline),
    path("compare", views.compare),
    path("brief", views.brief),
]
