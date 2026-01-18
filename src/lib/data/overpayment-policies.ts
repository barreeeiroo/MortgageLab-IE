/**
 * Overpayment policy data fetching and helper utilities.
 */

import {
	OverpaymentPoliciesFileSchema,
	type OverpaymentPolicy,
} from "@/lib/schemas/overpayment-policy";
import { getPath } from "@/lib/utils/path";

/**
 * Fetch overpayment policies data from the JSON file.
 * @returns Array of overpayment policies, or empty array on error
 */
export async function fetchOverpaymentPoliciesData(): Promise<
	OverpaymentPolicy[]
> {
	try {
		const res = await fetch(getPath("data/overpayment-policies.json"));
		if (!res.ok) return [];
		const json = await res.json();
		return OverpaymentPoliciesFileSchema.parse(json);
	} catch {
		return [];
	}
}

/**
 * Get an overpayment policy by ID from a policies array
 */
export function getOverpaymentPolicy(
	policies: OverpaymentPolicy[],
	id: string,
): OverpaymentPolicy | undefined {
	return policies.find((p) => p.id === id);
}
