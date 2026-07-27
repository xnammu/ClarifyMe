"use client";

import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

interface ImageCompareProps {
  originalUrl: string;
  resultUrl: string;
}

export function ImageCompare({ originalUrl, resultUrl }: ImageCompareProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
      <ReactCompareSlider
        itemOne={<ReactCompareSliderImage src={originalUrl} alt="Original pixelated image" style={{ imageRendering: "pixelated" }} />}
        itemTwo={<ReactCompareSliderImage src={resultUrl} alt="Recovered image" />}
        style={{ display: "block", width: "100%" }}
      />
    </div>
  );
}
