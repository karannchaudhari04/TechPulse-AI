"""Parse JDBC/TiDB URLs into Django DATABASES settings."""

from __future__ import annotations

from urllib.parse import parse_qs, unquote, urlparse


def jdbc_to_django(jdbc_url: str, user: str, password: str) -> dict:
    raw = (jdbc_url or "").strip()
    if not raw:
        return {}
    if raw.startswith("jdbc:"):
        raw = raw[5:]
    parsed = urlparse(raw)
    query = parse_qs(parsed.query)
    options = {}
    if query.get("useSSL", ["false"])[0].lower() == "true" or "tidbcloud.com" in (parsed.hostname or ""):
        options["ssl"] = {"ssl": True}
    name = (parsed.path or "/").lstrip("/").split("?")[0] or "techpulse"
    return {
        "ENGINE": "django.db.backends.mysql",
        "NAME": name,
        "USER": user or unquote(parsed.username or ""),
        "PASSWORD": password or unquote(parsed.password or ""),
        "HOST": parsed.hostname or "127.0.0.1",
        "PORT": str(parsed.port or 3306),
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET SESSION tidb_enable_noop_functions = 1",
            **options,
        },
        "CONN_MAX_AGE": 60,
    }


class ReplicaRouter:
    def db_for_read(self, model, **hints):
        from django.conf import settings

        return "replica" if "replica" in settings.DATABASES else "default"

    def db_for_write(self, model, **hints):
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return db == "default"
