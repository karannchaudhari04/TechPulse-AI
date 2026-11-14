from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime

from django.conf import settings

from core import ai
from ingestion.models import RawIngestion
from catalog.models import TechnologyEvent

logger = logging.getLogger(__name__)

KNOWN_CATEGORIES = [
    "Problem Solving",
    "Development",
    "AI & Machine Learning",
    "Cloud & DevOps",
    "System Design & Backend",
    "Cybersecurity",
    "Data Science & Analytics",
    "Product & UI/UX",
    "Open Source & GitHub",
    "Career & Placements",
    "Emerging Tech",
]


def synthesize_and_save(raw_update: RawIngestion) -> TechnologyEvent | None:
    logger.info(
        "[AISynthesisAgent] Processing raw update for AI synthesis: '%s' (Event ID: %s)",
        raw_update.title,
        raw_update.event_id,
    )
    prompt = build_structured_prompt(raw_update.title, raw_update.raw_content)

    try:
        response = ai.generate(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
            temperature=0.2,
            max_tokens=2048,
            system_prompt="You are a professional technology analyst. Return strict JSON ONLY.",
            user_prompt=prompt,
            request_id=str(uuid.uuid4()),
        )
    except Exception as exc:
        logger.error(
            '[AI_SYNTHESIS] rawIngestionId=%s eventId=%s status=FAILED reason="%s". '
            "Deleting from DB immediately.",
            raw_update.id,
            raw_update.event_id,
            exc,
        )
        try:
            RawIngestion.objects.filter(pk=raw_update.id).delete()
        except Exception as delete_exc:
            logger.warning(
                "[AI_SYNTHESIS] Could not delete failed raw update %s: %s",
                raw_update.id,
                delete_exc,
            )
        raise RuntimeError(f"Gemini generation failed: {exc}") from exc

    json_content = (response.content or "").strip()
    if json_content.startswith("```"):
        json_content = re.sub(r"^```[a-zA-Z]*\s*", "", json_content)
        json_content = re.sub(r"\s*```$", "", json_content)
    json_content = json_content.strip()

    try:
        dto = json.loads(json_content)
        if not isinstance(dto, dict):
            raise ValueError("Structured output must be a JSON object")
    except Exception as exc:
        logger.error(
            '[AI_SYNTHESIS] rawIngestionId=%s eventId=%s status=FAILED '
            'reason="JSON parsing failed: %s". Deleting from DB immediately.',
            raw_update.id,
            raw_update.event_id,
            exc,
        )
        try:
            RawIngestion.objects.filter(pk=raw_update.id).delete()
        except Exception as delete_exc:
            logger.warning(
                "[AI_SYNTHESIS] Could not delete failed raw update %s: %s",
                raw_update.id,
                delete_exc,
            )
        raise RuntimeError("Structured output parsing failed") from exc

    category_name = dto.get("category")
    if not isinstance(category_name, str) or category_name not in KNOWN_CATEGORIES:
        category_name = "Emerging Tech"

    now = datetime.now()
    topics = dto.get("topics") if isinstance(dto.get("topics"), list) else []
    official_links = (
        dto.get("officialLinks")
        if isinstance(dto.get("officialLinks"), list) and dto.get("officialLinks")
        else [raw_update.url]
    )

    event = TechnologyEvent(
        id=raw_update.event_id,
        title=(
            dto.get("title")
            if isinstance(dto.get("title"), str) and dto.get("title").strip()
            else raw_update.title
        ),
        summary=dto.get("summary"),
        technical_impact=dto.get("technicalImpact"),
        developer_impact=dto.get("developerImpact"),
        enterprise_impact=dto.get("enterpriseImpact"),
        migration_notes=dto.get("migrationNotes"),
        breaking_changes=dto.get("breakingChanges"),
        security_notes=dto.get("securityNotes"),
        credibility_score=(
            float(dto.get("credibilityScore"))
            if dto.get("credibilityScore") is not None
            else 80.0
        ),
        importance_score=(
            float(dto.get("importanceScore"))
            if dto.get("importanceScore") is not None
            else 70.0
        ),
        version_string=dto.get("versionString"),
        lifecycle_status=dto.get("lifecycleStatus"),
        first_seen=raw_update.published_at or now,
        last_updated=now,
        fetched_at=raw_update.fetched_at or now,
        summary_status="READY",
        llm_model=response.model or settings.GEMINI_MODEL,
        prompt_tokens=response.prompt_tokens,
        completion_tokens=response.completion_tokens,
        generation_latency=response.latency,
        summary_generated_at=now,
        categories_json=json.dumps([category_name]),
        entities_json=json.dumps(topics),
        official_links_json=json.dumps(official_links),
    )
    event.save()

    raw_update.processing_status = "PROCESSED"
    raw_update.save(update_fields=["processing_status"])

    logger.info(
        "[AI_SYNTHESIS] rawIngestionId=%s eventId=%s status=SUCCESS",
        raw_update.id,
        event.id,
    )
    return event


def build_structured_prompt(title: str, content: str) -> str:
    categories_str = ", ".join(KNOWN_CATEGORIES)
    return f"""You are a senior technology analyst. Synthesize this raw technology update into a structured, developer-oriented news event.

RAW TITLE: {title}
RAW CONTENT: {content[:3500]}

Select exactly one category from these options:
- {categories_str}

Extract 3-5 specific topics/tags (e.g. "React", "LLM", "Docker").
Evaluate overall importanceScore (0.0 to 100.0) and credibilityScore (0.0 to 100.0) based on source strength and technical impact.
Extract versionString (e.g., "19.0.0" or null if not applicable) and lifecycleStatus (e.g., "RELEASED", "BETA", "GA", or null).
For impacts (technicalImpact, developerImpact, enterpriseImpact), write 1-2 concise, high-value sentences explaining what developers and businesses need to know.
Write migrationNotes, breakingChanges, and securityNotes if mentioned, otherwise write "Not confirmed."

HEADLINE RULES (give the title special attention):
- Write a clear, specific headline that makes the actual news interesting to a technology reader.
- Lead with the named product, technology, organization, or change, then explain the concrete announcement or consequence.
- Prefer strong, accurate verbs such as "adds", "opens", "cuts", "patches", "ships", or "deprecates" when supported by the source.
- Aim for 8-14 words and keep it under 100 characters; use sentence case.
- Preserve important product names and version numbers from the source.
- Do not merely copy the raw title or use generic wording like "Latest Update", "Major News", or "Big Changes".
- No clickbait, unsupported claims, questions, emojis, or exclamation marks. Never make the change sound bigger than the source supports.
- Example style: "Kubernetes adds safer pod resizing for live production workloads".

Return STRICT JSON matching the following schema. Wrap output in a JSON object only. Do not add markdown or backticks.
{{
  "title": "string (specific, engaging, accurate headline following the headline rules)",
  "summary": "string (a bulleted or clear summary explaining what happened, what changed, and why it matters)",
  "category": "string (must match one of the listed categories exactly)",
  "topics": ["string"],
  "importanceScore": number,
  "credibilityScore": number,
  "versionString": "string or null",
  "lifecycleStatus": "string or null",
  "technicalImpact": "string",
  "developerImpact": "string",
  "enterpriseImpact": "string",
  "migrationNotes": "string",
  "breakingChanges": "string",
  "securityNotes": "string",
  "officialLinks": ["string"]
}}
"""
