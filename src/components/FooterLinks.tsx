import { Bug, Lightbulb, Scale, Shield } from "lucide-react";
import { AboutDialog } from "@/components/AboutDialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { getBugReportUrl, getFeatureRequestUrl } from "@/lib/constants/contact";

const DISCLAIMER_TEXT =
    "The information provided on this website is intended for general informational purposes only. While efforts are made to keep the information accurate and up-to-date, no representations or warranties of any kind are made about the completeness, accuracy, or reliability of the information provided. Any reliance placed on such information is done strictly at your own risk. This website should not be considered as financial advice. A qualified financial advisor should be consulted before making any mortgage decisions.";

const PRIVACY_TEXT =
    "Your privacy matters. This website operates entirely client-side and does not collect, store, or transmit any personal data. No cookies, analytics, or tracking of any kind are used.";

export function FooterLinks() {
    const bugReportUrl = getBugReportUrl({ reportSource: "Footer" });
    const featureRequestUrl = getFeatureRequestUrl({ reportSource: "Footer" });

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left side: Modals */}
            <div className="flex items-center gap-4">
                <Dialog>
                    <DialogTrigger className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        <Scale className="h-4 w-4" />
                        <span>Financial Disclaimer</span>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Scale className="h-5 w-5" />
                                Financial Disclaimer
                            </DialogTitle>
                            <DialogDescription className="text-left leading-relaxed pt-2">
                                {DISCLAIMER_TEXT}
                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>

                <Dialog>
                    <DialogTrigger className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        <Shield className="h-4 w-4" />
                        <span>Privacy Policy</span>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Privacy Policy
                            </DialogTitle>
                            <DialogDescription className="text-left leading-relaxed pt-2">
                                {PRIVACY_TEXT}
                            </DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>

                <AboutDialog />
            </div>

            {/* Right side: External links */}
            <div className="flex items-center gap-4">
                <a
                    href={bugReportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Bug className="h-4 w-4" />
                    <span>Report a Bug</span>
                </a>
                <a
                    href={featureRequestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Lightbulb className="h-4 w-4" />
                    <span>Feature Request</span>
                </a>
            </div>
        </div>
    );
}
