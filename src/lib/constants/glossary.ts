export interface GlossaryTerm {
	id: string;
	term: string;
	shortDescription: string;
	fullDescription: string;
	relatedTerms?: string[];
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
	{
		id: "apr",
		term: "APR",
		shortDescription: "Annual Percentage Rate",
		fullDescription:
			"The Annual Percentage Rate (APR) represents the yearly interest rate charged on a mortgage, expressed as a percentage. It reflects the basic cost of borrowing but does not include additional fees or charges associated with the loan. While useful for comparing headline rates, the APR alone may not give you the full picture of a mortgage's total cost.",
		relatedTerms: ["aprc"],
	},
	{
		id: "aprc",
		term: "APRC",
		shortDescription: "Annual Percentage Rate of Charge",
		fullDescription:
			"The Annual Percentage Rate of Charge (APRC) is an EU-standardised measure that represents the total cost of a mortgage, including the interest rate plus all mandatory fees and charges (such as valuation fees, legal fees, and mortgage protection insurance where required). The APRC provides a more accurate comparison between different mortgage products as it shows the true cost of borrowing over the full term of the loan. In Ireland, lenders are legally required to display the APRC.",
		relatedTerms: ["apr"],
	},
	{
		id: "followUpProduct",
		term: "Follow-Up Product",
		shortDescription: "The variable rate after your fixed period ends",
		fullDescription:
			"When your fixed-rate period ends, you'll typically move to a variable rate with your lender. The follow-up product shown here is an estimate based on the lender's current variable rates. However, you are not restricted to this rate. Once your fixed period ends, you're free to switch to any other rate offered by your lender, or remortgage to a different lender entirely. Lenders often offer multiple variable rate products with different terms.",
		relatedTerms: ["costOfCredit"],
	},
	{
		id: "totalRepayable",
		term: "Total Repayable",
		shortDescription: "The full amount you'll pay back",
		fullDescription:
			"The Total Repayable is the complete amount you'll pay over the life of your mortgage, including both the original loan amount (principal) and all interest charges. For fixed-rate mortgages, this calculation assumes you move to the estimated follow-up variable rate after your fixed period ends. The actual amount may differ if you remortgage or switch to a different rate.",
		relatedTerms: ["costOfCredit", "followUpProduct"],
	},
	{
		id: "costOfCredit",
		term: "Cost of Credit",
		shortDescription: "Total interest paid over the mortgage term",
		fullDescription:
			"The Cost of Credit represents the total amount of interest you'll pay over the full term of your mortgage. It's calculated as the difference between the Total Repayable amount and the original mortgage amount. The percentage shows this cost relative to your original loan. For example, a 50% cost of credit means you'll pay half of your original loan amount in interest over the term.",
		relatedTerms: ["aprc", "totalRepayable"],
	},
];

export const GLOSSARY_TERMS_MAP = Object.fromEntries(
	GLOSSARY_TERMS.map((term) => [term.id, term]),
) as Record<string, GlossaryTerm>;

export type GlossaryTermId = (typeof GLOSSARY_TERMS)[number]["id"];
