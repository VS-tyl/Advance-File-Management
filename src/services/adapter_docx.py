"""DOCX adapter: extract plain text from .docx bytes.

Note: requires the third-party package `python-docx` (pip install python-docx).
If the wrong `docx` package is installed or a local `docx.py` shadows the package,
importing Document will raise an ImportError or ModuleNotFoundError. The code
below surfaces a helpful error message in that case.
"""
from __future__ import annotations

import io
from typing import Optional

try:
    from docx import Document
except Exception as exc:  # defensive to capture wrong package or missing dependency
    raise ImportError(
        "Failed to import python-docx. Make sure you have installed `python-docx` "
        "and you don't have a local `docx.py` that shadows the package. "
        f"Original error: {exc}"
    )

from src.interface.adapter_extension import AdapterExtensionInterface


class AdapterDocx(AdapterExtensionInterface):
    """Adapter that extracts text from a .docx file's bytes.

    Returns an empty string on non-fatal parsing errors to preserve caller flow.
    """

    def extract_text(self, raw_data: bytes) -> str:
        if not raw_data:
            return ""

        try:
            document = Document(io.BytesIO(raw_data))
            paragraphs = [p.text for p in document.paragraphs]
            return "\n".join(paragraphs)
        except Exception:
            # don't propagate parser errors; caller can decide how to handle empty text
            return ""
