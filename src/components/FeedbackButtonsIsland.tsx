import { Bug, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { getBugReportUrl, getFeatureRequestUrl } from "@/lib/constants/contact";
import { Button } from "./ui/button";

function getBrowserInfo(): string {
    if (typeof navigator === "undefined") return "";

    const ua = navigator.userAgent;
    let browser = "";

    if (ua.includes("Firefox/")) {
        browser = `Firefox ${ua.split("Firefox/")[1]?.split(" ")[0] ?? ""}`;
    } else if (ua.includes("Edg/")) {
        browser = `Edge ${ua.split("Edg/")[1]?.split(" ")[0] ?? ""}`;
    } else if (ua.includes("Chrome/")) {
        browser = `Chrome ${ua.split("Chrome/")[1]?.split(" ")[0] ?? ""}`;
    } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
        browser = `Safari ${ua.split("Version/")[1]?.split(" ")[0] ?? ""}`;
    }

    // Add platform info
    let platform = "";
    if (ua.includes("Windows")) platform = "Windows";
    else if (ua.includes("Mac OS")) platform = "macOS";
    else if (ua.includes("Linux")) platform = "Linux";
    else if (ua.includes("iPhone") || ua.includes("iPad")) platform = "iOS";
    else if (ua.includes("Android")) platform = "Android";

    if (browser && platform) {
        return `${browser} on ${platform}`;
    }
    return browser || platform || "";
}

export function FeedbackButtonsIsland() {
    const [bugReportUrl, setBugReportUrl] = useState(() =>
        getBugReportUrl({ reportSource: "Landing page" }),
    );

    const featureRequestUrl = getFeatureRequestUrl({
        reportSource: "Landing page",
    });

    // Update bug report URL with browser info after mount (client-side only)
    useEffect(() => {
        const browserInfo = getBrowserInfo();
        if (browserInfo) {
            setBugReportUrl(
                getBugReportUrl({
                    browser: browserInfo,
                    reportSource: "Landing page",
                }),
            );
        }
    }, []);

    return (
        <div className="flex gap-3 justify-center flex-wrap">
            <a href={bugReportUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Bug className="h-4 w-4" />
                    Report a Bug
                </Button>
            </a>
            <a
                href={featureRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
            >
                <Button variant="outline" size="sm" className="gap-1.5">
                    <Lightbulb className="h-4 w-4" />
                    Request a Feature
                </Button>
            </a>
        </div>
    );
}
