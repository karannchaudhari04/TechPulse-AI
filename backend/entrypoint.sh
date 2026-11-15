#!/bin/sh
set -eu

# The Django migrations mirror the existing TiDB schema. --fake-initial keeps
# deployments over an existing Flyway-managed database from trying to recreate
# tables while still applying framework migrations (sessions, auth, admin).
# Set RUN_MIGRATIONS=false on worker/beat containers so only the web container
# performs schema changes.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "[entrypoint] Applying database migrations..."
    python manage.py migrate --fake-initial --noinput
fi

# The Java backend seeded news sources and categories on startup
# (TechPulseApplication#seedData). Without that, discovery has no feeds to read
# and the pipeline can never produce a new event. The command is idempotent and
# must never block a deploy, so a failure is logged and ignored.
if [ "${SEED_REFERENCE_DATA:-true}" = "true" ]; then
    echo "[entrypoint] Seeding reference data (news sources, categories)..."
    python manage.py seed_reference_data || echo "[entrypoint] WARNING: reference data seeding failed."
fi

if [ "${COLLECT_STATIC:-true}" = "true" ]; then
    echo "[entrypoint] Collecting static files..."
    python manage.py collectstatic --noinput
fi

exec "$@"
