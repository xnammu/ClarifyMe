from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Optional

# Vendor the repo unmodified and reach its package via sys.path, rather than editing
# depixlib itself. If upstream changes, only this file needs to change.
_VENDOR_DIR = Path(__file__).resolve().parent.parent / "vendor" / "depixelization_poc"
if str(_VENDOR_DIR) not in sys.path:
    sys.path.insert(0, str(_VENDOR_DIR))

from depixlib.LoadedImage import LoadedImage  # noqa: E402
from depixlib.Rectangle import Rectangle  # noqa: E402
from depixlib.functions import (  # noqa: E402
    dropEmptyRectangleMatches,
    findGeometricMatchesForSingleResults,
    findRectangleMatches,
    findRectangleSizeOccurences,
    findSameColorSubRectangles,
    removeMootColorRectangles,
    splitSingleMatchAndMultipleMatches,
    writeAverageMatchToImage,
    writeFirstMatchToImage,
)

from .base import BaseEngine, EngineOptionError, EngineResult, OptionField, ResultType


def _parse_background_color(value: Optional[str]) -> Optional[tuple[int, int, int]]:
    if not value:
        return None
    parts = [p.strip() for p in value.split(",")]
    if len(parts) != 3:
        raise EngineOptionError("background_color must be formatted as 'r,g,b', e.g. '40,41,35'.")
    try:
        r, g, b = (int(p) for p in parts)
    except ValueError as exc:
        raise EngineOptionError("background_color values must be integers 0-255.") from exc
    return (r, g, b)


class POCEngine(BaseEngine):
    id = "poc"
    name = "Depixelization POC"
    description = (
        "Rectangle-matching approach. Needs a second 'search pattern' image made "
        "with the same font/editor/size as the pixelated original."
    )
    result_type = ResultType.IMAGE
    requires_second_image = True
    second_image_label = (
        "Search pattern image (a screenshot of a De Bruijn sequence typed in the "
        "same editor, font and size as the original screenshot)"
    )

    @classmethod
    def get_options_schema(cls) -> list[dict[str, Any]]:
        return [
            OptionField(
                key="average_type",
                label="Averaging mode",
                type="select",
                default="gammacorrected",
                options=["gammacorrected", "linear"],
                help="Match the tool that pixelated the image: most tools (e.g. Greenshot) "
                     "average gamma-encoded values; some (e.g. GIMP) average in linear sRGB.",
            ).to_dict(),
            OptionField(
                key="background_color",
                label="Editor background color to ignore (r,g,b)",
                type="text",
                required=False,
                help="Optional. Filters out solid-color blocks that are just editor background.",
            ).to_dict(),
        ]

    def process(
        self,
        input_path: Path,
        output_dir: Path,
        options: dict[str, Any],
        second_image_path: Optional[Path] = None,
    ) -> EngineResult:
        if second_image_path is None:
            raise EngineOptionError("The POC engine requires a search pattern image.")

        average_type = options.get("average_type") or "gammacorrected"
        if average_type not in ("gammacorrected", "linear"):
            raise EngineOptionError("average_type must be 'gammacorrected' or 'linear'.")
        background_color = _parse_background_color(options.get("background_color"))

        pixelated_image = LoadedImage(str(input_path))
        output_image = pixelated_image.getCopyOfLoadedPILImage()
        search_image = LoadedImage(str(second_image_path))

        pixelated_rect = Rectangle((0, 0), (pixelated_image.width - 1, pixelated_image.height - 1))

        sub_rects = findSameColorSubRectangles(pixelated_image, pixelated_rect)
        sub_rects = removeMootColorRectangles(sub_rects, background_color)
        size_occurrences = findRectangleSizeOccurences(sub_rects)

        matches = findRectangleMatches(size_occurrences, sub_rects, search_image, average_type)
        sub_rects = dropEmptyRectangleMatches(matches, sub_rects)

        single_results, sub_rects = splitSingleMatchAndMultipleMatches(sub_rects, matches)
        # Two passes, matching upstream depix.py - the second pass catches squares that
        # only became resolvable after the first pass's geometric inference.
        single_results, sub_rects = findGeometricMatchesForSingleResults(single_results, sub_rects, matches)
        single_results, sub_rects = findGeometricMatchesForSingleResults(single_results, sub_rects, matches)

        writeFirstMatchToImage(single_results, matches, search_image, output_image)
        writeAverageMatchToImage(sub_rects, matches, search_image, output_image)

        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / "poc_result.png"
        output_image.save(output_path)

        return EngineResult(
            result_type=ResultType.IMAGE,
            image_path=output_path,
            metadata={
                "average_type": average_type,
                "background_color": background_color,
                "single_matches": len(single_results),
                "unresolved_blocks": len(sub_rects),
            },
        )
