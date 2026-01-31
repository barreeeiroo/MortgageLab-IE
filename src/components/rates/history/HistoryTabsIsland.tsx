import { useStore } from "@nanostores/react";
import {
    ArrowLeftRight,
    CalendarClock,
    RefreshCw,
    TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    $historyDataState,
    loadHistoryData,
} from "@/lib/stores/rates/rates-history-data";
import {
    $historyActiveTab,
    type HistoryTab,
    initializeHistoryFilters,
    setHistoryTab,
} from "@/lib/stores/rates/rates-history-filters";

/**
 * Tab navigation island for history page.
 * Renders tabs and centralized loading/error states.
 * Content islands only render when data is ready.
 */
export function HistoryTabsIsland() {
    const [initialized, setInitialized] = useState(false);
    const activeTab = useStore($historyActiveTab);
    const { loading, error, historyData } = useStore($historyDataState);

    // Initialize filters from localStorage/share URL and load data on mount
    useEffect(() => {
        initializeHistoryFilters();
        setInitialized(true);
        loadHistoryData();
    }, []);

    const handleTabChange = (value: string) => {
        setHistoryTab(value as HistoryTab);
    };

    const tabsDisabled = !initialized || loading;

    return (
        <div className="space-y-4">
            <Tabs
                value={initialized ? activeTab : undefined}
                onValueChange={handleTabChange}
            >
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger
                        value="updates"
                        className="gap-1.5"
                        disabled={tabsDisabled}
                    >
                        <CalendarClock className="h-4 w-4" />
                        <span className="hidden sm:inline">
                            Updates History
                        </span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="changes"
                        className="gap-1.5"
                        disabled={tabsDisabled}
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                        <span className="hidden sm:inline">Rate Changes</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="trends"
                        className="gap-1.5"
                        disabled={tabsDisabled}
                    >
                        <TrendingUp className="h-4 w-4" />
                        <span className="hidden sm:inline">Trends</span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 animate-spin mb-4" />
                    <p>Loading historical data...</p>
                </div>
            )}

            {error && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <p className="text-destructive">{error}</p>
                </div>
            )}

            {!loading && !error && historyData.size === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <p>No historical data available</p>
                </div>
            )}
        </div>
    );
}
