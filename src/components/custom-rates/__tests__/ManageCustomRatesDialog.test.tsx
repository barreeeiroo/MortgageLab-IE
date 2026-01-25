import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender } from "@/test/utils/mock-data";
import { ManageCustomRatesDialog } from "../ManageCustomRatesDialog";

describe("ManageCustomRatesDialog", () => {
	const mockLenders = [
		createMockLender({ id: "aib", name: "AIB" }),
		createMockLender({ id: "boi", name: "Bank of Ireland" }),
	];

	const mockCustomRate = {
		id: "custom-1",
		name: "3 Year Fixed",
		lenderId: "aib",
		type: "fixed" as const,
		rate: 3.45,
		apr: 3.52,
		fixedTerm: 3,
		minLtv: 0,
		maxLtv: 80,
		buyerTypes: ["ftb", "mover"] as const,
		createdAt: "2024-01-15T10:00:00.000Z",
		lastUpdatedAt: "2024-01-20T14:00:00.000Z",
	};

	const defaultProps = {
		customRates: [],
		lenders: mockLenders,
		customLenders: [],
		perks: [],
		customPerks: [],
		currentBuyerType: "ftb" as const,
		onAddRate: vi.fn(),
		onUpdateRate: vi.fn(),
		onDeleteRate: vi.fn(),
		onAddPerk: vi.fn(),
		onUpdatePerk: vi.fn(),
		onDeletePerk: vi.fn(),
	};

	describe("trigger button", () => {
		it("renders Custom Rates button", () => {
			render(<ManageCustomRatesDialog {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /custom rates/i }),
			).toBeInTheDocument();
		});
	});

	describe("dialog opening", () => {
		it("opens dialog when trigger button is clicked", async () => {
			const user = userEvent.setup();
			render(<ManageCustomRatesDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: /custom rates/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe("empty state", () => {
		it("shows empty message when no custom rates", async () => {
			const user = userEvent.setup();
			render(<ManageCustomRatesDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(screen.getByText(/no custom rates yet/i)).toBeInTheDocument();
			});
		});
	});

	describe("rates table", () => {
		it("displays custom rates in table", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(screen.getByText("3 Year Fixed")).toBeInTheDocument();
				expect(screen.getByText("3.45%")).toBeInTheDocument();
				expect(screen.getByText("Fixed")).toBeInTheDocument();
				expect(screen.getByText("3 yr")).toBeInTheDocument();
			});
		});

		it("displays lender name", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(screen.getByText("AIB")).toBeInTheDocument();
			});
		});

		it("displays custom lender name when provided", async () => {
			const user = userEvent.setup();
			const customRate = {
				...mockCustomRate,
				lenderId: "my-bank",
				customLenderName: "My Bank",
			};
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[customRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(screen.getByText("My Bank")).toBeInTheDocument();
			});
		});

		it("displays dash for variable rate period", async () => {
			const user = userEvent.setup();
			const variableRate = {
				...mockCustomRate,
				type: "variable" as const,
				fixedTerm: undefined,
			};
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[variableRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(screen.getByText("—")).toBeInTheDocument();
			});
		});
	});

	describe("table headers", () => {
		it("renders all table headers", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(screen.getByText("Lender")).toBeInTheDocument();
				expect(screen.getByText("Product")).toBeInTheDocument();
				expect(screen.getByText("Type")).toBeInTheDocument();
				expect(screen.getByText("Period")).toBeInTheDocument();
				expect(screen.getByText("Rate")).toBeInTheDocument();
				expect(screen.getByText("Created")).toBeInTheDocument();
				expect(screen.getByText("Modified")).toBeInTheDocument();
			});
		});
	});

	describe("action buttons", () => {
		it("renders edit button for each rate", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /edit/i }),
				).toBeInTheDocument();
			});
		});

		it("renders delete button for each rate", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /delete/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe("footer buttons", () => {
		it("renders Add Custom Rate button", async () => {
			const user = userEvent.setup();
			render(<ManageCustomRatesDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /add custom rate/i }),
				).toBeInTheDocument();
			});
		});

		it("renders Manage Perks button", async () => {
			const user = userEvent.setup();
			render(<ManageCustomRatesDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /manage perks/i }),
				).toBeInTheDocument();
			});
		});

		it("renders Share button", async () => {
			const user = userEvent.setup();
			render(<ManageCustomRatesDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /share/i }),
				).toBeInTheDocument();
			});
		});

		it("disables share button when no custom rates or perks", async () => {
			const user = userEvent.setup();
			render(<ManageCustomRatesDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /share/i })).toBeDisabled();
			});
		});

		it("enables share button when custom rates exist", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /share/i }),
				).not.toBeDisabled();
			});
		});
	});

	describe("delete confirmation", () => {
		it("shows delete confirmation dialog when delete clicked", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /delete/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /delete/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: /delete custom rate/i }),
				).toBeInTheDocument();
			});
		});

		it("shows rate name in confirmation message", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /delete/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /delete/i }));

			await waitFor(() => {
				expect(screen.getByText(/"3 Year Fixed"/)).toBeInTheDocument();
			});
		});

		it("calls onDeleteRate when confirmed", async () => {
			const user = userEvent.setup();
			const onDeleteRate = vi.fn();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
					onDeleteRate={onDeleteRate}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /delete/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /delete/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /^delete$/i }),
				).toBeInTheDocument();
			});

			// Click the Delete button in the confirmation dialog
			const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
			await user.click(deleteButtons[deleteButtons.length - 1]);

			expect(onDeleteRate).toHaveBeenCalledWith("custom-1");
		});

		it("closes confirmation when cancelled", async () => {
			const user = userEvent.setup();
			render(
				<ManageCustomRatesDialog
					{...defaultProps}
					customRates={[mockCustomRate]}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /delete/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /delete/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /cancel/i }),
				).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /cancel/i }));

			await waitFor(() => {
				expect(
					screen.queryByRole("heading", { name: /delete custom rate/i }),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("close button", () => {
		it("renders close button", async () => {
			const user = userEvent.setup();
			render(<ManageCustomRatesDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /close/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe("dialog description", () => {
		it("renders dialog description", async () => {
			const user = userEvent.setup();
			render(<ManageCustomRatesDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /custom rates/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/manage your custom rates for comparison/i),
				).toBeInTheDocument();
			});
		});
	});
});
