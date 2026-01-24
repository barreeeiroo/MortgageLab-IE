import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLendersSet } from "@/test/utils/mock-data";
import { createRatesInputValues } from "@/test/utils/store-helpers";
import { RatesInput, type RatesInputProps } from "../RatesInput";

describe("RatesInput", () => {
	const mockLenders = createMockLendersSet();

	const defaultProps: RatesInputProps = {
		values: createRatesInputValues(),
		onChange: vi.fn(),
		lenders: mockLenders,
		deposit: 35000,
		ltv: 90,
		isFormValid: true,
		hasError: false,
		hasWarning: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("mode tabs", () => {
		it("renders First Mortgage and Mortgage Switch tabs", () => {
			render(<RatesInput {...defaultProps} />);

			expect(
				screen.getByRole("tab", { name: /first mortgage/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("tab", { name: /mortgage switch/i }),
			).toBeInTheDocument();
		});

		it("highlights First Mortgage tab when mode is first-mortgage", () => {
			render(<RatesInput {...defaultProps} />);

			const tab = screen.getByRole("tab", { name: /first mortgage/i });
			expect(tab).toHaveAttribute("data-state", "active");
		});

		it("highlights Mortgage Switch tab when mode is remortgage", () => {
			const values = createRatesInputValues({ mode: "remortgage" });
			render(<RatesInput {...defaultProps} values={values} />);

			const tab = screen.getByRole("tab", { name: /mortgage switch/i });
			expect(tab).toHaveAttribute("data-state", "active");
		});

		it("calls onChange when switching to remortgage", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<RatesInput {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByRole("tab", { name: /mortgage switch/i }));

			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({ mode: "remortgage" }),
			);
		});
	});

	describe("first mortgage mode", () => {
		it("renders property value input", () => {
			render(<RatesInput {...defaultProps} />);

			expect(screen.getByLabelText(/property value/i)).toBeInTheDocument();
		});

		it("renders mortgage amount input", () => {
			render(<RatesInput {...defaultProps} />);

			expect(screen.getByLabelText(/mortgage amount/i)).toBeInTheDocument();
		});

		it("renders deposit display (disabled)", () => {
			render(<RatesInput {...defaultProps} />);

			const depositInput = screen.getByLabelText(/deposit/i);
			expect(depositInput).toBeDisabled();
			expect(depositInput).toHaveValue("€35,000");
		});

		it("renders LTV display", () => {
			render(<RatesInput {...defaultProps} />);

			const ltvInput = screen.getByLabelText(/ltv/i);
			expect(ltvInput).toBeDisabled();
			expect(ltvInput).toHaveValue("90.00%");
		});

		it("renders buyer type selector", () => {
			render(<RatesInput {...defaultProps} />);

			// Buyer type selector is hidden on mobile, visible on lg
			expect(screen.getAllByLabelText(/buyer type/i).length).toBeGreaterThan(0);
		});

		it("renders term selector", () => {
			render(<RatesInput {...defaultProps} />);

			expect(screen.getByLabelText(/term/i)).toBeInTheDocument();
		});

		it("renders BER selector", () => {
			render(<RatesInput {...defaultProps} />);

			expect(screen.getByLabelText(/ber/i)).toBeInTheDocument();
		});

		it("does not show current lender field in first-mortgage mode", () => {
			render(<RatesInput {...defaultProps} />);

			expect(
				screen.queryByLabelText(/current lender/i),
			).not.toBeInTheDocument();
		});
	});

	describe("remortgage mode", () => {
		const remortgageProps: RatesInputProps = {
			...defaultProps,
			values: createRatesInputValues({
				mode: "remortgage",
				monthlyRepayment: "1500",
			}),
		};

		it("shows Current Property Value label", () => {
			render(<RatesInput {...remortgageProps} />);

			expect(
				screen.getByLabelText(/current property value/i),
			).toBeInTheDocument();
		});

		it("shows Outstanding Balance label", () => {
			render(<RatesInput {...remortgageProps} />);

			expect(screen.getByLabelText(/outstanding balance/i)).toBeInTheDocument();
		});

		it("shows current monthly repayment input instead of deposit", () => {
			render(<RatesInput {...remortgageProps} />);

			expect(
				screen.getByLabelText(/current monthly repayment/i),
			).toBeInTheDocument();
			expect(screen.queryByLabelText(/^deposit$/i)).not.toBeInTheDocument();
		});

		it("shows current lender selector", () => {
			render(<RatesInput {...remortgageProps} />);

			expect(screen.getByLabelText(/current lender/i)).toBeInTheDocument();
		});

		it("shows Remaining Term label", () => {
			render(<RatesInput {...remortgageProps} />);

			expect(screen.getByLabelText(/remaining term/i)).toBeInTheDocument();
		});

		it("shows remortgage type selector label", () => {
			render(<RatesInput {...remortgageProps} />);

			// Shows "Remortgage Type" instead of "Buyer Type"
			expect(
				screen.getAllByLabelText(/remortgage type/i).length,
			).toBeGreaterThan(0);
		});
	});

	describe("LTV quick select buttons", () => {
		it("renders LTV percentage buttons", () => {
			const values = createRatesInputValues({ propertyValue: "400000" });
			render(<RatesInput {...defaultProps} values={values} />);

			// First mortgage mode has 50%, 70%, 80%, 90% buttons
			expect(screen.getByRole("button", { name: "50%" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "70%" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "80%" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "90%" })).toBeInTheDocument();
		});

		it("buttons are disabled when property value is 0", () => {
			const values = createRatesInputValues({ propertyValue: "" });
			render(<RatesInput {...defaultProps} values={values} />);

			expect(screen.getByRole("button", { name: "90%" })).toBeDisabled();
		});

		it("clicking LTV button updates mortgage amount", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const values = createRatesInputValues({ propertyValue: "400000" });
			render(
				<RatesInput {...defaultProps} values={values} onChange={onChange} />,
			);

			await user.click(screen.getByRole("button", { name: "80%" }));

			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({ mortgageAmount: "320000" }),
			);
		});
	});

	describe("status alerts", () => {
		it("shows error alert when hasError is true", () => {
			render(
				<RatesInput
					{...defaultProps}
					hasError={true}
					errorMessage="LTV exceeds maximum allowed"
				/>,
			);

			expect(
				screen.getByText("LTV exceeds maximum allowed"),
			).toBeInTheDocument();
		});

		it("shows warning alert when hasWarning is true and no error", () => {
			render(
				<RatesInput
					{...defaultProps}
					hasWarning={true}
					warningMessage="High LTV may limit your options"
				/>,
			);

			expect(
				screen.getByText("High LTV may limit your options"),
			).toBeInTheDocument();
		});

		it("shows info message when form is incomplete", () => {
			render(
				<RatesInput
					{...defaultProps}
					isFormValid={false}
					hasError={false}
					hasWarning={false}
				/>,
			);

			expect(
				screen.getByText(/enter your property details above/i),
			).toBeInTheDocument();
		});

		it("does not show warning when error is present", () => {
			render(
				<RatesInput
					{...defaultProps}
					hasError={true}
					errorMessage="Error message"
					hasWarning={true}
					warningMessage="Warning message"
				/>,
			);

			expect(screen.getByText("Error message")).toBeInTheDocument();
			expect(screen.queryByText("Warning message")).not.toBeInTheDocument();
		});
	});

	describe("LTV display", () => {
		it("shows placeholder when property value is 0", () => {
			const values = createRatesInputValues({ propertyValue: "" });
			render(
				<RatesInput {...defaultProps} values={values} ltv={0} deposit={0} />,
			);

			const ltvInput = screen.getByLabelText(/ltv/i);
			expect(ltvInput).toHaveValue("—");
		});

		it("applies destructive styling when LTV is above 90%", () => {
			render(<RatesInput {...defaultProps} ltv={95} />);

			const ltvInput = screen.getByLabelText(/ltv/i);
			expect(ltvInput).toHaveClass("text-destructive");
		});

		it("does not apply destructive styling when LTV is 90% or below", () => {
			render(<RatesInput {...defaultProps} ltv={90} />);

			const ltvInput = screen.getByLabelText(/ltv/i);
			expect(ltvInput).not.toHaveClass("text-destructive");
		});
	});

	describe("input interactions", () => {
		it("calls onChange on property value blur", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<RatesInput {...defaultProps} onChange={onChange} />);

			const input = screen.getByLabelText(/property value/i);
			await user.clear(input);
			await user.type(input, "400000");
			await user.tab(); // trigger blur

			expect(onChange).toHaveBeenLastCalledWith(
				expect.objectContaining({ propertyValue: "400000" }),
			);
		});

		it("calls onChange on mortgage amount blur", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<RatesInput {...defaultProps} onChange={onChange} />);

			const input = screen.getByLabelText(/mortgage amount/i);
			await user.clear(input);
			await user.type(input, "280000");
			await user.tab(); // trigger blur

			expect(onChange).toHaveBeenLastCalledWith(
				expect.objectContaining({ mortgageAmount: "280000" }),
			);
		});
	});
});
