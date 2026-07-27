export type ResultKind = "image" | "text";

export interface OptionField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  default: string | number | null;
  required: boolean;
  help?: string;
  options?: string[];
}

export interface EngineInfo {
  id: string;
  name: string;
  description: string;
  result_type: ResultKind;
  requires_second_image: boolean;
  second_image_label?: string | null;
  options_schema: OptionField[];
}

export interface SearchImageInfo {
  id: string;
  label: string;
  note: string;
  preview_url: string;
}

export type JobStatusValue = "queued" | "running" | "completed" | "failed";

export interface EngineResultOut {
  engine: string;
  result_type: ResultKind | "error";
  image_url?: string | null;
  text?: string | null;
  metadata: Record<string, unknown>;
  error?: string | null;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatusValue;
  progress: number;
  stage?: string | null;
  results: EngineResultOut[];
  error?: string | null;
}

/** key -> raw string/number value as typed into the options form, before JSON.stringify. */
export type OptionValues = Record<string, string | number>;

export type OutputFormat = "png" | "jpg";

export type ImageSource = { kind: "file"; file: File } | { kind: "url"; url: string };
