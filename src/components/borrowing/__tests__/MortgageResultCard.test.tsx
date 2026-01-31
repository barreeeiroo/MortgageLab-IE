import { render, screen } from "@testing-library/react";
import { type MortgageResult, MortgageResultCard } from "../MortgageResultCard";

const defaultResult: MortgageResult = {
    propertyValue: 400000,
    mortgageAmount: 360000,
    mortgageTerm: 30,
    berRating: "B2",
    ltv: 90,
    lti: 4,
};

describe("MortgageResultCard", () => {
    describe("basic rendering", () => {
        it("displays property value", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(
                screen.getByText("Maximum Property Value"),
            ).toBeInTheDocument();
            expect(screen.getByText("€400,000")).toBeInTheDocument();
        });

        it("displays mortgage amount", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(screen.getByText("Mortgage Amount")).toBeInTheDocument();
            expect(screen.getByText("€360,000")).toBeInTheDocument();
        });

        it("displays mortgage term in years", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(screen.getByText("Mortgage Term")).toBeInTheDocument();
            expect(screen.getByText("30 years")).toBeInTheDocument();
        });

        it("displays BER rating", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(screen.getByText("BER Rating")).toBeInTheDocument();
            expect(screen.getByText("B2")).toBeInTheDocument();
        });
    });

    describe("LTV and LTI metrics", () => {
        it("displays LTV percentage", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(screen.getByText("Loan-to-Value (LTV)")).toBeInTheDocument();
            expect(screen.getByText("90.0%")).toBeInTheDocument();
        });

        it("displays LTI ratio", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(
                screen.getByText("Loan-to-Income (LTI)"),
            ).toBeInTheDocument();
            expect(screen.getByText("4.0×")).toBeInTheDocument();
        });
    });

    describe("cash required section", () => {
        it("displays deposit amount", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(screen.getByText("Deposit (10%)")).toBeInTheDocument();
            expect(screen.getByText("€40,000")).toBeInTheDocument();
        });

        it("displays stamp duty", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(screen.getByText("Stamp Duty")).toBeInTheDocument();
            // €400,000 property: 1% = €4,000 (stamp duty and legal fees both €4,000)
            expect(screen.getAllByText("€4,000")).toHaveLength(2);
        });

        it("displays legal fees estimate", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(screen.getByText("Legal Fees (est.)")).toBeInTheDocument();
        });

        it("displays total cash required", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                />,
            );

            expect(screen.getByText("Total Cash Required")).toBeInTheDocument();
        });
    });

    describe("constrained state", () => {
        it("applies constrained styling when isConstrained is true", () => {
            const { container } = render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                    isConstrained
                />,
            );

            const card = container.querySelector("[class*='amber']");
            expect(card).toBeInTheDocument();
        });

        it("applies normal styling when isConstrained is false", () => {
            const { container } = render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                    isConstrained={false}
                />,
            );

            const card = container.querySelector("[class*='primary']");
            expect(card).toBeInTheDocument();
        });
    });

    describe("VAT handling", () => {
        it("does not show VAT for existing properties", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                    propertyType="existing"
                />,
            );

            expect(screen.queryByText(/Property VAT/)).not.toBeInTheDocument();
        });

        it("shows VAT note when VAT is included in price", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                    propertyType="new-build"
                    priceIncludesVAT={true}
                />,
            );

            expect(
                screen.getByText(/VAT of .* is included in the property price/),
            ).toBeInTheDocument();
        });

        it("shows VAT as separate line item when not included in price", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                    propertyType="new-build"
                    priceIncludesVAT={false}
                />,
            );

            expect(
                screen.getByText(/Property VAT \(13\.5%\)/),
            ).toBeInTheDocument();
        });
    });

    describe("additional content", () => {
        it("renders additionalMetrics when provided", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                    additionalMetrics={
                        <div data-testid="custom-metric">Custom Metric</div>
                    }
                />,
            );

            expect(screen.getByTestId("custom-metric")).toBeInTheDocument();
        });

        it("renders additionalSections when provided", () => {
            render(
                <MortgageResultCard
                    result={defaultResult}
                    maxLtv={90}
                    maxLti={4}
                    additionalSections={
                        <div data-testid="custom-section">Custom Section</div>
                    }
                />,
            );

            expect(screen.getByTestId("custom-section")).toBeInTheDocument();
        });
    });

    describe("different LTV scenarios", () => {
        it("calculates correct deposit for 80% LTV", () => {
            const result: MortgageResult = {
                ...defaultResult,
                mortgageAmount: 320000,
                ltv: 80,
            };

            render(
                <MortgageResultCard result={result} maxLtv={90} maxLti={4} />,
            );

            expect(screen.getByText("Deposit (20%)")).toBeInTheDocument();
            expect(screen.getByText("€80,000")).toBeInTheDocument();
        });

        it("calculates correct deposit for 70% LTV", () => {
            const result: MortgageResult = {
                ...defaultResult,
                mortgageAmount: 280000,
                ltv: 70,
            };

            render(
                <MortgageResultCard result={result} maxLtv={90} maxLti={4} />,
            );

            expect(screen.getByText("Deposit (30%)")).toBeInTheDocument();
            expect(screen.getByText("€120,000")).toBeInTheDocument();
        });
    });
});
