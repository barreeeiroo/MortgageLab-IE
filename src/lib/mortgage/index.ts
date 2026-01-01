/**
 * Mortgage calculation utilities
 */

export { type AprcConfig, calculateAprc, inferFollowOnRate } from "./aprc";
export {
	calculateMonthlyFollowUp,
	calculateMonthlyPayment,
	calculateRemainingBalance,
	findVariableRate,
} from "./payments";
