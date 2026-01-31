import { atom, computed } from "nanostores";
import type {
    SaveableSimulationState,
    SavedSimulation,
    SimulationState,
} from "@/lib/schemas/simulate";
import { $simulationState } from "./simulate-state";

export const SAVES_STORAGE_KEY = "simulate-saves";

// Atom for saved simulations
export const $savedSimulations = atom<SavedSimulation[]>([]);

// Track initialization
let savesInitialized = false;

/**
 * Generate a unique ID for a saved simulation
 */
export function generateSaveId(): string {
    return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Initialize saved simulations from localStorage
 */
export function initializeSavedSimulations(): void {
    if (typeof window === "undefined" || savesInitialized) return;
    savesInitialized = true;

    try {
        const stored = localStorage.getItem(SAVES_STORAGE_KEY);
        if (stored) {
            $savedSimulations.set(JSON.parse(stored));
        }
    } catch {
        // Ignore parse errors, use empty array
    }
}

/**
 * Persist saved simulations to localStorage
 */
function persistSaves(saves: SavedSimulation[]): void {
    if (typeof window !== "undefined") {
        localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(saves));
    }
}

/**
 * Extract saveable state from full simulation state
 */
export function extractSaveableState(
    state: SimulationState,
): SaveableSimulationState {
    const { initialized: _, ...saveable } = state;
    return saveable;
}

/**
 * Save the current simulation with a name.
 * If a save with the same name exists, it will be overwritten.
 */
export function saveSimulation(name: string): SavedSimulation {
    const now = new Date().toISOString();
    const currentState = $simulationState.get();
    const saves = $savedSimulations.get();

    // Check if a save with this name already exists
    const existingIndex = saves.findIndex((s) => s.name === name);

    if (existingIndex >= 0) {
        // Overwrite existing save
        const updatedSave: SavedSimulation = {
            ...saves[existingIndex],
            state: extractSaveableState(currentState),
            lastUpdatedAt: now,
        };

        const updated = [...saves];
        updated[existingIndex] = updatedSave;
        $savedSimulations.set(updated);
        persistSaves(updated);

        return updatedSave;
    }

    // Create new save
    const newSave: SavedSimulation = {
        id: generateSaveId(),
        name,
        state: extractSaveableState(currentState),
        createdAt: now,
        lastUpdatedAt: now,
    };

    const updated = [...saves, newSave];
    $savedSimulations.set(updated);
    persistSaves(updated);

    return newSave;
}

/**
 * Load a saved simulation into the active state
 */
export function loadSave(saveId: string): boolean {
    const saves = $savedSimulations.get();
    const save = saves.find((s) => s.id === saveId);
    if (!save) return false;

    $simulationState.set({
        ...save.state,
        initialized: true,
    });

    return true;
}

/**
 * Delete a saved simulation
 */
export function deleteSave(saveId: string): void {
    const saves = $savedSimulations.get();
    const updated = saves.filter((s) => s.id !== saveId);
    $savedSimulations.set(updated);
    persistSaves(updated);
}

/**
 * Rename a saved simulation
 */
export function renameSave(saveId: string, newName: string): boolean {
    const saves = $savedSimulations.get();
    const saveIndex = saves.findIndex((s) => s.id === saveId);
    if (saveIndex === -1) return false;

    // Check if name already exists (for a different save)
    const nameExists = saves.some((s) => s.id !== saveId && s.name === newName);
    if (nameExists) return false;

    const now = new Date().toISOString();
    const updated = [...saves];
    updated[saveIndex] = {
        ...updated[saveIndex],
        name: newName,
        lastUpdatedAt: now,
    };

    $savedSimulations.set(updated);
    persistSaves(updated);
    return true;
}

// Computed: check if there are any saved simulations
export const $hasSavedSimulations = computed(
    $savedSimulations,
    (saves) => saves.length > 0,
);
