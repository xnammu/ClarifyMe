"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchEngines, fetchJobStatus, fetchSearchImages } from "@/lib/api";

export function useEngines() {
  return useQuery({
    queryKey: ["engines"],
    queryFn: fetchEngines,
    staleTime: Infinity, // the engine list only changes when the backend restarts
  });
}

export function useSearchImages() {
  return useQuery({
    queryKey: ["search-images"],
    queryFn: fetchSearchImages,
    staleTime: Infinity,
  });
}

const ACTIVE_STATUSES = new Set(["queued", "running"]);

export function useJobStatus(jobId: string | null) {
  // A plain boolean + fixed interval (rather than a refetchInterval callback keyed
  // off query state) avoids depending on an exact callback signature that differs
  // between TanStack Query v4 and v5 - this shape is stable across both.
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    setIsPolling(true);
  }, [jobId]);

  const query = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobStatus(jobId as string),
    enabled: jobId !== null,
    refetchInterval: isPolling ? 1200 : false,
  });

  useEffect(() => {
    if (query.data && !ACTIVE_STATUSES.has(query.data.status)) {
      setIsPolling(false);
    }
  }, [query.data]);

  return query;
}
