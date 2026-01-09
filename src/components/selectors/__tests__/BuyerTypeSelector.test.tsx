import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuyerTypeSelector } from "../BuyerTypeSelector";

describe("BuyerTypeSelector", () => {
	describe("purchase variant (default)", () => {
		it("renders with label when not compact", () => {
			render(<BuyerTypeSelector value="ftb" onChange={vi.fn()} />);

			expect(screen.getByText("Buyer Type")).toBeInTheDocument();
			expect(screen.getByRole("combobox")).toBeInTheDocument();
		});

		it("renders without label when compact", () => {
			render(<BuyerTypeSelector value="ftb" onChange={vi.fn()} compact />);

			expect(screen.queryByText("Buyer Type")).not.toBeInTheDocument();
			expect(screen.getByRole("combobox")).toBeInTheDocument();
		});

		it("displays selected value", () => {
			render(<BuyerTypeSelector value="ftb" onChange={vi.fn()} />);

			expect(screen.getByRole("combobox")).toHaveTextContent(
				"First Time Buyer",
			);
		});

		it("displays all purchase options when opened", async () => {
			const user = userEvent.setup();
			render(<BuyerTypeSelector value="ftb" onChange={vi.fn()} />);

			await user.click(screen.getByRole("combobox"));

			expect(
				screen.getByRole("option", { name: "First Time Buyer" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", { name: "Home Mover (Primary Residence)" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", {
					name: "Other Buyer (2nd Home, Buy To Let, etc.)",
				}),
			).toBeInTheDocument();
		});

		it("calls onChange when selection changes", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<BuyerTypeSelector value="ftb" onChange={onChange} />);

			await user.click(screen.getByRole("combobox"));
			await user.click(
				screen.getByRole("option", { name: "Home Mover (Primary Residence)" }),
			);

			expect(onChange).toHaveBeenCalledWith("mover");
		});

		it("uses custom id when provided", () => {
			render(
				<BuyerTypeSelector value="ftb" onChange={vi.fn()} id="custom-id" />,
			);

			expect(screen.getByRole("combobox")).toHaveAttribute("id", "custom-id");
		});

		it("uses custom label when provided", () => {
			render(
				<BuyerTypeSelector
					value="ftb"
					onChange={vi.fn()}
					label="Custom Label"
				/>,
			);

			expect(screen.getByText("Custom Label")).toBeInTheDocument();
		});
	});

	describe("remortgage variant", () => {
		it("displays remortgage options when opened", async () => {
			const user = userEvent.setup();
			render(
				<BuyerTypeSelector
					value="switcher-pdh"
					onChange={vi.fn()}
					variant="remortgage"
				/>,
			);

			await user.click(screen.getByRole("combobox"));

			expect(
				screen.getByRole("option", {
					name: "Owner Occupied (Primary Residence)",
				}),
			).toBeInTheDocument();
			expect(
				screen.getByRole("option", {
					name: "Other Switcher (2nd Home, Buy To Let, etc.)",
				}),
			).toBeInTheDocument();
		});

		it("does not show purchase options in remortgage variant", async () => {
			const user = userEvent.setup();
			render(
				<BuyerTypeSelector
					value="switcher-pdh"
					onChange={vi.fn()}
					variant="remortgage"
				/>,
			);

			await user.click(screen.getByRole("combobox"));

			expect(
				screen.queryByRole("option", { name: "First Time Buyer" }),
			).not.toBeInTheDocument();
		});

		it("displays selected remortgage value", () => {
			render(
				<BuyerTypeSelector
					value="switcher-pdh"
					onChange={vi.fn()}
					variant="remortgage"
				/>,
			);

			expect(screen.getByRole("combobox")).toHaveTextContent(
				"Owner Occupied (Primary Residence)",
			);
		});

		it("calls onChange with remortgage value", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<BuyerTypeSelector
					value="switcher-pdh"
					onChange={onChange}
					variant="remortgage"
				/>,
			);

			await user.click(screen.getByRole("combobox"));
			await user.click(
				screen.getByRole("option", {
					name: "Other Switcher (2nd Home, Buy To Let, etc.)",
				}),
			);

			expect(onChange).toHaveBeenCalledWith("switcher-btl");
		});
	});
});
