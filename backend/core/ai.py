from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

RESPONSE_FORMAT = {"type": "json_object"}
CONNECT_TIMEOUT_SECONDS = 10
READ_TIMEOUT_SECONDS = 45

# Mirrors GeminiClient.modelUnavailableUntil: cooldowns are tracked per client
# (i.e. per API key) and model.
_model_unavailable_until: dict[tuple[str, str], float] = {}


@dataclass
class AIResponse:
    content: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    finish_reason: str = ""
    latency: int = 0
    provider: str = "Gemini"
    raw_response: str = ""


def _quota_cooldown_until(response: requests.Response) -> float:
    body = (response.text or "").lower()
    if (
        "requestsperday" in body
        or "perdayperproject" in body
        or "requests_per_day" in body
    ):
        pacific = ZoneInfo("America/Los_Angeles")
        now = datetime.now(pacific)
        next_day = datetime(now.year, now.month, now.day, tzinfo=pacific)
        return next_day.timestamp() + 86400
    retry_after = response.headers.get("Retry-After")
    try:
        retry_seconds = int(str(retry_after).strip()) if retry_after else 60
    except (TypeError, ValueError):
        retry_seconds = 60
    return datetime.now(timezone.utc).timestamp() + max(1, retry_seconds)


def _error_body(response: requests.Response | None, limit: int = 400) -> str:
    if response is None:
        return ""
    text = " ".join((response.text or "").split())
    return text[:limit]


def _generate_with_model(
    *,
    api_key: str,
    url: str,
    model: str,
    temperature: float,
    max_tokens: int,
    system_prompt: str | None,
    user_prompt: str,
    request_id: str | None,
) -> AIResponse:
    body: dict[str, Any] = {
        "model": model,
        "temperature": temperature,
    }
    if max_tokens > 0:
        body["max_tokens"] = max_tokens

    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})
    body["messages"] = messages
    body["response_format"] = RESPONSE_FORMAT

    logger.info("[GeminiClient] Sending request (requestId=%s) to model %s.", request_id, model)
    started = datetime.now(timezone.utc).timestamp()
    response = requests.post(
        url,
        json=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        timeout=(CONNECT_TIMEOUT_SECONDS, READ_TIMEOUT_SECONDS),
    )
    if not response.ok:
        # Include the provider's message: Google answers an invalid key with a
        # 400 "Please pass a valid API key", which raise_for_status alone hides
        # behind a bare "400 Client Error".
        raise requests.HTTPError(
            f"{response.status_code} from Gemini for model {model}: {_error_body(response)}",
            response=response,
        )

    if not response.text:
        raise RuntimeError("Empty response body from Gemini API.")

    try:
        root = json.loads(response.text)
        choices = root.get("choices")
        if not isinstance(choices, list) or not choices:
            raise RuntimeError("Empty choices array in API response.")
        choice = choices[0] or {}
        usage = root.get("usage") or {}
        return AIResponse(
            content=((choice.get("message") or {}).get("content")) or "",
            model=model,
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            finish_reason=str(choice.get("finish_reason") or ""),
            latency=int((datetime.now(timezone.utc).timestamp() - started) * 1000),
            provider="Gemini",
            raw_response=response.text,
        )
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError("Could not parse Gemini response") from exc


def generate(
    *,
    api_key: str,
    user_prompt: str,
    system_prompt: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1200,
    model: str | None = None,
    request_id: str | None = None,
) -> AIResponse:
    """Call the Gemini OpenAI-compatible endpoint with the legacy fallback chain."""
    base_url = settings.GEMINI_BASE_URL
    url = base_url if base_url.endswith("/") else f"{base_url}/"
    url = f"{url}chat/completions"

    primary_model = model or settings.GEMINI_MODEL
    models: list[str] = [primary_model]
    for fallback_model in settings.GEMINI_FALLBACK_MODELS:
        if fallback_model not in models:
            models.append(fallback_model)

    last_error: Exception | None = None
    for candidate in models:
        unavailable_until = _model_unavailable_until.get((api_key, candidate))
        if unavailable_until and datetime.now(timezone.utc).timestamp() < unavailable_until:
            logger.info(
                "[GeminiClient] Skipping model %s while its quota cooldown is active until %s.",
                candidate,
                datetime.fromtimestamp(unavailable_until, timezone.utc),
            )
            continue
        try:
            return _generate_with_model(
                api_key=api_key,
                url=url,
                model=candidate,
                temperature=temperature,
                max_tokens=max_tokens,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                request_id=request_id,
            )
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else 0
            # A bad model name, an unsupported parameter for one model, or an
            # invalid key all arrive as 400/403 here; try the remaining models
            # before giving up so a single bad name cannot stop ingestion.
            if status not in {400, 403, 404, 429} and not (500 <= status < 600):
                raise
            last_error = exc
            if status == 429 and exc.response is not None:
                until = _quota_cooldown_until(exc.response)
                _model_unavailable_until[(api_key, candidate)] = until
                logger.warning(
                    "[GeminiClient] Model %s throttled; cooling it down before continuing the model chain.",
                    candidate,
                )
            logger.warning(
                "[GeminiClient] Model %s returned %s (%s); trying next configured model.",
                candidate,
                status,
                _error_body(exc.response),
            )
        except requests.RequestException as exc:
            last_error = exc
            logger.warning(
                "[GeminiClient] Model %s transport failure (%s); trying next configured model.",
                candidate,
                exc,
            )

    raise RuntimeError(
        "Gemini fallback chain exhausted after trying "
        f"{len(models)} configured models. Last error: "
        f"{last_error if last_error is None else str(last_error)}"
    )


def extract_message(raw_content: str) -> str:
    """Mirror AssistantController's JSON unwrapping for content/response/text."""
    message = raw_content
    if raw_content.strip().startswith("{"):
        try:
            node = json.loads(raw_content)
            if isinstance(node, dict):
                for key in ("content", "response", "text"):
                    if key in node:
                        value = node[key]
                        message = value if isinstance(value, str) else json.dumps(value)
                        break
        except Exception:
            pass
    return message
