import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MortgageTermSelector } from "../MortgageTermSelector";

describe("MortgageTermSelector", () => {
	it("renders with label when not compact", () => {
		render(<MortgageTermSelector value="360" onChange={vi.fn()} />);

		expect(screen.getByText("Mortgage Term")).toBeInTheDocument();
		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("renders without label when compact", () => {
		render(<MortgageTermSelector value="360" onChange={vi.fn()} compact />);

		expect(screen.queryByText("Mortgage Term")).not.toBeInTheDocument();
		expect(screen.getByRole("combobox")).toBeInTheDocument();
	});

	it("displays term in years format", () => {
		render(<MortgageTermSelector value="360" onChange={vi.fn()} />);

		expect(screen.getByRole("combobox")).toHaveTextContent("30 years");
	});

	it("displays term with months when applicable", () => {
		render(<MortgageTermSelector value="363" onChange={vi.fn()} />);

		expect(screen.getByRole("combobox")).toHaveTextContent("30 years 3 months");
	});

	it("displays preset year options when opened", async () => {
		const user = userEvent.setup();
		render(<MortgageTermSelector value="360" onChange={vi.fn()} />);

		await user.click(screen.getByRole("combobox"));

		expect(screen.getByRole("button", { name: "5 years" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "10 years" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "25 years" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "30 years" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "35 years" }),
		).toBeInTheDocument();
	});

	it("calls onChange with correct month value when selecting a year", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<MortgageTermSelector value="360" onChange={onChange} />);

		await user.click(screen.getByRole("combobox"));
		await user.click(screen.getByRole("button", { name: "25 years" }));

		expect(onChange).toHaveBeenCalledWith("300"); // 25 * 12 = 300
	});

	it("has mode toggle between Years Only and With Months", async () => {
		const user = userEvent.setup();
		render(<MortgageTermSelector value="360" onChange={vi.fn()} />);

		await user.click(screen.getByRole("combobox"));

		expect(screen.getByRole("tab", { name: "Years Only" })).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: "With Months" }),
		).toBeInTheDocument();
	});

	it("shows month options when With Months mode is selected", async () => {
		const user = userEvent.setup();
		render(<MortgageTermSelector value="360" onChange={vi.fn()} />);

		await user.click(screen.getByRole("combobox"));
		await user.click(screen.getByRole("tab", { name: "With Months" }));

		expect(
			screen.getByRole("button", { name: "0 months" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "3 months" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "6 months" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "9 months" }),
		).toBeInTheDocument();
	});

	it("calls onChange with correct value when selecting months", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<MortgageTermSelector value="360" onChange={onChange} />);

		await user.click(screen.getByRole("combobox"));
		await user.click(screen.getByRole("tab", { name: "With Months" }));
		await user.click(screen.getByRole("button", { name: "6 months" }));

		expect(onChange).toHaveBeenCalledWith("366"); // 30 years + 6 months = 366
	});

	it("uses custom id when provided", () => {
		render(
			<MortgageTermSelector value="360" onChange={vi.fn()} id="custom-term" />,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("id", "custom-term");
	});

	it("uses custom label when provided", () => {
		render(
			<MortgageTermSelector value="360" onChange={vi.fn()} label="Loan Term" />,
		);

		expect(screen.getByText("Loan Term")).toBeInTheDocument();
	});

	describe("custom input", () => {
		it("allows entering custom year value", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MortgageTermSelector value="360" onChange={onChange} />);

			await user.click(screen.getByRole("combobox"));

			const customInput = screen.getByPlaceholderText("Custom");
			await user.type(customInput, "22");
			await user.click(screen.getByRole("button", { name: "Go" }));

			expect(onChange).toHaveBeenCalledWith("264"); // 22 * 12 = 264
		});

		it("allows entering custom year via Enter key", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MortgageTermSelector value="360" onChange={onChange} />);

			await user.click(screen.getByRole("combobox"));

			const customInput = screen.getByPlaceholderText("Custom");
			await user.type(customInput, "18{Enter}");

			expect(onChange).toHaveBeenCalledWith("216"); // 18 * 12 = 216
		});
	});

	describe("With Months mode", () => {
		it("auto-enables With Months mode when value has months", () => {
			render(<MortgageTermSelector value="366" onChange={vi.fn()} />);

			// Display should show months
			expect(screen.getByRole("combobox")).toHaveTextContent(
				"30 years 6 months",
			);
		});

		it("preserves months when switching years in With Months mode", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MortgageTermSelector value="366" onChange={onChange} />);

			await user.click(screen.getByRole("combobox"));
			// Should already be in With Months mode because value has months
			await user.click(screen.getByRole("button", { name: "25 years" }));

			expect(onChange).toHaveBeenCalledWith("306"); // 25*12 + 6 = 306
		});

		it("resets months to 0 when switching to Years Only mode", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MortgageTermSelector value="366" onChange={onChange} />);

			await user.click(screen.getByRole("combobox"));
			await user.click(screen.getByRole("tab", { name: "Years Only" }));

			expect(onChange).toHaveBeenCalledWith("360"); // 30*12 = 360, months reset to 0
		});
	});

	describe("optional mode", () => {
		it("does not show None option by default", async () => {
			const user = userEvent.setup();
			render(<MortgageTermSelector value="360" onChange={vi.fn()} />);

			await user.click(screen.getByRole("combobox"));

			expect(
				screen.queryByRole("button", { name: "None" }),
			).not.toBeInTheDocument();
		});

		it("shows None option when optional is true", async () => {
			const user = userEvent.setup();
			render(<MortgageTermSelector value="360" onChange={vi.fn()} optional />);

			await user.click(screen.getByRole("combobox"));

			expect(screen.getByRole("button", { name: "None" })).toBeInTheDocument();
		});

		it("calls onChange with empty string when None is selected", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<MortgageTermSelector value="360" onChange={onChange} optional />);

			await user.click(screen.getByRole("combobox"));
			await user.click(screen.getByRole("button", { name: "None" }));

			expect(onChange).toHaveBeenCalledWith("");
		});

		it("displays Select term when value is empty", () => {
			render(<MortgageTermSelector value="" onChange={vi.fn()} optional />);

			expect(screen.getByRole("combobox")).toHaveTextContent("Select term");
		});

		it("closes popover after selecting None", async () => {
			const user = userEvent.setup();
			render(<MortgageTermSelector value="360" onChange={vi.fn()} optional />);

			await user.click(screen.getByRole("combobox"));
			await user.click(screen.getByRole("button", { name: "None" }));

			expect(
				screen.queryByRole("button", { name: "None" }),
			).not.toBeInTheDocument();
		});
	});
});
