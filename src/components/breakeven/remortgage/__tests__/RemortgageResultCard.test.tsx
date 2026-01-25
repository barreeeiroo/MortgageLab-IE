import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RemortgageResult } from "@/lib/mortgage/breakeven";
import { RemortgageResultCard } from "../RemortgageResultCard";

// Mock Recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="chart-container">{children}</div>
	),
	LineChart: () => <div data-testid="line-chart" />,
	Line: () => null,
	XAxis: () => null,
	YAxis: () => null,
	Tooltip: () => null,
	ReferenceLine: () => null,
	Legend: () => null,
	BarChart: () => <div data-testid="bar-chart" />,
	Bar: () => null,
	CartesianGrid: () => null,
	AreaChart: () => <div data-testid="area-chart" />,
	Area: () => null,
	ComposedChart: () => <div data-testid="composed-chart" />,
}));

const createMockResult = (
	overrides: Partial<RemortgageResult> = {},
): RemortgageResult => ({
	currentMonthlyPayment: 1800,
	newMonthlyPayment: 1600,
	monthlySavings: 200,
	switchingCosts: 2000,
	legalFees: 3000,
	erc: 0,
	cashback: 1000,
	breakevenMonths: 10,
	breakevenDetails: {
		monthlySavings: 200,
		breakevenMonths: 10,
		switchingCosts: 2000,
		cumulativeSavingsAtBreakeven: 2000,
	},
	yearOneSavings: 400,
	totalSavingsOverTerm: 45000,
	interestSavingsDetails: {
		totalInterestCurrent: 120000,
		totalInterestNew: 95000,
		interestSaved: 25000,
		switchingCosts: 2000,
		netBenefit: 23000,
	},
	yearlyBreakdown: [
		{
			year: 1,
			netSavings: 400,
			cumulativeSavings: 2400,
			interestSaved: 3000,
			remainingBalanceCurrent: 340000,
			remainingBalanceNew: 338000,
			interestPaidCurrent: 13000,
			interestPaidNew: 10000,
		},
		{
			year: 5,
			netSavings: 10400,
			cumulativeSavings: 12000,
			interestSaved: 15000,
			remainingBalanceCurrent: 300000,
			remainingBalanceNew: 290000,
			interestPaidCurrent: 60000,
			interestPaidNew: 45000,
		},
		{
			year: 10,
			netSavings: 22400,
			cumulativeSavings: 24000,
			interestSaved: 25000,
			remainingBalanceCurrent: 240000,
			remainingBalanceNew: 220000,
			interestPaidCurrent: 120000,
			interestPaidNew: 95000,
		},
	],
	monthlyBreakdown: [],
	...overrides,
});

