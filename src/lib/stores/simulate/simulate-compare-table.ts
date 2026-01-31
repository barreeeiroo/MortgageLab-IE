import { atom } from "nanostores";
import { loadFromStorage, saveToStorage } from "@/lib/storage/helpers";

const STORAGE_KEY = "simulate-compare-table";

export interface CompareTableColumnVisibility {
    opening: boolean;
    interest: boolean;
    principal: boolean;
    overpayments: boolean;
    totalPaid: boolean;
    closing: boolean;
}

export interface CompareTableSettings {
    visibleColumns: CompareTableColumnVisibility;
    // Note: expandedYears is not persisted as it's session-specific
}

// Serializable settings (for localStorage)
interface StoredSettings {
    visibleColumns: CompareTableColumnVisibility;
}

const DEFAULT_SETTINGS: CompareTableSettings = {
    visibleColumns: {
        opening: true,
        interest: false,
        principal: true,
        overpayments: false,
        totalPaid: false,
        closing: true,
    },
};

// Load initial state from localStorage
function loadSettings(): CompareTableSettings {
    const stored = loadFromStorage<StoredSettings>(STORAGE_KEY);
    if (stored?.visibleColumns) {
        return {
            visibleColumns: {
                ...DEFAULT_SETTINGS.visibleColumns,
                ...stored.visibleColumns,
            },
        };
    }
    return DEFAULT_SETTINGS;
}

// Main table settings atom
export const $compareTableSettings = atom<CompareTableSettings>(loadSettings());

// Expanded years - session-only state (not persisted)
export const $compareTableExpandedYears = atom<Set<number>>(new Set());

// Visible simulations - which simulations to show in the table
export const $compareTableVisibleSimulations = atom<Set<string>>(new Set());

// Persist settings on changes
$compareTableSettings.listen((settings) => {
    const toStore: StoredSettings = {
        visibleColumns: settings.visibleColumns,
    };
    saveToStorage(STORAGE_KEY, toStore);
});

// Actions
export function toggleCompareTableColumn(
    column: keyof CompareTableColumnVisibility,
): void {
    const current = $compareTableSettings.get();
    $compareTableSettings.set({
        ...current,
        visibleColumns: {
            ...current.visibleColumns,
            [column]: !current.visibleColumns[column],
        },
    });
}

export function setCompareTableColumnVisibility(
    column: keyof CompareTableColumnVisibility,
    visible: boolean,
): void {
    const current = $compareTableSettings.get();
    $compareTableSettings.set({
        ...current,
        visibleColumns: {
            ...current.visibleColumns,
            [column]: visible,
        },
    });
}

export function toggleCompareTableYear(year: number): void {
    const current = $compareTableExpandedYears.get();
    const next = new Set(current);
    if (next.has(year)) {
        next.delete(year);
    } else {
        next.add(year);
    }
    $compareTableExpandedYears.set(next);
}

export function expandAllCompareTableYears(years: number[]): void {
    $compareTableExpandedYears.set(new Set(years));
}

export function collapseAllCompareTableYears(): void {
    $compareTableExpandedYears.set(new Set());
}

export function initializeCompareTableVisibleSimulations(
    simulationIds: string[],
): void {
    $compareTableVisibleSimulations.set(new Set(simulationIds));
}

export function toggleCompareTableSimulation(simId: string): void {
    const current = $compareTableVisibleSimulations.get();
    const next = new Set(current);
    if (next.has(simId)) {
        // Don't allow hiding all simulations
        if (next.size > 1) {
            next.delete(simId);
        }
    } else {
        next.add(simId);
    }
    $compareTableVisibleSimulations.set(next);
}

export function resetCompareTableSettings(): void {
    $compareTableSettings.set(DEFAULT_SETTINGS);
    $compareTableExpandedYears.set(new Set());
}

// Column configuration for UI
export interface CompareTableColumnConfig {
    key: keyof CompareTableColumnVisibility;
    label: string;
    color?: string;
}

export const COMPARE_TABLE_COLUMNS: CompareTableColumnConfig[] = [
    { key: "opening", label: "Opening" },
    { key: "interest", label: "Interest", color: "#dc2626" }, // Red
    { key: "principal", label: "Principal", color: "#16a34a" }, // Green
    { key: "overpayments", label: "Overpayments" },
    { key: "totalPaid", label: "Total Paid" },
    { key: "closing", label: "Closing" },
];
