import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender, createMockRate } from "@/test/utils/mock-data";
import { CompareRatesModal } from "../CompareRatesModal";

describe("CompareRatesModal", () => {
    const mockLender = createMockLender({
        id: "aib",
        name: "AIB",
        shortName: "AIB",
    });

    const mockLender2 = createMockLender({
        id: "boi",
        name: "Bank of Ireland",
        shortName: "BOI",
    });

    const mockRate1 = {
        ...createMockRate({
            id: "aib-fixed-3yr",
            name: "3 Year Fixed",
            lenderId: "aib",
            type: "fixed",
            rate: 3.45,
            apr: 3.52,
            fixedTerm: 3,
        }),
        monthlyPayment: 1402,
        indicativeAprc: 3.52,
        combinedPerks: [],
        followOnLtv: 80,
    };

    const mockRate2 = {
        ...createMockRate({
            id: "boi-fixed-5yr",
            name: "5 Year Fixed",
            lenderId: "boi",
            type: "fixed",
            rate: 3.65,
            apr: 3.72,
            fixedTerm: 5,
        }),
        monthlyPayment: 1435,
        indicativeAprc: 3.72,
        combinedPerks: [],
        followOnLtv: 80,
    };

    const defaultProps = {
        rates: [mockRate1, mockRate2],
        lenders: [mockLender, mockLender2],
        perks: [],
        mortgageAmount: 315000,
        mortgageTerm: 360,
        open: true,
        onOpenChange: vi.fn(),
        onShare: vi.fn().mockResolvedValue("https://example.com/share"),
    };

    describe("basic rendering", () => {
        it("renders Compare Rates title", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(
                screen.getByRole("heading", { name: /compare rates/i }),
            ).toBeInTheDocument();
        });

        it("displays rate count in description", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(
                screen.getByText(/comparing 2 mortgage rates/i),
            ).toBeInTheDocument();
        });

        it("displays mortgage amount", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(screen.getByText(/€315,000/)).toBeInTheDocument();
        });

        it("displays mortgage term", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(screen.getByText(/30 years/)).toBeInTheDocument();
        });
    });

    describe("rate headers", () => {
        it("displays lender names in column headers", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(screen.getByText("AIB")).toBeInTheDocument();
            expect(screen.getByText("Bank of Ireland")).toBeInTheDocument();
        });

        it("displays rate names in column headers", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(screen.getByText("3 Year Fixed")).toBeInTheDocument();
            expect(screen.getByText("5 Year Fixed")).toBeInTheDocument();
        });
    });

    describe("comparison rows", () => {
        it("displays Type row", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(screen.getByText("Type")).toBeInTheDocument();
            expect(screen.getAllByText("Fixed")).toHaveLength(2);
        });

        it("displays Period row", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(screen.getByText("Period")).toBeInTheDocument();
            expect(screen.getByText("3 yr")).toBeInTheDocument();
            expect(screen.getByText("5 yr")).toBeInTheDocument();
        });

        it("displays Rate row", () => {
            render(<CompareRatesModal {...defaultProps} />);

            // "Rate" label appears once as row header
            expect(screen.getByText("Rate")).toBeInTheDocument();
            expect(screen.getByText("3.45%")).toBeInTheDocument();
            expect(screen.getByText("3.65%")).toBeInTheDocument();
        });

        it("displays APRC row", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(screen.getByText("APRC")).toBeInTheDocument();
            expect(screen.getByText("3.52%")).toBeInTheDocument();
            expect(screen.getByText("3.72%")).toBeInTheDocument();
        });

        it("displays Monthly row", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(screen.getByText("Monthly")).toBeInTheDocument();
        });
    });

    describe("comparison table structure", () => {
        it("renders comparison table with cells", () => {
            render(<CompareRatesModal {...defaultProps} />);

            // Check that table cells with values are rendered
            const cells = screen.getAllByRole("cell");
            expect(cells.length).toBeGreaterThan(0);
        });
    });

    describe("action buttons", () => {
        it("renders Export button", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /export/i }),
            ).toBeInTheDocument();
        });

        it("opens export dropdown on click", async () => {
            const user = userEvent.setup();
            render(<CompareRatesModal {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /export/i }));

            await waitFor(() => {
                expect(screen.getByText("Export as PDF")).toBeInTheDocument();
                expect(screen.getByText("Export as Excel")).toBeInTheDocument();
                expect(screen.getByText("Export as CSV")).toBeInTheDocument();
            });
        });

        it("renders Share button", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /share comparison/i }),
            ).toBeInTheDocument();
        });
    });

    describe("close button", () => {
        it("renders close button", () => {
            render(<CompareRatesModal {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /close/i }),
            ).toBeInTheDocument();
        });

        it("calls onOpenChange when close button is clicked", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            render(
                <CompareRatesModal
                    {...defaultProps}
                    onOpenChange={onOpenChange}
                />,
            );

            await user.click(screen.getByRole("button", { name: /close/i }));

            expect(onOpenChange).toHaveBeenCalled();
        });
    });

    describe("empty state", () => {
        it("returns null when rates array is empty", () => {
            const { container } = render(
                <CompareRatesModal {...defaultProps} rates={[]} />,
            );

            expect(container.firstChild).toBeNull();
        });
    });

    describe("variable rates", () => {
        it("displays Variable for variable rate type", () => {
            const variableRate = {
                ...createMockRate({
                    id: "aib-variable",
                    name: "Variable Rate",
                    lenderId: "aib",
                    type: "variable",
                    rate: 4.15,
                }),
                monthlyPayment: 1520,
                combinedPerks: [],
                followOnLtv: 80,
            };

            render(
                <CompareRatesModal
                    {...defaultProps}
                    rates={[mockRate1, variableRate]}
                />,
            );

            expect(screen.getByText("Variable")).toBeInTheDocument();
        });

        it("displays dash for period when variable rate", () => {
            const variableRate = {
                ...createMockRate({
                    id: "aib-variable",
                    name: "Variable Rate",
                    lenderId: "aib",
                    type: "variable",
                    rate: 4.15,
                }),
                monthlyPayment: 1520,
                combinedPerks: [],
                followOnLtv: 80,
            };

            render(
                <CompareRatesModal
                    {...defaultProps}
                    rates={[mockRate1, variableRate]}
                />,
            );

            // Variable rates show "—" for period
            const periodCells = screen.getAllByText("—");
            expect(periodCells.length).toBeGreaterThan(0);
        });
    });
});
