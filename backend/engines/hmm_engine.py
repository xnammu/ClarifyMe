from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Optional

from PIL import Image, ImageFont
from PIL.ImageFont import FreeTypeFont

_VENDOR_DIR = Path(__file__).resolve().parent.parent / "vendor" / "depixhmm"
if str(_VENDOR_DIR) not in sys.path:
    sys.path.insert(0, str(_VENDOR_DIR))

# Compatibility shim: the vendored repo (pinned to Pillow==8.3.2) calls font.getsize(),
# which Pillow removed in v10 in favor of getbbox()/getlength(). Patching it here - at
# the wrapper boundary - keeps the vendored source untouched. If you instead run this
# engine in its own venv with Pillow pinned to 8.3.2, this shim is a harmless no-op.
if not hasattr(FreeTypeFont, "getsize"):

    def _getsize_compat(self, text, *args, **kwargs):
        left, top, right, bottom = self.getbbox(text)
        return (right - left, bottom - top)

    FreeTypeFont.getsize = _getsize_compat

from resources.fonts import DemoFontPaths  # noqa: E402
from text_depixelizer.HMM.depix_hmm import DepixHMM  # noqa: E402
from text_depixelizer.parameters import PictureParameters, TrainingParameters  # noqa: E402

from .base import BaseEngine, EngineOptionError, EngineResult, OptionField, ResultType

# The repo only ships two demo fonts. Add more .ttf files under vendor/depixhmm/resources/fonts
# and register them here to support other editors/terminals.
FONT_PATHS: dict[str, Path] = {
    "arial": Path(DemoFontPaths.arial),
    "micr": Path(DemoFontPaths.micr),
}


class HMMEngine(BaseEngine):
    id = "hmm"
    name = "DepixHMM"
    description = (
        "Trains a Hidden Markov Model on synthetic data matching your font and text "
        "pattern, then decodes the pixelated image. Returns recovered TEXT, not an "
        "image. Slower than the POC engine because training happens per request."
    )
    result_type = ResultType.TEXT
    requires_second_image = False

    @classmethod
    def get_options_schema(cls) -> list[dict[str, Any]]:
        return [
            OptionField(
                key="font",
                label="Font used in the original screenshot",
                type="select",
                default="arial",
                options=list(FONT_PATHS.keys()),
            ).to_dict(),
            OptionField(
                key="font_size",
                label="Font size (px)",
                type="number",
                default=50,
            ).to_dict(),
            OptionField(
                key="pattern",
                label="Regex describing the hidden text",
                type="text",
                default=r"[a-zA-Z0-9]{6,9}",
                help=r"e.g. \d{8,12} for a numeric account number, [a-zA-Z0-9]{6,9} for a password.",
            ).to_dict(),
            OptionField(
                key="block_size",
                label="Pixelation block size (px)",
                type="number",
                default=8,
                required=True,
                help="Measure this from the pixelated image - it's the size of one solid-color square.",
            ).to_dict(),
            OptionField(
                key="window_size",
                label="Window size (advanced)",
                type="number",
                default=5,
            ).to_dict(),
            OptionField(
                key="offset_y",
                label="Vertical offset (advanced)",
                type="number",
                default=0,
            ).to_dict(),
            OptionField(
                key="n_img_train",
                label="Training images (accuracy vs. speed)",
                type="number",
                default=1000,
                help="Higher = more accurate but much slower. Training happens on every request.",
            ).to_dict(),
            OptionField(
                key="n_img_test",
                label="Evaluation images",
                type="number",
                default=100,
            ).to_dict(),
            OptionField(
                key="n_clusters",
                label="Clusters",
                type="number",
                default=300,
            ).to_dict(),
        ]

    def process(
        self,
        input_path: Path,
        output_dir: Path,
        options: dict[str, Any],
        second_image_path: Optional[Path] = None,
    ) -> EngineResult:
        font_key = options.get("font", "arial")
        if font_key not in FONT_PATHS:
            raise EngineOptionError(f"Unknown font '{font_key}'. Choose from {list(FONT_PATHS.keys())}.")

        pattern = options.get("pattern") or r"[a-zA-Z0-9]{6,9}"
        try:
            re.compile(pattern)
        except re.error as exc:
            raise EngineOptionError(f"'{pattern}' is not a valid regex: {exc}") from exc

        try:
            font_size = int(options.get("font_size", 50))
            block_size = int(options.get("block_size", 8))
            window_size = int(options.get("window_size", 5))
            offset_y = int(options.get("offset_y", 0))
            n_img_train = int(options.get("n_img_train", 1000))
            n_img_test = int(options.get("n_img_test", 100))
            n_clusters = int(options.get("n_clusters", 300))
        except (TypeError, ValueError) as exc:
            raise EngineOptionError(f"Numeric option was not a valid integer: {exc}") from exc

        if block_size <= 0:
            raise EngineOptionError("block_size must be a positive integer.")

        picture_parameters = PictureParameters(
            pattern=pattern,
            font=ImageFont.truetype(str(FONT_PATHS[font_key]), font_size),
            block_size=block_size,
            window_size=window_size,
            offset_y=offset_y,
        )
        training_parameters = TrainingParameters(
            n_img_train=n_img_train,
            n_img_test=n_img_test,
            n_clusters=n_clusters,
        )

        hmm = DepixHMM(picture_parameters, training_parameters)
        hmm.train()
        accuracy, average_distance = hmm.evaluate()

        with Image.open(input_path) as raw_img:
            # Training images are always generated as RGB. A user-supplied PNG saved via a
            # browser (rather than downloaded raw) commonly comes back as RGBA or palette
            # mode instead, which silently changes the per-window feature count and breaks
            # clustering with a shape mismatch that has nothing to do with block_size/
            # window_size. Normalize here so that whole class of failure can't happen.
            img = raw_img.convert("RGB")
            try:
                reconstructed = hmm.test_image(img)
            except ValueError as exc:
                if "features" in str(exc):
                    raise EngineOptionError(
                        "The image doesn't match these settings. This engine trains on "
                        f"synthetic text rendered at font_size={font_size}/block_size="
                        f"{block_size}/window_size={window_size}, then samples the real "
                        "image assuming the same pixel-block size - if the actual "
                        "pixelated squares in your image are a different size (or it "
                        "isn't a pixelated-text screenshot at all), the sampled data "
                        "won't match what the model was trained on. Measure the real "
                        "block size in your image (zoom in - it's the width in pixels "
                        f"of one solid-color square) and set block_size to that. "
                        f"(Underlying error: {exc})"
                    ) from exc
                raise

        return EngineResult(
            result_type=ResultType.TEXT,
            text=reconstructed,
            metadata={
                "training_accuracy": accuracy,
                "average_distance": average_distance,
                "font": font_key,
                "font_size": font_size,
                "block_size": block_size,
            },
        )
