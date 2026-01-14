/**
 * Lazy singleton wrapper for qrcode library.
 * Loaded on first use and cached for subsequent calls.
 */

let qrcodeModule: typeof import("qrcode") | null = null;

/**
 * Lazily loads qrcode library (~12KB).
 * Cached after first load.
 */
export async function getQRCode() {
	if (!qrcodeModule) {
		qrcodeModule = await import("qrcode");
	}
	return qrcodeModule;
}
