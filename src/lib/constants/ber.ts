// BER ratings in Ireland (A1 is best, G is worst)
export const BER_RATINGS = [
	"A1",
	"A2",
	"A3",
	"B1",
	"B2",
	"B3",
	"C1",
	"C2",
	"C3",
	"D1",
	"D2",
	"E1",
	"E2",
	"F",
	"G",
	"Exempt",
] as const;

export type BerRating = (typeof BER_RATINGS)[number];

// BER group aliases
export const BER_GROUP_A: BerRating[] = ["A1", "A2", "A3"];
export const BER_GROUP_B: BerRating[] = ["B1", "B2", "B3"];
export const BER_GROUP_C: BerRating[] = ["C1", "C2", "C3"];
export const BER_GROUP_D: BerRating[] = ["D1", "D2"];
export const BER_GROUP_E: BerRating[] = ["E1", "E2"];

// "Green" BER ratings (B3 or better) - typically qualify for green mortgage rates
export const GREEN_BER_RATINGS: BerRating[] = [...BER_GROUP_A, ...BER_GROUP_B];

export function isGreenBer(ber: BerRating): boolean {
	return GREEN_BER_RATINGS.includes(ber);
}

export function getBerGroup(ber: BerRating): string {
	if (BER_GROUP_A.includes(ber)) return "A";
	if (BER_GROUP_B.includes(ber)) return "B";
	if (BER_GROUP_C.includes(ber)) return "C";
	if (BER_GROUP_D.includes(ber)) return "D";
	if (BER_GROUP_E.includes(ber)) return "E";
	if (ber === "F") return "F";
	if (ber === "G") return "G";
	return "Exempt";
}
