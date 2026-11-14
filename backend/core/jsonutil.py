from __future__ import annotations

import json
from typing import Any


def parse_json_list(value: str | None) -> list[str]:
    if not value or not str(value).strip():
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except Exception:
        pass
    clean = str(value).replace("[", "").replace("]", "").replace('"', "")
    if not clean.strip():
        return []
    return [part.strip() for part in clean.split(",") if part.strip()]


def dump_json(value: Any) -> str:
    return json.dumps(value)
