from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Category
from ingestion.models import NewsSource

# Mirrors the Java backend's startup seeder (TechPulseApplication#seedData and
# resources/data.sql). The Django port never seeded these tables, so a fresh
# deployment had no news sources at all and discovery always found nothing.
DEFAULT_SOURCES = [
    ("Economic Times Tech (ETTech)", "https://economictimes.indiatimes.com/tech/rssfeeds/13357204.cms"),
    ("The Hindu Tech", "https://www.thehindu.com/sci-tech/technology/feeder/default.rss"),
    ("YourStory Tech (Indian Startups)", "https://yourstory.com/category/tech/feed"),
    ("GeeksforGeeks (India DSA/Prep)", "https://www.geeksforgeeks.org/feed/"),
    ("Hacker News (FAANG/System Design)", "https://hnrss.org/frontpage"),
    ("Dev.to (Developer Tutorials)", "https://dev.to/feed"),
    ("FreeCodeCamp", "https://www.freecodecamp.org/news/rss/"),
    ("Gadgets360 (NDTV Tech)", "https://feeds.feedburner.com/gadgets360-latest"),
    ("InfoQ (Architecture & Cloud)", "https://feed.infoq.com/"),
    ("AWS Architecture Blog", "https://aws.amazon.com/blogs/architecture/feed/"),
    ("Android Developers Blog", "https://android-developers.googleblog.com/feeds/posts/default"),
    ("Kubernetes Blog (DevOps)", "https://kubernetes.io/feed.xml"),
    ("HackerNoon", "https://hackernoon.com/feed"),
    ("Towards Data Science", "https://towardsdatascience.com/feed"),
    ("Smashing Magazine", "https://www.smashingmagazine.com/feed/"),
    ("GitHub Blog", "https://github.blog/feed/"),
    ("The Kotlin Blog", "https://blog.jetbrains.com/kotlin/feed/"),
    ("Spring Blog", "https://spring.io/blog.atom"),
    ("TechCrunch Startups", "https://techcrunch.com/category/startups/feed/"),
    ("UX Collective", "https://uxdesign.cc/feed"),
    ("KDnuggets", "https://www.kdnuggets.com/feed"),
    ("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("Red Hat Developer", "https://developers.redhat.com/blog/feed"),
]

DEFAULT_CATEGORIES = [
    ("Problem Solving", "Master the fundamentals of DSA and solve complex problems"),
    ("Development", "Build web, mobile, frontend, and backend applications"),
    ("AI & Machine Learning", "Neural networks, LLMs, and intelligent engineering"),
    ("Cloud & DevOps", "Docker, Kubernetes, CI/CD, and cloud scaling"),
    ("System Design & Backend", "Scale distributed systems and write optimized backend code"),
    ("Cybersecurity", "Auditing, security principles, and digital forensics"),
    ("Data Science & Analytics", "Big Data, analytics, visualization, and engineering"),
    ("Product & UI/UX", "Interface design, Figma workflows, and user psychology"),
    ("Open Source & GitHub", "Contribute to community code and master git workflows"),
    ("Career & Placements", "Cracking FAANG internships, resume optimization, and prep"),
    ("Emerging Tech", "Quantum computing, Web3, blockchain, and tech future"),
]


class Command(BaseCommand):
    help = (
        "Idempotently seed the news sources and categories the pipeline needs. "
        "Safe to run on every deploy: existing rows are left untouched."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be created without writing.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        with transaction.atomic():
            created_sources = self._seed_sources(dry_run)
            created_categories = self._seed_categories(dry_run)

        active_sources = NewsSource.objects.filter(active=True).count()
        self.stdout.write(
            f"News sources: created {created_sources}, total {NewsSource.objects.count()}, "
            f"active {active_sources}."
        )
        self.stdout.write(
            f"Categories: created {created_categories}, total {Category.objects.count()}."
        )
        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run: no changes were written."))

    def _seed_sources(self, dry_run: bool) -> int:
        created = 0
        for name, url in DEFAULT_SOURCES:
            existing = (
                NewsSource.objects.filter(url=url).first()
                or NewsSource.objects.filter(name=name).first()
            )
            if existing is not None:
                # The Java seeder shipped two dead feed URLs; an existing row is
                # repaired in place instead of being duplicated under a new id.
                if existing.url != url:
                    self.stdout.write(f"  ~ source {name} -> {url}")
                    if not dry_run:
                        existing.url = url
                        existing.save(update_fields=["url"])
                continue
            created += 1
            self.stdout.write(f"  + source {name} <{url}>")
            if not dry_run:
                NewsSource.objects.get_or_create(
                    url=url, defaults={"name": name, "active": True}
                )
        return created

    def _seed_categories(self, dry_run: bool) -> int:
        created = 0
        for name, description in DEFAULT_CATEGORIES:
            if Category.objects.filter(name=name).exists():
                continue
            created += 1
            self.stdout.write(f"  + category {name}")
            if not dry_run:
                Category.objects.get_or_create(
                    name=name, defaults={"description": description}
                )
        return created
