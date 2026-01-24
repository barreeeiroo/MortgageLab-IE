import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
	Milestone,
	OverpaymentConfig,
	ResolvedRatePeriod,
	SimulationWarning,
} from "@/lib/schemas/simulate";
import {
	SimulateMilestoneEvent,
	SimulateOverpaymentEvent,
	SimulateRatePeriodEvent,
} from "../SimulateEventCard";

describe("SimulateRatePeriodEvent", () => {
	const createMockPeriod = (
		overrides: Partial<ResolvedRatePeriod> = {},
	): ResolvedRatePeriod => ({
		id: "period-1",
		lenderId: "aib",
		lenderName: "AIB",
		rateId: "aib-fixed-3yr",
		rateName: "3 Year Fixed",
		rate: 3.45,
		type: "fixed",
		fixedTerm: 3,
		startMonth: 1,
		durationMonths: 36,
		isCustom: false,
		label: "AIB 3 Year Fixed @ 3.45%",
		...overrides,
	});

	const defaultProps = {
		period: createMockPeriod(),
		warnings: [] as SimulationWarning[],
	};

	describe("basic rendering", () => {
		it("renders rate name", () => {
			render(<SimulateRatePeriodEvent {...defaultProps} />);

			expect(screen.getByText("3 Year Fixed")).toBeInTheDocument();
		});

		it("renders lender name", () => {
			render(<SimulateRatePeriodEvent {...defaultProps} />);

			expect(screen.getByText("AIB")).toBeInTheDocument();
		});

		it("renders rate value", () => {
			render(<SimulateRatePeriodEvent {...defaultProps} />);

			expect(screen.getByText("3.45%")).toBeInTheDocument();
		});

		it("renders Fix badge for fixed rates", () => {
			render(<SimulateRatePeriodEvent {...defaultProps} />);

			expect(screen.getByText("Fix")).toBeInTheDocument();
		});

		it("renders Var badge for variable rates", () => {
			const variablePeriod = createMockPeriod({
				type: "variable",
				fixedTerm: undefined,
			});
			render(
				<SimulateRatePeriodEvent {...defaultProps} period={variablePeriod} />,
			);

			expect(screen.getByText("Var")).toBeInTheDocument();
		});
	});

	describe("popover content", () => {
		it("shows details on click", async () => {
			const user = userEvent.setup();
			render(<SimulateRatePeriodEvent {...defaultProps} />);

			await user.click(screen.getByRole("button"));

			// Should show period details in popover
			expect(screen.getByText("Rate")).toBeInTheDocument();
			expect(screen.getByText("Type")).toBeInTheDocument();
			expect(screen.getByText("Starts")).toBeInTheDocument();
			expect(screen.getByText("Duration")).toBeInTheDocument();
		});

		it("shows type as fixed with term", async () => {
			const user = userEvent.setup();
			render(<SimulateRatePeriodEvent {...defaultProps} />);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("3-Year Fixed")).toBeInTheDocument();
		});

		it("shows Custom badge for custom rates", async () => {
			const user = userEvent.setup();
			const customPeriod = createMockPeriod({ isCustom: true });
			render(
				<SimulateRatePeriodEvent {...defaultProps} period={customPeriod} />,
			);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("Custom")).toBeInTheDocument();
		});

		it("shows Until end of mortgage for 0 duration", async () => {
			const user = userEvent.setup();
			const untilEndPeriod = createMockPeriod({ durationMonths: 0 });
			render(
				<SimulateRatePeriodEvent {...defaultProps} period={untilEndPeriod} />,
			);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("Until end of mortgage")).toBeInTheDocument();
		});

		it("formats duration in years and months", async () => {
			const user = userEvent.setup();
			const periodWithMonths = createMockPeriod({ durationMonths: 42 }); // 3y 6m
			render(
				<SimulateRatePeriodEvent {...defaultProps} period={periodWithMonths} />,
			);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("3y 6m")).toBeInTheDocument();
		});
	});

	describe("warnings", () => {
		it("shows warning styling when warnings present", () => {
			const warnings: SimulationWarning[] = [
				{
					type: "allowance_exceeded",
					month: 5,
					message: "Exceeds allowance",
					configId: "config-1",
					overpaymentLabel: "Monthly €500",
				},
			];
			const { container } = render(
				<SimulateRatePeriodEvent {...defaultProps} warnings={warnings} />,
			);

			const button = container.querySelector("button");
			expect(button).toHaveClass("border-yellow-500/50");
		});

		it("shows error styling for error warnings", () => {
			const warnings: SimulationWarning[] = [
				{
					type: "rate_missing",
					month: 5,
					message: "Rate not found",
					severity: "error",
				},
			];
			const { container } = render(
				<SimulateRatePeriodEvent {...defaultProps} warnings={warnings} />,
			);

			const button = container.querySelector("button");
			expect(button).toHaveClass("border-destructive/50");
		});

		it("shows warning messages in popover", async () => {
			const user = userEvent.setup();
			const warnings: SimulationWarning[] = [
				{
					type: "allowance_exceeded",
					month: 5,
					message: "Exceeds 10% allowance",
					configId: "config-1",
					overpaymentLabel: "Monthly €500",
				},
			];
			render(<SimulateRatePeriodEvent {...defaultProps} warnings={warnings} />);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("Exceeds 10% allowance")).toBeInTheDocument();
		});
	});

	describe("action buttons", () => {
		it("shows Edit button when onEdit is provided", async () => {
			const user = userEvent.setup();
			const onEdit = vi.fn();
			render(<SimulateRatePeriodEvent {...defaultProps} onEdit={onEdit} />);

			await user.click(screen.getByRole("button"));

			const editButton = screen.getByRole("button", { name: /edit/i });
			expect(editButton).toBeInTheDocument();
		});

		it("calls onEdit when Edit button is clicked", async () => {
			const user = userEvent.setup();
			const onEdit = vi.fn();
			render(<SimulateRatePeriodEvent {...defaultProps} onEdit={onEdit} />);

			await user.click(screen.getByRole("button"));
			await user.click(screen.getByRole("button", { name: /edit/i }));

			expect(onEdit).toHaveBeenCalled();
		});

		it("shows Delete button when onDelete is provided", async () => {
			const user = userEvent.setup();
			const onDelete = vi.fn();
			render(<SimulateRatePeriodEvent {...defaultProps} onDelete={onDelete} />);

			await user.click(screen.getByRole("button"));

			// Delete button has destructive styling
			const buttons = screen.getAllByRole("button");
			const deleteButton = buttons.find((btn) =>
				btn.classList.contains("text-destructive"),
			);
			expect(deleteButton).toBeInTheDocument();
		});
	});
});

