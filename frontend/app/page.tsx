"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EngineMultiSelect } from "@/components/EngineMultiSelect";
import { ImageSourceInput } from "@/components/ImageSourceInput";
import { OptionsForm } from "@/components/OptionsForm";
import { ProgressPanel } from "@/components/ProgressPanel";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ScanMark } from "@/components/ScanMark";
import type { SearchImageSelection } from "@/components/SearchImagePicker";
import { SearchImagePicker } from "@/components/SearchImagePicker";
import { useEngines, useJobStatus } from "@/hooks/useApi";
import { submitJob } from "@/lib/api";
import type { ImageSource, OptionValues, OutputFormat } from "@/lib/types";

export default function Home() {
  const { data: engines, error: enginesError } = useEngines();

  const [selectedEngineIds, setSelectedEngineIds] = useState<string[]>([]);
  const [imageSource, setImageSource] = useState<ImageSource | null>(null);
  const [searchImage, setSearchImage] = useState<SearchImageSelection>(null);
  const [optionsByEngine, setOptionsByEngine] = useState<Record<string, OptionValues>>({});
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [jobId, setJobId] = useState<string | null>(null);

  // Default to selecting every engine once they load in, so there's always something checked.
  useEffect(() => {
    if (engines && engines.length > 0 && selectedEngineIds.length === 0) {
      setSelectedEngineIds([engines[0].id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engines]);

  const { data: job, error: jobError } = useJobStatus(jobId);

  const activeEngines = useMemo(
    () => (engines ?? []).filter((e) => selectedEngineIds.includes(e.id)),
    [engines, selectedEngineIds],
  );
  const needsSearchImage = activeEngines.some((e) => e.requires_second_image);
  const searchImageLabel = activeEngines.find((e) => e.requires_second_image)?.second_image_label ?? "Search pattern image";

  const engineNames = useMemo(
    () => Object.fromEntries((engines ?? []).map((e) => [e.id, e.name])),
    [engines],
  );

  const mutation = useMutation({
    mutationFn: submitJob,
    onSuccess: (data) => setJobId(data.job_id),
    onError: (err: Error) => toast.error(err.message || "Failed to start processing."),
  });

  const isBusy = job?.status === "queued" || job?.status === "running";
  const canSubmit =
    Boolean(imageSource) &&
    selectedEngineIds.length > 0 &&
    (!needsSearchImage || Boolean(searchImage)) &&
    !isBusy &&
    !mutation.isPending;

  function handleSubmit() {
    if (!imageSource || selectedEngineIds.length === 0) return;
    const searchImagePayload =
      searchImage?.kind === "file"
        ? ({ kind: "file", file: searchImage.file } as const)
        : searchImage?.kind === "bundled"
          ? ({ kind: "bundled", id: searchImage.id } as const)
          : null;

    mutation.mutate({
      engineIds: selectedEngineIds,
      image: imageSource,
      searchImage: searchImagePayload,
      optionsByEngine,
      outputFormat,
    });
  }

  function handleReset() {
    setJobId(null);
  }

  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (imageSource?.kind === "file") {
      const url = URL.createObjectURL(imageSource.file);
      setOriginalPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (imageSource?.kind === "url") {
      setOriginalPreviewUrl(imageSource.url);
      return;
    }
    setOriginalPreviewUrl(null);
  }, [imageSource]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center gap-3">
        <ScanMark size={36} />
        <div>
          <h1 className="font-display text-lg font-semibold text-[var(--color-text)]">ClarifyMe</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            Pixelation recovery lab - pick one or more engines, see what each can reconstruct.
          </p>
        </div>
      </header>

      {enginesError && (
        <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-danger)]">
          Could not reach the backend: {enginesError.message}. Is it running at the configured API URL?
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-5">
          <ImageSourceInput
            label="Pixelated image"
            helpText="The screenshot with a pixelated/mosaic region you want to recover."
            value={imageSource}
            onChange={setImageSource}
          />

          {needsSearchImage && (
            <SearchImagePicker label={searchImageLabel} value={searchImage} onChange={setSearchImage} />
          )}

          {engines && engines.length > 0 && (
            <EngineMultiSelect engines={engines} selected={selectedEngineIds} onChange={setSelectedEngineIds} />
          )}

          {activeEngines.map((engine) => (
            <OptionsForm
              key={engine.id}
              engine={engine}
              onChange={(values) => setOptionsByEngine((prev) => ({ ...prev, [engine.id]: values }))}
            />
          ))}

          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-[var(--color-text-muted)]">
              Output format
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                className="rounded border border-[var(--color-border)] bg-[var(--color-panel-raised)] px-2 py-1 text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Button disabled={!canSubmit} onClick={handleSubmit}>
              {isBusy || mutation.isPending ? "Processing..." : "Recover image"}
            </Button>
            {jobId && (
              <Button variant="ghost" onClick={handleReset}>
                Start over
              </Button>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          {!jobId && (
            <div className="flex min-h-[9rem] items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
              Results will appear here once you upload an image and run an engine.
            </div>
          )}

          {jobError && <p className="text-sm text-[var(--color-danger)]">{jobError.message}</p>}

          {job && isBusy && <ProgressPanel stage={job.stage ?? "Working"} progress={job.progress} />}

          {job && job.status === "failed" && job.results.length === 0 && (
            <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-panel)] p-3 text-sm text-[var(--color-danger)]">
              {job.error ?? "Processing failed."}
            </div>
          )}

          {job && (job.status === "completed" || job.status === "failed") && job.results.length > 0 && originalPreviewUrl && (
            <ResultsPanel originalPreviewUrl={originalPreviewUrl} results={job.results} engineNames={engineNames} />
          )}
        </section>
      </div>
    </main>
  );
}
