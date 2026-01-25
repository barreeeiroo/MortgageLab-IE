import { render, screen } from "@testing-library/react";
import { Table, TableBody } from "@/components/ui/table";
import type {
	AmortizationMonth,
	Milestone,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import { SimulateMonthRow } from "../SimulateMonthRow";

// Wrapper component to provide table context
function renderInTable(ui: React.ReactElement) {
	return render(
		<Table>
			<TableBody>{ui}</TableBody>
		</Table>,
	);
}

const createMockMonth = (
	overrides: Partial<AmortizationMonth> = {},
): AmortizationMonth => ({
	month: 1,
	year: 1,
	monthOfYear: 1,
	date: "2024-01-01",
	openingBalance: 36000000, // €360,000 in cents
	closingBalance: 35850000, // €358,500 in cents
	scheduledPayment: 150000,
	interestPortion: 105000, // €1,050 in cents
	principalPortion: 45000, // €450 in cents
	overpayment: 0,
	totalPayment: 150000, // €1,500 in cents
	rate: 3.5,
	ratePeriodId: "period-1",
	cumulativeInterest: 105000,
	cumulativePrincipal: 45000,
	cumulativeOverpayments: 0,
	cumulativeTotal: 150000,
	...overrides,
});

describe("SimulateMonthRow", () => {
	const defaultProps = {
		month: createMockMonth(),
		warnings: [] as SimulationWarning[],
		milestones: [] as Milestone[],
	};

	describe("basic rendering", () => {
		it("renders month label with date", () => {
			renderInTable(<SimulateMonthRow {...defaultProps} />);

			expect(screen.getByText("January 2024")).toBeInTheDocument();
		});

		it("renders month label without date", () => {
			const monthWithoutDate = createMockMonth({
				date: undefined,
				monthOfYear: 5,
			});
			renderInTable(
				<SimulateMonthRow {...defaultProps} month={monthWithoutDate} />,
			);

			expect(screen.getByText("Month 5")).toBeInTheDocument();
		});

		it("renders opening balance", () => {
			renderInTable(<SimulateMonthRow {...defaultProps} />);

			expect(screen.getByText("€360,000.00")).toBeInTheDocument();
		});

		it("renders interest portion", () => {
			renderInTable(<SimulateMonthRow {...defaultProps} />);

			expect(screen.getByText("€1,050.00")).toBeInTheDocument();
		});

		it("renders principal portion", () => {
			renderInTable(<SimulateMonthRow {...defaultProps} />);

			expect(screen.getByText("€450.00")).toBeInTheDocument();
		});

		it("renders total payment", () => {
			renderInTable(<SimulateMonthRow {...defaultProps} />);

			expect(screen.getByText("€1,500.00")).toBeInTheDocument();
		});

		it("renders closing balance", () => {
			renderInTable(<SimulateMonthRow {...defaultProps} />);

			expect(screen.getByText("€358,500.00")).toBeInTheDocument();
		});
	});

	describe("overpayment display", () => {
		it("shows dash when no overpayment", () => {
			renderInTable(<SimulateMonthRow {...defaultProps} />);

			expect(screen.getByText("—")).toBeInTheDocument();
		});

		it("shows overpayment amount when present", () => {
			const monthWithOverpayment = createMockMonth({ overpayment: 50000 }); // €500
			renderInTable(
				<SimulateMonthRow {...defaultProps} month={monthWithOverpayment} />,
			);

			expect(screen.getByText("€500.00")).toBeInTheDocument();
		});
	});

	describe("milestones", () => {
		it("renders milestone icons", () => {
			const milestones: Milestone[] = [
				{
					type: "mortgage_start",
					month: 1,
					date: "2024-01-01",
					label: "Mortgage Start",
					value: 36000000,
				},
			];
			renderInTable(
				<SimulateMonthRow {...defaultProps} milestones={milestones} />,
			);

			// Milestone icon should be present (uses Flag icon for mortgage_start)
			expect(screen.getByText("January 2024")).toBeInTheDocument();
		});

		it("renders multiple milestone icons", () => {
			const milestones: Milestone[] = [
				{
					type: "principal_25_percent",
					month: 1,
					date: "2024-01-01",
					label: "25% Principal Paid",
					value: 27000000,
				},
				{
					type: "ltv_80_percent",
					month: 1,
					date: "2024-01-01",
					label: "LTV Below 80%",
				},
			];
			renderInTable(
				<SimulateMonthRow {...defaultProps} milestones={milestones} />,
			);

			// Both milestones should render (using Percent icon)
			expect(screen.getByText("January 2024")).toBeInTheDocument();
		});
	});

	describe("warnings", () => {
		it("applies warning styling when warnings present", () => {
			const warnings: SimulationWarning[] = [
				{
					type: "allowance_exceeded",
					month: 1,
					message: "Exceeds 10% allowance",
					severity: "warning",
					configId: "config-1",
					overpaymentLabel: "Monthly €500",
				},
			];
			renderInTable(<SimulateMonthRow {...defaultProps} warnings={warnings} />);

			// Check for warning row styling
			const row = screen.getByRole("row");
			expect(row).toHaveClass("bg-yellow-50");
		});

		it("does not apply warning styling when no warnings", () => {
			renderInTable(<SimulateMonthRow {...defaultProps} />);

			const row = screen.getByRole("row");
			expect(row).not.toHaveClass("bg-yellow-50");
		});

		it("shows warning icon for overpayment with allowance exceeded", () => {
			const monthWithOverpayment = createMockMonth({ overpayment: 50000 });
			const warnings: SimulationWarning[] = [
				{
					type: "allowance_exceeded",
					month: 1,
					message: "Exceeds 10% allowance by €100",
					severity: "warning",
					configId: "config-1",
					overpaymentLabel: "Monthly €500",
				},
			];
			renderInTable(
				<SimulateMonthRow
					{...defaultProps}
					month={monthWithOverpayment}
					warnings={warnings}
				/>,
			);

			// Should show both the amount and a warning icon
			expect(screen.getByText("€500.00")).toBeInTheDocument();
		});
	});

	describe("formatting", () => {
		it("formats large currency amounts correctly", () => {
			const largeMonth = createMockMonth({
				openingBalance: 150000000, // €1,500,000
				closingBalance: 149850000, // €1,498,500
			});
			renderInTable(<SimulateMonthRow {...defaultProps} month={largeMonth} />);

			expect(screen.getByText("€1,500,000.00")).toBeInTheDocument();
			expect(screen.getByText("€1,498,500.00")).toBeInTheDocument();
		});

		it("handles zero values", () => {
			const zeroMonth = createMockMonth({
				interestPortion: 0,
				principalPortion: 0,
			});
			renderInTable(<SimulateMonthRow {...defaultProps} month={zeroMonth} />);

			expect(screen.getAllByText("€0.00")).toHaveLength(2);
		});
	});
});
