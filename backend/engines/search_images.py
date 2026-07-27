from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

SEARCH_IMAGES_DIR = (
    Path(__file__).resolve().parent.parent / "vendor" / "depixelization_poc" / "images" / "searchimages"
)


@dataclass(frozen=True)
class SearchImageOption:
    id: str
    filename: str
    label: str
    note: str


# These only help if your screenshot was actually made with a matching editor/font/OS.
# We surface that explicitly in `note` rather than silently trying them as a fallback -
# a mismatched one produces confident-looking garbage, not an error.
BUNDLED_SEARCH_IMAGES: list[SearchImageOption] = [
    SearchImageOption(
        id="notepad-win10-close-spaced",
        filename="debruinseq_notepad_Windows10_closeAndSpaced.png",
        label="Notepad - Windows 10 (tight + spaced)",
        note="Matches Notepad's default font on Windows 10, covering both tightly-kerned and letter-spaced text.",
    ),
    SearchImageOption(
        id="notepad-win10-close",
        filename="debruinseq_notepad_Windows10_close.png",
        label="Notepad - Windows 10 (tight)",
        note="Matches Notepad's default font on Windows 10 with normal letter spacing.",
    ),
    SearchImageOption(
        id="notepad-win10-spaced",
        filename="debruinseq_notepad_Windows10_spaced.png",
        label="Notepad - Windows 10 (spaced)",
        note="Matches Notepad's default font on Windows 10 with extra letter spacing.",
    ),
    SearchImageOption(
        id="notepad-win7-close",
        filename="debruinseq_notepad_Windows7_close.png",
        label="Notepad - Windows 7",
        note="Matches Notepad's default font on Windows 7.",
    ),
    SearchImageOption(
        id="sublime-linux-small",
        filename="debruin_sublime_Linux_small.png",
        label="Sublime Text - Linux (small)",
        note="Matches Sublime Text's default rendering on Linux at a small size. Usually needs average_type=linear.",
    ),
]


def list_available_search_images() -> list[SearchImageOption]:
    return [opt for opt in BUNDLED_SEARCH_IMAGES if (SEARCH_IMAGES_DIR / opt.filename).exists()]


def get_search_image_path(image_id: str) -> Optional[Path]:
    for opt in BUNDLED_SEARCH_IMAGES:
        if opt.id == image_id:
            path = SEARCH_IMAGES_DIR / opt.filename
            return path if path.exists() else None
    return None
