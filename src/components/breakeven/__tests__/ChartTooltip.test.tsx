import { render, screen } from "@testing-library/react";
import {
	TooltipDifferenceRow,
	TooltipHeader,
	TooltipMetricRow,
	TooltipSection,
	TooltipWrapper,
} from "../ChartTooltip";

describe("TooltipWrapper", () => {
	it("renders children", () => {
		render(<TooltipWrapper>Tooltip content</TooltipWrapper>);

		expect(screen.getByText("Tooltip content")).toBeInTheDocument();
	});

	it("applies container styling", () => {
		const { container } = render(<TooltipWrapper>Content</TooltipWrapper>);

		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper).toHaveClass("rounded-lg", "border", "shadow-xl");
	});
});

describe("TooltipHeader", () => {
	it("renders children text", () => {
		render(<TooltipHeader>Year 5</TooltipHeader>);

		expect(screen.getByText("Year 5")).toBeInTheDocument();
	});

	it("shows projection label when isProjection is true", () => {
		render(<TooltipHeader isProjection>Year 5</TooltipHeader>);

		expect(screen.getByText("(projection)")).toBeInTheDocument();
	});

	it("does not show projection label when isProjection is false", () => {
		render(<TooltipHeader isProjection={false}>Year 5</TooltipHeader>);

		expect(screen.queryByText("(projection)")).not.toBeInTheDocument();
	});
});

describe("TooltipMetricRow", () => {
	it("renders label and formatted value", () => {
		render(
			<TooltipMetricRow color="#3b82f6" label="Net Worth" value={150000} />,
		);

		expect(screen.getByText("Net Worth")).toBeInTheDocument();
		expect(screen.getByText("€150,000")).toBeInTheDocument();
	});

	it("renders solid color indicator by default", () => {
		const { container } = render(
			<TooltipMetricRow color="#3b82f6" label="Value" value={100000} />,
		);

		const indicator = container.querySelector(
			".h-2\\.5.w-2\\.5.rounded-sm.shrink-0",
		);
		expect(indicator).toBeInTheDocument();
		expect(indicator).toHaveStyle({ backgroundColor: "#3b82f6" });
	});

	it("renders dashed indicator when dashed is true", () => {
		const { container } = render(
			<TooltipMetricRow
				color="#3b82f6"
				label="Projection"
				value={100000}
				dashed
			/>,
		);

		const dashedIndicator = container.querySelector(
			".h-2\\.5.w-2\\.5.rounded-sm.shrink-0.border.border-dashed",
		);
		expect(dashedIndicator).toBeInTheDocument();
		expect(dashedIndicator).toHaveStyle({
			backgroundColor: "transparent",
			borderColor: "#3b82f6",
		});
	});

	it("applies positive highlight style", () => {
		render(
			<TooltipMetricRow
				color="#3b82f6"
				label="Savings"
				value={5000}
				highlight="positive"
			/>,
		);

		const value = screen.getByText("€5,000");
		expect(value).toHaveClass("text-green-600");
	});

	it("applies negative highlight style", () => {
		render(
			<TooltipMetricRow
				color="#3b82f6"
				label="Cost"
				value={5000}
				highlight="negative"
			/>,
		);

		const value = screen.getByText("€5,000");
		expect(value).toHaveClass("text-amber-600");
	});
});

describe("TooltipDifferenceRow", () => {
	it("renders label and positive value with +", () => {
		render(<TooltipDifferenceRow label="Difference" value={10000} />);

		expect(screen.getByText("Difference")).toBeInTheDocument();
		expect(screen.getByText("+€10,000")).toBeInTheDocument();
	});

	it("renders negative value without +", () => {
		render(<TooltipDifferenceRow label="Difference" value={-5000} />);

		expect(screen.getByText("-€5,000")).toBeInTheDocument();
	});

	it("uses green for positive values when positiveIsGood is true", () => {
		render(
			<TooltipDifferenceRow
				label="Savings"
				value={10000}
				positiveIsGood={true}
			/>,
		);

		const value = screen.getByText("+€10,000");
		expect(value).toHaveClass("text-green-600");
	});

	it("uses amber for negative values when positiveIsGood is true", () => {
		render(
			<TooltipDifferenceRow label="Loss" value={-5000} positiveIsGood={true} />,
		);

		const value = screen.getByText("-€5,000");
		expect(value).toHaveClass("text-amber-600");
	});

	it("uses amber for positive values when positiveIsGood is false", () => {
		render(
			<TooltipDifferenceRow
				label="Extra Cost"
				value={10000}
				positiveIsGood={false}
			/>,
		);

		const value = screen.getByText("+€10,000");
		expect(value).toHaveClass("text-amber-600");
	});

	it("uses green for negative values when positiveIsGood is false", () => {
		render(
			<TooltipDifferenceRow
				label="Savings"
				value={-5000}
				positiveIsGood={false}
			/>,
		);

		const value = screen.getByText("-€5,000");
		expect(value).toHaveClass("text-green-600");
	});
});

describe("TooltipSection", () => {
	it("renders children", () => {
		render(<TooltipSection>Section content</TooltipSection>);

		expect(screen.getByText("Section content")).toBeInTheDocument();
	});
});
