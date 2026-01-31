import { useStore } from "@nanostores/react";
import { TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { BER_GROUP_LIST } from "@/lib/constants/ber";
import { getEuriborTimeSeries } from "@/lib/data/euribor";
import type { EuriborFile } from "@/lib/schemas/euribor";
import type { Lender } from "@/lib/schemas/lender";
import type {
    RatesHistoryFile,
    RateTimeSeries,
} from "@/lib/schemas/rate-history";
import { getRateTimeSeries } from "@/lib/stores/rates/rates-history";
import {
    $euriborToggles,
    $trendsFilter,
    $trendsLendersFirstVisit,
    $trendsSelectedLenders,
    setTrendsSelectedLenders,
} from "@/lib/stores/rates/rates-history-filters";
import { EuriborToggles } from "./EuriborToggles";
import { type MarketDataPoint, RatesTrendChart } from "./RatesTrendChart";
import {
    MarketOverviewOptions,
    TrendsFilters,
    TrendsViewControls,
} from "./TrendsFilters";
import {
    type MarketOverviewStats,
    type RateStat,
    TrendsStatsTable,
} from "./TrendsStatsTable";

interface RatesTrendsProps {
    historyData: Map<string, RatesHistoryFile>;
    lenders: Lender[];
    euriborData: EuriborFile | null;
}

// Buyer types that belong to each category
const PDH_BUYER_TYPES = ["ftb", "mover", "switcher-pdh"] as const;
const BTL_BUYER_TYPES = ["btl", "switcher-btl"] as const;

/**
 * Extract rate type from rate name/type
 */
function getRateTypeKey(rate: { type: string; fixedTerm?: number }): string {
    if (rate.type === "variable") return "variable";
    if (rate.fixedTerm) return `fixed-${rate.fixedTerm}`;
    return "other";
}

/**
 * Get display label for rate type key
 */
function getRateTypeLabel(key: string): string {
    if (key === "variable") return "Variable";
    if (key.startsWith("fixed-")) {
        const term = key.replace("fixed-", "");
        return `${term}-Year Fixed`;
    }
    return key;
}

/**
 * Get LTV bucket key for a rate
 */
function getLtvKey(maxLtv: number): string {
    if (maxLtv <= 50) return "ltv-50";
    if (maxLtv <= 60) return "ltv-60";
    if (maxLtv <= 70) return "ltv-70";
    if (maxLtv <= 80) return "ltv-80";
    return "ltv-90";
}

/**
 * Get display label for LTV key
 */
function getLtvLabel(key: string): string {
    const ltv = key.replace("ltv-", "");
    return `≤${ltv}% LTV`;
}

/**
 * Get buyer type category key for a rate
 */
function getBuyerTypeKey(buyerTypes: string[]): string {
    const hasPdh = buyerTypes.some((bt) =>
        (PDH_BUYER_TYPES as readonly string[]).includes(bt),
    );
    const hasBtl = buyerTypes.some((bt) =>
        (BTL_BUYER_TYPES as readonly string[]).includes(bt),
    );
    if (hasPdh && hasBtl) return "buyer-both";
    if (hasBtl) return "buyer-btl";
    return "buyer-pdh";
}

/**
 * Get display label for buyer type key
 */
function getBuyerTypeLabel(key: string): string {
    if (key === "buyer-pdh") return "Primary Residence";
    if (key === "buyer-btl") return "Buy to Let";
    if (key === "buyer-both") return "All Buyers";
    return key;
}

/**
 * Check if a rate matches a BER group filter.
 * Returns true if the rate is available for properties with the given BER group.
 */
function matchesBerFilter(
    berEligible: string[] | undefined,
    berFilter: string,
): boolean {
    // "all" matches any rate
    if (berFilter === "all") return true;

    // If berEligible is undefined or empty, the rate is available for all BER ratings
    if (!berEligible || berEligible.length === 0) return true;

    // Check if any rating in berEligible starts with the filter group letter
    // e.g., berFilter "A" matches "A1", "A2", "A3"
    // Special case for "Exempt" which matches exactly
    if (berFilter === "Exempt") {
        return berEligible.includes("Exempt");
    }

    return berEligible.some((ber) => ber.startsWith(berFilter));
}

/**
 * Get BER group keys for a rate (for grouping purposes)
 * Returns all BER groups the rate is available for.
 * Rates with no BER restriction return ALL groups.
 */
function getBerKeys(berEligible: string[] | undefined): string[] {
    // If berEligible is undefined or empty, rate is available for ALL BER groups
    if (!berEligible || berEligible.length === 0) {
        return BER_GROUP_LIST.map((g) => `ber-${g}`);
    }

    // Get unique groups from the eligible ratings
    const groups = berEligible.map((ber) =>
        ber === "Exempt" ? "Exempt" : ber.charAt(0),
    );
    const uniqueGroups = [...new Set(groups)];
    return uniqueGroups.map((g) => `ber-${g}`);
}

/**
 * Get display label for BER key
 */
function getBerLabel(key: string): string {
    const group = key.replace("ber-", "");
    return `BER ${group}`;
}

/**
 * Time range parsed into start/end dates
 */
interface ParsedTimeRange {
    startDate: Date | null;
    endDate: Date | null; // null means "now"
}

/**
 * Parse time range string into start/end dates
 * Supports: "all", durations (5y, 3m), years (2024), quarters (2024-Q3), months (2024-01)
 */
function parseTimeRange(timeRange: string): ParsedTimeRange {
    if (timeRange === "all") {
        return { startDate: null, endDate: null };
    }

    const now = new Date();

    // Duration patterns: 5y, 3y, 1y, 6m, 3m
    const durationMatch = timeRange.match(/^(\d+)(y|m)$/);
    if (durationMatch) {
        const num = Number.parseInt(durationMatch[1], 10);
        const unit = durationMatch[2];
        if (unit === "y") {
            return {
                startDate: new Date(
                    now.getFullYear() - num,
                    now.getMonth(),
                    now.getDate(),
                ),
                endDate: null,
            };
        }
        if (unit === "m") {
            return {
                startDate: new Date(
                    now.getFullYear(),
                    now.getMonth() - num,
                    now.getDate(),
                ),
                endDate: null,
            };
        }
    }

    // Year pattern: 2024
    const yearMatch = timeRange.match(/^(\d{4})$/);
    if (yearMatch) {
        const year = Number.parseInt(yearMatch[1], 10);
        return {
            startDate: new Date(year, 0, 1),
            endDate: new Date(year, 11, 31, 23, 59, 59, 999),
        };
    }

    // Quarter pattern: 2024-Q3
    const quarterMatch = timeRange.match(/^(\d{4})-Q([1-4])$/);
    if (quarterMatch) {
        const year = Number.parseInt(quarterMatch[1], 10);
        const quarter = Number.parseInt(quarterMatch[2], 10);
        const startMonth = (quarter - 1) * 3;
        const endMonth = startMonth + 2;
        return {
            startDate: new Date(year, startMonth, 1),
            endDate: new Date(year, endMonth + 1, 0, 23, 59, 59, 999), // Last day of end month
        };
    }

    // Month pattern: 2024-01
    const monthMatch = timeRange.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
        const year = Number.parseInt(monthMatch[1], 10);
        const month = Number.parseInt(monthMatch[2], 10) - 1; // 0-indexed
        return {
            startDate: new Date(year, month, 1),
            endDate: new Date(year, month + 1, 0, 23, 59, 59, 999), // Last day of month
        };
    }

    // Unknown format, show all
    return { startDate: null, endDate: null };
}

