import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/utils/currency";

interface TooltipWrapperProps {
    children: ReactNode;
}

export function TooltipWrapper({ children }: TooltipWrapperProps) {
    return (
        <div className="border-border/50 bg-background rounded-lg border px-3 py-2 shadow-xl">
            {children}
        </div>
    );
}

interface TooltipHeaderProps {
    children: ReactNode;
    isProjection?: boolean;
}

export function TooltipHeader({ children, isProjection }: TooltipHeaderProps) {
    return (
        <div className="font-medium mb-2">
            {children}
            {isProjection && (
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (projection)
                </span>
            )}
        </div>
    );
}

interface TooltipMetricRowProps {
    color: string;
    label: string;
    value: number;
    highlight?: "positive" | "negative" | "none";
    dashed?: boolean;
}

export function TooltipMetricRow({
    color,
    label,
    value,
    highlight = "none",
    dashed,
}: TooltipMetricRowProps) {
    const valueClass =
        highlight === "positive"
            ? "font-mono font-semibold text-green-600"
            : highlight === "negative"
              ? "font-mono font-semibold text-amber-600"
              : "font-mono";

    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
                {dashed ? (
                    <div
                        className="h-2.5 w-2.5 rounded-sm shrink-0 border border-dashed"
                        style={{
                            backgroundColor: "transparent",
                            borderColor: color,
                        }}
                    />
                ) : (
                    <div
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: color }}
                    />
                )}
                <span className="text-muted-foreground">{label}</span>
            </div>
            <span className={valueClass}>{formatCurrency(value)}</span>
        </div>
    );
}

interface TooltipDifferenceRowProps {
    label: string;
    value: number;
    positiveIsGood?: boolean;
}

export function TooltipDifferenceRow({
    label,
    value,
    positiveIsGood = true,
}: TooltipDifferenceRowProps) {
    const isPositive = value > 0;
    const isGood = positiveIsGood ? isPositive : !isPositive;
    const colorClass = isGood ? "text-green-600" : "text-amber-600";

    return (
        <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border/50">
            <span className="text-muted-foreground pl-4">{label}</span>
            <span className={`font-mono font-semibold ${colorClass}`}>
                {isPositive ? "+" : ""}
                {formatCurrency(value)}
            </span>
        </div>
    );
}

interface TooltipSectionProps {
    children: ReactNode;
}

export function TooltipSection({ children }: TooltipSectionProps) {
    return <div className="space-y-1.5 text-sm">{children}</div>;
}
