from __future__ import annotations

from .base import BaseEngine
from .hmm_engine import HMMEngine
from .poc_engine import POCEngine

# Adding a new engine (Real-ESRGAN, SwinIR, your own algorithm, ...) means:
#   1. Write EngineClass(BaseEngine) in its own file.
#   2. Register an instance here.
# Nothing in api/ or the frontend needs to change - "Run All" just iterates this dict.
ENGINES: dict[str, BaseEngine] = {
    "poc": POCEngine(),
    "hmm": HMMEngine(),
}


def get_engine(engine_id: str) -> BaseEngine:
    try:
        return ENGINES[engine_id]
    except KeyError as exc:
        raise KeyError(
            f"Unknown engine '{engine_id}'. Available: {list(ENGINES.keys())}"
        ) from exc


def list_engines() -> dict[str, BaseEngine]:
    return ENGINES
