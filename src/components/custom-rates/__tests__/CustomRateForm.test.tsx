import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender } from "@/test/utils/mock-data";
import { CustomRateForm } from "../CustomRateForm";

describe("CustomRateForm", () => {
	const mockLenders = [
		createMockLender({ id: "aib", name: "AIB" }),
		createMockLender({ id: "boi", name: "Bank of Ireland" }),
	];

	const defaultProps = {
		lenders: mockLenders,
		customLenders: [],
		perks: [],
		currentBuyerType: "ftb" as const,
		onSubmit: vi.fn(),
		submitButton: ({
			onClick,
			disabled,
		}: {
			onClick: () => void;
			disabled: boolean;
		}) => (
			<button type="button" onClick={onClick} disabled={disabled}>
				Submit
			</button>
		),
	};

	describe("basic rendering", () => {
		it("renders lender selection", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByText("Lender")).toBeInTheDocument();
			expect(screen.getByText(/select a lender/i)).toBeInTheDocument();
		});

		it("renders rate name input", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByLabelText(/rate name/i)).toBeInTheDocument();
		});

		it("renders rate type selection", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByText("Rate Type")).toBeInTheDocument();
		});

		it("renders interest rate input", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByLabelText(/interest rate/i)).toBeInTheDocument();
		});

		it("renders APRC input by default", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByLabelText("APRC")).toBeInTheDocument();
		});

		it("renders LTV range", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByText("LTV Range")).toBeInTheDocument();
		});

		it("renders buyer types section", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByText("Buyer Types")).toBeInTheDocument();
		});

		it("renders BER eligibility section", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByText("BER Eligibility")).toBeInTheDocument();
		});
	});

	describe("fixed term input", () => {
		it("shows fixed term input for fixed rate type", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByLabelText(/fixed term/i)).toBeInTheDocument();
		});

		it("hides fixed term input for variable rate type", async () => {
			const user = userEvent.setup();
			render(<CustomRateForm {...defaultProps} />);

			// Click the rate type selector (Radix Select comboboxes don't have accessible names)
			const comboboxes = screen.getAllByRole("combobox");
			// Rate Type is the second combobox (after Lender)
			await user.click(comboboxes[1]);

			// Select variable
			await user.click(screen.getByRole("option", { name: /variable/i }));

			expect(screen.queryByLabelText(/fixed term/i)).not.toBeInTheDocument();
		});
	});

	describe("APRC calculation mode", () => {
		it("shows fees inputs when showAprcCalculation is true and fees mode selected", () => {
			render(<CustomRateForm {...defaultProps} showAprcCalculation />);

			expect(screen.getByLabelText(/valuation fee/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/release fee/i)).toBeInTheDocument();
		});

		it("shows APRC mode toggle when showAprcCalculation is true", () => {
			render(<CustomRateForm {...defaultProps} showAprcCalculation />);

			expect(screen.getByLabelText(/calculate from fees/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/enter aprc/i)).toBeInTheDocument();
		});

		it("does not show mode toggle when showAprcCalculation is false", () => {
			render(<CustomRateForm {...defaultProps} showAprcCalculation={false} />);

			expect(
				screen.queryByLabelText(/calculate from fees/i),
			).not.toBeInTheDocument();
		});
	});

	describe("buyer types", () => {
		it("has FTB and Mover checked by default for FTB buyer type", () => {
			const { container } = render(
				<CustomRateForm {...defaultProps} currentBuyerType="ftb" />,
			);

			// Use specific IDs since label text appears in both First Mortgage and Mortgage Switch sections
			const ftbCheckbox = container.querySelector("#buyer-type-ftb");
			const moverCheckbox = container.querySelector("#buyer-type-mover");

			expect(ftbCheckbox).toHaveAttribute("data-state", "checked");
			expect(moverCheckbox).toHaveAttribute("data-state", "checked");
		});

		it("has BTL checked by default for BTL buyer type", () => {
			const { container } = render(
				<CustomRateForm {...defaultProps} currentBuyerType="btl" />,
			);

			const btlCheckbox = container.querySelector("#buyer-type-btl");
			expect(btlCheckbox).toHaveAttribute("data-state", "checked");
		});
	});

	describe("BER eligibility", () => {
		it("has all BER ratings eligible checked by default", () => {
			render(<CustomRateForm {...defaultProps} />);

			const allBerCheckbox = screen.getByRole("checkbox", {
				name: /all ber ratings eligible/i,
			});
			expect(allBerCheckbox).toBeChecked();
		});

		it("shows BER group checkboxes when all BER is unchecked", async () => {
			const user = userEvent.setup();
			render(<CustomRateForm {...defaultProps} />);

			await user.click(
				screen.getByRole("checkbox", { name: /all ber ratings eligible/i }),
			);

			expect(screen.getByText("Green (A & B)")).toBeInTheDocument();
			expect(screen.getByRole("checkbox", { name: "A" })).toBeInTheDocument();
			expect(screen.getByRole("checkbox", { name: "B" })).toBeInTheDocument();
		});
	});

	describe("customer eligibility", () => {
		it("renders customer eligibility selection", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByText("Customer Eligibility")).toBeInTheDocument();
		});
	});

	describe("form validation", () => {
		it("submit button is disabled when form is empty", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
		});
	});

	describe("custom lender", () => {
		it("shows custom lender name input when new custom lender selected", async () => {
			const user = userEvent.setup();
			render(<CustomRateForm {...defaultProps} />);

			// Lender is the first combobox
			const comboboxes = screen.getAllByRole("combobox");
			await user.click(comboboxes[0]);
			await user.click(
				screen.getByRole("option", { name: /new custom lender/i }),
			);

			expect(
				screen.getByPlaceholderText(/enter custom lender name/i),
			).toBeInTheDocument();
		});

		it("shows existing custom lenders in dropdown", async () => {
			const user = userEvent.setup();
			const customLenders = [{ id: "my-bank", name: "My Bank" }];
			render(
				<CustomRateForm {...defaultProps} customLenders={customLenders} />,
			);

			// Lender is the first combobox
			const comboboxes = screen.getAllByRole("combobox");
			await user.click(comboboxes[0]);

			expect(
				screen.getByRole("option", { name: /my bank/i }),
			).toBeInTheDocument();
		});
	});

	describe("perks", () => {
		it("shows perks section when perks are available", () => {
			const perks = [
				{
					id: "cashback",
					label: "2% Cashback",
					description: "Get 2% back",
					icon: "Percent",
				},
			];
			render(<CustomRateForm {...defaultProps} perks={perks} />);

			expect(screen.getByText("Perks")).toBeInTheDocument();
			expect(screen.getByText("2% Cashback")).toBeInTheDocument();
		});

		it("hides perks section when no perks available", () => {
			render(<CustomRateForm {...defaultProps} perks={[]} />);

			expect(screen.queryByText("Perks")).not.toBeInTheDocument();
		});
	});

	describe("footer", () => {
		it("shows local storage notice", () => {
			render(<CustomRateForm {...defaultProps} />);

			expect(
				screen.getByText(/custom rates are stored locally/i),
			).toBeInTheDocument();
		});
	});
});
