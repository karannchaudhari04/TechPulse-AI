from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from core.authentication import request_user


class IsAuthenticatedUser(BasePermission):
    def has_permission(self, request, view):
        user = request_user(request)
        if user is None:
            raise AuthenticationFailed("Not authenticated")
        return True


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request_user(request)
        if user is None:
            raise AuthenticationFailed("Not authenticated")
        if not user.is_admin:
            raise PermissionDenied("You do not have permission to access this resource.")
        return True
