/**
 * Store for coordinating chart capture for compare PDF export.
 */

import { atom } from "nanostores";
import type { ChartImageData } from "@/lib/export/simulate-export";

/** Callback to be called when charts are captured */
type CaptureCallback = (images: ChartImageData[]) => void;

/** Store for pending capture request */
export const $pendingCompareChartCapture = atom<CaptureCallback | null>(null);

/** Store for captured chart images */
export const $capturedCompareChartImages = atom<ChartImageData[]>([]);

/**
 * Request capture of all comparison charts.
 * The chart component will handle the actual capture and call the callback.
 */
export function requestCompareChartCapture(callback: CaptureCallback): void {
    $pendingCompareChartCapture.set(callback);
}

/**
 * Complete the capture request with the captured images.
 */
export function completeCompareChartCapture(images: ChartImageData[]): void {
    const callback = $pendingCompareChartCapture.get();
    $capturedCompareChartImages.set(images);
    $pendingCompareChartCapture.set(null);
    if (callback) {
        callback(images);
    }
}

/**
 * Clear any pending capture request.
 */
export function clearCompareChartCapture(): void {
    $pendingCompareChartCapture.set(null);
    $capturedCompareChartImages.set([]);
}
