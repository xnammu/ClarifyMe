from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class ResultType(str, Enum):
    """The two engines return fundamentally different things - be explicit about it
    instead of assuming every engine returns an image."""

    IMAGE = "image"
    TEXT = "text"


class EngineOptionError(ValueError):
    """Raised when the options/inputs passed to an engine are invalid. The API layer
    turns this into a 400 response with the message shown to the user."""


@dataclass
class EngineResult:
    result_type: ResultType
    image_path: Optional[Path] = None
    text: Optional[str] = None
    # Free-form stats surfaced in the UI: rectangles found, HMM accuracy, timing, etc.
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class OptionField:
    """Describes one input field an engine needs, so the frontend can render a form
    without hardcoding per-engine UI. Kept intentionally simple (no full JSON-schema)."""

    key: str
    label: str
    type: str  # "text" | "number" | "select"
    default: Any = None
    required: bool = False
    help: Optional[str] = None
    options: Optional[list[str]] = None  # only used when type == "select"

    def to_dict(self) -> dict[str, Any]:
        d = {
            "key": self.key,
            "label": self.label,
            "type": self.type,
            "default": self.default,
            "required": self.required,
        }
        if self.help:
            d["help"] = self.help
        if self.options:
            d["options"] = self.options
        return d


class BaseEngine(ABC):
    """Every engine (current or future) implements this. The API and frontend never
    talk to depixlib / text_depixelizer directly - only through this interface."""

    id: str
    name: str
    description: str = ""
    result_type: ResultType

    # POC needs a second "search pattern" image; HMM doesn't. Declaring it here lets
    # the frontend show/hide the second dropzone per engine instead of hardcoding it.
    requires_second_image: bool = False
    second_image_label: Optional[str] = None

    @classmethod
    @abstractmethod
    def get_options_schema(cls) -> list[dict[str, Any]]:
        """Return the option fields this engine accepts, for the frontend to render."""
        raise NotImplementedError

    @abstractmethod
    def process(
        self,
        input_path: Path,
        output_dir: Path,
        options: dict[str, Any],
        second_image_path: Optional[Path] = None,
    ) -> EngineResult:
        """Run the engine. Must raise EngineOptionError for bad input/options rather
        than letting a raw exception bubble up as a 500."""
        raise NotImplementedError
