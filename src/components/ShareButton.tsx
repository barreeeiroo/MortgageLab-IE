import { Check, Clipboard, Loader2, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import { generateQRCodeWithLogo } from "@/lib/share/qrcode";
import { Button, type ButtonProps } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";

interface ShareButtonProps {
    /** Function that returns the URL to copy. ShareButton handles clipboard copy. */
    onShare: () => Promise<string>;
    /** Label text to display. Defaults to "Share". */
    label?: string;
    /** If true, hides text on small screens (shows only icon). */
    responsive?: boolean;
    /** Additional class names for the button. */
    className?: string;
    /** Button size. Defaults to "sm". */
    size?: ButtonProps["size"];
    /** If true, disables the button. */
    disabled?: boolean;
}

/**
 * A reusable share button that shows a QR code dialog.
 * Falls back to clipboard copy if QR generation fails.
 */
export function ShareButton({
    onShare,
    label = "Share",
    responsive = false,
    className,
    size = "sm",
    disabled = false,
}: ShareButtonProps) {
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [dialogCopied, setDialogCopied] = useState(false);

    const handleShare = useCallback(async () => {
        setLoading(true);
        try {
            const url = await onShare();
            setShareUrl(url);

            // Try to generate QR code
            try {
                const dataUrl = await generateQRCodeWithLogo(url, 256);
                setQrDataUrl(dataUrl);
                setDialogOpen(true);
            } catch {
                // QR generation failed, fall back to clipboard copy
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch {
            // Share failed
        } finally {
            setLoading(false);
        }
    }, [onShare]);

    const handleDialogCopy = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setDialogCopied(true);
            setTimeout(() => setDialogCopied(false), 2000);
        } catch {
            // Clipboard copy failed
        }
    }, [shareUrl]);

    return (
        <>
            <Button
                variant="outline"
                size={size}
                className={`gap-1.5 ${className ?? ""}`}
                onClick={handleShare}
                disabled={disabled || loading}
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {responsive ? (
                            <span className="hidden sm:inline">{label}</span>
                        ) : (
                            label
                        )}
                    </>
                ) : copied ? (
                    <>
                        <Check className="h-4 w-4" />
                        {responsive ? (
                            <span className="hidden sm:inline">Copied!</span>
                        ) : (
                            "Copied!"
                        )}
                    </>
                ) : (
                    <>
                        <Share2 className="h-4 w-4" />
                        {responsive ? (
                            <span className="hidden sm:inline">{label}</span>
                        ) : (
                            label
                        )}
                    </>
                )}
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[320px]">
                    <DialogHeader>
                        <DialogTitle>Share URL</DialogTitle>
                        <DialogDescription>
                            Scan this QR code to open the link on another
                            device.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4">
                        {qrDataUrl && (
                            <img
                                src={qrDataUrl}
                                alt="QR Code"
                                className="rounded-lg border"
                                width={256}
                                height={256}
                            />
                        )}
                        <div className="flex w-full items-center gap-3">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-muted-foreground text-xs">
                                or
                            </span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <DialogDescription>
                            Copy the URL to share via message or email.
                        </DialogDescription>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={handleDialogCopy}
                        >
                            {dialogCopied ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Clipboard className="h-4 w-4" />
                                    Copy URL to Clipboard
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
