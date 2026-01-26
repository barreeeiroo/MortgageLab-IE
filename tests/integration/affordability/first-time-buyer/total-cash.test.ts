/**
 * Total cash required calculations for First Time Buyer.
 *
 * Tests deposit + stamp duty + legal fees calculations.
 */

import { describe, expect, it } from "vitest";
import { calculateStampDuty, ESTIMATED_LEGAL_FEES } from "@/lib/utils/fees";
import {
	calculateRequiredDeposit,
	LTV_LIMITS,
	PROPERTY_VALUES,
} from "../fixtures";

describe("FTB total cash required", () => {
	const FTB_LTV = LTV_LIMITS.FTB; // 90%

	it("calculates all upfront costs for €400k purchase", () => {
		const propertyValue = PROPERTY_VALUES.average; // €400k
		const deposit = calculateRequiredDeposit(propertyValue, FTB_LTV);

		const stampDuty = calculateStampDuty(propertyValue);
		const legalFees = ESTIMATED_LEGAL_FEES;

		// Stamp duty: 1% on first €1m = €4,000
		expect(stampDuty).toBe(4000);
		expect(deposit).toBeCloseTo(40000, 0);
		expect(legalFees).toBe(4000);

		const totalCashRequired = deposit + stampDuty + legalFees;
		expect(totalCashRequired).toBeCloseTo(48000, 0);
	});

	it("calculates stamp duty correctly for €600k purchase", () => {
		const propertyValue = PROPERTY_VALUES.premium; // €600k

		const stampDuty = calculateStampDuty(propertyValue);

		// 1% on first €1m = €6,000
		expect(stampDuty).toBe(6000);
	});

	it("calculates higher stamp duty for €1.2m purchase", () => {
		const propertyValue = 1200000;

		const stampDuty = calculateStampDuty(propertyValue);

		// 1% on first €1m = €10,000, 2% on next €200k = €4,000
		expect(stampDuty).toBe(14000);
	});
});
