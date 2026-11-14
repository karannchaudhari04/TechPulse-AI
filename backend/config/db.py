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


def enable_tidb_schema_compatibility() -> None:
    """Keep Django schema changes compatible with TiDB.

    Django 6.0 adds a foreign-key field to MySQL in a single statement:

        ALTER TABLE t ADD COLUMN fk_id bigint NULL,
            ADD CONSTRAINT ... FOREIGN KEY (fk_id) REFERENCES other (id)

    TiDB validates the constraint against the pre-statement schema, so it
    rejects this with::

        (1072, "Key column 'fk_id' doesn't exist in table")

    Removing the inline form makes Django emit the ADD COLUMN first and the
    ADD CONSTRAINT afterwards, which TiDB accepts.
    """
    from django.db.backends.mysql.schema import DatabaseSchemaEditor

    DatabaseSchemaEditor.sql_create_column_inline_fk = None
