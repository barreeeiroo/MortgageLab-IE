/**
 * HTML fetching for rate scrapers.
 *
 * Some lenders (AIB, EBS, Haven, Avant) sit behind bot protection that serves
 * 403s in three cases: bun's fetch() (TLS fingerprint, even with browser
 * headers), headless Chromium (automation detection), and CLI fingerprints
 * from datacenter IPs (GitHub Actions runners block curl too). What passes
 * reliably is curl from a residential IP, or a *headful* real Chromium under
 * Xvfb from anywhere. fetchHtml() therefore tries, in order:
 *
 *   1. curl with browser headers (fast, works locally)
 *   2. fetch() with browser headers
 *   3. headful Chromium via Playwright (spawning Xvfb on Linux if needed)
 */
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BROWSER_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

let browserPromise: Promise<import("@playwright/test").Browser> | null = null;
let xvfbProcess: ReturnType<typeof spawn> | null = null;

async function commandExists(command: string): Promise<boolean> {
    try {
        await execFileAsync(command, ["-version"], { timeout: 5000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Start a virtual X server so a headful browser can run on machines without
 * a display (CI runners, SSH boxes). No-op when DISPLAY is already set or
 * Xvfb is unavailable.
 */
async function ensureVirtualDisplay(): Promise<void> {
    if (process.env.DISPLAY || process.platform !== "linux") return;
    if (!(await commandExists("Xvfb"))) return;

    for (let display = 99; display <= 109; display++) {
        const candidate = `:${display}`;
        const proc = spawn("Xvfb", [
            candidate,
            "-screen",
            "0",
            "1920x1080x24",
            "-nolisten",
            "tcp",
        ]);
        // Xvfb keeps running when ready; a taken display number exits at once
        const exited = await new Promise<boolean>((resolve) => {
            proc.once("error", () => resolve(true));
            proc.once("exit", () => resolve(true));
            setTimeout(() => resolve(false), 500);
        });
        if (exited) continue;

        xvfbProcess = proc;
        process.env.DISPLAY = candidate;
        return;
    }
}

async function launchBrowser(): Promise<import("@playwright/test").Browser> {
    const pw = await import("@playwright/test");
    await ensureVirtualDisplay();
    // Headful is essential: these sites 403 headless Chromium via
    // automation detection. Under Xvfb there is no real display needed.
    return pw.chromium.launch({
        headless: !process.env.DISPLAY, // headless only when no display exists
        args: ["--disable-blink-features=AutomationControlled"],
    });
}

async function getBrowser(): Promise<import("@playwright/test").Browser> {
    if (!browserPromise) {
        browserPromise = launchBrowser()
            .then((browser) => {
                // Don't keep the process alive on account of the browser
                process.on("exit", () => {
                    void browser.close().catch(() => undefined);
                    xvfbProcess?.kill();
                });
                return browser;
            })
            .catch((error) => {
                browserPromise = null; // Allow retrying on the next call
                throw error;
            });
    }
    return browserPromise;
}

async function fetchWithBrowser(url: string): Promise<string> {
    const browser = await getBrowser();
    const context = await browser.newContext({
        userAgent: BROWSER_USER_AGENT,
        locale: "en-IE",
        viewport: { width: 1920, height: 1080 },
    });
    try {
        const page = await context.newPage();
        // Hide the most trivial automation tell
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "webdriver", {
                get: () => undefined,
            });
        });
        const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45_000,
        });
        if (!response || !response.ok()) {
            throw new Error(
                `browser (HTTP ${response?.status() ?? "no response"})`,
            );
        }
        // Give JS-rendered content a moment to settle before reading the DOM
        await page
            .waitForLoadState("networkidle", { timeout: 15_000 })
            .catch(() => undefined);
        const html = await page.content();
        if (html.trim().length === 0) {
            throw new Error("browser returned an empty body");
        }
        return html;
    } finally {
        await context.close();
    }
}

/**
 * Fetch a page's HTML via curl with browser-like headers, falling back to
 * fetch() and then to a real browser.
 *
 * @param url - Page URL to fetch
 * @returns The page HTML
 * @throws If all three strategies fail (network error, 4xx/5xx, empty body)
 */
export async function fetchHtml(url: string): Promise<string> {
    const errors: string[] = [];

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
        errors.push(
            `curl (${curlError instanceof Error ? curlError.message.split("\n")[0] : String(curlError)})`,
        );
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": BROWSER_USER_AGENT,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });
        if (response.ok) {
            const html = await response.text();
            if (html.trim().length > 0) return html;
            errors.push("fetch (empty body)");
        } else {
            errors.push(`fetch (HTTP ${response.status})`);
        }
    } catch (fetchError) {
        errors.push(
            `fetch (${fetchError instanceof Error ? fetchError.message.split("\n")[0] : String(fetchError)})`,
        );
    }

    try {
        return await fetchWithBrowser(url);
    } catch (browserError) {
        errors.push(
            `browser (${browserError instanceof Error ? browserError.message.split("\n")[0] : String(browserError)})`,
        );
    }

    throw new Error(`Failed to fetch ${url}: ${errors.join(", ")}`);
}
