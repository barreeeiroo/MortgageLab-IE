/**
 * Lender logo assets mapped by lender ID.
 * Shared between UI components and PDF export.
 */

import aibLogo from "@/assets/logos/lenders/aib.webp";
import avantLogo from "@/assets/logos/lenders/avant.webp";
import boiLogo from "@/assets/logos/lenders/boi.webp";
import cuLogo from "@/assets/logos/lenders/cu.webp";
import ebsLogo from "@/assets/logos/lenders/ebs.webp";
import havenLogo from "@/assets/logos/lenders/haven.webp";
import icsLogo from "@/assets/logos/lenders/ics.webp";
import mocoLogo from "@/assets/logos/lenders/moco.webp";
import nuaLogo from "@/assets/logos/lenders/nua.webp";
import ptsbLogo from "@/assets/logos/lenders/ptsb.webp";

export const LENDER_LOGOS: Record<string, ImageMetadata> = {
	aib: aibLogo,
	avant: avantLogo,
	boi: boiLogo,
	cu: cuLogo,
	ebs: ebsLogo,
	haven: havenLogo,
	ics: icsLogo,
	moco: mocoLogo,
	nua: nuaLogo,
	ptsb: ptsbLogo,
};

/**
 * Gets all known lender IDs.
 */
export function getKnownLenderIds(): string[] {
	return Object.keys(LENDER_LOGOS);
}
