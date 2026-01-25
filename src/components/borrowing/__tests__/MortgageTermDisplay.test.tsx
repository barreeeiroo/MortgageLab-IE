import { render, screen } from "@testing-library/react";
import { AGE_LIMITS } from "@/lib/constants/central-bank";
import { MortgageTermDisplay } from "../MortgageTermDisplay";

describe("MortgageTermDisplay", () => {
	describe("basic rendering", () => {
		it("renders label", () => {
			render(<MortgageTermDisplay maxMortgageTerm={30} />);

			expect(screen.getByText("Maximum Mortgage Term")).toBeInTheDocument();
		});

		it("renders info tooltip trigger", () => {
			render(<MortgageTermDisplay maxMortgageTerm={30} />);

			// Info icon should be present for tooltip
			const infoIcon = document.querySelector("svg.lucide-info");
			expect(infoIcon).toBeInTheDocument();
		});

		it("renders age limit info text", () => {
			render(<MortgageTermDisplay maxMortgageTerm={30} />);

			expect(
				screen.getByText(
					new RegExp(`maximum age of ${AGE_LIMITS.MAX_AGE_AT_END}`),
				),
			).toBeInTheDocument();
			expect(
				screen.getByText(
					new RegExp(`age ${AGE_LIMITS.EXTENDED_MAX_AGE_AT_END}`),
				),
			).toBeInTheDocument();
		});
	});

	describe("term display", () => {
		it("displays term value when provided", () => {
			render(<MortgageTermDisplay maxMortgageTerm={30} />);

			// The select trigger shows the value
			const trigger = screen.getByRole("combobox");
			expect(trigger).toHaveTextContent("30 years");
		});

		it("displays different term values correctly", () => {
			const { rerender } = render(<MortgageTermDisplay maxMortgageTerm={25} />);
			expect(screen.getByRole("combobox")).toHaveTextContent("25 years");

			rerender(<MortgageTermDisplay maxMortgageTerm={35} />);
			expect(screen.getByRole("combobox")).toHaveTextContent("35 years");

			rerender(<MortgageTermDisplay maxMortgageTerm={40} />);
			expect(screen.getByRole("combobox")).toHaveTextContent("40 years");
		});

		it("shows placeholder when term is null", () => {
			render(<MortgageTermDisplay maxMortgageTerm={null} />);

			const trigger = screen.getByRole("combobox");
			expect(trigger).toHaveTextContent("Select date of birth first");
		});
	});

	describe("select element", () => {
		it("renders disabled select", () => {
			render(<MortgageTermDisplay maxMortgageTerm={30} />);

			const trigger = screen.getByRole("combobox");
			expect(trigger).toBeDisabled();
		});

		it("has correct id for label association", () => {
			render(<MortgageTermDisplay maxMortgageTerm={30} />);

			const trigger = screen.getByRole("combobox");
			expect(trigger).toHaveAttribute("id", "maxMortgageTerm");
		});
	});
});
