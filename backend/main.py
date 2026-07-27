from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import OUTPUTS_DIR, router

app = FastAPI(title="ClarifyMe API", version="0.1.0")

# Tighten this to your actual frontend origin before deploying anywhere real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")

app.include_router(router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
