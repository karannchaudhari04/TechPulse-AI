from __future__ import annotations

import time
from typing import Any

from rest_framework.response import Response


def java_datetime(value) -> str:
    if value is None:
        return None
    iso = value.isoformat()
    if iso.endswith("+00:00"):
        iso = iso[:-6]
    if "." in iso:
        iso = iso.rstrip("0").rstrip(".")
    return iso


def api_payload(success: bool, message: str, data: Any = None, trace_id: str | None = None) -> dict:
    return {
        "success": success,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
        "traceId": trace_id,
    }


def ok(data: Any = None, message: str = "OK", status: int = 200, trace_id: str | None = None) -> Response:
    return Response(api_payload(True, message, data, trace_id), status=status)


def fail(message: str, status: int = 400, data: Any = None, trace_id: str | None = None) -> Response:
    return Response(api_payload(False, message, data, trace_id), status=status)
