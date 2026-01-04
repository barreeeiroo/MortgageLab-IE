import type { RateType } from "@/lib/schemas/rate";
import type { StoredCustomRate } from "@/lib/stores/custom-rates";

/**
 * Custom rates URL sharing - compression/decompression
 * Reused by both rates page and simulate page sharing
 */

// Compressed custom rate format for URL (abbreviated keys)
export interface CompressedCustomRate {
	id: string;
	n: string; // name
	li: string; // lenderId
	ty: string; // type
	rt: number; // rate
	ap?: number; // apr
	ft?: number; // fixedTerm
	mnL: number; // minLtv
	mxL: number; // maxLtv
	mnLn?: number; // minLoan
	bt: string[]; // buyerTypes
	be?: string[]; // berEligible
	nb?: boolean; // newBusiness
	pk?: string[]; // perks
	w?: string; // warning
	cln?: string; // customLenderName
}

export function compressCustomRate(
	rate: StoredCustomRate,
): CompressedCustomRate {
	return {
		id: rate.id,
		n: rate.name,
		li: rate.lenderId,
		ty: rate.type,
		rt: rate.rate,
		ap: rate.apr,
		ft: rate.fixedTerm,
		mnL: rate.minLtv,
		mxL: rate.maxLtv,
		mnLn: rate.minLoan,
		bt: rate.buyerTypes,
		be: rate.berEligible,
		nb: rate.newBusiness,
		pk: rate.perks.length > 0 ? rate.perks : undefined,
		w: rate.warning,
		cln: rate.customLenderName,
	};
}

export function decompressCustomRate(
	compressed: CompressedCustomRate,
): StoredCustomRate {
	return {
		id: compressed.id,
		name: compressed.n,
		lenderId: compressed.li,
		type: compressed.ty as RateType,
		rate: compressed.rt,
		apr: compressed.ap,
		fixedTerm: compressed.ft,
		minLtv: compressed.mnL,
		maxLtv: compressed.mxL,
		minLoan: compressed.mnLn,
		buyerTypes: compressed.bt as StoredCustomRate["buyerTypes"],
		berEligible: compressed.be as StoredCustomRate["berEligible"],
		newBusiness: compressed.nb,
		perks: compressed.pk ?? [],
		warning: compressed.w,
		customLenderName: compressed.cln,
	};
}
