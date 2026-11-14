from djangorestframework_camel_case.render import CamelCaseJSONRenderer

from core.response import api_payload


class ApiResponseJSONRenderer(CamelCaseJSONRenderer):
    """Render camelCase JSON and put every DRF result in the legacy API envelope."""

    def render(self, data, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        response = renderer_context.get("response")
        request = renderer_context.get("request")
        is_envelope = isinstance(data, dict) and {
            "success", "message", "data", "timestamp", "traceId"
        }.issubset(data)

        if not is_envelope:
            status_code = getattr(response, "status_code", 200)
            message = "OK" if status_code < 400 else "Request failed"
            if isinstance(data, dict) and isinstance(data.get("message"), str):
                message = data["message"]
            data = api_payload(
                status_code < 400,
                message,
                data,
                getattr(request, "correlation_id", None),
            )
        elif data.get("traceId") is None:
            data["traceId"] = getattr(request, "correlation_id", None)

        return super().render(data, accepted_media_type, renderer_context)
