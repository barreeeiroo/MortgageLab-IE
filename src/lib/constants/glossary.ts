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
		id: "followOnProduct",
		term: "Follow-On Product",
		shortDescription: "The variable rate after your fixed period ends",
		fullDescription:
			"When your fixed-rate period ends, you'll typically move to a variable rate with your lender. The follow-on product shown here is an estimate based on the lender's current variable rates. However, you are not restricted to this rate. Once your fixed period ends, you're free to switch to any other rate offered by your lender, or remortgage to a different lender entirely. Lenders often offer multiple variable rate products with different terms.",
		relatedTerms: ["followOnMonthly", "costOfCredit"],
	},
	{
		id: "followOnMonthly",
		term: "Follow-On Monthly",
		shortDescription: "Your estimated monthly payment after the fixed period",
		fullDescription:
			"The Follow-On Monthly payment is the estimated amount you'll pay each month after your fixed-rate period ends. This is calculated using the follow-on variable rate and the remaining balance on your mortgage at that point. Since you'll have paid down some principal during the fixed period, both your remaining balance and LTV will be lower, which may qualify you for better rates. This figure helps you understand the full cost of your mortgage beyond the initial fixed period.",
		relatedTerms: ["followOnProduct", "totalRepayable"],
	},
	{
		id: "totalRepayable",
		term: "Total Repayable",
		shortDescription: "The full amount you'll pay back",
		fullDescription:
			"The Total Repayable is the complete amount you'll pay over the life of your mortgage, including both the original loan amount (principal) and all interest charges. For fixed-rate mortgages, this calculation assumes you move to the estimated follow-on variable rate after your fixed period ends. The actual amount may differ if you remortgage or switch to a different rate.",
		relatedTerms: ["costOfCredit", "followOnProduct"],
	},
	{
		id: "costOfCredit",
		term: "Cost of Credit",
		shortDescription: "Total interest paid over the mortgage term",
		fullDescription:
			"The Cost of Credit represents the total amount of interest you'll pay over the full term of your mortgage. It's calculated as the difference between the Total Repayable amount and the original mortgage amount. The percentage shows this cost relative to your original loan. For example, a 50% cost of credit means you'll pay half of your original loan amount in interest over the term.",
		relatedTerms: ["aprc", "totalRepayable"],
	},
	{
		id: "valuationFee",
		term: "Valuation Fee",
		shortDescription: "Fee for professional property valuation",
		fullDescription:
			"The Valuation Fee is charged by lenders to cover the cost of having your property professionally valued before approving a mortgage. This fee is typically paid upfront and is included in APRC calculations. In Ireland, valuation fees typically range from €150 to €215 depending on the lender. The valuation ensures the property value supports the loan amount requested.",
		relatedTerms: ["aprc", "securityReleaseFee"],
	},
	{
		id: "securityReleaseFee",
		term: "Security Release Fee",
		shortDescription: "Fee to release the mortgage from your property",
		fullDescription:
			"The Security Release Fee (also called Deed Release Fee) is charged when your mortgage is fully paid off to release the lender's security interest from your property. This fee covers the administrative and legal costs of removing the mortgage charge from the Land Registry (Tailte Éireann). In Ireland, this fee typically ranges from €40 to €175 depending on the lender.",
		relatedTerms: ["aprc", "valuationFee"],
	},
	{
		id: "openingBalance",
		term: "Opening Balance",
		shortDescription: "Balance at the start of the period",
		fullDescription:
			"The Opening Balance is the outstanding mortgage amount at the beginning of a period (month or year), before any payments are made. At the start of your mortgage, this equals your total loan amount. Each subsequent period, it equals the previous period's closing balance.",
		relatedTerms: ["closingBalance", "principal"],
	},
	{
		id: "closingBalance",
		term: "Closing Balance",
		shortDescription: "Balance at the end of the period",
		fullDescription:
			"The Closing Balance is the remaining mortgage amount at the end of a period, after all regular payments and overpayments have been applied. This becomes the opening balance for the next period. When this reaches zero, your mortgage is fully paid off.",
		relatedTerms: ["openingBalance", "principal", "overpayment"],
	},
	{
		id: "principal",
		term: "Principal",
		shortDescription: "The original amount borrowed",
		fullDescription:
			"The principal is the original amount of money you borrow, excluding interest. In the amortization table, this column shows how much of each payment goes toward reducing this balance. Early in your mortgage, most of your payment covers interest, but over time the principal portion increases.",
		relatedTerms: ["interest", "overpayment"],
	},
	{
		id: "overpayment",
		term: "Overpayment",
		shortDescription: "Extra payments above your regular amount",
		fullDescription:
			"An overpayment is any amount you pay above your required monthly payment. Overpayments go directly toward reducing your principal balance, which can significantly reduce the total interest you pay and shorten your mortgage term. During fixed-rate periods, lenders typically limit penalty-free overpayments to a percentage of your balance or payment.",
		relatedTerms: ["principal", "closingBalance"],
	},
	{
		id: "interest",
		term: "Interest",
		shortDescription: "The cost of borrowing",
		fullDescription:
			"Interest is the cost charged by the lender for borrowing money, calculated as a percentage of your outstanding balance. Each month, interest is calculated on your remaining balance and forms part of your monthly payment. The lower your balance, the less interest you pay, which is why overpayments can save significant money over time.",
		relatedTerms: ["apr", "principal"],
	},
];

export const GLOSSARY_TERMS_MAP = Object.fromEntries(
	GLOSSARY_TERMS.map((term) => [term.id, term]),
) as Record<string, GlossaryTerm>;

export type GlossaryTermId = (typeof GLOSSARY_TERMS)[number]["id"];
