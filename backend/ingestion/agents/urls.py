from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

TRACKING_KEYS = {"fbclid", "gclid"}


def normalize(url_str: str | None) -> str:
    if not url_str or not str(url_str).strip():
        return ""
    raw = str(url_str).strip()
    try:
        parts = urlsplit(raw)
        if not parts.scheme or not parts.hostname:
            return raw
        scheme = parts.scheme.lower()
        host = parts.hostname.lower()
        try:
            port = parts.port
        except ValueError:
            port = None

        path = parts.path or ""
        path = re_sub_slashes(path)
        if len(path) > 1 and path.endswith("/"):
            path = path[:-1]

        query_pairs = []
        for key, value in parse_qsl(parts.query, keep_blank_values=True):
            lower_key = key.lower()
            if lower_key.startswith("utm_") or lower_key in TRACKING_KEYS:
                continue
            query_pairs.append((key, value))
        query = urlencode(query_pairs, doseq=True) if query_pairs else ""

        netloc = host
        if port is not None and port not in (80, 443):
            netloc = f"{host}:{port}"
        return urlunsplit((scheme, netloc, path, query, ""))
    except Exception:
        return raw


def re_sub_slashes(path: str) -> str:
    import re

    return re.sub(r"/{2,}", "/", path)
