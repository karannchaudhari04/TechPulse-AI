from __future__ import annotations

import uuid
from datetime import datetime, timezone

from django.conf import settings

from core import ai


def java_instant_now() -> str:
    """Match java.time.Instant.toString() closely enough for client parsing."""
    now = datetime.now(timezone.utc)
    base = now.strftime("%Y-%m-%dT%H:%M:%S")
    micros = now.microsecond
    if micros == 0:
        return f"{base}Z"
    if micros % 1000 == 0:
        return f"{base}.{micros // 1000:03d}Z"
    return f"{base}.{micros:06d}Z"


def validate_chat_request(data) -> tuple[str | None, str | None]:
    prompt = data.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip():
        return None, "prompt is required"
    if len(prompt) > 4000:
        return None, "prompt must be at most 4000 characters"

    history = data.get("history")
    if history is None:
        history = []
    if not isinstance(history, list):
        return None, "history must be a list"
    if len(history) > 20:
        return None, "history may contain at most 20 messages"
    for message in history:
        if not isinstance(message, dict):
            return None, "history role must be user or assistant"
        role = message.get("role")
        if not isinstance(role, str) or not role.strip():
            return None, "history role must be user or assistant"
        if role not in {"user", "assistant"}:
            return None, "history role must be user or assistant"
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            return None, "history content is required"
        if len(content) > 4000:
            return None, "history content must be at most 4000 characters"

    conversation_id = data.get("conversation_id")
    if conversation_id is not None and len(str(conversation_id)) > 80:
        return None, "conversationId must be at most 80 characters"
    return prompt, None


def chat(data) -> tuple[dict | None, str | None, str | None]:
    """Return (payload, error_message, error_detail)."""
    prompt, error = validate_chat_request(data)
    if error:
        return None, error, "validation"

    history = data.get("history") or []
    context_parts: list[str] = []
    for message in history:
        context_parts.append(f"{message['role']}: {message['content']}\n")
    context_parts.append(f"user: {prompt}\n")
    context = "".join(context_parts)
    if len(context) > 12000:
        return None, "Conversation context must be at most 12000 characters.", "validation"

    response = ai.generate(
        api_key=settings.GEMINI_EXPLAIN_API_KEY or settings.GEMINI_API_KEY,
        system_prompt=(
            "You are Antigravity, a professional technology and coding assistant. "
            "Help developers answer questions, explain errors, or migrate versions. "
            "Return the answer in a JSON object with a single field 'content' "
            "containing the response text."
        ),
        user_prompt=context,
        temperature=0.7,
        max_tokens=1200,
        request_id=str(uuid.uuid4()),
    )
    message_text = ai.extract_message(response.content or "")

    assistant_message = {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": message_text,
        "status": "completed",
        "messageType": "markdown",
        "createdAt": java_instant_now(),
        "citations": [],
    }

    conversation_id = data.get("conversation_id")
    if conversation_id is None or not str(conversation_id).strip():
        conversation_id = str(uuid.uuid4())

    payload = {
        "conversationId": str(conversation_id),
        "title": prompt if len(prompt) <= 80 else f"{prompt[:77]}...",
        "persisted": False,
        "message": assistant_message,
    }
    return payload, None, None
