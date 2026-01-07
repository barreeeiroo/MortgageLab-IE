import { atom, computed } from "nanostores";
import type {
	RemortgageResult,
	RentVsBuyResult,
} from "@/lib/mortgage/breakeven";
import type {
	RemortgageBreakevenShareState,
	RentVsBuyShareState,
} from "@/lib/share";

// --- Rent vs Buy Store ---

export interface RentVsBuyResultState {
	result: RentVsBuyResult;
	monthlyRent: number;
	saleCostRate: number;
	shareState: RentVsBuyShareState;
}

export const $rentVsBuyResult = atom<RentVsBuyResultState | null>(null);
export const $rentVsBuyDialogOpen = atom(false);

export function setRentVsBuyResult(state: RentVsBuyResultState): void {
	$rentVsBuyResult.set(state);
}

export function openRentVsBuyDialog(): void {
	$rentVsBuyDialogOpen.set(true);
}

export function closeRentVsBuyDialog(): void {
	$rentVsBuyDialogOpen.set(false);
}

export function showRentVsBuyResult(state: RentVsBuyResultState): void {
	setRentVsBuyResult(state);
	openRentVsBuyDialog();
}

// --- Remortgage Breakeven Store ---

export interface RemortgageResultState {
	result: RemortgageResult;
	remainingTermMonths: number;
	shareState: RemortgageBreakevenShareState;
}

export const $remortgageResult = atom<RemortgageResultState | null>(null);
export const $remortgageDialogOpen = atom(false);

export function setRemortgageResult(state: RemortgageResultState): void {
	$remortgageResult.set(state);
}

export function openRemortgageDialog(): void {
	$remortgageDialogOpen.set(true);
}

export function closeRemortgageDialog(): void {
	$remortgageDialogOpen.set(false);
}

export function showRemortgageResult(state: RemortgageResultState): void {
	setRemortgageResult(state);
	openRemortgageDialog();
}

// --- Combined Dialog State ---

// Useful for the result island to know which dialog to show
export const $activeBreakevenType = computed(
	[$rentVsBuyDialogOpen, $remortgageDialogOpen],
	(rvbOpen, rmOpen) => {
		if (rvbOpen) return "rvb" as const;
		if (rmOpen) return "rm" as const;
		return null;
	},
);
