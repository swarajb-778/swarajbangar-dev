"""Document chunking for the RAG pipeline.

Strategy:
  1. Detect fenced code blocks and isolate them — they're never split.
  2. Split prose by paragraph (blank-line separated).
  3. If a paragraph exceeds ``chunk_size``, fall back to sentence splitting.
  4. Greedy-pack adjacent paragraphs/sentences up to ``chunk_size`` with
     ``overlap`` characters of carry-over between chunks.

Resume special case:
  When source type is ``resume``, split by H2 (``## Role — Company``) and
  keep each role as ONE chunk — even if it exceeds the soft size cap.  A
  hiring manager asking "what did Swaraj do at McKinsey?" must retrieve the
  whole McKinsey section, not half of it.

List handling:
  Adjacent bullets (``- item`` / ``* item``) inside a paragraph are kept
  together — we never split a list mid-bullet.

Each chunk dict has the shape::

    {
        "text": str,
        "source": str,
        "chunk_index": int,
        "metadata": {
            "char_start": int,
            "char_end": int,
            "has_code": bool,
            "section": str | None,
        },
    }
"""

import re
from typing import Any

# Fenced code block: ``` ... ``` (with optional language tag).
_CODE_BLOCK_RE = re.compile(r"```[^\n]*\n.*?```", re.DOTALL)

# H2 heading at start of line: "## Title".
_H2_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)

# Sentence terminator — naive but adequate for resume / case-study prose.
_SENTENCE_END_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


def chunk_document(
    text: str,
    source: str,
    chunk_size: int = 500,
    overlap: int = 50,
) -> list[dict[str, Any]]:
    """Split ``text`` into RAG-ready chunks.

    ``source`` is a free-form label like ``"resume"`` or ``"case_study"``.
    When it equals ``"resume"``, role-aware chunking kicks in.
    """
    if not text or not text.strip():
        return []

    if source == "resume":
        return _chunk_resume(text, source)

    return _chunk_prose(text, source, chunk_size, overlap)


# ════════════════════════════════════════════════════════════════════
# ── Resume: keep each role intact ──
# ════════════════════════════════════════════════════════════════════


def _chunk_resume(text: str, source: str) -> list[dict[str, Any]]:
    """Split a resume by H2 headings — one chunk per role/section."""
    matches = list(_H2_HEADING_RE.finditer(text))
    if not matches:
        # No H2 headings — fall back to ordinary paragraph chunking
        # (still using the resume label).
        return _chunk_prose(text, source, chunk_size=600, overlap=50)

    chunks: list[dict[str, Any]] = []
    # Treat any preamble before the first H2 as its own chunk.
    if matches[0].start() > 0:
        preamble = text[: matches[0].start()].strip()
        if preamble:
            chunks.append(
                _make_chunk(
                    text=preamble,
                    source=source,
                    chunk_index=len(chunks),
                    char_start=0,
                    char_end=matches[0].start(),
                    section=None,
                )
            )

    for i, match in enumerate(matches):
        section_title = match.group(1).strip()
        section_start = match.start()
        section_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        section_text = text[section_start:section_end].strip()
        if not section_text:
            continue
        chunks.append(
            _make_chunk(
                text=section_text,
                source=source,
                chunk_index=len(chunks),
                char_start=section_start,
                char_end=section_end,
                section=section_title,
            )
        )

    return chunks


# ════════════════════════════════════════════════════════════════════
# ── Prose: paragraph → sentence fallback ──
# ════════════════════════════════════════════════════════════════════


