import { atom, computed } from "nanostores";
import type {
    CashbackBreakevenResult,
    RemortgageResult,
    RentVsBuyResult,
} from "@/lib/mortgage/breakeven";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type {
    CashbackBreakevenShareState,
    RemortgageBreakevenShareState,
    RentVsBuyShareState,
} from "@/lib/share/breakeven";

// --- Overpayment Allowance Info ---

export interface OverpaymentAllowanceInfo {
    /** Overpayment policy details, undefined if breakage fee applies */
    policy?: OverpaymentPolicy;
    /** Total allowed overpayment for the comparison period */
    totalAllowance: number;
}

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
    fixedPeriodMonths: number | null; // null = variable rate (new rate)
    currentRateRemainingFixedMonths: number | null; // null = not on fixed rate or unknown
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

// --- Cashback Comparison Store ---

export interface CashbackResultState {
    result: CashbackBreakevenResult;
    mortgageAmount: number;
    mortgageTermMonths: number;
    shareState: CashbackBreakevenShareState;
    /** Overpayment allowance info for each option (same order as result.options) */
    overpaymentAllowances?: OverpaymentAllowanceInfo[];
}

export const $cashbackResult = atom<CashbackResultState | null>(null);
export const $cashbackDialogOpen = atom(false);

export function setCashbackResult(state: CashbackResultState): void {
    $cashbackResult.set(state);
}

export function openCashbackDialog(): void {
    $cashbackDialogOpen.set(true);
}

export function closeCashbackDialog(): void {
    $cashbackDialogOpen.set(false);
}

export function showCashbackResult(state: CashbackResultState): void {
    setCashbackResult(state);
    openCashbackDialog();
}

// --- Combined Dialog State ---

// Useful for the result island to know which dialog to show
export const $activeBreakevenType = computed(
    [$rentVsBuyDialogOpen, $remortgageDialogOpen, $cashbackDialogOpen],
    (rvbOpen, rmOpen, cbOpen) => {
        if (rvbOpen) return "rvb" as const;
        if (rmOpen) return "rm" as const;
        if (cbOpen) return "cb" as const;
        return null;
    },
);
