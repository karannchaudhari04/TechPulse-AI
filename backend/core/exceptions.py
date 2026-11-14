from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.views import exception_handler

from core.response import api_payload


def api_exception_handler(exc, context):
    request = context.get("request")
    trace_id = getattr(request, "correlation_id", None)

    if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        return _r(False, str(exc.detail) if hasattr(exc, "detail") else "Not authenticated", 401, trace_id)
    if isinstance(exc, PermissionDenied):
        return _r(False, "You do not have permission to access this resource.", 403, trace_id)
    if isinstance(exc, ValidationError):
        message = exc.detail
        if isinstance(message, list):
            message = str(message[0])
        elif isinstance(message, dict):
            first = next(iter(message.values()))
            message = str(first[0] if isinstance(first, list) else first)
        return _r(False, str(message), 400, trace_id)

    response = exception_handler(exc, context)
    if response is not None:
        message = response.data.get("detail") if isinstance(response.data, dict) else str(response.data)
        response.data = api_payload(False, str(message), None, trace_id)
        return response
    return _r(False, "An unexpected error occurred on the server.", 500, trace_id)


def _r(success, message, status, trace_id):
    from rest_framework.response import Response

    return Response(api_payload(success, message, None, trace_id), status=status)