describe("SimulateOverpaymentEvent", () => {
	const createMockConfig = (
		overrides: Partial<OverpaymentConfig> = {},
	): OverpaymentConfig => ({
		id: "overpayment-1",
		type: "recurring",
		amount: 50000, // €500 in cents
		startMonth: 1,
		effect: "reduce_term",
		frequency: "monthly",
		enabled: true,
		...overrides,
	});

	const defaultProps = {
		config: createMockConfig(),
		warnings: [] as SimulationWarning[],
	};

	describe("basic rendering", () => {
		it("renders amount with monthly suffix", () => {
			render(<SimulateOverpaymentEvent {...defaultProps} />);

			expect(screen.getByText("€500/mo")).toBeInTheDocument();
		});

		it("renders Monthly badge for recurring monthly", () => {
			render(<SimulateOverpaymentEvent {...defaultProps} />);

			expect(screen.getByText("Monthly")).toBeInTheDocument();
		});

		it("renders Once badge for one-time payments", () => {
			const oneTimeConfig = createMockConfig({ type: "one_time" });
			render(
				<SimulateOverpaymentEvent {...defaultProps} config={oneTimeConfig} />,
			);

			expect(screen.getByText("Once")).toBeInTheDocument();
		});

		it("renders Yearly badge for yearly payments", () => {
			const yearlyConfig = createMockConfig({ frequency: "yearly" });
			render(
				<SimulateOverpaymentEvent {...defaultProps} config={yearlyConfig} />,
			);

			expect(screen.getByText("Yearly")).toBeInTheDocument();
		});

		it("shows start and end period for recurring", () => {
			const configWithEnd = createMockConfig({ endMonth: 36 });
			render(
				<SimulateOverpaymentEvent {...defaultProps} config={configWithEnd} />,
			);

			expect(screen.getByText(/Month 1 → Year 3/)).toBeInTheDocument();
		});

		it("shows End for open-ended recurring", () => {
			render(<SimulateOverpaymentEvent {...defaultProps} />);

			expect(screen.getByText(/→ End/)).toBeInTheDocument();
		});
	});

	describe("disabled state", () => {
		it("applies opacity when disabled", () => {
			const disabledConfig = createMockConfig({ enabled: false });
			const { container } = render(
				<SimulateOverpaymentEvent {...defaultProps} config={disabledConfig} />,
			);

			const button = container.querySelector("button");
			expect(button).toHaveClass("opacity-50");
		});
	});

	describe("popover content", () => {
		it("shows details on click", async () => {
			const user = userEvent.setup();
			render(<SimulateOverpaymentEvent {...defaultProps} />);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("€500 /month")).toBeInTheDocument();
			expect(screen.getByText("Recurring monthly")).toBeInTheDocument();
		});

		it("shows effect as Reduce term", async () => {
			const user = userEvent.setup();
			render(<SimulateOverpaymentEvent {...defaultProps} />);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("Reduce term")).toBeInTheDocument();
		});

		it("shows effect as Reduce payment", async () => {
			const user = userEvent.setup();
			const reducePaymentConfig = createMockConfig({
				effect: "reduce_payment",
			});
			render(
				<SimulateOverpaymentEvent
					{...defaultProps}
					config={reducePaymentConfig}
				/>,
			);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("Reduce payment")).toBeInTheDocument();
		});

		it("shows label when provided", async () => {
			const user = userEvent.setup();
			const configWithLabel = createMockConfig({
				label: "Bonus payment",
			});
			render(
				<SimulateOverpaymentEvent {...defaultProps} config={configWithLabel} />,
			);

			await user.click(screen.getByRole("button"));

			expect(screen.getByText("Bonus payment")).toBeInTheDocument();
		});
	});

	describe("warnings", () => {
		it("shows warning styling when warnings present", () => {
			const warnings: SimulationWarning[] = [
				{
					type: "allowance_exceeded",
					month: 5,
					message: "Exceeds allowance",
					configId: "overpayment-1",
					overpaymentLabel: "Monthly €500",
				},
			];
			const { container } = render(
				<SimulateOverpaymentEvent {...defaultProps} warnings={warnings} />,
			);

			const button = container.querySelector("button");
			expect(button).toHaveClass("border-yellow-500/50");
		});
	});
});

