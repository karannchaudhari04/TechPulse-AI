from __future__ import annotations

import logging
import random

import requests

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

HOOK_TITLES = [
    "🧠 Daily System Design Challenge",
    "🚀 Master System Design",
    "📚 Daily CS Digest",
    "💡 Developer Pro-Tip",
    "🔍 Under the Hood",
    "🎯 Elevate Your Tech Game",
]

HOOK_BODIES = [
    "Do you know how TinyURL scales? Read the high-yield breakdown in 2 minutes.",
    "How do databases optimize read speeds using B-Trees? Find out now.",
    "Optimistic vs. Pessimistic Locking: when should you use each? Learn in 2 minutes.",
    "What is the CAP Theorem and how does it affect distributed databases? Read now.",
    "How do Content Delivery Networks (CDNs) cache static assets globally? Find out in 2 minutes.",
    "Ever wondered how JWT tokens are cryptographically signed? Let's break it down simply.",
    "How does Redis achieve sub-millisecond read/write latencies? Master it in 2 minutes.",
    "What are index lookups and why are composite keys so fast in SQL? Read now.",
]


def send_push_notifications(tokens: list[str] | None, title: str, body: str) -> None:
    if not tokens:
        return

    messages = []
    for token in tokens:
        if token and str(token).strip():
            messages.append(
                {
                    "to": token,
                    "sound": "default",
                    "title": title,
                    "body": body,
                    "data": {"screen": "Home"},
                }
            )
    if not messages:
        return

    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={"Content-Type": "application/json"},
            timeout=(10, 30),
        )
        if response.ok:
            logger.info(
                "[PushNotificationService] Successfully sent %s push notifications via Expo.",
                len(messages),
            )
        else:
            logger.error(
                "[PushNotificationService] Expo API responded with code: %s",
                response.status_code,
            )
    except Exception as exc:
        logger.error("[PushNotificationService] Error sending push notifications: %s", exc)


def send_daily_cs_digest() -> None:
    from accounts.models import UserAccount

    logger.info("[PushScheduler] Preparing daily push notification campaign...")
    tokens = list(
        UserAccount.objects.exclude(push_token__isnull=True)
        .exclude(push_token="")
        .values_list("push_token", flat=True)
    )
    if not tokens:
        logger.info("[PushScheduler] No registered push tokens found. Aborting campaign.")
        return

    title = random.choice(HOOK_TITLES)
    body = random.choice(HOOK_BODIES)
    send_push_notifications(tokens, title, body)
