/**
 * Mortgage calculation utilities
 */

export { type AprcConfig, calculateAprc, inferFollowOnRate } from "./aprc";
export {
	calculateMonthlyPayment,
	calculateRemainingBalance,
} from "./payments";
