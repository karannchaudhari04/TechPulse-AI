from __future__ import annotations

import re
import uuid

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes

from core import ai
from core.permissions import IsAuthenticatedUser
from core.response import fail, ok

AUTH = [IsAuthenticatedUser]

VALID_BRIEF_FORMATS = re.compile(
    r"summary|technical|migration|security|markdown|pdf", re.IGNORECASE
)


def _node(node_id: str, label: str, node_type: str) -> dict:
    return {"id": node_id, "label": label, "type": node_type}


def _link(source: str, target: str, relationship: str) -> dict:
    return {"source": source, "target": target, "relationship": relationship}


@api_view(["GET"])
def graph(request):
    data = {
        "nodes": [
            _node("java", "Java Language", "language"),
            _node("spring-boot", "Spring Boot", "technology"),
            _node("react", "React Native", "technology"),
            _node("docker", "Docker Containers", "cloud"),
            _node("google", "Google Cloud", "company"),
            _node("cve-1234", "CVE-2026-1234", "cve"),
        ],
        "links": [
            _link("spring-boot", "java", "built_on"),
            _link("spring-boot", "docker", "deployed_via"),
            _link("java", "cve-1234", "vulnerable_to"),
        ],
    }
    return ok(data, "Knowledge graph fetched successfully")


@api_view(["GET"])
def technology(request, technology_id: str):
    name = technology_id[:1].upper() + technology_id[1:]
    data = {
        "id": technology_id,
        "name": name,
        "latestVersion": "21.0.1",
        "trendingScore": 85,
        "overview": (
            f"{name} is widely adopted in modern enterprise software stacks for "
            "modular architecture and scalability."
        ),
        "breakingChanges": [
            "Deprecated legacy reflection mechanisms.",
            "Removed support for outdated JVM configurations.",
        ],
    }
    return ok(data, "Technology details fetched successfully")


@api_view(["GET"])
def company(request, company_id: str):
    name = company_id[:1].upper() + company_id[1:]
    data = {
        "id": company_id,
        "name": name,
        "aiSummary": (
            f"{name} is actively contributing to open-source developer toolkits, "
            "focusing on containerization, serverless compute, and machine learning SDKs."
        ),
        "announcements": [
            "Announced integration support for next-gen virtualization instances.",
            "Released developer preview of advanced security auditing dashboards.",
        ],
    }
    return ok(data, "Company details fetched successfully")


@api_view(["GET"])
def release(request, release_id: str):
    data = {
        "id": release_id,
        "version": "v3.2.0",
        "notes": (
            "Major stability updates. Faster cold-start initialization and lower heap "
            "memory usage under concurrent loads."
        ),
        "compatibility": "Compatible with Java 17 and Java 21 runtimes.",
        "migrationGuide": (
            "Upgrade your project build plugins, and resolve deprecated direct properties "
            "imports as detailed in the official changelog."
        ),
    }
    return ok(data, "Release details fetched successfully")


@api_view(["GET"])
def timeline(request, timeline_id: str):
    data = [
        {
            "id": "t-1",
            "version": "21.0.0",
            "date": "2026-05-10",
            "headline": "LTS Release Launch",
            "description": (
                "Introduced stable virtual threads supporting scalable concurrent "
                "threads processing."
            ),
        },
        {
            "id": "t-2",
            "version": "21.0.1",
            "date": "2026-07-01",
            "headline": "Minor security patch update",
            "description": "Addressed CVE-2026-1234 within reflection loaders.",
        },
    ]
    return ok(data, "Timeline fetched successfully")


@api_view(["POST"])
def compare(request):
    techs = request.data.get("techs")
    if techs is not None and not isinstance(techs, list):
        return fail("techs must be a list", 400)
    data = {
        "techNames": techs if techs is not None else ["react", "angular"],
        "features": ["Performance", "Learning Curve", "Ecosystem Sizing"],
        "ratings": {
            "react": ["Excellent", "Easy", "Massive"],
            "angular": ["Good", "Complex", "Large"],
        },
        "summary": (
            "React excels in client-side responsiveness and library ecosystems, "
            "whereas Angular offers a highly structured full-framework approach."
        ),
    }
    return ok(data, "Comparison details processed successfully")


@api_view(["POST"])
@permission_classes(AUTH)
def brief(request):
    topic = request.data.get("topic")
    if not isinstance(topic, str) or not topic.strip():
        return fail("topic is required", 400)
    topic = topic.strip()
    if len(topic) > 200:
        return fail("topic must be at most 200 characters", 400)

    brief_format = request.data.get("format")
    if not isinstance(brief_format, str) or not brief_format.strip():
        return fail("format is required", 400)
    brief_format = brief_format.strip()
    if not VALID_BRIEF_FORMATS.fullmatch(brief_format):
        return fail(
            "format must be summary, technical, migration, security, markdown, or pdf",
            400,
        )
    brief_format = brief_format.lower()

    try:
        response = ai.generate(
            api_key=settings.GEMINI_API_KEY,
            system_prompt=(
                "You are an engineering analyst. Return a JSON object with a single "
                "field 'content' containing a technical summary and guide for the topic."
            ),
            user_prompt=(
                f"Generate an engineering brief for: {topic} in {brief_format} format."
            ),
            temperature=0.5,
            max_tokens=1200,
            request_id=str(uuid.uuid4()),
        )
    except Exception as exc:
        return fail(str(exc), 500)

    data = {
        "topic": topic,
        "format": brief_format,
        "content": ai.extract_message(response.content or ""),
    }
    return ok(data, "Tech brief generated successfully")
