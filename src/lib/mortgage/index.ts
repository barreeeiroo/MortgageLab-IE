/**
 * Mortgage calculation utilities
 */

export { type AprcConfig, calculateAprc, inferFollowOnRate } from "./aprc";
export {
	calculateMonthlyFollowOn,
	calculateMonthlyPayment,
	calculateRemainingBalance,
	calculateTotalRepayable,
	findVariableRate,
} from "./payments";
