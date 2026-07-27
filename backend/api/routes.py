from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from engines.manager import list_engines
from engines.search_images import SEARCH_IMAGES_DIR, get_search_image_path, list_available_search_images
from models.schemas import EngineInfo, JobStatusResponse, ProcessAcceptedResponse, SearchImageInfo

from . import jobs
from .url_fetch import UrlFetchError, fetch_image_bytes

router = APIRouter(prefix="/api")

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"
OUTPUTS_URL_PREFIX = "/outputs"

VALID_OUTPUT_FORMATS = {"png", "jpg"}


@router.get("/engines", response_model=list[EngineInfo])
def get_engines() -> list[EngineInfo]:
    """Frontend renders the engine picker and each engine's options form entirely
    from this - no engine id is ever hardcoded on the frontend, so a 3rd/4th engine
    just needs to be registered in engines/manager.py to show up here automatically."""
    infos = []
    for engine in list_engines().values():
        infos.append(
            EngineInfo(
                id=engine.id,
                name=engine.name,
                description=engine.description,
                result_type=engine.result_type.value,
                requires_second_image=engine.requires_second_image,
                second_image_label=engine.second_image_label,
                options_schema=engine.get_options_schema(),
            )
        )
    return infos


@router.get("/search-images", response_model=list[SearchImageInfo])
def get_search_images() -> list[SearchImageInfo]:
    """Bundled De Bruijn search images the POC engine ships with. These are opt-in
    convenience choices, not a silent fallback - the frontend must show the `note`
    (which font/editor/OS each one actually matches) so picking the wrong one is a
    visible choice, not a silent wrong answer."""
    return [
        SearchImageInfo(
            id=opt.id,
            label=opt.label,
            note=opt.note,
            preview_url=f"/search-images/{opt.filename}",
        )
        for opt in list_available_search_images()
    ]


@router.get("/search-images/{filename}")
def get_search_image_file(filename: str) -> FileResponse:
    # Guard against path traversal; only serve files that are actually registered.
    path = SEARCH_IMAGES_DIR / filename
    if ".." in filename or not path.is_file() or path.parent != SEARCH_IMAGES_DIR:
        raise HTTPException(404, "Unknown search image")
    return FileResponse(path)


def _parse_engine_list(engines_raw: str) -> list[str]:
    try:
        parsed = json.loads(engines_raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, f"engines must be a JSON array of engine ids: {exc}") from exc
    if not isinstance(parsed, list) or not parsed or not all(isinstance(e, str) for e in parsed):
        raise HTTPException(400, "engines must be a non-empty JSON array of engine id strings.")

    known = list_engines()
    unknown = [e for e in parsed if e not in known]
    if unknown:
        raise HTTPException(400, f"Unknown engine id(s): {unknown}. Available: {list(known.keys())}")
    return parsed


@router.post("/process", response_model=ProcessAcceptedResponse)
async def process_image(
    background_tasks: BackgroundTasks,
    engines: str = Form(..., description='JSON array of engine ids to run, e.g. ["poc","hmm"].'),
    image: Optional[UploadFile] = File(None, description="The pixelated image to recover."),
    image_url: Optional[str] = Form(None, description="Alternative to `image`: fetched server-side."),
    search_image: Optional[UploadFile] = File(
        None, description="Custom search pattern image, for engines that need one."
    ),
    search_image_id: Optional[str] = Form(
        None, description="Alternative to `search_image`: id of a bundled search image (see /api/search-images)."
    ),
    options: str = Form("{}", description='JSON object: {"<engine_id>": {...options}}'),
    output_format: str = Form("png", description="'png' or 'jpg', applied to any image results."),
) -> ProcessAcceptedResponse:
    engine_ids = _parse_engine_list(engines)

    if output_format not in VALID_OUTPUT_FORMATS:
        raise HTTPException(400, f"output_format must be one of {sorted(VALID_OUTPUT_FORMATS)}")

    if bool(image) == bool(image_url):
        raise HTTPException(400, "Provide exactly one of `image` (file) or `image_url`.")

    if search_image is not None and search_image_id is not None:
        raise HTTPException(400, "Provide at most one of `search_image` or `search_image_id`.")

    needs_search_image = any(list_engines()[e].requires_second_image for e in engine_ids)
    if needs_search_image and search_image is None and search_image_id is None:
        raise HTTPException(
            400,
            "One of the selected engines needs a search pattern image - upload one or pick a bundled one "
            "via search_image_id.",
        )

    try:
        options_by_engine: dict = json.loads(options)
    except json.JSONDecodeError as exc:
        raise HTTPException(400, f"options must be valid JSON: {exc}") from exc
    if not isinstance(options_by_engine, dict):
        raise HTTPException(400, "options must be a JSON object keyed by engine id.")

    job_id = jobs.create_job(engine_ids)
    job_upload_dir = UPLOADS_DIR / job_id
    job_output_dir = OUTPUTS_DIR / job_id
    job_upload_dir.mkdir(parents=True, exist_ok=True)
    job_output_dir.mkdir(parents=True, exist_ok=True)

    input_path = job_upload_dir / "input.png"
    if image is not None:
        with input_path.open("wb") as f:
            shutil.copyfileobj(image.file, f)
    else:
        try:
            data, _content_type = fetch_image_bytes(image_url)  # type: ignore[arg-type]
        except UrlFetchError as exc:
            raise HTTPException(400, str(exc)) from exc
        input_path.write_bytes(data)

    second_image_path: Optional[Path] = None
    if search_image is not None:
        second_image_path = job_upload_dir / "search.png"
        with second_image_path.open("wb") as f:
            shutil.copyfileobj(search_image.file, f)
    elif search_image_id is not None:
        bundled_path = get_search_image_path(search_image_id)
        if bundled_path is None:
            raise HTTPException(400, f"Unknown search_image_id: {search_image_id}")
        second_image_path = bundled_path

    background_tasks.add_task(
        jobs.run_job,
        job_id=job_id,
        engine_ids=engine_ids,
        input_path=input_path,
        output_dir=job_output_dir,
        options_by_engine=options_by_engine,
        second_image_path=second_image_path,
        outputs_url_prefix=OUTPUTS_URL_PREFIX,
        output_format=output_format,
    )

    return ProcessAcceptedResponse(job_id=job_id, status=jobs.get_job(job_id)["status"])


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str) -> JobStatusResponse:
    job = jobs.get_job(job_id)
    if job is None:
        raise HTTPException(404, "Unknown job_id")
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        stage=job["stage"],
        results=job["results"],
        error=job["error"],
    )
