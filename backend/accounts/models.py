from django.db import models
from django.utils import timezone


class Category(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    follower_count = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = "categories"

    def __str__(self):
        return self.name


class UserAccount(models.Model):
    class Role(models.TextChoices):
        USER = "USER", "User"
        ADMIN = "ADMIN", "Admin"

    id = models.BigAutoField(primary_key=True)
    firebase_uid = models.CharField(max_length=128, unique=True)
    email = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(max_length=100, null=True, blank=True)
    profile_picture_url = models.CharField(max_length=500, null=True, blank=True)
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.USER)
    push_token = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    preferences = models.ManyToManyField(
        Category,
        through="UserPreference",
        related_name="followers",
        blank=True,
    )

    class Meta:
        db_table = "users"
        indexes = [models.Index(fields=["firebase_uid"], name="idx_users_firebase_uid")]


class UserPreference(models.Model):
    pk = models.CompositePrimaryKey("user", "category")
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, db_column="user_id")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, db_column="category_id")
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "user_preferences"
        indexes = [
            models.Index(fields=["user", "category"], name="idx_pref_user_category"),
            models.Index(fields=["category"], name="idx_pref_category_id"),
        ]


class LoginAudit(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField(null=True, blank=True)
    firebase_uid = models.CharField(max_length=128, null=True, blank=True)
    ip_address = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "login_audit"


class UserProfile(models.Model):
    user_id = models.BigIntegerField(primary_key=True)
    preferred_difficulty_level = models.CharField(max_length=50, default="ALL", null=True, blank=True)
    categories_json = models.TextField(null=True, blank=True)
    technologies_json = models.TextField(null=True, blank=True)
    frameworks_json = models.TextField(null=True, blank=True)
    languages_json = models.TextField(null=True, blank=True)
    cloud_providers_json = models.TextField(null=True, blank=True)
    companies_json = models.TextField(null=True, blank=True)
    products_json = models.TextField(null=True, blank=True)
    cves_json = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = "user_profile"


class UserInterest(models.Model):
    pk = models.CompositePrimaryKey("user_id", "interest_type", "interest_key")
    user_id = models.BigIntegerField()
    interest_type = models.CharField(max_length=50)
    interest_key = models.CharField(max_length=255)
    weight = models.FloatField(default=0.0, null=True, blank=True)
    last_interaction_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = "user_interest"


class UserFollow(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    entity_name = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=50)
    followed_at = models.DateTimeField(default=timezone.now, null=True, blank=True)

    class Meta:
        db_table = "user_follow"
        constraints = [
            models.UniqueConstraint(
                fields=["user_id", "entity_name", "entity_type"],
                name="idx_user_follow_entity",
            )
        ]
