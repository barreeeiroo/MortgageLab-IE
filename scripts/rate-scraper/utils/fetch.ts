/**
 * HTML fetching for rate scrapers.
 *
 * Some lenders (AIB, EBS, Haven, Avant) serve 403s to non-browser clients -
 * the block is TLS/HTTP fingerprint based, so fetch() is rejected even with
 * browser headers attached. curl's fingerprint gets through, so it is the
 * primary strategy, with fetch() as a fallback for environments without it.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BROWSER_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

/**
 * Fetch a page's HTML via curl with browser-like headers.
 *
 * @param url - Page URL to fetch
 * @returns The page HTML
 * @throws If both curl and fetch fail (network error, 4xx/5xx, empty body)
 */
export async function fetchHtml(url: string): Promise<string> {
    try {
        const { stdout } = await execFileAsync(
            "curl",
            [
                "-fsSL",
                "--compressed",
                "--max-time",
                "30",
                "-A",
                BROWSER_USER_AGENT,
                "-H",
                "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "-H",
                "Accept-Language: en-IE,en;q=0.9",
                url,
            ],
            { maxBuffer: 20 * 1024 * 1024 },
        );
        if (stdout.trim().length > 0) {
            return stdout;
        }
        throw new Error("curl returned an empty body");
    } catch (curlError) {
        // Fallback for environments without curl, or curl-specific failures
        const response = await fetch(url, {
            headers: {
                "User-Agent": BROWSER_USER_AGENT,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });
        if (!response.ok) {
            const reason =
                curlError instanceof Error
                    ? curlError.message
                    : String(curlError);
            throw new Error(
                `Failed to fetch ${url}: curl (${reason}), fetch (HTTP ${response.status})`,
            );
        }
        return response.text();
    }
}
