import { render, screen } from "@testing-library/react";
import { ChartLegend } from "../ChartLegend";

describe("ChartLegend", () => {
	describe("basic rendering", () => {
		it("renders legend items", () => {
			const items = [
				{ color: "#3b82f6", label: "Buying" },
				{ color: "#ef4444", label: "Renting" },
			];
			render(<ChartLegend items={items} />);

			expect(screen.getByText("Buying")).toBeInTheDocument();
			expect(screen.getByText("Renting")).toBeInTheDocument();
		});

		it("renders solid color indicators by default", () => {
			const items = [{ color: "#3b82f6", label: "Value" }];
			const { container } = render(<ChartLegend items={items} />);

			const indicator = container.querySelector(".h-2.w-2.rounded-sm");
			expect(indicator).toBeInTheDocument();
			expect(indicator).toHaveStyle({ backgroundColor: "#3b82f6" });
		});
	});

	describe("dashed indicators", () => {
		it("renders dashed border for dashed items", () => {
			const items = [{ color: "#3b82f6", label: "Projection", dashed: true }];
			const { container } = render(<ChartLegend items={items} />);

			const dashedIndicator = container.querySelector(
				".h-2.w-2.rounded-sm.border.border-dashed",
			);
			expect(dashedIndicator).toBeInTheDocument();
			expect(dashedIndicator).toHaveStyle({
				backgroundColor: "transparent",
				borderColor: "#3b82f6",
			});
		});
	});

	describe("multiple items", () => {
		it("renders all items", () => {
			const items = [
				{ color: "#3b82f6", label: "Option A" },
				{ color: "#ef4444", label: "Option B" },
				{ color: "#22c55e", label: "Option C" },
			];
			render(<ChartLegend items={items} />);

			expect(screen.getByText("Option A")).toBeInTheDocument();
			expect(screen.getByText("Option B")).toBeInTheDocument();
			expect(screen.getByText("Option C")).toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("renders empty container for empty items", () => {
			const { container } = render(<ChartLegend items={[]} />);

			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.children.length).toBe(0);
		});
	});
});
