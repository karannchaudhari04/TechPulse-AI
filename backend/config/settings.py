import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from config.db import jdbc_to_django

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# pytest-django imports settings from inside the pytest process. Force an
# isolated SQLite/LocMem setup so a developer's TiDB/Redis env cannot leak into
# the test suite.
RUNNING_TESTS = (
    "pytest" in sys.modules
    or bool(os.getenv("PYTEST_CURRENT_TEST"))
    or "pytest" in Path(sys.argv[0]).name.lower()
)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", os.getenv("JWT_SECRET", "dev-insecure-secret-change-me"))
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() in {"1", "true", "yes"}
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "*").split(",") if h.strip()]

# Render terminates TLS at its proxy and forwards the original scheme.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "core",
    "accounts",
    "catalog",
    "library",
    "assistant",
    "intelligence",
    "notifications",
    "ingestion",
]

MIDDLEWARE = [
    "core.middleware.CorrelationIdMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.FirebaseAuthenticationMiddleware",
    "core.middleware.RateLimitMiddleware",
    "core.middleware.SecurityPolicyMiddleware",
]
if RUNNING_TESTS:
    # collectstatic is not part of the test run, so skip WhiteNoise's missing
    # STATIC_ROOT warning.
    MIDDLEWARE.remove("whitenoise.middleware.WhiteNoiseMiddleware")

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

USE_TZ = False
TIME_ZONE = os.getenv("TZ", "UTC")
LANGUAGE_CODE = "en-us"
USE_I18N = False
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

writer_url = os.getenv("DATABASE_WRITER_URL", os.getenv("DATABASE_URL", ""))
if RUNNING_TESTS or writer_url.startswith("sqlite") or os.getenv("DJANGO_TEST") == "1" or (not writer_url and DEBUG):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.getenv("SQLITE_PATH", str(BASE_DIR / "db.sqlite3")),
        }
    }
else:
    DATABASES = {
        "default": jdbc_to_django(
            writer_url,
            os.getenv("DATABASE_WRITER_USER", os.getenv("DATABASE_USER", "")),
            os.getenv("DATABASE_WRITER_PASSWORD", os.getenv("DATABASE_PASSWORD", "")),
        )
    }
    replica_url = os.getenv("DATABASE_REPLICA_URL", writer_url)
    if replica_url and replica_url != writer_url:
        DATABASES["replica"] = jdbc_to_django(
            replica_url,
            os.getenv("DATABASE_REPLICA_USER", os.getenv("DATABASE_WRITER_USER", "")),
            os.getenv("DATABASE_REPLICA_PASSWORD", os.getenv("DATABASE_WRITER_PASSWORD", "")),
        )
        DATABASE_ROUTERS = ["config.db.ReplicaRouter"]

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "techpulse-local",
    }
}
REDIS_URL = os.getenv("REDIS_URL") or (
    f"redis://{os.getenv('SPRING_DATA_REDIS_HOST', os.getenv('REDIS_HOST', 'localhost'))}:"
    f"{os.getenv('SPRING_DATA_REDIS_PORT', os.getenv('REDIS_PORT', '6379'))}/0"
)
if (
    os.getenv("REDIS_DISABLED", "").lower() not in {"1", "true"}
    and not os.getenv("DJANGO_TEST")
    and not RUNNING_TESTS
):
    try:
        CACHES["default"] = {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "IGNORE_EXCEPTIONS": True,
                # Without explicit timeouts an unreachable Redis makes health
                # checks and cache reads block until the TCP stack gives up.
                "SOCKET_CONNECT_TIMEOUT": 2,
                "SOCKET_TIMEOUT": 2,
            },
            "KEY_PREFIX": "techpulse",
        }
    except Exception:
        pass

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)
CELERY_TASK_ALWAYS_EAGER = RUNNING_TESTS or os.getenv("CELERY_TASK_ALWAYS_EAGER", "false").lower() in {
    "1",
    "true",
}
CELERY_TASK_EAGER_PROPAGATES = True

web_origin = os.getenv("WEB_APP_ORIGIN", "https://techbite.onrender.com")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
    r"^http://192\.168\.1\.\d+(?::\d+)?$",
]
CORS_ALLOWED_ORIGINS = [web_origin] if web_origin.startswith("http") else []
CORS_ALLOW_HEADERS = [
    "authorization",
    "content-type",
    "cache-control",
    "x-user-timezone",
    "x-correlation-id",
]
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
CORS_PREFLIGHT_MAX_AGE = 3600

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["core.authentication.FirebaseAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": ["core.renderers.ApiResponseJSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["djangorestframework_camel_case.parser.CamelCaseJSONParser"],
    "EXCEPTION_HANDLER": "core.exceptions.api_exception_handler",
    "UNAUTHENTICATED_USER": None,
}

FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
ALLOW_TEST_AUTH = RUNNING_TESTS or os.getenv("ALLOW_TEST_AUTH", "false").lower() in {"1", "true", "yes"}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_EXPLAIN_API_KEY = os.getenv("GEMINI_EXPLAIN_API_KEY", "")
GEMINI_BASE_URL = os.getenv(
    "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"
)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
GEMINI_FALLBACK_MODELS = [
    m.strip()
    for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.8-flash,gemini-3.6-flash").split(",")
    if m.strip()
]

NEWS_INGESTION_ENABLED = os.getenv("NEWS_INGESTION_ENABLED", "true").lower() in {"1", "true"}
NEWS_MAX_ARTICLES_PER_INGESTION = int(os.getenv("NEWS_MAX_ARTICLES_PER_INGESTION", "20"))
# How old an article may be and still enter the pipeline. The Java backend used
# a hard-coded 24 hours, which starves feeds that publish a few times a week.
NEWS_FRESHNESS_HOURS = int(os.getenv("NEWS_FRESHNESS_HOURS", "24"))
DISCOVERY_THREAD_POOL_SIZE = int(os.getenv("DISCOVERY_THREAD_POOL_SIZE", "10"))
AI_RATE_LIMIT_PER_USER_PER_MINUTE = int(os.getenv("AI_RATE_LIMIT_PER_USER_PER_MINUTE", "12"))
AI_RATE_LIMIT_PER_IP_PER_MINUTE = int(os.getenv("AI_RATE_LIMIT_PER_IP_PER_MINUTE", "30"))
ANDROID_SHA256_FINGERPRINT = os.getenv(
    "ANDROID_SHA256_FINGERPRINT",
    "71:BC:9C:71:07:82:E2:3C:F8:55:A2:33:16:F7:FA:4C:FF:18:E5:B0:08:AD:49:BC:60:09:47:43:1F:57:44:B3",
)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "[{levelname}] {name}: {message}", "style": "{"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "simple"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
