from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes

from core.authentication import require_user
from core.permissions import IsAuthenticatedUser
from core.response import fail, ok
from library import services
from library.models import CollectionEvent, UserCollection

AUTH = [IsAuthenticatedUser]


@api_view(["GET"])
@permission_classes(AUTH)
def get_bookmarks(request):
    user = require_user(request)
    return ok(services.bookmarks(user.id), "Bookmarks fetched successfully.")


@api_view(["POST"])
@permission_classes(AUTH)
def add_bookmark(request):
    user = require_user(request)
    services.add_bookmark(user.id, request.data.get("event_id"))
    return ok(None, "Event bookmarked successfully.")


@api_view(["DELETE"])
@permission_classes(AUTH)
def delete_bookmark(request, event_id: str):
    user = require_user(request)
    services.remove_bookmark(user.id, event_id)
    return ok(None, "Event bookmark removed successfully.")


@api_view(["GET", "DELETE"])
@permission_classes(AUTH)
def history_endpoint(request):
    user = require_user(request)
    if request.method == "DELETE":
        from library.models import UserHistoryLog

        UserHistoryLog.objects.filter(user_id=user.id).delete()
        return ok(None, "Reading history cleared successfully.")
    return ok(services.history(user.id), "Reading history fetched successfully.")


@api_view(["GET"])
@permission_classes(AUTH)
def get_stats(request):
    user = require_user(request)
    return ok(services.stats(user.id), "Library statistics fetched successfully.")


@api_view(["POST"])
@permission_classes(AUTH)
def record_interaction(request):
    user = require_user(request)
    services.record_interaction(
        user.id,
        request.data.get("event_id"),
        request.data.get("type"),
        request.data.get("value"),
    )
    return ok(None, "Interaction recorded successfully.")


@api_view(["GET", "POST"])
@permission_classes(AUTH)
def collections_endpoint(request):
    user = require_user(request)
    if request.method == "POST":
        collection = services.create_collection(
            user.id, request.data.get("name"), request.data.get("description")
        )
        return ok(services.serialize_collection(collection), "Collection created successfully.")
    return ok(services.collections(user.id), "Collections fetched successfully.")


@api_view(["PUT", "DELETE"])
@permission_classes(AUTH)
def collection_detail(request, collection_id: int):
    user = require_user(request)
    collection = UserCollection.objects.filter(pk=collection_id).first()
    if collection is None:
        return fail("Collection not found.", 404)
    if collection.user_id != user.id:
        return fail("You do not have permission to access this resource.", 403)

    if request.method == "DELETE":
        CollectionEvent.objects.filter(collection_id=collection.id).delete()
        collection.delete()
        return ok(None, "Collection deleted successfully.")

    name = request.data.get("name")
    description = request.data.get("description")
    if name is not None:
        collection.name = name
    if description is not None:
        collection.description = description
    collection.save()
    return ok(services.serialize_collection(collection), "Collection updated successfully.")


@api_view(["POST"])
@permission_classes(AUTH)
def add_collection_event(request, collection_id: int):
    user = require_user(request)
    collection = UserCollection.objects.filter(pk=collection_id).first()
    if collection is None:
        return fail("Collection not found.", 404)
    if collection.user_id != user.id:
        return fail("You do not have permission to access this resource.", 403)
    services.add_event_to_collection(collection.id, request.data.get("event_id"))
    return ok(None, "Event added to collection.")


@api_view(["DELETE"])
@permission_classes(AUTH)
def remove_collection_event(request, collection_id: int, event_id: str):
    user = require_user(request)
    collection = UserCollection.objects.filter(pk=collection_id).first()
    if collection is None:
        return fail("Collection not found.", 404)
    if collection.user_id != user.id:
        return fail("You do not have permission to access this resource.", 403)
    CollectionEvent.objects.filter(collection_id=collection.id, event_id=event_id).delete()
    return ok(None, "Event removed from collection.")
