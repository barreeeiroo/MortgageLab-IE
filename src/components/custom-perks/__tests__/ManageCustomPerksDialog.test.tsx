import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManageCustomPerksDialog } from "../ManageCustomPerksDialog";

describe("ManageCustomPerksDialog", () => {
	const mockPerk = {
		id: "custom-perk-1",
		label: "Free Legal Fees",
		description: "Legal fees covered up to €1,500",
		icon: "Star",
		createdAt: "2024-01-15T10:00:00.000Z",
		lastUpdatedAt: "2024-01-20T14:00:00.000Z",
	};

	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		customPerks: [],
		onAddPerk: vi.fn(),
		onUpdatePerk: vi.fn(),
		onDeletePerk: vi.fn(),
	};

	describe("basic rendering", () => {
		it("renders Custom Perks title", () => {
			render(<ManageCustomPerksDialog {...defaultProps} />);

			expect(
				screen.getByRole("heading", { name: /custom perks/i }),
			).toBeInTheDocument();
		});

		it("renders description text", () => {
			render(<ManageCustomPerksDialog {...defaultProps} />);

			expect(screen.getByText(/manage your custom perks/i)).toBeInTheDocument();
		});

		it("renders close button", () => {
			render(<ManageCustomPerksDialog {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /close/i }),
			).toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("shows empty message when no perks", () => {
			render(<ManageCustomPerksDialog {...defaultProps} />);

			expect(screen.getByText(/no custom perks yet/i)).toBeInTheDocument();
		});

		it("shows local storage notice when empty", () => {
			render(<ManageCustomPerksDialog {...defaultProps} />);

			expect(
				screen.getByText(/custom perks are stored locally/i),
			).toBeInTheDocument();
		});
	});

	describe("perks table", () => {
		it("displays perk label", () => {
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			expect(screen.getByText("Free Legal Fees")).toBeInTheDocument();
		});

		it("displays perk description", () => {
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			expect(
				screen.getByText("Legal fees covered up to €1,500"),
			).toBeInTheDocument();
		});

		it("displays dash when no description", () => {
			const perkNoDesc = { ...mockPerk, description: undefined };
			render(
				<ManageCustomPerksDialog
					{...defaultProps}
					customPerks={[perkNoDesc]}
				/>,
			);

			expect(screen.getByText("—")).toBeInTheDocument();
		});

		it("displays perk count in footer", () => {
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			expect(screen.getByText("1 custom perk")).toBeInTheDocument();
		});

		it("displays plural perk count", () => {
			const secondPerk = {
				...mockPerk,
				id: "custom-perk-2",
				label: "Cashback",
			};
			render(
				<ManageCustomPerksDialog
					{...defaultProps}
					customPerks={[mockPerk, secondPerk]}
				/>,
			);

			expect(screen.getByText("2 custom perks")).toBeInTheDocument();
		});
	});

	describe("table headers", () => {
		it("renders all table headers", () => {
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			expect(screen.getByText("Icon")).toBeInTheDocument();
			expect(screen.getByText("Label")).toBeInTheDocument();
			expect(screen.getByText("Description")).toBeInTheDocument();
			expect(screen.getByText("Created")).toBeInTheDocument();
			expect(screen.getByText("Modified")).toBeInTheDocument();
		});
	});

	describe("action buttons", () => {
		it("renders edit button for each perk", () => {
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
		});

		it("renders delete button for each perk", () => {
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			expect(
				screen.getByRole("button", { name: /delete/i }),
			).toBeInTheDocument();
		});
	});

	describe("footer buttons", () => {
		it("renders Add Custom Perk button", () => {
			render(<ManageCustomPerksDialog {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /add custom perk/i }),
			).toBeInTheDocument();
		});
	});

	describe("delete confirmation", () => {
		it("shows delete confirmation when delete clicked", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			await user.click(screen.getByRole("button", { name: /delete/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: /delete custom perk/i }),
				).toBeInTheDocument();
			});
		});

		it("shows perk label in confirmation", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			await user.click(screen.getByRole("button", { name: /delete/i }));

			await waitFor(() => {
				expect(screen.getByText(/"Free Legal Fees"/)).toBeInTheDocument();
			});
		});

		it("calls onDeletePerk when confirmed", async () => {
			const user = userEvent.setup();
			const onDeletePerk = vi.fn();
			render(
				<ManageCustomPerksDialog
					{...defaultProps}
					customPerks={[mockPerk]}
					onDeletePerk={onDeletePerk}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /delete/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: /delete custom perk/i }),
				).toBeInTheDocument();
			});

			// Click the Delete button in the confirmation dialog
			const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
			await user.click(deleteButtons[deleteButtons.length - 1]);

			expect(onDeletePerk).toHaveBeenCalledWith("custom-perk-1");
		});

		it("closes confirmation when cancelled", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomPerksDialog {...defaultProps} customPerks={[mockPerk]} />,
			);

			await user.click(screen.getByRole("button", { name: /delete/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /cancel/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /cancel/i }));

			await waitFor(() => {
				expect(
					screen.queryByRole("heading", { name: /delete custom perk/i }),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("back button", () => {
		it("renders back button when onBack provided", () => {
			render(<ManageCustomPerksDialog {...defaultProps} onBack={vi.fn()} />);

			expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
		});

		it("does not render back button when onBack not provided", () => {
			render(<ManageCustomPerksDialog {...defaultProps} />);

			expect(
				screen.queryByRole("button", { name: /back/i }),
			).not.toBeInTheDocument();
		});

		it("calls onBack when back button is clicked", async () => {
			const user = userEvent.setup();
			const onBack = vi.fn();
			render(<ManageCustomPerksDialog {...defaultProps} onBack={onBack} />);

			await user.click(screen.getByRole("button", { name: /back/i }));

			expect(onBack).toHaveBeenCalled();
		});
	});

	describe("dialog closed state", () => {
		it("does not render content when closed", () => {
			render(<ManageCustomPerksDialog {...defaultProps} open={false} />);

			expect(
				screen.queryByRole("heading", { name: /custom perks/i }),
			).not.toBeInTheDocument();
		});
	});
});
