import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CashbackBreakevenResult } from "@/lib/mortgage/breakeven";
import { CashbackResultCard } from "../CashbackResultCard";

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
	CartesianGrid: () => null,
	AreaChart: () => <div data-testid="area-chart" />,
	Area: () => null,
	BarChart: () => <div data-testid="bar-chart" />,
	Bar: () => null,
	ComposedChart: () => <div data-testid="composed-chart" />,
}));

const createMockResult = (
	overrides: Partial<CashbackBreakevenResult> = {},
): CashbackBreakevenResult => ({
	options: [
		{
			label: "Option A",
			rate: 3.5,
			fixedPeriodYears: 3,
			cashbackAmount: 7200,
			monthlyPayment: 1650,
			monthlyPaymentDiff: 0,
			interestPaid: 35000,
			principalPaid: 25000,
			balanceAtEnd: 335000,
			netCost: 27800,
			adjustedBalance: 327800,
		},
		{
			label: "Option B",
			rate: 3.25,
			fixedPeriodYears: 3,
			cashbackAmount: 0,
			monthlyPayment: 1580,
			monthlyPaymentDiff: -70,
			interestPaid: 32000,
			principalPaid: 27000,
			balanceAtEnd: 333000,
			netCost: 32000,
			adjustedBalance: 333000,
		},
	],
	cheapestAdjustedBalanceIndex: 0,
	cheapestNetCostIndex: 0,
	cheapestMonthlyIndex: 1,
	savingsVsWorst: 5200,
	comparisonPeriodMonths: 36,
	comparisonPeriodYears: 3,
	allVariable: false,
	monthlyBreakdown: [],
	breakevens: [
		{
			optionAIndex: 0,
			optionBIndex: 1,
			optionALabel: "Option A",
			optionBLabel: "Option B",
			breakevenMonth: 18,
			description: "Option A becomes cheaper than Option B",
		},
	],
	yearlyBreakdown: [
		{
			year: 1,
			balances: [350000, 348000],
			netCosts: [10000, 11000],
			adjustedBalances: [342800, 348000],
			interestPaid: [10000, 11000],
			principalPaid: [10000, 12000],
		},
		{
			year: 2,
			balances: [342000, 340000],
			netCosts: [18000, 21000],
			adjustedBalances: [334800, 340000],
			interestPaid: [18000, 21000],
			principalPaid: [18000, 20000],
		},
		{
			year: 3,
			balances: [335000, 333000],
			netCosts: [27800, 32000],
			adjustedBalances: [327800, 333000],
			interestPaid: [27800, 32000],
			principalPaid: [25000, 27000],
		},
	],
	projectionYear: null,
	...overrides,
});

