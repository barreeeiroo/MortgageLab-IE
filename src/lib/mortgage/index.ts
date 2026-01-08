/**
 * Mortgage calculation utilities
 */

export { type AprcConfig, calculateAprc, inferFollowOnRate } from "./aprc";
export {
	calculateCostOfCreditPercent,
	calculateFollowOnLtv,
	calculateMonthlyFollowOn,
	calculateMonthlyPayment,
	calculateRemainingBalance,
	calculateTotalRepayable,
	findVariableRate,
} from "./payments";
