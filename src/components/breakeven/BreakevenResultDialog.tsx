import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { ShareButton } from "../ShareButton";
import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

interface BreakevenResultDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    children: ReactNode;
    onExport: () => Promise<void>;
    isExporting: boolean;
    onShare: () => Promise<string>;
    hasResult: boolean;
}

export function BreakevenResultDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    onExport,
    isExporting,
    onShare,
    hasResult,
}: BreakevenResultDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogBody>{children}</AlertDialogBody>
                <AlertDialogFooter className="sm:justify-between">
                    {hasResult && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="default"
                                className="gap-1.5"
                                onClick={onExport}
                                disabled={isExporting}
                            >
                                <Download className="h-4 w-4" />
                                {isExporting ? "Exporting..." : "Export PDF"}
                            </Button>
                            <ShareButton size="default" onShare={onShare} />
                        </div>
                    )}
                    <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