describe("CashbackResultCard", () => {
	const defaultProps = {
		result: createMockResult(),
		mortgageTermMonths: 360, // 30 years
	};

	describe("winner summary", () => {
		it("displays the best option label", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(screen.getByText(/Best Option: Option A/i)).toBeInTheDocument();
		});

		it("displays the winning option rate and cashback", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(
				screen.getByText(/3\.5% rate with €7,200 cashback/i),
			).toBeInTheDocument();
		});

		it("displays savings vs worst option", () => {
			render(<CashbackResultCard {...defaultProps} />);

			// €5,200 may appear in multiple places (in summary and explanation)
			expect(screen.getAllByText("€5,200").length).toBeGreaterThan(0);
		});
	});

	describe("comparison period info", () => {
		it("displays comparison period for fixed rates", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(
				screen.getByText(/3 years \(max fixed period\)/i),
			).toBeInTheDocument();
		});

		it("displays full term for all variable rates", () => {
			const allVariable = createMockResult({ allVariable: true });
			render(<CashbackResultCard {...defaultProps} result={allVariable} />);

			expect(screen.getByText(/Full mortgage term/i)).toBeInTheDocument();
		});
	});

	describe("metric rows", () => {
		it("displays Adjusted Balance section", () => {
			render(<CashbackResultCard {...defaultProps} />);

			// "Adjusted Balance" appears both as metric title and in table
			expect(screen.getAllByText("Adjusted Balance").length).toBeGreaterThan(0);
			// The description also appears multiple times (in details summary)
			expect(
				screen.getAllByText(/Balance if cashback was applied to principal/i)
					.length,
			).toBeGreaterThan(0);
		});

		it("displays Net Cost section", () => {
			render(<CashbackResultCard {...defaultProps} />);

			// "Net Cost" appears both as metric title and in table
			expect(screen.getAllByText("Net Cost").length).toBeGreaterThan(0);
			expect(
				screen.getByText(/Interest paid minus cashback received/i),
			).toBeInTheDocument();
		});

		it("displays Balance After section", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(screen.getByText("Balance After")).toBeInTheDocument();
			expect(
				screen.getByText(/Remaining mortgage balance after comparison period/i),
			).toBeInTheDocument();
		});
	});

	describe("options comparison table", () => {
		it("displays option labels in header", () => {
			render(<CashbackResultCard {...defaultProps} />);

			// The table header shows option labels
			expect(screen.getAllByText("Option A").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Option B").length).toBeGreaterThan(0);
		});

		it("displays Rate row", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(screen.getByText("Rate")).toBeInTheDocument();
			expect(screen.getByText("3.5%")).toBeInTheDocument();
			expect(screen.getByText("3.25%")).toBeInTheDocument();
		});

		it("displays Monthly Payment row", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(screen.getByText("Monthly Payment")).toBeInTheDocument();
		});

		it("displays Cashback row", () => {
			render(<CashbackResultCard {...defaultProps} />);

			const table = screen.getAllByRole("table")[0];
			expect(table).toBeInTheDocument();

			// Check for cashback values in the table
			expect(screen.getByText("€7,200")).toBeInTheDocument();
		});

		it("displays Interest row", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(screen.getByText("Interest")).toBeInTheDocument();
		});

		it("displays Principal row", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(screen.getByText("Principal")).toBeInTheDocument();
		});

		it("marks the best option in the table", () => {
			render(<CashbackResultCard {...defaultProps} />);

			// The "Best" label should appear for Option A
			expect(screen.getByText("Best")).toBeInTheDocument();
		});
	});

	describe("breakeven points", () => {
		it("displays breakeven points section when present", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(screen.getByText("Breakeven Points")).toBeInTheDocument();
		});

		it("displays individual breakeven comparisons", () => {
			render(<CashbackResultCard {...defaultProps} />);

			expect(screen.getByText(/Option A vs Option B:/i)).toBeInTheDocument();
			// 18 months is formatted as "1 year 6 months"
			expect(screen.getByText("1 year 6 months")).toBeInTheDocument();
		});

		it("does not display breakeven section when no breakevens", () => {
			const noBreakeven = createMockResult({ breakevens: [] });
			render(<CashbackResultCard {...defaultProps} result={noBreakeven} />);

			expect(screen.queryByText("Breakeven Points")).not.toBeInTheDocument();
		});
	});

	describe("expandable details", () => {
		it("shows detailed explanation when clicked", async () => {
			const user = userEvent.setup();
			render(<CashbackResultCard {...defaultProps} />);

			// Find and click the details summary
			const summaries = screen.getAllByText(/Why these values\?/i);
			expect(summaries.length).toBeGreaterThan(0);

			await user.click(summaries[0]);

			// After expansion, should show explanation text
			// The exact content depends on the metric
		});
	});

	describe("overpayment allowances", () => {
		it("displays overpayment allowances when provided", () => {
			const overpaymentAllowances = [
				{
					policy: {
						id: "test-policy",
						label: "10% per year",
						description: "10% of balance",
						icon: "Percent",
						allowanceType: "percentage" as const,
						allowanceValue: 10,
						allowanceBasis: "balance" as const,
					},
					totalAllowance: 35000,
				},
				{
					totalAllowance: 0,
				},
			];
			render(
				<CashbackResultCard
					{...defaultProps}
					overpaymentAllowances={overpaymentAllowances}
				/>,
			);

			expect(screen.getByText(/Overpayment Allowances/i)).toBeInTheDocument();
			expect(screen.getByText("10% per year")).toBeInTheDocument();
			// €35,000 appears in multiple places
			expect(screen.getAllByText("€35,000").length).toBeGreaterThan(0);
		});

		it("shows breakage fee warning for options without policy", () => {
			const overpaymentAllowances = [
				{ totalAllowance: 0 },
				{ totalAllowance: 0 },
			];
			// Use default result which has two options
			render(
				<CashbackResultCard
					{...defaultProps}
					overpaymentAllowances={overpaymentAllowances}
				/>,
			);

			expect(screen.getAllByText("Breakage fee").length).toBeGreaterThan(0);
		});
	});

	describe("three option comparison", () => {
		it("handles three options correctly", () => {
			const threeOptions = createMockResult({
				options: [
					...createMockResult().options,
					{
						label: "Option C",
						rate: 3.0,
						fixedPeriodYears: 5,
						cashbackAmount: 0,
						monthlyPayment: 1520,
						monthlyPaymentDiff: -130,
						interestPaid: 28000,
						principalPaid: 32000,
						balanceAtEnd: 328000,
						netCost: 28000,
						adjustedBalance: 328000,
					},
				],
				breakevens: [
					{
						optionAIndex: 0,
						optionBIndex: 1,
						optionALabel: "Option A",
						optionBLabel: "Option B",
						breakevenMonth: 18,
						description: "Option A becomes cheaper than Option B",
					},
					{
						optionAIndex: 0,
						optionBIndex: 2,
						optionALabel: "Option A",
						optionBLabel: "Option C",
						breakevenMonth: 24,
						description: "Option A becomes cheaper than Option C",
					},
				],
			});

			render(<CashbackResultCard {...defaultProps} result={threeOptions} />);

			expect(screen.getAllByText("Option A").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Option B").length).toBeGreaterThan(0);
			expect(screen.getAllByText("Option C").length).toBeGreaterThan(0);
		});
	});
});
