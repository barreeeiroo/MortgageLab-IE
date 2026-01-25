import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender } from "@/test/utils/mock-data";
import { AddCustomRateDialog } from "../AddCustomRateDialog";

describe("AddCustomRateDialog", () => {
	const mockLenders = [
		createMockLender({ id: "aib", name: "AIB" }),
		createMockLender({ id: "boi", name: "Bank of Ireland" }),
	];

	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		lenders: mockLenders,
		customLenders: [],
		perks: [],
		currentBuyerType: "ftb" as const,
		onAddRate: vi.fn(),
	};

	describe("basic rendering", () => {
		it("renders Add Custom Rate title", () => {
			render(<AddCustomRateDialog {...defaultProps} />);

			expect(
				screen.getByRole("heading", { name: /add custom rate/i }),
			).toBeInTheDocument();
		});

		it("renders description text", () => {
			render(<AddCustomRateDialog {...defaultProps} />);

			expect(
				screen.getByText(/create a custom rate to compare/i),
			).toBeInTheDocument();
		});

		it("renders Create Rate button", () => {
			render(<AddCustomRateDialog {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /create rate/i }),
			).toBeInTheDocument();
		});

		it("renders close button", () => {
			render(<AddCustomRateDialog {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /close/i }),
			).toBeInTheDocument();
		});
	});

	describe("dialog closed state", () => {
		it("does not render when closed", () => {
			render(<AddCustomRateDialog {...defaultProps} open={false} />);

			expect(
				screen.queryByRole("heading", { name: /add custom rate/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("back button", () => {
		it("renders back button when onBack provided", () => {
			render(<AddCustomRateDialog {...defaultProps} onBack={vi.fn()} />);

			expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
		});

		it("does not render back button when onBack not provided", () => {
			render(<AddCustomRateDialog {...defaultProps} />);

			expect(
				screen.queryByRole("button", { name: /back/i }),
			).not.toBeInTheDocument();
		});

		it("calls onBack when back button is clicked", async () => {
			const user = userEvent.setup();
			const onBack = vi.fn();
			render(<AddCustomRateDialog {...defaultProps} onBack={onBack} />);

			await user.click(screen.getByRole("button", { name: /back/i }));

			expect(onBack).toHaveBeenCalled();
		});
	});

	describe("close button", () => {
		it("calls onOpenChange when close button is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(
				<AddCustomRateDialog {...defaultProps} onOpenChange={onOpenChange} />,
			);

			await user.click(screen.getByRole("button", { name: /close/i }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("form integration", () => {
		it("renders CustomRateForm with showAprcCalculation", () => {
			render(<AddCustomRateDialog {...defaultProps} />);

			// This verifies the form is rendered with showAprcCalculation=true
			// by checking for the fee inputs which only appear in that mode
			expect(screen.getByLabelText(/valuation fee/i)).toBeInTheDocument();
		});

		it("includes custom perks in the form", () => {
			const customPerks = [
				{
					id: "custom-perk",
					label: "My Perk",
					description: "Custom perk",
					icon: "Gift",
				},
			];
			render(
				<AddCustomRateDialog {...defaultProps} customPerks={customPerks} />,
			);

			expect(screen.getByText("Perks")).toBeInTheDocument();
			expect(screen.getByText("My Perk")).toBeInTheDocument();
		});
	});

	describe("lender logo", () => {
		it("renders custom lender logo in header", () => {
			render(<AddCustomRateDialog {...defaultProps} />);

			// Dialog renders in a portal, so use document.querySelector
			const pencilContainer = document.querySelector(
				'[class*="bg-primary/10"]',
			);
			expect(pencilContainer).toBeInTheDocument();
		});
	});
});
