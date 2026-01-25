import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditCustomPerkDialog } from "../EditCustomPerkDialog";

describe("EditCustomPerkDialog", () => {
	const mockPerk = {
		id: "custom-perk-1",
		label: "Free Legal Fees",
		description: "Legal fees covered up to €1,500",
		icon: "Gift",
	};

	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		perk: mockPerk,
		onUpdatePerk: vi.fn(),
	};

	describe("basic rendering", () => {
		it("renders Edit Custom Perk title", () => {
			render(<EditCustomPerkDialog {...defaultProps} />);

			expect(
				screen.getByRole("heading", { name: /edit custom perk/i }),
			).toBeInTheDocument();
		});

		it("renders description with perk label", () => {
			render(<EditCustomPerkDialog {...defaultProps} />);

			expect(
				screen.getByText(/modify your custom perk "free legal fees"/i),
			).toBeInTheDocument();
		});

		it("renders Save Changes button", () => {
			render(<EditCustomPerkDialog {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /save changes/i }),
			).toBeInTheDocument();
		});

		it("renders close button", () => {
			render(<EditCustomPerkDialog {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /close/i }),
			).toBeInTheDocument();
		});
	});

	describe("dialog closed state", () => {
		it("does not render when closed", () => {
			render(<EditCustomPerkDialog {...defaultProps} open={false} />);

			expect(
				screen.queryByRole("heading", { name: /edit custom perk/i }),
			).not.toBeInTheDocument();
		});
	});

	describe("back button", () => {
		it("renders back button when onBack provided", () => {
			render(<EditCustomPerkDialog {...defaultProps} onBack={vi.fn()} />);

			expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
		});

		it("does not render back button when onBack not provided", () => {
			render(<EditCustomPerkDialog {...defaultProps} />);

			expect(
				screen.queryByRole("button", { name: /back/i }),
			).not.toBeInTheDocument();
		});

		it("calls onBack when back button is clicked", async () => {
			const user = userEvent.setup();
			const onBack = vi.fn();
			render(<EditCustomPerkDialog {...defaultProps} onBack={onBack} />);

			await user.click(screen.getByRole("button", { name: /back/i }));

			expect(onBack).toHaveBeenCalled();
		});
	});

	describe("close button", () => {
		it("calls onOpenChange when close button is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(
				<EditCustomPerkDialog {...defaultProps} onOpenChange={onOpenChange} />,
			);

			await user.click(screen.getByRole("button", { name: /close/i }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("pre-populated form", () => {
		it("shows perk label in input", () => {
			render(<EditCustomPerkDialog {...defaultProps} />);

			expect(screen.getByDisplayValue("Free Legal Fees")).toBeInTheDocument();
		});

		it("shows perk description in input", () => {
			render(<EditCustomPerkDialog {...defaultProps} />);

			expect(
				screen.getByDisplayValue("Legal fees covered up to €1,500"),
			).toBeInTheDocument();
		});

		it("has Gift icon selected", () => {
			render(<EditCustomPerkDialog {...defaultProps} />);

			// The Gift icon button inside the form should have the selected style
			// Dialog renders in portal, so use document
			const giftButton = document.querySelector('button[title="Gift"]');
			expect(giftButton?.className).toContain("border-primary");
		});
	});
});
