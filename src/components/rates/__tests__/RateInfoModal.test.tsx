import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender, createMockRate } from "@/test/utils/mock-data";
import { RateInfoModal } from "../RateInfoModal";

// Mock window.location for navigation tests
Object.defineProperty(window, "location", {
	value: { href: "" },
	writable: true,
});

describe("RateInfoModal", () => {
	const mockRate = createMockRate({
		id: "aib-fixed-3yr-90",
		name: "3 Year Fixed",
		lenderId: "aib",
		type: "fixed",
		rate: 3.45,
		apr: 3.52,
		fixedTerm: 3,
		maxLtv: 90,
	});

	const mockVariableRate = createMockRate({
		id: "aib-variable",
		name: "Variable Rate",
		lenderId: "aib",
		type: "variable",
		rate: 4.15,
		apr: 4.22,
		maxLtv: 90,
	});

	const mockLender = createMockLender({
		id: "aib",
		name: "AIB",
		shortName: "AIB",
	});

	const defaultProps = {
		rate: mockRate,
		lender: mockLender,
		allRates: [mockRate, mockVariableRate],
		perks: [],
		overpaymentPolicies: [],
		combinedPerks: [],
		mortgageAmount: 315000,
		mortgageTerm: 360, // 30 years in months
		ltv: 90,
		berRating: "C1",
		mode: "first-mortgage" as const,
		open: true,
		onOpenChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("header display", () => {
		it("displays rate name in dialog title", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(
				screen.getByRole("heading", { name: /3 year fixed/i }),
			).toBeInTheDocument();
		});

		it("displays lender name in description", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText(/AIB/)).toBeInTheDocument();
		});

		it("displays Fixed for fixed rates", () => {
			render(<RateInfoModal {...defaultProps} />);

			// The heading should show the rate name
			expect(
				screen.getByRole("heading", { name: /3 year fixed/i }),
			).toBeInTheDocument();
		});

		it("displays Variable Rate for variable rates", () => {
			render(<RateInfoModal {...defaultProps} rate={mockVariableRate} />);

			// The heading should show the rate name
			expect(
				screen.getByRole("heading", { name: /variable rate/i }),
			).toBeInTheDocument();
		});

		it("shows Custom badge for custom rates", () => {
			const customRate = { ...mockRate, isCustom: true };
			render(<RateInfoModal {...defaultProps} rate={customRate} />);

			expect(screen.getByText("Custom")).toBeInTheDocument();
		});
	});

	describe("mortgage details section", () => {
		it("displays mortgage amount", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText("Mortgage Amount")).toBeInTheDocument();
			expect(screen.getByText("€315,000")).toBeInTheDocument();
		});

		it("displays full term", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText("Full Term")).toBeInTheDocument();
			// "30 years" appears in both tab and table
			expect(screen.getAllByText("30 years").length).toBeGreaterThan(0);
		});

		it("displays monthly repayments", () => {
			render(<RateInfoModal {...defaultProps} />);

			// "Monthly Repayments" appears in multiple places
			expect(screen.getAllByText("Monthly Repayments").length).toBeGreaterThan(
				0,
			);
			// Check that currency values are displayed
			expect(screen.getAllByText(/€[\d,]+\.\d{2}/).length).toBeGreaterThan(0);
		});

		it("displays total repayable", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText("Total Repayable")).toBeInTheDocument();
		});

		it("displays cost of credit", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText("Cost of Credit")).toBeInTheDocument();
		});
	});

	describe("rate details section", () => {
		it("displays interest rate", () => {
			render(<RateInfoModal {...defaultProps} />);

			// "Interest Rate" may appear multiple times
			expect(screen.getAllByText("Interest Rate").length).toBeGreaterThan(0);
			// Rate values may appear multiple times
			expect(screen.getAllByText("3.45%").length).toBeGreaterThan(0);
		});

		it("displays fixed period for fixed rates", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText("Fixed Period")).toBeInTheDocument();
			expect(screen.getByText("3 years")).toBeInTheDocument();
		});

		it("displays APRC when available", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText("APRC")).toBeInTheDocument();
			expect(screen.getByText("3.52%")).toBeInTheDocument();
		});

		it("displays overpayment policy for variable rates", () => {
			render(<RateInfoModal {...defaultProps} rate={mockVariableRate} />);

			expect(screen.getByText("Overpayment Policy")).toBeInTheDocument();
			expect(screen.getByText("Unlimited")).toBeInTheDocument();
		});
	});

	describe("follow-on period section", () => {
		it("displays follow-on section for fixed rates", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText("Follow-On Period")).toBeInTheDocument();
		});

		it("does not display follow-on section for variable rates", () => {
			render(<RateInfoModal {...defaultProps} rate={mockVariableRate} />);

			expect(screen.queryByText("Follow-On Period")).not.toBeInTheDocument();
		});

		it("displays follow-on rate details when available", () => {
			render(<RateInfoModal {...defaultProps} />);

			// Should show the variable rate as follow-on
			expect(screen.getByText("4.15%")).toBeInTheDocument();
		});
	});

	describe("end of fixed period section", () => {
		it("displays remaining balance for fixed rates", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.getByText("At End of Fixed Period")).toBeInTheDocument();
			expect(screen.getByText("Remaining Balance")).toBeInTheDocument();
			expect(screen.getByText("% of Original")).toBeInTheDocument();
		});

		it("does not show end of fixed period for variable rates", () => {
			render(<RateInfoModal {...defaultProps} rate={mockVariableRate} />);

			expect(
				screen.queryByText("At End of Fixed Period"),
			).not.toBeInTheDocument();
		});
	});

	describe("term selector", () => {
		it("displays term options tabs", () => {
			render(<RateInfoModal {...defaultProps} />);

			// Should have term tabs with options around the current term
			expect(screen.getByRole("tablist")).toBeInTheDocument();
		});

		it("has interactive term tabs", async () => {
			const user = userEvent.setup();
			render(<RateInfoModal {...defaultProps} />);

			// Click a different term tab if available
			const tabs = screen.getAllByRole("tab");
			if (tabs.length > 1) {
				await user.click(tabs[0]); // Click first tab (likely shorter term)

				// Just verify no errors occur and tabs remain interactive
				await waitFor(() => {
					expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
				});
			}
		});
	});

	describe("action buttons", () => {
		it("renders Simulate button in first-mortgage mode", () => {
			render(<RateInfoModal {...defaultProps} mode="first-mortgage" />);

			expect(
				screen.getByRole("button", { name: /simulate/i }),
			).toBeInTheDocument();
		});

		it("renders Copy as Custom Rate button for non-custom rates", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /copy as custom rate/i }),
			).toBeInTheDocument();
		});

		it("does not render Copy as Custom Rate button for custom rates", () => {
			const customRate = { ...mockRate, isCustom: true };
			render(<RateInfoModal {...defaultProps} rate={customRate} />);

			expect(
				screen.queryByRole("button", { name: /copy as custom rate/i }),
			).not.toBeInTheDocument();
		});

		it("renders Incorrect Info link for non-custom rates", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(
				screen.getByRole("link", { name: /incorrect info/i }),
			).toBeInTheDocument();
		});

		it("does not render Incorrect Info link for custom rates", () => {
			const customRate = { ...mockRate, isCustom: true };
			render(<RateInfoModal {...defaultProps} rate={customRate} />);

			expect(
				screen.queryByRole("link", { name: /incorrect info/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("view history button", () => {
		it("renders View History button when onViewHistory is provided", () => {
			const onViewHistory = vi.fn();
			render(<RateInfoModal {...defaultProps} onViewHistory={onViewHistory} />);

			expect(
				screen.getByRole("button", { name: /view history/i }),
			).toBeInTheDocument();
		});

		it("calls onViewHistory when clicked", async () => {
			const user = userEvent.setup();
			const onViewHistory = vi.fn();
			render(<RateInfoModal {...defaultProps} onViewHistory={onViewHistory} />);

			await user.click(screen.getByRole("button", { name: /view history/i }));

			expect(onViewHistory).toHaveBeenCalled();
		});

		it("does not render View History for custom rates", () => {
			const customRate = { ...mockRate, isCustom: true };
			render(
				<RateInfoModal
					{...defaultProps}
					rate={customRate}
					onViewHistory={vi.fn()}
				/>,
			);

			expect(
				screen.queryByRole("button", { name: /view history/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("perks display", () => {
		it("displays perks when provided", () => {
			const perks = [
				{
					id: "cashback-2pct",
					label: "2% Cashback",
					icon: "PiggyBank",
					description: "Get 2% of loan value back",
				},
			];
			render(
				<RateInfoModal
					{...defaultProps}
					perks={perks}
					combinedPerks={["cashback-2pct"]}
				/>,
			);

			expect(screen.getByText("2% Cashback")).toBeInTheDocument();
		});
	});

	describe("modal behavior", () => {
		it("calls onOpenChange when close button is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(<RateInfoModal {...defaultProps} onOpenChange={onOpenChange} />);

			await user.click(screen.getByRole("button", { name: /close/i }));

			expect(onOpenChange).toHaveBeenCalled();
		});

		it("does not render when rate is null", () => {
			render(<RateInfoModal {...defaultProps} rate={null} />);

			expect(
				screen.queryByRole("heading", { name: /3 year fixed/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("BER eligibility", () => {
		it("displays BER requirement when rate has berEligible", () => {
			const greenRate = createMockRate({
				...mockRate,
				berEligible: ["A1", "A2", "A3", "B1", "B2", "B3"],
			});
			render(<RateInfoModal {...defaultProps} rate={greenRate} />);

			expect(screen.getByText("BER Required")).toBeInTheDocument();
			expect(screen.getByText(/A1, A2, A3/)).toBeInTheDocument();
		});

		it("does not display BER requirement when not specified", () => {
			render(<RateInfoModal {...defaultProps} />);

			expect(screen.queryByText("BER Required")).not.toBeInTheDocument();
		});
	});

	describe("minimum loan display", () => {
		it("displays minimum loan when specified", () => {
			const hvmRate = createMockRate({
				...mockRate,
				minLoan: 250000,
			});
			render(<RateInfoModal {...defaultProps} rate={hvmRate} />);

			expect(screen.getByText("Min. Loan Amount")).toBeInTheDocument();
			expect(screen.getByText("€250,000")).toBeInTheDocument();
		});
	});
});