/**
 * Filter time series data points to only include those within the date range.
 * Also adds the last data point before start (at the start timestamp) to ensure
 * the chart shows the rate that was in effect at the start of the range.
 */
function filterTimeSeriesByDateRange(
    series: RateTimeSeries,
    range: ParsedTimeRange,
): RateTimeSeries {
    if (!range.startDate && !range.endDate) return series;

    const startTs = range.startDate?.getTime() ?? 0;
    const endTs = range.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const filteredPoints: typeof series.dataPoints = [];

    // Find the last point before start to establish the starting rate
    let lastPointBeforeStart: (typeof series.dataPoints)[0] | null = null;

    for (const point of series.dataPoints) {
        const pointTs = new Date(point.timestamp).getTime();
        if (pointTs < startTs) {
            lastPointBeforeStart = point;
        } else if (pointTs <= endTs) {
            filteredPoints.push(point);
        }
    }

    // If there was a rate before the start, add it at the start timestamp
    if (lastPointBeforeStart && range.startDate) {
        filteredPoints.unshift({
            ...lastPointBeforeStart,
            timestamp: range.startDate.toISOString(),
        });
    }

    return {
        ...series,
        dataPoints: filteredPoints,
    };
}

export function RatesTrends({
    historyData,
    lenders,
    euriborData,
}: RatesTrendsProps) {
    const filter = useStore($trendsFilter);
    const selectedLenders = useStore($trendsSelectedLenders);
    const isFirstVisit = useStore($trendsLendersFirstVisit);
    const euriborToggles = useStore($euriborToggles);

    const isMarketOverview = filter.displayMode === "market-overview";

    // Initialize selected lenders to all lenders ONLY on first visit (no localStorage data)
    // This ensures user's explicit "clear all" selection is preserved on refresh
    const initializedRef = useRef(false);
    useEffect(() => {
        if (!initializedRef.current && lenders.length > 0 && isFirstVisit) {
            initializedRef.current = true;
            // First visit: inject all lenders as default, then mark as no longer first visit
            setTrendsSelectedLenders(lenders.map((l) => l.id));
            $trendsLendersFirstVisit.set(false);
        }
    }, [lenders, isFirstVisit]);

    // Get available rates that have history
    const availableRates = useMemo(() => {
        const rates: Array<{
            id: string;
            name: string;
            lenderId: string;
            type: string;
            fixedTerm?: number;
            maxLtv: number;
            buyerTypes: string[];
            berEligible?: string[];
        }> = [];

        for (const [lenderId, history] of historyData) {
            // Get rates from baseline
            for (const rate of history.baseline.rates) {
                rates.push({
                    id: rate.id,
                    name: rate.name,
                    lenderId,
                    type: rate.type,
                    fixedTerm: rate.fixedTerm,
                    maxLtv: rate.maxLtv,
                    buyerTypes: rate.buyerTypes,
                    berEligible: rate.berEligible,
                });
            }

            // Also check changesets for added rates
            for (const changeset of history.changesets) {
                for (const op of changeset.operations) {
                    if (op.op === "add") {
                        rates.push({
                            id: op.rate.id,
                            name: op.rate.name,
                            lenderId,
                            type: op.rate.type,
                            fixedTerm: op.rate.fixedTerm,
                            maxLtv: op.rate.maxLtv,
                            buyerTypes: op.rate.buyerTypes,
                            berEligible: op.rate.berEligible,
                        });
                    }
                }
            }
        }

        // Remove duplicates
        const seen = new Set<string>();
        return rates.filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        });
    }, [historyData]);

    // Filter rates based on current filters
    const filteredRates = useMemo(() => {
        const selectedSet = new Set(selectedLenders);
        return availableRates.filter((rate) => {
            // Filter by selected lenders
            if (!selectedSet.has(rate.lenderId)) return false;

            // Filter by rate type
            if (filter.rateType && filter.rateType !== "all") {
                const rateTypeKey = getRateTypeKey(rate);
                if (rateTypeKey !== filter.rateType) return false;
            }

            // Filter by LTV
            if (filter.ltvRange) {
                const [, maxLtv] = filter.ltvRange;
                if (rate.maxLtv > maxLtv) return false;
            }

            // Filter by buyer category (PDH and BTL are mutually exclusive)
            if (filter.buyerCategory !== "all") {
                const allowedTypes =
                    filter.buyerCategory === "pdh"
                        ? PDH_BUYER_TYPES
                        : BTL_BUYER_TYPES;
                const hasAllowedType = rate.buyerTypes.some((bt) =>
                    (allowedTypes as readonly string[]).includes(bt),
                );
                if (!hasAllowedType) return false;
            }

            // Filter by BER group
            if (!matchesBerFilter(rate.berEligible, filter.berFilter))
                return false;

            return true;
        });
    }, [availableRates, selectedLenders, filter]);

    // Create lender map for quick lookup
    const lenderMap = useMemo(() => {
        return new Map(lenders.map((l) => [l.id, l]));
    }, [lenders]);

    // Parse time range into start/end dates
    const timeRange = useMemo(
        () => parseTimeRange(filter.timeRange),
        [filter.timeRange],
    );

    // Get time series for filtered rates
    const timeSeries = useMemo(() => {
        const series: RateTimeSeries[] = [];
        const showLenderPrefix = selectedLenders.length > 1;

        for (const rate of filteredRates) {
            const history = historyData.get(rate.lenderId);
            if (!history) continue;

            const rateSeries = getRateTimeSeries(history, rate.id);
            if (rateSeries && rateSeries.dataPoints.length >= 1) {
                // Apply time range filter
                const filteredSeries = filterTimeSeriesByDateRange(
                    rateSeries,
                    timeRange,
                );

                // Skip if no data points after filtering
                if (filteredSeries.dataPoints.length === 0) continue;

                // Prefix rate name with lender short name when multiple lenders selected
                if (showLenderPrefix) {
                    const lender = lenderMap.get(rate.lenderId);
                    const prefix = lender?.shortName ?? rate.lenderId;
                    series.push({
                        ...filteredSeries,
                        rateName: `${prefix} ${filteredSeries.rateName}`,
                    });
                } else {
                    series.push(filteredSeries);
                }
            }
        }

        return series;
    }, [
        filteredRates,
        historyData,
        selectedLenders.length,
        lenderMap,
        timeRange,
    ]);

    // Get Euribor time series filtered by enabled toggles
    const euriborTimeSeries = useMemo((): RateTimeSeries[] => {
        if (!euriborData) return [];

        const enabledTenors = Object.entries(euriborToggles)
            .filter(([, enabled]) => enabled)
            .map(([tenor]) => tenor as "1M" | "3M" | "6M" | "12M");

        if (enabledTenors.length === 0) return [];

        return enabledTenors.map((tenor) => {
            const series = getEuriborTimeSeries(euriborData, tenor);
            // Apply the same date range filter as mortgage rates
            return filterTimeSeriesByDateRange(series, timeRange);
        });
    }, [euriborData, euriborToggles, timeRange]);

    // Calculate average time series across all rates (for individual mode)
    const averageSeries = useMemo((): RateTimeSeries | null => {
        if (timeSeries.length < 2 || isMarketOverview) return null;

        // Collect all unique timestamps
        const timestampSet = new Set<string>();
        for (const series of timeSeries) {
            for (const point of series.dataPoints) {
                timestampSet.add(point.timestamp);
            }
        }

        // Add start and end dates for proper range boundaries
        if (timeRange.startDate) {
            timestampSet.add(timeRange.startDate.toISOString());
        }
        const endDate = timeRange.endDate ?? new Date();
        timestampSet.add(endDate.toISOString());

        // Sort timestamps chronologically
        const timestamps = Array.from(timestampSet).sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime(),
        );

        // For each timestamp, calculate the average of all rates that have data at or before that time
        const dataPoints: Array<{ timestamp: string; rate: number }> = [];

        for (const ts of timestamps) {
            const tsTime = new Date(ts).getTime();
            const ratesAtTime: number[] = [];

            for (const series of timeSeries) {
                // Find the most recent rate at or before this timestamp
                let lastRate: number | null = null;
                for (const point of series.dataPoints) {
                    if (new Date(point.timestamp).getTime() <= tsTime) {
                        lastRate = point.rate;
                    } else {
                        break;
                    }
                }
                if (lastRate !== null) {
                    ratesAtTime.push(lastRate);
                }
            }

            if (ratesAtTime.length > 0) {
                const avg =
                    ratesAtTime.reduce((sum, r) => sum + r, 0) /
                    ratesAtTime.length;
                dataPoints.push({ timestamp: ts, rate: avg });
            }
        }

        return {
            rateId: "average",
            rateName: "Average",
            lenderId: "",
            dataPoints,
        };
    }, [timeSeries, isMarketOverview, timeRange]);

    // Calculate market data (min/avg/max per timestamp) for market overview mode
    const marketData = useMemo((): MarketDataPoint[] => {
        if (!isMarketOverview || timeSeries.length === 0) return [];
        // Skip when grouped mode is active - we use breakdownSeries instead
        if (filter.marketChartStyle === "grouped") return [];

        // Collect all unique timestamps
        const timestampSet = new Set<string>();
        for (const series of timeSeries) {
            for (const point of series.dataPoints) {
                timestampSet.add(point.timestamp);
            }
        }

        // Add start and end dates for proper range boundaries
        if (timeRange.startDate) {
            timestampSet.add(timeRange.startDate.toISOString());
        }
        const endDate = timeRange.endDate ?? new Date();
        timestampSet.add(endDate.toISOString());

        // Sort timestamps chronologically
        const timestamps = Array.from(timestampSet).sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime(),
        );

        const dataPoints: MarketDataPoint[] = [];

        for (const ts of timestamps) {
            const tsTime = new Date(ts).getTime();
            const ratesAtTime: number[] = [];

            for (const series of timeSeries) {
                // Find the most recent rate at or before this timestamp
                let lastRate: number | null = null;
                for (const point of series.dataPoints) {
                    if (new Date(point.timestamp).getTime() <= tsTime) {
                        lastRate = point.rate;
                    } else {
                        break;
                    }
                }
                if (lastRate !== null) {
                    ratesAtTime.push(lastRate);
                }
            }

            if (ratesAtTime.length > 0) {
                const min = Math.min(...ratesAtTime);
                const max = Math.max(...ratesAtTime);
                const avg =
                    ratesAtTime.reduce((sum, r) => sum + r, 0) /
                    ratesAtTime.length;
                dataPoints.push({ timestamp: ts, min, max, avg });
            }
        }

        return dataPoints;
    }, [timeSeries, isMarketOverview, filter.marketChartStyle, timeRange]);

    // Calculate breakdown series - grouped by selected dimensions
    const breakdownSeries = useMemo((): RateTimeSeries[] => {
        if (!isMarketOverview || filter.marketChartStyle !== "grouped")
            return [];

        // Build compound group keys for a rate based on selected dimensions
        // Returns multiple keys when BER dimension is used and rate has no BER restriction
        const getGroupKeys = (rate: {
            lenderId: string;
            type: string;
            fixedTerm?: number;
            maxLtv: number;
            buyerTypes: string[];
            berEligible?: string[];
        }): string[] => {
            // Start with a single empty key
            let keys: string[] = [""];

            for (const dim of filter.breakdownBy) {
                if (dim === "ber") {
                    // BER can produce multiple keys (rate available for multiple BER groups)
                    const berKeys = getBerKeys(rate.berEligible);
                    // Expand keys: for each existing key, create variants for each BER key
                    keys = keys.flatMap((existingKey) =>
                        berKeys.map((berKey) =>
                            existingKey ? `${existingKey}|${berKey}` : berKey,
                        ),
                    );
                } else {
                    // Other dimensions produce a single value
                    let part: string;
                    if (dim === "lender") part = rate.lenderId;
                    else if (dim === "rate-type") part = getRateTypeKey(rate);
                    else if (dim === "ltv") part = getLtvKey(rate.maxLtv);
                    else if (dim === "buyer-type")
                        part = getBuyerTypeKey(rate.buyerTypes);
                    else part = "";

                    keys = keys.map((existingKey) =>
                        existingKey ? `${existingKey}|${part}` : part,
                    );
                }
            }

            return keys;
        };

        // Build display label from compound key
        const getGroupLabel = (key: string): string => {
            const parts = key.split("|");
            const labels: string[] = [];
            let dimIndex = 0;
            for (const dim of filter.breakdownBy) {
                const part = parts[dimIndex++];
                if (dim === "lender")
                    labels.push(lenderMap.get(part)?.name ?? part);
                else if (dim === "rate-type")
                    labels.push(getRateTypeLabel(part));
                else if (dim === "ltv") labels.push(getLtvLabel(part));
                else if (dim === "buyer-type")
                    labels.push(getBuyerTypeLabel(part));
                else if (dim === "ber") labels.push(getBerLabel(part));
            }
            return labels.join(" · ");
        };

        // Get lender ID from compound key (for logo display)
        const getLenderIdFromKey = (key: string): string => {
            if (!filter.breakdownBy.includes("lender")) return "";
            const lenderIndex = filter.breakdownBy.indexOf("lender");
            return key.split("|")[lenderIndex] ?? "";
        };

        // Group filtered rates by compound key
        const groups = new Map<
            string,
            Array<{
                id: string;
                lenderId: string;
                type: string;
                fixedTerm?: number;
                maxLtv: number;
                buyerTypes: string[];
                berEligible?: string[];
            }>
        >();

        for (const rate of filteredRates) {
            const keys = getGroupKeys(rate);
            for (const key of keys) {
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key)?.push(rate);
            }
        }

        // For each group, calculate average time series
        const series: RateTimeSeries[] = [];

        for (const [groupKey, rates] of groups) {
            // Get time series for all rates in this group
            const groupTimeSeries: RateTimeSeries[] = [];
            for (const rate of rates) {
                const history = historyData.get(rate.lenderId);
                if (!history) continue;

                const rateSeries = getRateTimeSeries(history, rate.id);
                if (rateSeries && rateSeries.dataPoints.length >= 1) {
                    groupTimeSeries.push(rateSeries);
                }
            }

            if (groupTimeSeries.length === 0) continue;

            // Collect all unique timestamps
            const timestampSet = new Set<string>();
            for (const ts of groupTimeSeries) {
                for (const point of ts.dataPoints) {
                    timestampSet.add(point.timestamp);
                }
            }
            // Add start and end dates for proper range boundaries
            if (timeRange.startDate) {
                timestampSet.add(timeRange.startDate.toISOString());
            }
            const endDate = timeRange.endDate ?? new Date();
            timestampSet.add(endDate.toISOString());

            // Sort timestamps chronologically
            const timestamps = Array.from(timestampSet).sort(
                (a, b) => new Date(a).getTime() - new Date(b).getTime(),
            );

            // Calculate average at each timestamp
            const dataPoints: Array<{ timestamp: string; rate: number }> = [];

            for (const ts of timestamps) {
                const tsTime = new Date(ts).getTime();
                const ratesAtTime: number[] = [];

                for (const groupTs of groupTimeSeries) {
                    let lastRate: number | null = null;
                    for (const point of groupTs.dataPoints) {
                        if (new Date(point.timestamp).getTime() <= tsTime) {
                            lastRate = point.rate;
                        } else {
                            break;
                        }
                    }
                    if (lastRate !== null) {
                        ratesAtTime.push(lastRate);
                    }
                }

                if (ratesAtTime.length > 0) {
                    const avg =
                        ratesAtTime.reduce((sum, r) => sum + r, 0) /
                        ratesAtTime.length;
                    dataPoints.push({ timestamp: ts, rate: avg });
                }
            }

            // Apply time range filter to the computed series
            const filteredSeries = filterTimeSeriesByDateRange(
                {
                    rateId: groupKey,
                    rateName: getGroupLabel(groupKey),
                    lenderId: getLenderIdFromKey(groupKey),
                    dataPoints,
                },
                timeRange,
            );

            if (filteredSeries.dataPoints.length > 0) {
                series.push(filteredSeries);
            }
        }

        // Sort series for consistent ordering
        return series.sort((a, b) => a.rateName.localeCompare(b.rateName));
    }, [
        isMarketOverview,
        filter.marketChartStyle,
        filter.breakdownBy,
        filteredRates,
        historyData,
        lenderMap,
        timeRange,
    ]);

    // Calculate market overview statistics
    const marketOverviewStats = useMemo((): MarketOverviewStats | null => {
        if (!isMarketOverview || marketData.length === 0) return null;

        const currentPoint = marketData[marketData.length - 1];

        // Find historical lowest and highest averages
        let lowestAvgPoint = marketData[0];
        let highestAvgPoint = marketData[0];

        // Find absolute lowest and highest (from min/max at each point)
        let absoluteLowest = {
            rate: marketData[0].min,
            timestamp: marketData[0].timestamp,
        };
        let absoluteHighest = {
            rate: marketData[0].max,
            timestamp: marketData[0].timestamp,
        };

        for (const point of marketData) {
            if (point.avg < lowestAvgPoint.avg) lowestAvgPoint = point;
            if (point.avg > highestAvgPoint.avg) highestAvgPoint = point;
            if (point.min < absoluteLowest.rate) {
                absoluteLowest = {
                    rate: point.min,
                    timestamp: point.timestamp,
                };
            }
            if (point.max > absoluteHighest.rate) {
                absoluteHighest = {
                    rate: point.max,
                    timestamp: point.timestamp,
                };
            }
        }

        return {
            currentAverage: currentPoint.avg,
            currentMin: currentPoint.min,
            currentMax: currentPoint.max,
            currentDate: currentPoint.timestamp,
            lowestAverage: lowestAvgPoint.avg,
            lowestAverageDate: lowestAvgPoint.timestamp,
            highestAverage: highestAvgPoint.avg,
            highestAverageDate: highestAvgPoint.timestamp,
            absoluteLowest: absoluteLowest.rate,
            absoluteLowestDate: absoluteLowest.timestamp,
            absoluteHighest: absoluteHighest.rate,
            absoluteHighestDate: absoluteHighest.timestamp,
        };
    }, [marketData, isMarketOverview]);

    // Calculate breakdown statistics (per-group stats for grouped mode)
    const breakdownStats = useMemo((): RateStat[] => {
        if (!isMarketOverview || filter.marketChartStyle !== "grouped")
            return [];

        return breakdownSeries.map((series) => {
            const points = series.dataPoints;

            if (points.length === 0) {
                return {
                    rateId: series.rateId,
                    rateName: series.rateName,
                    lenderId: series.lenderId,
                    lenderName: series.rateName,
                    min: null,
                    max: null,
                    current: null,
                };
            }

            let minPoint = points[0];
            let maxPoint = points[0];

            for (const point of points) {
                if (point.rate < minPoint.rate) minPoint = point;
                if (point.rate > maxPoint.rate) maxPoint = point;
            }

            const currentPoint = points[points.length - 1];

            return {
                rateId: series.rateId,
                rateName: series.rateName,
                lenderId: series.lenderId,
                lenderName: series.rateName,
                min: { rate: minPoint.rate, date: minPoint.timestamp },
                max: { rate: maxPoint.rate, date: maxPoint.timestamp },
                current: {
                    rate: currentPoint.rate,
                    date: currentPoint.timestamp,
                },
            };
        });
    }, [isMarketOverview, filter.marketChartStyle, breakdownSeries]);

    // Calculate min/max/current stats for each rate (individual mode)
    const rateStats = useMemo((): RateStat[] => {
        if (isMarketOverview) return [];

        return timeSeries.map((series) => {
            const lender = lenders.find((l) => l.id === series.lenderId);
            const points = series.dataPoints;

            if (points.length === 0) {
                return {
                    rateId: series.rateId,
                    rateName: series.rateName,
                    lenderId: series.lenderId,
                    lenderName: lender?.name ?? series.lenderId,
                    min: null,
                    max: null,
                    current: null,
                };
            }

            let minPoint = points[0];
            let maxPoint = points[0];

            for (const point of points) {
                if (point.rate < minPoint.rate) minPoint = point;
                if (point.rate > maxPoint.rate) maxPoint = point;
            }

            const currentPoint = points[points.length - 1];

            return {
                rateId: series.rateId,
                rateName: series.rateName,
                lenderId: series.lenderId,
                lenderName: lender?.name ?? series.lenderId,
                min: { rate: minPoint.rate, date: minPoint.timestamp },
                max: { rate: maxPoint.rate, date: maxPoint.timestamp },
                current: {
                    rate: currentPoint.rate,
                    date: currentPoint.timestamp,
                },
            };
        });
    }, [timeSeries, lenders, isMarketOverview]);

    // Determine if grouped mode is active
    const isGroupedActive =
        isMarketOverview && filter.marketChartStyle === "grouped";

    // Count unique lenders for info text
    const uniqueLenderCount = useMemo(() => {
        const lenderSet = new Set<string>();
        for (const rate of filteredRates) {
            lenderSet.add(rate.lenderId);
        }
        return lenderSet.size;
    }, [filteredRates]);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <TrendsFilters lenders={lenders} />

            {/* View Mode and Time Range Controls */}
            <TrendsViewControls />

            {/* Chart */}
            {timeSeries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <TrendingUp className="h-8 w-8 mb-4" />
                    <p>No rates match your filters</p>
                    <p className="text-xs mt-1">
                        Try selecting different lenders or rate types
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        {isGroupedActive ? (
                            <>
                                Showing {breakdownSeries.length} group
                                {breakdownSeries.length !== 1 ? "s" : ""} based
                                on {timeSeries.length} rate
                                {timeSeries.length !== 1 ? "s" : ""}
                            </>
                        ) : isMarketOverview ? (
                            <>
                                Market overview based on {timeSeries.length}{" "}
                                rate
                                {timeSeries.length !== 1 ? "s" : ""} from{" "}
                                {uniqueLenderCount} lender
                                {uniqueLenderCount !== 1 ? "s" : ""}
                            </>
                        ) : (
                            <>
                                Showing {timeSeries.length} rate
                                {timeSeries.length !== 1 ? "s" : ""} with
                                historical data
                            </>
                        )}
                    </div>

                    <div className="relative">
                        <RatesTrendChart
                            data={
                                isGroupedActive
                                    ? breakdownSeries
                                    : isMarketOverview
                                      ? []
                                      : timeSeries
                            }
                            averageSeries={
                                isMarketOverview ? null : averageSeries
                            }
                            marketData={
                                isMarketOverview && !isGroupedActive
                                    ? marketData
                                    : undefined
                            }
                            displayStyle={
                                isGroupedActive
                                    ? "lines"
                                    : isMarketOverview
                                      ? filter.marketChartStyle === "range-band"
                                          ? "range-band"
                                          : "average"
                                      : "lines"
                            }
                            showLegend={!isMarketOverview || isGroupedActive}
                            height={350}
                            animate={false}
                            endDate={timeRange.endDate}
                            euriborSeries={euriborTimeSeries}
                        />
                    </div>

                    {/* Chart controls row: Euribor + Market Overview Options */}
                    <div className="flex flex-wrap-reverse items-center gap-x-6 gap-y-2 mt-2">
                        {isMarketOverview && <MarketOverviewOptions />}
                        <div className="ml-auto">
                            <EuriborToggles />
                        </div>
                    </div>

                    {/* Stats Table */}
                    <TrendsStatsTable
                        rateStats={
                            isGroupedActive
                                ? breakdownStats
                                : isMarketOverview
                                  ? []
                                  : rateStats
                        }
                        marketStats={
                            isMarketOverview && !isGroupedActive
                                ? marketOverviewStats
                                : null
                        }
                        isGroupedMode={isGroupedActive}
                        breakdownBy={filter.breakdownBy}
                    />
                </div>
            )}
        </div>
    );
}
