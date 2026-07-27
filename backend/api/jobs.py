from __future__ import annotations

import logging
import threading
import uuid
from pathlib import Path
from typing import Any, Optional

from engines.base import EngineOptionError, EngineResult
from engines.manager import get_engine
from models.schemas import EngineResultOut, JobStatus

logger = logging.getLogger("clarifyme.jobs")

# In-memory store: fine for a single-process dev skeleton. Swap for Redis (and the
# processing loop below for a Celery/RQ task) once you need multiple workers.
_JOBS: dict[str, dict[str, Any]] = {}
_LOCK = threading.Lock()


def create_job(engine_ids: list[str]) -> str:
    job_id = uuid.uuid4().hex
    with _LOCK:
        _JOBS[job_id] = {
            "status": JobStatus.QUEUED,
            "progress": 0,
            "stage": "Queued",
            "results": [],
            "error": None,
            "engines": engine_ids,
        }
    return job_id


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    with _LOCK:
        job = _JOBS.get(job_id)
        return dict(job) if job is not None else None


def _update_job(job_id: str, **fields: Any) -> None:
    with _LOCK:
        if job_id in _JOBS:
            _JOBS[job_id].update(fields)


def _convert_image_if_needed(image_path: Path, output_format: str) -> Path:
    """Applied at the job-runner level rather than inside each engine, so engines
    don't need to know or care about output format - any current or future
    image-producing engine gets this for free."""
    if output_format == "png" or image_path.suffix.lower() == f".{output_format}":
        return image_path
    from PIL import Image

    converted_path = image_path.with_suffix(f".{output_format}")
    with Image.open(image_path) as img:
        if output_format == "jpg":
            img = img.convert("RGB")
        img.save(converted_path)
    image_path.unlink(missing_ok=True)
    return converted_path


def run_job(
    job_id: str,
    engine_ids: list[str],
    input_path: Path,
    output_dir: Path,
    options_by_engine: dict[str, dict[str, Any]],
    second_image_path: Optional[Path],
    outputs_url_prefix: str,
    output_format: str = "png",
) -> None:
    """Runs synchronously in a background thread (see main.py). Each engine's success
    or failure is independent - one engine failing when several are selected doesn't
    sink the others."""
    _update_job(job_id, status=JobStatus.RUNNING, progress=5, stage="Preparing image")

    results: list[EngineResultOut] = []
    total = len(engine_ids)

    for index, engine_id in enumerate(engine_ids):
        _update_job(
            job_id,
            stage=f"Running {engine_id}",
            progress=10 + int(80 * index / max(total, 1)),
        )
        try:
            engine = get_engine(engine_id)
            engine_output_dir = output_dir / engine_id
            result: EngineResult = engine.process(
                input_path=input_path,
                output_dir=engine_output_dir,
                options=options_by_engine.get(engine_id, {}),
                second_image_path=second_image_path,
            )
            image_url = None
            if result.image_path is not None:
                final_path = _convert_image_if_needed(result.image_path, output_format)
                image_url = f"{outputs_url_prefix}/{job_id}/{engine_id}/{final_path.name}"

            results.append(
                EngineResultOut(
                    engine=engine_id,
                    result_type=result.result_type.value,
                    image_url=image_url,
                    text=result.text,
                    metadata=result.metadata,
                )
            )
        except EngineOptionError as exc:
            logger.warning("Engine %s rejected options for job %s: %s", engine_id, job_id, exc)
            results.append(
                EngineResultOut(engine=engine_id, result_type="error", error=str(exc))
            )
        except Exception:  # noqa: BLE001 - isolate unexpected engine crashes per-engine
            logger.exception("Engine %s crashed for job %s", engine_id, job_id)
            results.append(
                EngineResultOut(
                    engine=engine_id,
                    result_type="error",
                    error="This engine failed unexpectedly. Check server logs.",
                )
            )

    all_failed = all(r.result_type == "error" for r in results) if results else True
    _update_job(
        job_id,
        status=JobStatus.FAILED if all_failed else JobStatus.COMPLETED,
        progress=100,
        stage="Failed" if all_failed else "Done",
        results=[r.model_dump() for r in results],
    )
