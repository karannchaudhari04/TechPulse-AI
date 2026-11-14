from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes

from assistant import services
from core.permissions import IsAuthenticatedUser
from core.response import fail, ok

AUTH = [IsAuthenticatedUser]


@api_view(["POST"])
@permission_classes(AUTH)
def chat(request):
    try:
        payload, error, _ = services.chat(request.data)
    except Exception as exc:
        return fail(str(exc), 500)
    if error:
        return fail(error, 400)
    return ok(payload, "Chat response generated successfully")


@api_view(["POST"])
@permission_classes(AUTH)
def feedback(request):
    return ok({"status": "SUCCESS"}, "Feedback received successfully")


@api_view(["POST"])
@permission_classes(AUTH)
def regenerate(request):
    return fail(
        "Conversation messages are not persisted by the server. "
        "Resend the prompt to /chat to generate a new response.",
        409,
    )


@api_view(["GET"])
@permission_classes(AUTH)
def history(request):
    return ok(
        {"persisted": False, "conversations": []},
        "Conversation history is not persisted by the server.",
    )
