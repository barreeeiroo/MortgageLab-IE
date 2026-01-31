import { render, screen } from "@testing-library/react";
import { RatesTableSkeleton } from "../RatesTableSkeleton";

describe("RatesTableSkeleton", () => {
    describe("basic rendering", () => {
        it("renders a table element", () => {
            render(<RatesTableSkeleton />);

            expect(screen.getByRole("table")).toBeInTheDocument();
        });

        it("renders table headers", () => {
            render(<RatesTableSkeleton />);

            expect(screen.getByText("Lender")).toBeInTheDocument();
            expect(screen.getByText("Product")).toBeInTheDocument();
            expect(screen.getByText("Type")).toBeInTheDocument();
            expect(screen.getByText("Period")).toBeInTheDocument();
            expect(screen.getByText("Rate")).toBeInTheDocument();
            expect(screen.getByText("APR")).toBeInTheDocument();
            expect(screen.getByText("Monthly")).toBeInTheDocument();
        });
    });

    describe("skeleton rows", () => {
        it("renders 6 skeleton rows", () => {
            render(<RatesTableSkeleton />);

            // Each row has 7 cells
            const rows = screen.getAllByRole("row");
            // 1 header row + 6 body rows
            expect(rows).toHaveLength(7);
        });

        it("renders skeleton elements in cells", () => {
            const { container } = render(<RatesTableSkeleton />);

            // Check that skeleton elements are present (they have a specific class pattern)
            const skeletons = container.querySelectorAll(
                '[class*="animate-pulse"]',
            );
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });
});
