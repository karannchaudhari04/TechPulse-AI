from __future__ import annotations

import calendar
import hashlib
import re
from datetime import datetime
from html import unescape

from bs4 import BeautifulSoup

STOP_WORDS = {
    "the",
    "a",
    "an",
    "in",
    "on",
    "at",
    "for",
    "with",
    "is",
    "of",
    "to",
    "and",
    "or",
    "by",
    "that",
    "this",
    "it",
}


def sha256(text: str | None) -> str:
    if text is None:
        return ""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalize_title(title: str | None) -> str:
    if not title:
        return ""
    cleaned = re.sub(r"[^a-z0-9\s]", "", title.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def has_token_overlap(title1: str | None, title2: str | None) -> bool:
    tokens1 = {
        token
        for token in normalize_title(title1).split(" ")
        if token and token not in STOP_WORDS
    }
    tokens2 = {
        token
        for token in normalize_title(title2).split(" ")
        if token and token not in STOP_WORDS
    }
    overlap = tokens1 & tokens2
    return len(overlap) >= 2 or (
        len(overlap) >= 1 and (len(tokens2) <= 3 or len(tokens1) == len(tokens2))
    )


def clean_html(html: str | None) -> str:
    if html is None:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n")
    text = unescape(text)
    text = re.sub(r"\r?\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t\x0b\f]+", " ", text)
    return text.strip()


def text_content(html: str | None) -> str:
    if html is None:
        return ""
    return BeautifulSoup(html, "html.parser").get_text(" ").strip()


def utc_struct_to_local_datetime(parsed) -> datetime | None:
    if not parsed:
        return None
    try:
        timestamp = calendar.timegm(parsed)
        return datetime.fromtimestamp(timestamp)
    except (TypeError, ValueError, OverflowError):
        return None
