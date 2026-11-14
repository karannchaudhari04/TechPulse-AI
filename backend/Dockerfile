FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system techpulse && adduser --system --ingroup techpulse techpulse

COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip && pip install -r requirements.txt

COPY --chown=techpulse:techpulse . .
# The container runs as the unprivileged techpulse user, so every directory the
# app writes to at runtime must exist and be owned by that user before USER.
# celerybeat holds the beat schedule; staticfiles is collectstatic's STATIC_ROOT.
RUN mkdir -p /app/celerybeat /app/staticfiles \
    && chown techpulse:techpulse /app/celerybeat /app/staticfiles

USER techpulse
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:8080/actuator/health', timeout=3)"

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD ["sh", "-c", "gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8080} --workers ${WEB_CONCURRENCY:-2} --timeout 120"]
