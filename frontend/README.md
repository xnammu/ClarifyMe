# ClarifyMe frontend

## What's new

- **Checkbox multi-select engines** (`EngineMultiSelect`) instead of a fixed
  "A / B / both" radio - scales to however many engines the backend registers.
- **File-or-URL image input** (`ImageSourceInput`). URL images are fetched by
  the *backend*, not the browser - a client-side `fetch()` of an arbitrary
  third-party image URL fails with a CORS error for most image hosts, so this
  is a correctness fix, not just a convenience.
- **Search-image picker** (`SearchImagePicker`): pick one of the bundled De
  Bruijn images (with its font/OS/editor match noted right there) or upload
  your own - the options are visible and labeled, not a silent guess.
- **`react-hook-form` + `zod`** for the per-engine options form
  (`OptionsForm`), with a zod schema built dynamically from each engine's
  `options_schema` - still fully schema-driven, just with real validation and
  inline error messages now.
- **TanStack Query** replaces the hand-rolled polling hook - `useEngines`,
  `useSearchImages`, `useJobStatus` (`hooks/useApi.ts`). Job polling stops
  itself once status leaves `queued`/`running` via a plain boolean rather than
  a `refetchInterval` callback, since that callback's exact signature differs
  between TanStack Query v4 and v5 and I couldn't verify which shape compiles
  without a real install here (see Known limitations below) - the boolean
  version is stable across both.
- **shadcn/ui-style primitives** (`components/ui/`): `Button`, `Card`,
  `Checkbox`, `Label`, `Badge` - hand-written with the same `cva` + Radix +
  `cn()` pattern shadcn's CLI generates, not pulled from a registry (no
  network access here to run the CLI), so the API should feel identical if you
  later swap these for CLI-generated ones.
- **Output format selector** (PNG/JPG), passed straight through to the
  backend's uniform job-level conversion.
- **`sonner` toasts** for submission errors instead of only inline text.

Kept from v1 because they're functionally motivated, not just style: the
`ScanMark` identity/progress element, and two distinct result views
(`ImageCompare` vs `TextResult`) rather than forcing every engine's output
into one shape.

## Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

## Known limitations / honest caveats

- **This sandbox has no network access**, so `npm install` was never actually
  run here - same constraint as v1. Every file was syntax-checked individually
  with esbuild (all clean), and I traced the actual data flow by hand against
  the v2 backend's real contract. Treat `npm install && npm run dev` as the
  real first test.
- Pinned to **Next.js 14 / Tailwind CSS 3** for the same reason as v1: I can
  review that combination with full confidence; Tailwind v4's CSS-first config
  is enough of a syntax departure that guessing at it here would be lower-
  confidence than stating the version choice plainly.
- **Search images are only ever local uploads or bundled picks** - there's no
  URL option for the search image specifically (only for the main pixelated
  image). `submitJob` throws a clear error if you try to pass one; wiring it up
  is a small addition to `api/url_fetch.py` reuse plus a form field, not
  started here.
- Docker build depends on `frontend/public/` existing (Next.js expects it) -
  it's included as an empty dir with `.gitkeep`; don't delete it.
