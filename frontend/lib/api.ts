import type {
  EngineInfo,
  ImageSource,
  JobStatusResponse,
  JobStatusValue,
  OptionValues,
  OutputFormat,
  SearchImageInfo,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let message = detail;
    try {
      const parsed = JSON.parse(detail);
      message = parsed.detail ?? detail;
    } catch {
      // detail wasn't JSON - use it as-is
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchEngines(): Promise<EngineInfo[]> {
  return unwrap(await fetch(`${API_BASE}/api/engines`));
}

export async function fetchSearchImages(): Promise<SearchImageInfo[]> {
  return unwrap(await fetch(`${API_BASE}/api/search-images`));
}

interface SubmitJobParams {
  engineIds: string[];
  image: ImageSource;
  searchImage?: ImageSource | { kind: "bundled"; id: string } | null;
  optionsByEngine: Record<string, OptionValues>;
  outputFormat: OutputFormat;
}

export async function submitJob(
  params: SubmitJobParams,
): Promise<{ job_id: string; status: JobStatusValue }> {
  const form = new FormData();
  form.append("engines", JSON.stringify(params.engineIds));
  form.append("options", JSON.stringify(params.optionsByEngine));
  form.append("output_format", params.outputFormat);

  if (params.image.kind === "file") {
    form.append("image", params.image.file);
  } else {
    form.append("image_url", params.image.url);
  }

  if (params.searchImage) {
    if (params.searchImage.kind === "file") {
      form.append("search_image", params.searchImage.file);
    } else if (params.searchImage.kind === "bundled") {
      form.append("search_image_id", params.searchImage.id);
    } else if (params.searchImage.kind === "url") {
      // Search images are always local uploads or bundled picks in the UI today;
      // URL-sourced search images aren't wired up server-side yet.
      throw new Error("URL-sourced search images aren't supported yet - upload a file or pick a bundled one.");
    }
  }

  const res = await fetch(`${API_BASE}/api/process`, { method: "POST", body: form });
  return unwrap(res);
}

export async function fetchJobStatus(jobId: string): Promise<JobStatusResponse> {
  return unwrap(await fetch(`${API_BASE}/api/jobs/${jobId}`));
}

/** Backend returns relative "/outputs/..." or "/search-images/..." paths - resolve
 * them against the API origin. */
export function resolveApiUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
}
