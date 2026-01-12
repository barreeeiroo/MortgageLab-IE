/**
 * Store for coordinating chart capture for PDF export.
 */

import { atom } from "nanostores";
import type { ChartImageData } from "@/lib/export/simulate-export";

/** Callback to be called when charts are captured */
type CaptureCallback = (images: ChartImageData[]) => void;

/** Store for pending capture request */
export const $pendingChartCapture = atom<CaptureCallback | null>(null);

/** Store for captured chart images */
export const $capturedChartImages = atom<ChartImageData[]>([]);

/**
 * Request capture of all charts.
 * The chart component will handle the actual capture and call the callback.
 */
export function requestChartCapture(callback: CaptureCallback): void {
	$pendingChartCapture.set(callback);
}

/**
 * Complete the capture request with the captured images.
 */
export function completeChartCapture(images: ChartImageData[]): void {
	const callback = $pendingChartCapture.get();
	$capturedChartImages.set(images);
	$pendingChartCapture.set(null);
	if (callback) {
		callback(images);
	}
}

/**
 * Clear any pending capture request.
 */
export function clearChartCapture(): void {
	$pendingChartCapture.set(null);
	$capturedChartImages.set([]);
}
