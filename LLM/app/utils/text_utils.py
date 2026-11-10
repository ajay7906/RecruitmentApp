import re
import unicodedata
from typing import List


def clean_resume_text(raw_text: str) -> str:
    """
    Normalizes Unicode characters, strips control characters and null bytes,
    repairs hyphenated line breaks, and collapses excessive whitespace while
    preserving section boundaries.
    """
    if not raw_text:
        return ""
    text = unicodedata.normalize("NFKC", str(raw_text))
    text = text.replace("\x00", "")
    # Replace common bullet symbols with standard hyphen bullets
    text = re.sub(r"[•●▪▸◦‣]", "- ", text)
    # Repair words broken across lines with a hyphen (e.g., "micro-\nservices" -> "microservices")
    text = re.sub(r"([a-zA-Z])-\r?\n\s*([a-zA-Z])", r"\1\2", text)
    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Remove non-printable control chars except newline and tab
    text = re.sub(r"[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]", " ", text)
    # Collapse horizontal spaces
    text = re.sub(r"[ \t]+", " ", text)
    # Trim spaces around newlines and limit consecutive blank lines to 2
    lines = [line.strip() for line in text.split("\n")]
    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def extract_relevant_excerpts(text: str, keywords: List[str], max_chars: int = 1600) -> str:
    """
    Extracts compact, high-signal resume excerpts matching job keywords so Gemini
    prompts stay small and grounded in verbatim candidate evidence.
    """
    if not text:
        return ""
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    if not keywords:
        return "\n".join(lines)[:max_chars]

    lower_kw = [k.lower() for k in keywords if k]
    scored_lines = []
    for idx, ln in enumerate(lines):
        low = ln.lower()
        hits = sum(1 for kw in lower_kw if kw in low)
        if hits > 0:
            scored_lines.append((hits, idx, ln))

    scored_lines.sort(key=lambda item: (-item[0], item[1]))
    selected_indices = sorted({item[1] for item in scored_lines[:18]})

    if not selected_indices:
        return "\n".join(lines[:20])[:max_chars]

    chosen = [lines[i] for i in selected_indices]
    joined = "\n".join(chosen)
    return joined[:max_chars]