describe("SimulateMilestoneEvent", () => {
	describe("basic rendering", () => {
		it("renders milestone label", () => {
			const milestone: Milestone = {
				type: "principal_25_percent",
				month: 60,
				label: "25% Principal Paid",
				value: 27000000, // €270,000 in cents
			};
			render(<SimulateMilestoneEvent milestone={milestone} />);

			expect(screen.getByText("25% Principal Paid")).toBeInTheDocument();
		});

		it("renders milestone value when present", () => {
			const milestone: Milestone = {
				type: "principal_50_percent",
				month: 120,
				label: "50% Principal Paid",
				value: 18000000, // €180,000
			};
			render(<SimulateMilestoneEvent milestone={milestone} />);

			expect(screen.getByText("€180,000")).toBeInTheDocument();
		});

		it("formats date when provided", () => {
			const milestone: Milestone = {
				type: "mortgage_complete",
				month: 360,
				label: "Mortgage Complete",
				date: "2054-01-01",
			};
			render(<SimulateMilestoneEvent milestone={milestone} />);

			// formatMonthYearShort formats as "Jan 2054"
			expect(screen.getByText(/Jan 2054/)).toBeInTheDocument();
		});

		it("formats period when no date", () => {
			// Month 73 = Year 7, Month 1 = "Year 7"
			const milestone: Milestone = {
				type: "ltv_80_percent",
				month: 73,
				label: "LTV Below 80%",
			};
			render(<SimulateMilestoneEvent milestone={milestone} />);

			expect(screen.getByText("Year 7")).toBeInTheDocument();
		});

		it("does not show value when zero", () => {
			const milestone: Milestone = {
				type: "mortgage_complete",
				month: 360,
				label: "Mortgage Complete",
				value: 0,
			};
			render(<SimulateMilestoneEvent milestone={milestone} />);

			// Should not have the bullet separator for value
			expect(screen.queryByText("€0")).not.toBeInTheDocument();
		});
	});

	describe("milestone types", () => {
		it("renders mortgage_start milestone", () => {
			const milestone: Milestone = {
				type: "mortgage_start",
				month: 1,
				label: "Mortgage Start",
				value: 36000000,
			};
			render(<SimulateMilestoneEvent milestone={milestone} />);

			expect(screen.getByText("Mortgage Start")).toBeInTheDocument();
		});

		it("renders construction_complete milestone", () => {
			const milestone: Milestone = {
				type: "construction_complete",
				month: 24,
				label: "Construction Complete",
			};
			render(<SimulateMilestoneEvent milestone={milestone} />);

			expect(screen.getByText("Construction Complete")).toBeInTheDocument();
		});

		it("renders full_payments_start milestone", () => {
			const milestone: Milestone = {
				type: "full_payments_start",
				month: 25,
				label: "Full Payments Start",
			};
			render(<SimulateMilestoneEvent milestone={milestone} />);

			expect(screen.getByText("Full Payments Start")).toBeInTheDocument();
		});
	});
});
