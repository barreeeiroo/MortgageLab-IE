import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RentVsBuyResult } from "@/lib/mortgage/breakeven";
import { RentVsBuyResultCard } from "../RentVsBuyResultCard";

// Mock Recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="chart-container">{children}</div>
    ),
    LineChart: () => <div data-testid="line-chart" />,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    ReferenceLine: () => null,
    Legend: () => null,
    AreaChart: () => <div data-testid="area-chart" />,
    Area: () => null,
    CartesianGrid: () => null,
    ComposedChart: () => <div data-testid="composed-chart" />,
    Bar: () => null,
}));

const createMockResult = (
    overrides: Partial<RentVsBuyResult> = {},
): RentVsBuyResult => ({
    deposit: 40000,
    mortgageAmount: 360000,
    monthlyMortgagePayment: 1650,
    stampDuty: 4000,
    legalFees: 4000,
    purchaseCosts: 8000,
    upfrontCosts: 48000,
    breakevenMonth: 84, // 7 years
    breakevenDetails: {
        cumulativeRent: 126000,
        cumulativeOwnership: 150000,
        equity: 50000,
        netOwnershipCost: 100000,
    },
    breakEvenOnSaleMonth: 48, // 4 years
    breakEvenOnSaleDetails: {
        homeValue: 440000,
        saleCosts: 13200,
        mortgageBalance: 330000,
        saleProceeds: 96800,
        upfrontCosts: 48000,
    },
    equityRecoveryMonth: 60, // 5 years
    equityRecoveryDetails: {
        homeValue: 450000,
        mortgageBalance: 320000,
        equity: 130000,
        upfrontCosts: 48000,
    },
    yearlyBreakdown: [
        {
            year: 1,
            cumulativeRent: 18000,
            cumulativeOwnership: 25000,
            equity: 15000,
            netOwnershipCost: 20000,
            homeValue: 410000,
            mortgageBalance: 355000,
        },
        {
            year: 5,
            cumulativeRent: 95000,
            cumulativeOwnership: 125000,
            equity: 75000,
            netOwnershipCost: 80000,
            homeValue: 450000,
            mortgageBalance: 320000,
        },
        {
            year: 10,
            cumulativeRent: 215000,
            cumulativeOwnership: 250000,
            equity: 170000,
            netOwnershipCost: 150000,
            homeValue: 520000,
            mortgageBalance: 260000,
        },
    ],
    monthlyBreakdown: [],
    ...overrides,
});

describe("RentVsBuyResultCard", () => {
    const defaultProps = {
        result: createMockResult(),
        monthlyRent: 1500,
        saleCostRate: 3,
    };

    describe("breakeven display", () => {
        it("displays Net Worth Breakeven section", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getByText("Net Worth Breakeven")).toBeInTheDocument();
            expect(
                screen.getByText(
                    /when buying is financially better than renting/i,
                ),
            ).toBeInTheDocument();
        });

        it("displays formatted breakeven period", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            // 84 months = 7 years
            expect(screen.getByText("7 years")).toBeInTheDocument();
        });

        it("displays Break-even on Sale section", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getByText("Break-even on Sale")).toBeInTheDocument();
            expect(
                screen.getByText(
                    /when you can sell and recover your upfront costs/i,
                ),
            ).toBeInTheDocument();
            // 48 months = 4 years
            expect(screen.getByText("4 years")).toBeInTheDocument();
        });

        it("displays Equity Recovery section", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getByText("Equity Recovery")).toBeInTheDocument();
            expect(
                screen.getByText(/when your equity exceeds upfront costs/i),
            ).toBeInTheDocument();
            // 60 months = 5 years
            expect(screen.getByText("5 years")).toBeInTheDocument();
        });

        it("displays 'Never' when no breakeven is reached", () => {
            const noBreakeven = createMockResult({
                breakevenMonth: null,
                breakevenDetails: undefined,
            });
            render(
                <RentVsBuyResultCard {...defaultProps} result={noBreakeven} />,
            );

            expect(screen.getByText("Never")).toBeInTheDocument();
        });
    });

    describe("monthly comparison section", () => {
        it("displays current monthly rent", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(
                screen.getByText("Current Monthly Rent"),
            ).toBeInTheDocument();
            expect(screen.getByText("€1,500.00")).toBeInTheDocument();
        });

        it("displays monthly mortgage payment", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(
                screen.getByText("Monthly Mortgage Payment"),
            ).toBeInTheDocument();
            expect(screen.getByText("€1,650.00")).toBeInTheDocument();
        });
    });

    describe("upfront costs section", () => {
        it("displays deposit amount", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getByText("Deposit")).toBeInTheDocument();
            expect(screen.getByText("€40,000")).toBeInTheDocument();
        });

        it("displays mortgage amount under deposit", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getByText(/Mortgage: €360,000/)).toBeInTheDocument();
        });

        it("displays purchase costs", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getByText("Purchase Costs")).toBeInTheDocument();
            expect(screen.getByText("€8,000")).toBeInTheDocument();
        });

        it("displays stamp duty and legal fees breakdown", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(
                screen.getByText(/Stamp Duty: €4,000 \+ Legal: €4,000/),
            ).toBeInTheDocument();
        });

        it("displays total cash required", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getByText("Total Cash Required")).toBeInTheDocument();
            expect(screen.getByText("€48,000")).toBeInTheDocument();
        });
    });

    describe("year snapshots", () => {
        it("displays Year 1, Year 5, and Year 10 snapshots", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getByText("Year 1")).toBeInTheDocument();
            expect(screen.getByText("Year 5")).toBeInTheDocument();
            expect(screen.getByText("Year 10")).toBeInTheDocument();
        });

        it("displays rent paid for year snapshots", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getAllByText("Rent Paid:")).toHaveLength(3);
        });

        it("displays equity built for year snapshots", () => {
            render(<RentVsBuyResultCard {...defaultProps} />);

            expect(screen.getAllByText("Equity Built:")).toHaveLength(3);
        });
    });

    describe("expandable details", () => {
        it("shows detailed breakdown when clicked", async () => {
            const user = userEvent.setup();
            render(<RentVsBuyResultCard {...defaultProps} />);

            // Find and click the details summary for net worth breakeven
            const summaries = screen.getAllByRole("group");
            expect(summaries.length).toBeGreaterThan(0);

            // The details should contain explanation text
            await user.click(screen.getByText(/why 7 years\?/i));

            // After expansion, should see the breakdown explanation
            expect(screen.getByText(/in rent/i)).toBeInTheDocument();
        });
    });

    describe("card styling", () => {
        it("applies primary styling when breakeven is reached", () => {
            const { container } = render(
                <RentVsBuyResultCard {...defaultProps} />,
            );

            const card = container.querySelector("[class*='bg-primary']");
            expect(card).toBeInTheDocument();
        });

        it("applies amber styling when no breakeven", () => {
            const noBreakeven = createMockResult({ breakevenMonth: null });
            const { container } = render(
                <RentVsBuyResultCard {...defaultProps} result={noBreakeven} />,
            );

            const card = container.querySelector("[class*='bg-amber']");
            expect(card).toBeInTheDocument();
        });
    });
});
