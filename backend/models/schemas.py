from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class EngineInfo(BaseModel):
    id: str
    name: str
    description: str
    result_type: str  # "image" | "text"
    requires_second_image: bool
    second_image_label: Optional[str] = None
    options_schema: list[dict[str, Any]]


class EngineResultOut(BaseModel):
    engine: str
    result_type: str
    image_url: Optional[str] = None
    text: Optional[str] = None
    metadata: dict[str, Any] = {}
    error: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = 0
    stage: Optional[str] = None
    results: list[EngineResultOut] = []
    error: Optional[str] = None


class ProcessAcceptedResponse(BaseModel):
    job_id: str
    status: JobStatus


class SearchImageInfo(BaseModel):
    id: str
    label: str
    note: str
    preview_url: str