describe("RemortgageResultCard", () => {
	const defaultProps = {
		result: createMockResult(),
		remainingTermMonths: 240, // 20 years
		fixedPeriodMonths: 36, // 3 years fixed
	};

	describe("breakeven display", () => {
		it("displays Cost Recovery section", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Cost Recovery")).toBeInTheDocument();
			expect(
				screen.getByText(/when monthly savings exceed switching costs/i),
			).toBeInTheDocument();
		});

		it("displays breakeven period in months", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			// 10 months
			expect(screen.getByText("10 months")).toBeInTheDocument();
		});

		it("displays Total Interest Saved section", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Total Interest Saved")).toBeInTheDocument();
			expect(
				screen.getByText(/interest you'll avoid paying over the term/i),
			).toBeInTheDocument();
		});

		it("displays interest saved amount", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("+€25,000")).toBeInTheDocument();
		});

		it("displays 'Never' when no savings", () => {
			const noSavings = createMockResult({
				breakevenMonths: Number.POSITIVE_INFINITY,
				monthlySavings: -50,
			});
			render(<RemortgageResultCard {...defaultProps} result={noSavings} />);

			expect(screen.getByText("Never")).toBeInTheDocument();
		});
	});

	describe("monthly comparison section", () => {
		it("displays current payment", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Current Payment")).toBeInTheDocument();
			expect(screen.getByText("€1,800.00")).toBeInTheDocument();
		});

		it("displays new payment", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("New Payment")).toBeInTheDocument();
			expect(screen.getByText("€1,600.00")).toBeInTheDocument();
		});

		it("displays monthly savings", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Monthly Savings")).toBeInTheDocument();
			expect(screen.getByText("+€200.00")).toBeInTheDocument();
		});
	});

	describe("switching costs section", () => {
		it("displays legal fees", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Legal Fees (est.)")).toBeInTheDocument();
			// €3,000 appears in multiple places, just check the label exists
			expect(screen.getAllByText("€3,000").length).toBeGreaterThan(0);
		});

		it("displays cashback", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Cashback")).toBeInTheDocument();
			expect(screen.getByText("-€1,000")).toBeInTheDocument();
		});

		it("displays net cost", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Net Cost")).toBeInTheDocument();
			// €2,000 may appear in multiple places
			expect(screen.getAllByText("€2,000").length).toBeGreaterThan(0);
		});

		it("displays early repayment charge when present", () => {
			const withErc = createMockResult({ erc: 5000 });
			render(<RemortgageResultCard {...defaultProps} result={withErc} />);

			expect(screen.getByText("Early Repayment")).toBeInTheDocument();
			expect(screen.getByText("€5,000")).toBeInTheDocument();
		});

		it("does not display early repayment when zero", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.queryByText("Early Repayment")).not.toBeInTheDocument();
		});
	});

	describe("savings summary section", () => {
		it("displays year 1 savings", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Year 1 Savings")).toBeInTheDocument();
			// +€400 may appear in multiple places
			expect(screen.getAllByText("+€400").length).toBeGreaterThan(0);
		});

		it("displays total savings over term", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText(/Total Savings/)).toBeInTheDocument();
			expect(screen.getByText("+€45,000")).toBeInTheDocument();
		});

		it("displays term length in savings summary", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			// 240 months = 20 years
			expect(screen.getByText(/20 years/)).toBeInTheDocument();
		});
	});

	describe("year snapshots", () => {
		it("displays Year 1, Year 5, and Year 10 snapshots", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getByText("Year 1")).toBeInTheDocument();
			expect(screen.getByText("Year 5")).toBeInTheDocument();
			expect(screen.getByText("Year 10")).toBeInTheDocument();
		});

		it("displays net savings for each year", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getAllByText("Net Savings:")).toHaveLength(3);
		});

		it("displays interest saved for each year", () => {
			render(<RemortgageResultCard {...defaultProps} />);

			expect(screen.getAllByText("Interest Saved:")).toHaveLength(3);
		});
	});

	describe("warnings and notes", () => {
		it("shows warning when breakeven exceeds fixed period", () => {
			// Breakeven 48 months > fixed period 36 months
			const longBreakeven = createMockResult({ breakevenMonths: 48 });
			render(
				<RemortgageResultCard
					{...defaultProps}
					result={longBreakeven}
					fixedPeriodMonths={36}
				/>,
			);

			expect(screen.getByText(/Warning/i)).toBeInTheDocument();
			expect(
				screen.getByText(/exceeds your 3-year fixed period/i),
			).toBeInTheDocument();
		});

		it("shows variable rate note when rate is variable", () => {
			render(
				<RemortgageResultCard {...defaultProps} fixedPeriodMonths={null} />,
			);

			expect(
				screen.getByText(/Variable rates can change/i),
			).toBeInTheDocument();
		});

		it("shows message when new rate offers no monthly savings", () => {
			const noSavings = createMockResult({
				monthlySavings: 0,
				breakevenMonths: Number.POSITIVE_INFINITY,
			});
			render(<RemortgageResultCard {...defaultProps} result={noSavings} />);

			expect(
				screen.getByText(/doesn't offer monthly savings/i),
			).toBeInTheDocument();
		});
	});

	describe("card styling", () => {
		it("applies primary styling when switching is worth it", () => {
			const { container } = render(<RemortgageResultCard {...defaultProps} />);

			const card = container.querySelector("[class*='bg-primary']");
			expect(card).toBeInTheDocument();
		});

		it("applies amber styling when not worth switching", () => {
			const notWorth = createMockResult({
				breakevenMonths: Number.POSITIVE_INFINITY,
				totalSavingsOverTerm: -1000,
			});
			const { container } = render(
				<RemortgageResultCard {...defaultProps} result={notWorth} />,
			);

			const card = container.querySelector("[class*='bg-amber']");
			expect(card).toBeInTheDocument();
		});
	});

	describe("expandable details", () => {
		it("shows detailed breakdown when clicked", async () => {
			const user = userEvent.setup();
			render(<RemortgageResultCard {...defaultProps} />);

			// Click on "Why X months?" detail
			await user.click(screen.getByText(/why 10 months\?/i));

			// Should show explanation
			expect(screen.getByText(/Monthly savings:/i)).toBeInTheDocument();
			expect(screen.getByText(/Switching costs:/i)).toBeInTheDocument();
		});
	});
});
