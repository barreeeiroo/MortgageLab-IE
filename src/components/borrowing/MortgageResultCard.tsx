import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/utils/currency";
import {
    calculatePropertyVAT,
    calculateStampDuty,
    ESTIMATED_LEGAL_FEES,
    type PropertyType,
} from "@/lib/utils/fees";
import { GlossaryTermTooltip } from "../tooltips/GlossaryTermTooltip";
import { Card, CardContent } from "../ui/card";
import { TooltipProvider } from "../ui/tooltip";

export interface MortgageResult {
    propertyValue: number;
    mortgageAmount: number;
    mortgageTerm: number;
    berRating: string;
    ltv: number;
    lti: number;
}

interface MortgageResultCardProps {
    result: MortgageResult;
    maxLtv: number;
    maxLti: number;
    isConstrained?: boolean;
    additionalMetrics?: ReactNode;
    additionalSections?: ReactNode;
    // Property VAT props
    propertyType?: PropertyType;
    priceIncludesVAT?: boolean;
}

export function MortgageResultCard({
    result,
    maxLtv,
    maxLti,
    isConstrained = false,
    additionalMetrics,
    additionalSections,
    propertyType = "existing",
    priceIncludesVAT = true,
}: MortgageResultCardProps) {
    // Calculate property VAT
    const vatResult = calculatePropertyVAT(
        result.propertyValue,
        propertyType,
        priceIncludesVAT,
    );
    const hasVAT = vatResult.vatRate > 0;
    const vatAddedToTotal = hasVAT && !priceIncludesVAT;

    // Stamp duty is calculated on the net (VAT-exclusive) price
    const stampDuty = calculateStampDuty(vatResult.netPrice);
    const legalFees = ESTIMATED_LEGAL_FEES;

    // Calculate deposit based on gross price for new builds with VAT exclusive
    const effectivePropertyValue = vatAddedToTotal
        ? vatResult.grossPrice
        : result.propertyValue;
    const deposit = effectivePropertyValue - result.mortgageAmount;

    // Total fees includes VAT if price was exclusive
    const totalFees =
        stampDuty + legalFees + (vatAddedToTotal ? vatResult.vatAmount : 0);
    const totalCashRequired = deposit + totalFees;

    const cardStyles = isConstrained
        ? "bg-amber-500/10 border-amber-500/30"
        : "bg-primary/5 border-primary/20";

    // Determine grid columns based on whether VAT is shown
    const gridCols = vatAddedToTotal
        ? "sm:grid-cols-2 lg:grid-cols-5"
        : "sm:grid-cols-2 lg:grid-cols-4";

    return (
        <TooltipProvider>
            <Card className={cardStyles}>
                <CardContent>
                    {/* Mortgage Summary */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Maximum Property Value
                            </p>
                            <p className="text-xl font-bold">
                                {formatCurrency(result.propertyValue)}
                            </p>
                            {vatAddedToTotal && (
                                <p className="text-xs text-muted-foreground">
                                    + {vatResult.vatRate}% VAT ={" "}
                                    {formatCurrency(vatResult.grossPrice)}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Mortgage Amount
                            </p>
                            <p className="text-xl font-bold text-primary">
                                {formatCurrency(result.mortgageAmount)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Mortgage Term
                            </p>
                            <p className="text-xl font-bold">
                                {result.mortgageTerm} years
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                BER Rating
                            </p>
                            <p className="text-xl font-bold">
                                {result.berRating}
                            </p>
                        </div>
                    </div>

                    {/* LTV/LTI Metrics */}
                    <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-sm text-muted-foreground">
                                    Loan-to-Value (LTV)
                                </p>
                                <GlossaryTermTooltip termId="ltv" />
                            </div>
                            <p
                                className={`text-lg font-semibold ${result.ltv > maxLtv ? "text-destructive" : ""}`}
                            >
                                {result.ltv.toFixed(1)}%
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-sm text-muted-foreground">
                                    Loan-to-Income (LTI)
                                </p>
                                <GlossaryTermTooltip termId="lti" />
                            </div>
                            <p
                                className={`text-lg font-semibold ${result.lti > maxLti ? "text-destructive" : ""}`}
                            >
                                {result.lti.toFixed(1)}×
                            </p>
                        </div>
                        {additionalMetrics}
                    </div>

                    {/* Cash Required */}
                    <div className="pt-4 border-t border-border mt-4">
                        <p className="text-sm font-medium mb-2">
                            Cash Required
                        </p>
                        <div className={`grid gap-2 ${gridCols} text-sm`}>
                            <div>
                                <p className="text-muted-foreground">
                                    Deposit ({(100 - result.ltv).toFixed(0)}%)
                                </p>
                                <p className="font-semibold">
                                    {formatCurrency(deposit)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">
                                    Stamp Duty
                                </p>
                                <p className="font-semibold">
                                    {formatCurrency(stampDuty)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">
                                    Legal Fees (est.)
                                </p>
                                <p className="font-semibold">
                                    {formatCurrency(legalFees)}
                                </p>
                            </div>
                            {vatAddedToTotal && (
                                <div>
                                    <p className="text-muted-foreground">
                                        Property VAT ({vatResult.vatRate}%)
                                    </p>
                                    <p className="font-semibold">
                                        {formatCurrency(vatResult.vatAmount)}
                                    </p>
                                </div>
                            )}
                            <div>
                                <p className="text-muted-foreground">
                                    Total Cash Required
                                </p>
                                <p className="font-semibold text-primary">
                                    {formatCurrency(totalCashRequired)}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Legal fees typically range from €3,000 to €5,000 and
                            include solicitor fees, searches, and registration.
                            {hasVAT &&
                                priceIncludesVAT &&
                                ` VAT of ${formatCurrency(vatResult.vatAmount)} (${vatResult.vatRate}%) is included in the property price.`}
                        </p>
                    </div>

                    {/* Additional Sections (e.g., Rental Analysis for BTL) */}
                    {additionalSections}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
