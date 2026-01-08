// Common share utilities

// Borrowing calculator share utilities
export {
	BORROWING_SHARE_PARAM,
	type BorrowingCalculatorType,
	type BorrowingShareState,
	type BtlShareState,
	clearBorrowingShareParam,
	copyBorrowingShareUrl,
	type FtbShareState,
	hasBorrowingShareParam,
	type MoverShareState,
	parseBorrowingShareState,
} from "./borrowing";
// Breakeven calculator share utilities
export {
	BREAKEVEN_SHARE_PARAM,
	type BreakevenCalculatorType,
	type BreakevenShareState,
	clearBreakevenShareParam,
	copyBreakevenShareUrl,
	hasBreakevenShareParam,
	parseBreakevenShareState,
	type RemortgageBreakevenShareState,
	type RentVsBuyShareState,
} from "./breakeven";
export {
	clearUrlParam,
	compressToUrl,
	decompressFromUrl,
	getUrlParam,
} from "./common";
// Rates page share utilities
export {
	clearRatesShareParam,
	generateRatesShareUrl,
	hasRatesShareParam,
	parseRatesShareState,
	RATES_SHARE_PARAM,
	type RatesShareState,
	type ShareableTableState,
} from "./rates";
