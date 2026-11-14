from __future__ import annotations

from django.core.cache import cache
from django.db import IntegrityError, transaction

from accounts.models import Category, UserAccount


def evict_user_cache(firebase_uid: str | None):
    if firebase_uid:
        cache.delete(f"user-role:{firebase_uid}")


def _update_user(user: UserAccount, email, display_name, photo_url) -> UserAccount:
    if display_name is not None and str(display_name).strip() and display_name != "Tech Explorer":
        user.display_name = str(display_name).strip()
    elif not user.display_name:
        user.display_name = "Tech Explorer"
    if photo_url is not None and str(photo_url).strip():
        user.profile_picture_url = str(photo_url).strip()
    if email is not None and str(email).strip():
        user.email = str(email).strip()
    user.save()
    return user


def sync_user(firebase_uid: str, email, display_name, photo_url) -> UserAccount:
    evict_user_cache(firebase_uid)
    existing = UserAccount.objects.filter(firebase_uid=firebase_uid).first()
    if existing is not None:
        user = _update_user(existing, email, display_name, photo_url)
        evict_user_cache(firebase_uid)
        return user

    if email:
        recovered = UserAccount.objects.filter(email=email).first()
        if recovered is not None:
            recovered.firebase_uid = firebase_uid
            user = _update_user(recovered, email, display_name, photo_url)
            evict_user_cache(firebase_uid)
            return user

    try:
        with transaction.atomic():
            user = UserAccount.objects.create(
                firebase_uid=firebase_uid,
                email=email if email else f"{firebase_uid}@unknown.com",
                display_name=display_name if display_name else None,
                profile_picture_url=photo_url if photo_url else None,
            )
        evict_user_cache(firebase_uid)
        return user
    except IntegrityError:
        user = UserAccount.objects.filter(firebase_uid=firebase_uid).first()
        if user is None and email:
            user = UserAccount.objects.filter(email=email).first()
        if user is None:
            raise
        evict_user_cache(firebase_uid)
        return user


def preference_categories(user: UserAccount) -> list[Category]:
    return list(Category.objects.filter(followers__id=user.id).order_by("name"))


def save_preferences(user: UserAccount, category_names: list[str]) -> list[Category]:
    all_categories = list(Category.objects.all())
    by_lower_name = {category.name.lower(): category for category in all_categories}
    desired = {
        by_lower_name[name.lower()]
        for name in category_names
        if isinstance(name, str) and name.lower() in by_lower_name
    }
    old = set(preference_categories(user))

    for category in desired - old:
        category.follower_count = (category.follower_count or 0) + 1
        category.save(update_fields=["follower_count"])
    for category in old - desired:
        category.follower_count = max(0, (category.follower_count or 0) - 1)
        category.save(update_fields=["follower_count"])

    user.preferences.set(desired)
    evict_user_cache(user.firebase_uid)
    return sorted(desired, key=lambda category: category.name)


def profile_payload(user: UserAccount) -> dict:
    preferences = preference_categories(user)
    from library.models import UserSavedEvent

    return {
        "uid": user.firebase_uid,
        "email": user.email,
        "displayName": user.display_name,
        "photoUrl": user.profile_picture_url,
        "roles": [user.role],
        "preferences": [category.name for category in preferences],
        "followedTechnologies": [],
        "isOnboarded": bool(preferences),
        "preferencesCount": len(preferences),
        "savedBitesCount": UserSavedEvent.objects.filter(user_id=user.id).count(),
        "role": user.role,
    }
