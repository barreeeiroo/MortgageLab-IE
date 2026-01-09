import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropertyTypeSelector } from "../PropertyTypeSelector";

describe("PropertyTypeSelector", () => {
	const defaultProps = {
		value: "existing" as const,
		onChange: vi.fn(),
		priceIncludesVAT: true,
		onPriceIncludesVATChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("basic rendering", () => {
		it("renders with label when not compact", () => {
			render(<PropertyTypeSelector {...defaultProps} />);

			expect(screen.getByText("Property Type")).toBeInTheDocument();
			expect(screen.getByRole("combobox")).toBeInTheDocument();
		});

		it("renders without label when compact", () => {
			render(<PropertyTypeSelector {...defaultProps} compact />);

			expect(screen.queryByText("Property Type")).not.toBeInTheDocument();
			expect(screen.getByRole("combobox")).toBeInTheDocument();
		});

		it("displays selected value", () => {
			render(<PropertyTypeSelector {...defaultProps} value="existing" />);

			expect(screen.getByRole("combobox")).toHaveTextContent(
				"Existing Property",
			);
		});
	});

	describe("options", () => {
		it("displays all property type options when opened", async () => {
			const user = userEvent.setup();
			render(<PropertyTypeSelector {...defaultProps} />);

			await user.click(screen.getByRole("combobox"));

			expect(
				screen.getByRole("option", { name: "Existing Property" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", { name: "New Build (13.5% VAT)" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", { name: "New Apartment (9% VAT)" }),
			).toBeInTheDocument();
		});

		it("calls onChange when selection changes", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<PropertyTypeSelector {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByRole("combobox"));
			await user.click(
				screen.getByRole("option", { name: "New Build (13.5% VAT)" }),
			);

			expect(onChange).toHaveBeenCalledWith("new-build");
		});
	});

	describe("VAT toggle", () => {
		it("does not show VAT toggle for existing property", () => {
			render(<PropertyTypeSelector {...defaultProps} value="existing" />);

			expect(
				screen.queryByLabelText("Price includes VAT"),
			).not.toBeInTheDocument();
		});

		it("shows VAT toggle for new build", () => {
			render(<PropertyTypeSelector {...defaultProps} value="new-build" />);

			expect(screen.getByLabelText("Price includes VAT")).toBeInTheDocument();
		});

		it("shows VAT toggle for new apartment", () => {
			render(<PropertyTypeSelector {...defaultProps} value="new-apartment" />);

			expect(screen.getByLabelText("Price includes VAT")).toBeInTheDocument();
		});

		it("VAT checkbox reflects priceIncludesVAT prop", () => {
			render(
				<PropertyTypeSelector
					{...defaultProps}
					value="new-build"
					priceIncludesVAT={true}
				/>,
			);

			expect(screen.getByLabelText("Price includes VAT")).toBeChecked();
		});

		it("VAT checkbox is unchecked when priceIncludesVAT is false", () => {
			render(
				<PropertyTypeSelector
					{...defaultProps}
					value="new-build"
					priceIncludesVAT={false}
				/>,
			);

			expect(screen.getByLabelText("Price includes VAT")).not.toBeChecked();
		});

		it("calls onPriceIncludesVATChange when checkbox is clicked", async () => {
			const user = userEvent.setup();
			const onPriceIncludesVATChange = vi.fn();
			render(
				<PropertyTypeSelector
					{...defaultProps}
					value="new-build"
					priceIncludesVAT={true}
					onPriceIncludesVATChange={onPriceIncludesVATChange}
				/>,
			);

			await user.click(screen.getByLabelText("Price includes VAT"));

			expect(onPriceIncludesVATChange).toHaveBeenCalledWith(false);
		});
	});

	describe("custom props", () => {
		it("uses custom id when provided", () => {
			render(<PropertyTypeSelector {...defaultProps} id="custom-property" />);

			expect(screen.getByRole("combobox")).toHaveAttribute(
				"id",
				"custom-property",
			);
		});

		it("uses custom label when provided", () => {
			render(
				<PropertyTypeSelector {...defaultProps} label="Type of Property" />,
			);

			expect(screen.getByText("Type of Property")).toBeInTheDocument();
		});
	});
});
