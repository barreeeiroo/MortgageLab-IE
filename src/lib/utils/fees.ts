// Stamp Duty for residential property in Ireland
// 1% up to €1M, 2% from €1M to €1.5M, 6% above €1.5M (cumulative)
export function calculateStampDuty(propertyValue: number): number {
	if (propertyValue <= 0) return 0;

	let stampDuty = 0;
	const tier1Limit = 1_000_000;
	const tier2Limit = 1_500_000;

	if (propertyValue <= tier1Limit) {
		stampDuty = propertyValue * 0.01;
	} else if (propertyValue <= tier2Limit) {
		stampDuty = tier1Limit * 0.01 + (propertyValue - tier1Limit) * 0.02;
	} else {
		stampDuty =
			tier1Limit * 0.01 +
			(tier2Limit - tier1Limit) * 0.02 +
			(propertyValue - tier2Limit) * 0.06;
	}

	return stampDuty;
}

// Estimated legal fees (solicitor, searches, registration, etc.)
export const ESTIMATED_LEGAL_FEES = 4000;

// Estimated legal fees for remortgage/switching (includes all outlays)
export const ESTIMATED_REMORTGAGE_LEGAL_FEES = 1350;
