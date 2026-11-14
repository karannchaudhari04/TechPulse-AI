#!/bin/sh
set -eu

# The Django migrations mirror the existing TiDB schema. --fake-initial keeps
# deployments over an existing Flyway-managed database from trying to recreate
# tables while still applying framework migrations (sessions, celery beat).
# Set RUN_MIGRATIONS=false on worker/beat containers so only the web container
# performs schema changes.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "[entrypoint] Applying database migrations..."
    python manage.py migrate --fake-initial --noinput
fi

if [ "${COLLECT_STATIC:-true}" = "true" ]; then
    echo "[entrypoint] Collecting static files..."
    python manage.py collectstatic --noinput
fi

exec "$@"
