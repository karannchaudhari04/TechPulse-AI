from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        # Apply before any management command (e.g. migrate) can build a schema
        # editor. See config/db.py for the TiDB rationale.
        from config.db import enable_tidb_schema_compatibility

        enable_tidb_schema_compatibility()

        # Start the periodic jobs on the first HTTP request, the way the Java
        # backend's @EnableScheduling did. Management commands never start it.
        from core import scheduler

        scheduler.connect()
