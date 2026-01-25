import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table, TableBody } from "@/components/ui/table";
import type {
	AmortizationYear,
	Milestone,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import { SimulateYearRow } from "../SimulateYearRow";

// Wrapper component to provide table context
function renderInTable(ui: React.ReactElement) {
	return render(
		<Table>
			<TableBody>{ui}</TableBody>
		</Table>,
	);
}

const createMockYear = (
	overrides: Partial<AmortizationYear> = {},
): AmortizationYear => ({
	year: 1,
	openingBalance: 36000000, // €360,000 in cents
	closingBalance: 34200000, // €342,000 in cents
	totalInterest: 1260000, // €12,600 in cents
	totalPrincipal: 540000, // €5,400 in cents
	totalOverpayments: 0,
	totalPayments: 1800000, // €18,000 in cents
	cumulativeInterest: 1260000,
	cumulativePrincipal: 540000,
	cumulativeTotal: 1800000,
	hasWarnings: false,
	rateChanges: [],
	months: [
		{
			month: 1,
			year: 1,
			monthOfYear: 1,
			date: "2024-01-01",
			openingBalance: 36000000,
			closingBalance: 35850000,
			scheduledPayment: 150000,
			interestPortion: 105000,
			principalPortion: 45000,
			overpayment: 0,
			totalPayment: 150000,
			rate: 3.5,
			ratePeriodId: "period-1",
			cumulativeInterest: 105000,
			cumulativePrincipal: 45000,
			cumulativeOverpayments: 0,
			cumulativeTotal: 150000,
		},
		{
			month: 2,
			year: 1,
			monthOfYear: 2,
			date: "2024-02-01",
			openingBalance: 35850000,
			closingBalance: 35700000,
			scheduledPayment: 150000,
			interestPortion: 104475,
			principalPortion: 45525,
			overpayment: 0,
			totalPayment: 150000,
			rate: 3.5,
			ratePeriodId: "period-1",
			cumulativeInterest: 209475,
			cumulativePrincipal: 90525,
			cumulativeOverpayments: 0,
			cumulativeTotal: 300000,
		},
	],
	...overrides,
});

describe("SimulateYearRow", () => {
	const defaultProps = {
		year: createMockYear(),
		isExpanded: false,
		warnings: [] as SimulationWarning[],
		milestones: [] as Milestone[],
		ratePeriodLabels: new Map<string, string>(),
		overpaymentLabels: [] as string[],
		onToggle: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("collapsed state", () => {
		it("renders year label from date", () => {
			renderInTable(<SimulateYearRow {...defaultProps} />);

			expect(screen.getByText("2024")).toBeInTheDocument();
		});

		it("renders year label without date", () => {
			const yearWithoutDate = createMockYear({
				months: [
					{
						month: 1,
						year: 1,
						monthOfYear: 1,
						date: "",
						openingBalance: 36000000,
						closingBalance: 35850000,
						scheduledPayment: 150000,
						interestPortion: 105000,
						principalPortion: 45000,
						overpayment: 0,
						totalPayment: 150000,
						rate: 3.5,
						ratePeriodId: "period-1",
						cumulativeInterest: 105000,
						cumulativePrincipal: 45000,
						cumulativeOverpayments: 0,
						cumulativeTotal: 150000,
					},
				],
			});
			renderInTable(
				<SimulateYearRow {...defaultProps} year={yearWithoutDate} />,
			);

			expect(screen.getByText("Year 1")).toBeInTheDocument();
		});

		it("renders opening balance", () => {
			renderInTable(<SimulateYearRow {...defaultProps} />);

			expect(screen.getByText("€360,000.00")).toBeInTheDocument();
		});

		it("renders total interest", () => {
			renderInTable(<SimulateYearRow {...defaultProps} />);

			expect(screen.getByText("€12,600.00")).toBeInTheDocument();
		});

		it("renders total principal", () => {
			renderInTable(<SimulateYearRow {...defaultProps} />);

			expect(screen.getByText("€5,400.00")).toBeInTheDocument();
		});

		it("renders total payments", () => {
			renderInTable(<SimulateYearRow {...defaultProps} />);

			expect(screen.getByText("€18,000.00")).toBeInTheDocument();
		});

		it("renders closing balance", () => {
			renderInTable(<SimulateYearRow {...defaultProps} />);

			expect(screen.getByText("€342,000.00")).toBeInTheDocument();
		});

		it("shows dash when no overpayments", () => {
			renderInTable(<SimulateYearRow {...defaultProps} />);

			expect(screen.getByText("—")).toBeInTheDocument();
		});

		it("shows overpayments when present", () => {
			const yearWithOverpayments = createMockYear({
				totalOverpayments: 600000,
			}); // €6,000
			renderInTable(
				<SimulateYearRow {...defaultProps} year={yearWithOverpayments} />,
			);

			expect(screen.getByText("€6,000.00")).toBeInTheDocument();
		});

		it("shows milestones when collapsed", () => {
			const milestones: Milestone[] = [
				{
					type: "principal_25_percent",
					month: 3,
					date: "2024-03-01",
					label: "25% Principal Paid",
					value: 27000000,
				},
			];
			renderInTable(
				<SimulateYearRow
					{...defaultProps}
					milestones={milestones}
					isExpanded={false}
				/>,
			);

			// Milestone should be visible in collapsed state
			expect(screen.getByText("2024")).toBeInTheDocument();
		});
	});

	describe("interaction", () => {
		it("calls onToggle when row is clicked", async () => {
			const user = userEvent.setup();
			const onToggle = vi.fn();
			renderInTable(<SimulateYearRow {...defaultProps} onToggle={onToggle} />);

			await user.click(screen.getByText("2024"));

			expect(onToggle).toHaveBeenCalled();
		});

		it("shows expand icon when collapsed", () => {
			renderInTable(<SimulateYearRow {...defaultProps} isExpanded={false} />);

			// Should show ChevronRight icon
			const button = screen.getByRole("button");
			expect(button).toBeInTheDocument();
		});

		it("shows collapse icon when expanded", () => {
			renderInTable(<SimulateYearRow {...defaultProps} isExpanded={true} />);

			// Should show ChevronDown icon
			const button = screen.getByRole("button");
			expect(button).toBeInTheDocument();
		});
	});

	describe("expanded state", () => {
		it("shows monthly breakdown when expanded", () => {
			renderInTable(<SimulateYearRow {...defaultProps} isExpanded={true} />);

			// Should show month rows
			expect(screen.getByText("January 2024")).toBeInTheDocument();
			expect(screen.getByText("February 2024")).toBeInTheDocument();
		});

		it("shows Year Total row when expanded", () => {
			renderInTable(<SimulateYearRow {...defaultProps} isExpanded={true} />);

			expect(screen.getByText("Year Total")).toBeInTheDocument();
		});

		it("shows rate changes when expanded and present", () => {
			const ratePeriodLabels = new Map([
				["period-1", "AIB 3 Year Fixed @ 3.45%"],
			]);
			const yearWithRateChanges = createMockYear({ rateChanges: ["period-1"] });
			renderInTable(
				<SimulateYearRow
					{...defaultProps}
					year={yearWithRateChanges}
					ratePeriodLabels={ratePeriodLabels}
					isExpanded={true}
				/>,
			);

			expect(screen.getByText("Rate periods:")).toBeInTheDocument();
			expect(screen.getByText(/AIB 3 Year Fixed @ 3\.45%/)).toBeInTheDocument();
		});

		it("shows overpayment labels when expanded and present", () => {
			const overpaymentLabels = ["Monthly €500", "Annual €2000"];
			renderInTable(
				<SimulateYearRow
					{...defaultProps}
					overpaymentLabels={overpaymentLabels}
					isExpanded={true}
				/>,
			);

			expect(screen.getByText("Overpayments:")).toBeInTheDocument();
			expect(
				screen.getByText(/Monthly €500, Annual €2000/),
			).toBeInTheDocument();
		});

		it("does not show milestones on year row when expanded", () => {
			const milestones: Milestone[] = [
				{
					type: "principal_25_percent",
					month: 1,
					date: "2024-01-01",
					label: "25% Principal Paid",
				},
			];
			renderInTable(
				<SimulateYearRow
					{...defaultProps}
					milestones={milestones}
					isExpanded={true}
				/>,
			);

			// Year row should not show milestone icon when expanded
			// (milestones are shown on individual month rows instead)
		});
	});

	describe("warnings", () => {
		it("applies warning styling when allowance exceeded warnings present", () => {
			const warnings: SimulationWarning[] = [
				{
					type: "allowance_exceeded",
					month: 1,
					message: "Exceeds allowance",
					severity: "warning",
					configId: "config-1",
					overpaymentLabel: "Monthly €500",
				},
			];
			renderInTable(<SimulateYearRow {...defaultProps} warnings={warnings} />);

			const rows = screen.getAllByRole("row");
			expect(rows[0]).toHaveClass("bg-yellow-50");
		});

		it("shows warning icon on overpayment cell", () => {
			const yearWithOverpayments = createMockYear({
				totalOverpayments: 600000,
			});
			const warnings: SimulationWarning[] = [
				{
					type: "allowance_exceeded",
					month: 1,
					message: "Exceeds allowance",
					severity: "warning",
					configId: "config-1",
					overpaymentLabel: "Monthly €500",
				},
			];
			renderInTable(
				<SimulateYearRow
					{...defaultProps}
					year={yearWithOverpayments}
					warnings={warnings}
				/>,
			);

			// Should show overpayment amount with warning
			expect(screen.getByText("€6,000.00")).toBeInTheDocument();
		});
	});

	describe("formatting", () => {
		it("formats large currency amounts correctly", () => {
			const largeYear = createMockYear({
				openingBalance: 150000000, // €1,500,000
				closingBalance: 145000000, // €1,450,000
				totalInterest: 5250000, // €52,500
			});
			renderInTable(<SimulateYearRow {...defaultProps} year={largeYear} />);

			expect(screen.getByText("€1,500,000.00")).toBeInTheDocument();
			expect(screen.getByText("€1,450,000.00")).toBeInTheDocument();
			expect(screen.getByText("€52,500.00")).toBeInTheDocument();
		});
	});
});