def _chunk_prose(
    text: str,
    source: str,
    chunk_size: int,
    overlap: int,
) -> list[dict[str, Any]]:
    """Greedy-pack paragraphs (with sentence fallback) into size-bounded chunks."""
    segments = _split_protecting_code(text)

    # Each segment is (segment_text, segment_start_in_full_text, is_code_block).
    # Now flatten: prose segments become paragraphs; code segments stay whole.
    units: list[tuple[str, int, bool]] = []
    for seg_text, seg_start, is_code in segments:
        if is_code:
            units.append((seg_text, seg_start, True))
            continue
        # Split prose into paragraphs (preserve in-text offset for each).
        for para_text, para_offset in _iter_paragraphs(seg_text):
            units.append((para_text, seg_start + para_offset, False))

    # Greedy-pack units into chunks.
    chunks: list[dict[str, Any]] = []
    current_parts: list[tuple[str, int, bool]] = []
    current_len = 0
    current_start: int | None = None
    current_section: str | None = None

    def flush() -> None:
        nonlocal current_parts, current_len, current_start
        if not current_parts:
            return
        chunk_text = "\n\n".join(p[0] for p in current_parts).strip()
        if not chunk_text:
            current_parts = []
            current_len = 0
            current_start = None
            return
        # If the would-be chunk is *only* a heading line, don't emit it —
        # carry the heading forward so it lands with the next paragraph.
        if len(current_parts) == 1 and not current_parts[0][2]:
            only_text = current_parts[0][0].strip()
            if _H2_HEADING_RE.match(only_text) and len(only_text) < 120:
                return
        first_offset = current_parts[0][1]
        last_text, last_offset, _ = current_parts[-1]
        char_end = last_offset + len(last_text)
        has_code = any(p[2] for p in current_parts)
        chunks.append(
            _make_chunk(
                text=chunk_text,
                source=source,
                chunk_index=len(chunks),
                char_start=first_offset,
                char_end=char_end,
                section=current_section,
                has_code=has_code,
            )
        )
        current_parts = []
        current_len = 0
        current_start = None

    for unit_text, unit_offset, is_code in units:
        # Track section by looking for H2 in prose.
        if not is_code:
            heading = _H2_HEADING_RE.match(unit_text)
            if heading:
                # Flush before switching sections so the heading lives with
                # its own bullets, not the previous role's content.
                flush()
                current_section = heading.group(1).strip()

        unit_len = len(unit_text)

        # Code blocks are never split — flush current and emit on their own
        # if they wouldn't fit alongside accumulated prose.
        if is_code:
            if current_len + unit_len > chunk_size and current_parts:
                flush()
            current_parts.append((unit_text, unit_offset, True))
            current_len += unit_len
            if current_len >= chunk_size:
                flush()
            continue

        # Oversized prose paragraph — split by sentence and re-feed.
        # Deliberately do NOT pre-flush: when current_parts holds just a
        # short H2 heading, we want the heading to ride with the first
        # few sentences so we don't emit a 10-character chunk.
        if unit_len > chunk_size:
            for sent_text, sent_offset in _iter_sentences(unit_text):
                abs_offset = unit_offset + sent_offset
                sent_len = len(sent_text)
                if current_len + sent_len > chunk_size and current_parts:
                    flush()
                current_parts.append((sent_text, abs_offset, False))
                current_len += sent_len
            continue

        # Normal paragraph — pack into the current chunk if it fits.
        if current_len + unit_len > chunk_size and current_parts:
            # Flush current chunk; carry overlap into the next.
            carry = _tail_overlap(current_parts, overlap)
            flush()
            if carry:
                current_parts.append(carry)
                current_len += len(carry[0])
        current_parts.append((unit_text, unit_offset, False))
        current_len += unit_len

    flush()
    return chunks


# ════════════════════════════════════════════════════════════════════
# ── Helpers ──
# ════════════════════════════════════════════════════════════════════


def _split_protecting_code(text: str) -> list[tuple[str, int, bool]]:
    """Return segments of ``text`` marking which ones are code blocks.

    Output is a list of ``(segment_text, start_offset, is_code_block)``.
    Non-code segments may contain multiple paragraphs; the caller is
    responsible for paragraph-splitting them.
    """
    segments: list[tuple[str, int, bool]] = []
    cursor = 0
    for match in _CODE_BLOCK_RE.finditer(text):
        if match.start() > cursor:
            segments.append((text[cursor : match.start()], cursor, False))
        segments.append((match.group(0), match.start(), True))
        cursor = match.end()
    if cursor < len(text):
        segments.append((text[cursor:], cursor, False))
    return segments


def _iter_paragraphs(text: str):
    """Yield ``(paragraph_text, offset_in_text)`` for each blank-line block.

    Paragraphs are stripped of leading/trailing whitespace but the offset
    tracks the *unstripped* start so char_start in metadata is faithful.
    """
    cursor = 0
    for raw in re.split(r"\n\s*\n", text):
        if not raw:
            cursor += 2  # account for the blank line separator we just consumed
            continue
        # Find this paragraph's actual position from the cursor onward.
        offset = text.find(raw, cursor)
        if offset == -1:
            offset = cursor
        stripped = raw.strip()
        if stripped:
            yield stripped, offset
        cursor = offset + len(raw)


def _iter_sentences(text: str):
    """Yield ``(sentence_text, offset_in_text)`` from a paragraph."""
    cursor = 0
    pieces = _SENTENCE_END_RE.split(text)
    for piece in pieces:
        if not piece.strip():
            continue
        offset = text.find(piece, cursor)
        if offset == -1:
            offset = cursor
        yield piece.strip(), offset
        cursor = offset + len(piece)


def _tail_overlap(
    parts: list[tuple[str, int, bool]],
    overlap: int,
) -> tuple[str, int, bool] | None:
    """Return a ``(text, offset, is_code)`` triple carrying the trailing
    ``overlap`` chars from the last non-code part, or ``None`` if no
    suitable carry-over exists.
    """
    if overlap <= 0:
        return None
    for part_text, part_offset, is_code in reversed(parts):
        if is_code:
            continue
        if len(part_text) <= overlap:
            return (part_text, part_offset, False)
        tail = part_text[-overlap:]
        # Snap to a word boundary if we can.
        space = tail.find(" ")
        if 0 < space < overlap:
            tail = tail[space + 1 :]
        offset = part_offset + len(part_text) - len(tail)
        return (tail, offset, False)
    return None


def _make_chunk(
    *,
    text: str,
    source: str,
    chunk_index: int,
    char_start: int,
    char_end: int,
    section: str | None = None,
    has_code: bool | None = None,
) -> dict[str, Any]:
    """Assemble a chunk dict with consistent metadata."""
    if has_code is None:
        has_code = "```" in text
    return {
        "text": text,
        "source": source,
        "chunk_index": chunk_index,
        "metadata": {
            "char_start": char_start,
            "char_end": char_end,
            "has_code": has_code,
            "section": section,
        },
    }
