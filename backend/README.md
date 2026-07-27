# ClarifyMe backend

FastAPI service exposing pluggable "engines" behind one interface. Currently
`poc` (`depixelization_poc`) and `hmm` (`DepixHMM`), both vendored unmodified
under `vendor/` - engine-specific logic lives only in `engines/poc_engine.py`
and `engines/hmm_engine.py`.

## What's new

- **True multi-engine selection.** `/api/process` takes `engines` as a JSON
  array of ids (`["poc","hmm"]`, or any subset/order) - there's no hardcoded
  "poc / hmm / both" special-casing anywhere. Register a 3rd engine in
  `engines/manager.py` and it's immediately selectable with zero other changes.
- **Options are actually wired end-to-end**, keyed by engine id:
  `options={"poc": {...}, "hmm": {...}}`. (Flagging this because a version of
  this app I reviewed elsewhere accepted an `options` field but never actually
  read it - every run silently used hardcoded defaults with no way to override
  block size, font, pattern, etc. - which matters a lot for tools this
  parameter-sensitive.)
- **URL upload, fetched server-side** (`image_url` form field, see
  `api/url_fetch.py`) instead of relying on the browser to `fetch()` a
  third-party image directly - that reliably hits CORS errors for most image
  hosts. Includes basic SSRF guards (rejects private/loopback/link-local
  addresses, including cloud metadata endpoints like `169.254.169.254`) and a
  20MB size cap. Note: it doesn't re-validate redirect targets - fine for
  local/dev use, harden further before exposing this publicly.
- **Bundled search-image picker** (`GET /api/search-images`): the POC engine's
  built-in De Bruijn sequence images are offered as explicit, labeled choices
  (`search_image_id`) - each with a `note` on which font/editor/OS it actually
  matches - rather than a silent fallback. A mismatched search image produces
  confidently wrong output with no error, so which one you're using should
  always be a visible choice, never a guess made for you.
- **Output format** (`output_format: "png"|"jpg"`), applied uniformly at the
  job-runner level (`api/jobs.py`) to any image result, so engines themselves
  don't need to know or care about it.

## Setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Endpoints

- `GET /api/health`
- `GET /api/engines` - engines + their dynamic option schemas
- `GET /api/search-images` - bundled POC search images (id, label, note, preview_url)
- `POST /api/process` - multipart form:
  - `engines`: JSON array of engine ids, e.g. `["poc","hmm"]`
  - `image` (file) **or** `image_url` (string) - exactly one
  - `search_image` (file) **or** `search_image_id` (string) - needed if any
    selected engine requires one
  - `options`: JSON object keyed by engine id
  - `output_format`: `"png"` or `"jpg"`
- `GET /api/jobs/{job_id}` - poll status/progress/results
- Output images served at `/outputs/{job_id}/{engine_id}/...`

## Carried over from v1 (still true, still important)

- `poc` needs a second search-pattern image (or a bundled one, now that v2
  supports that) and returns an **image**; `hmm` needs font/pattern/block-size
  and trains an HMM per request, returning **text**. `EngineResult.result_type`
  reflects this so the frontend renders the right view for each.
- `hmm_engine.py` patches Pillow's removed `FreeTypeFont.getsize()` at the
  wrapper boundary (vendored code was written against Pillow 8.3.2), and
  normalizes input images to RGB before sampling (a user-supplied PNG saved via
  browser is very often RGBA, which silently breaks the per-window feature
  count against RGB-only training data with no obvious cause otherwise).
- In-memory job store (`api/jobs.py`) with a background thread per job. Fine
  for one process; swap for Celery/RQ + Redis before running multiple workers.

## Adding a future engine

1. Implement `BaseEngine` in `engines/your_engine.py` (see `engines/base.py`).
2. Register an instance in `ENGINES` in `engines/manager.py`.

`/api/engines`, `/api/process`, and multi-select all pick it up automatically.
