import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender, createMockRate } from "@/test/utils/mock-data";
import { RatesToolbar, type RatesToolbarProps } from "../RatesToolbar";

describe("RatesToolbar", () => {
    const mockLender = createMockLender({
        id: "aib",
        name: "AIB",
        shortName: "AIB",
    });

    const mockRate = createMockRate({
        id: "aib-fixed-3yr",
        name: "3 Year Fixed",
        lenderId: "aib",
        type: "fixed",
        rate: 3.45,
    });

    const defaultProps: RatesToolbarProps = {
        lenders: [mockLender],
        inputValues: {
            mode: "first-mortgage",
            propertyValue: "350000",
            mortgageAmount: "315000",
            monthlyRepayment: "",
            mortgageTerm: "300",
            berRating: "C1",
            buyerType: "ftb",
            currentLender: "",
        },
        filteredRates: [mockRate],
        allRates: [mockRate],
        mortgageAmount: 315000,
        mortgageTerm: 300,
        ltv: 90,
        columnVisibility: {},
        columnFilters: [],
        sorting: [],
        compactMode: false,
        onColumnVisibilityChange: vi.fn(),
        onCompactModeChange: vi.fn(),
    };

    describe("columns button", () => {
        it("renders Columns button", () => {
            render(<RatesToolbar {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /columns/i }),
            ).toBeInTheDocument();
        });

        it("opens column visibility dropdown on click", async () => {
            const user = userEvent.setup();
            render(<RatesToolbar {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /columns/i }));

            await waitFor(() => {
                expect(screen.getByText("Toggle columns")).toBeInTheDocument();
            });
        });

        it("shows hideable columns in dropdown", async () => {
            const user = userEvent.setup();
            render(<RatesToolbar {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /columns/i }));

            await waitFor(() => {
                expect(screen.getByText("Perks")).toBeInTheDocument();
                expect(screen.getByText("Type")).toBeInTheDocument();
                expect(screen.getByText("Period")).toBeInTheDocument();
                expect(screen.getByText("Rate")).toBeInTheDocument();
                expect(screen.getByText("APRC")).toBeInTheDocument();
            });
        });

        it("is disabled when disabled prop is true", () => {
            render(<RatesToolbar {...defaultProps} disabled={true} />);

            expect(
                screen.getByRole("button", { name: /columns/i }),
            ).toBeDisabled();
        });
    });

    describe("compact mode button", () => {
        it("renders Compact button", () => {
            render(<RatesToolbar {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /compact/i }),
            ).toBeInTheDocument();
        });

        it("calls onCompactModeChange when clicked", async () => {
            const user = userEvent.setup();
            const onCompactModeChange = vi.fn();
            render(
                <RatesToolbar
                    {...defaultProps}
                    onCompactModeChange={onCompactModeChange}
                />,
            );

            await user.click(screen.getByRole("button", { name: /compact/i }));

            expect(onCompactModeChange).toHaveBeenCalledWith(true);
        });

        it("toggles off when already in compact mode", async () => {
            const user = userEvent.setup();
            const onCompactModeChange = vi.fn();
            render(
                <RatesToolbar
                    {...defaultProps}
                    compactMode={true}
                    onCompactModeChange={onCompactModeChange}
                />,
            );

            await user.click(screen.getByRole("button", { name: /compact/i }));

            expect(onCompactModeChange).toHaveBeenCalledWith(false);
        });

        it("is disabled when disabled prop is true", () => {
            render(<RatesToolbar {...defaultProps} disabled={true} />);

            expect(
                screen.getByRole("button", { name: /compact/i }),
            ).toBeDisabled();
        });
    });

    describe("export button", () => {
        it("renders Export button", () => {
            render(<RatesToolbar {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /export/i }),
            ).toBeInTheDocument();
        });

        it("is disabled when no filtered rates", () => {
            render(<RatesToolbar {...defaultProps} filteredRates={[]} />);

            expect(
                screen.getByRole("button", { name: /export/i }),
            ).toBeDisabled();
        });

        it("opens export dropdown on click", async () => {
            const user = userEvent.setup();
            render(<RatesToolbar {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /export/i }));

            await waitFor(() => {
                expect(screen.getByText("Export as PDF")).toBeInTheDocument();
                expect(screen.getByText("Export as Excel")).toBeInTheDocument();
                expect(screen.getByText("Export as CSV")).toBeInTheDocument();
            });
        });
    });

    describe("share button", () => {
        it("renders Share button", () => {
            render(<RatesToolbar {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /share/i }),
            ).toBeInTheDocument();
        });
    });

    describe("column visibility toggle", () => {
        it("calls onColumnVisibilityChange when column is toggled", async () => {
            const user = userEvent.setup();
            const onColumnVisibilityChange = vi.fn();
            render(
                <RatesToolbar
                    {...defaultProps}
                    onColumnVisibilityChange={onColumnVisibilityChange}
                />,
            );

            await user.click(screen.getByRole("button", { name: /columns/i }));

            await waitFor(() => {
                expect(screen.getByText("Perks")).toBeInTheDocument();
            });

            // Click on Perks to toggle it off
            await user.click(
                screen.getByRole("menuitemcheckbox", { name: "Perks" }),
            );

            expect(onColumnVisibilityChange).toHaveBeenCalledWith(
                expect.objectContaining({ perks: false }),
            );
        });
    });
});
