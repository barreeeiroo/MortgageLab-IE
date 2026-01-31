import { describe, expect, it } from "vitest";
import { type AprcConfig, calculateAprc, inferFollowOnRate } from "../aprc";

// Standard test configuration matching typical Irish lender assumptions
const standardConfig: AprcConfig = {
    loanAmount: 100000, // €100,000
    termMonths: 240, // 20 years
    valuationFee: 150, // €150 valuation fee
    securityReleaseFee: 50, // €50 at end
};

// Larger loan configuration
const largeConfig: AprcConfig = {
    loanAmount: 250000, // €250,000
    termMonths: 360, // 30 years
    valuationFee: 185, // €185 valuation fee
    securityReleaseFee: 75, // €75 at end
};

describe("calculateAprc", () => {
    describe("fixed rate for entire term", () => {
        it("calculates APRC for pure fixed rate", () => {
            const aprc = calculateAprc(
                3.5, // Fixed rate
                240, // Fixed for entire term
                3.5, // Same as fixed (no follow-on)
                standardConfig,
            );

            // APRC should be slightly higher than nominal rate due to fees
            expect(aprc).toBeGreaterThan(3.5);
            expect(aprc).toBeLessThan(4.0);
        });

        it("calculates APRC for pure variable rate", () => {
            const aprc = calculateAprc(
                4.5, // Variable rate
                240, // Entire term
                4.5, // Same rate
                standardConfig,
            );

            expect(aprc).toBeGreaterThan(4.5);
            expect(aprc).toBeLessThan(5.0);
        });
    });

    describe("fixed rate followed by variable", () => {
        it("calculates APRC for 3-year fixed + variable", () => {
            const aprc = calculateAprc(
                3.5, // 3-year fixed
                36, // 3 years = 36 months
                4.5, // Revert to 4.5% variable
                standardConfig,
            );

            // APRC should be between fixed and variable rates
            expect(aprc).toBeGreaterThan(3.5);
            expect(aprc).toBeLessThan(4.5);
        });

        it("calculates APRC for 5-year fixed + variable", () => {
            const aprc = calculateAprc(
                3.0, // 5-year fixed
                60, // 5 years = 60 months
                4.8, // Higher variable
                standardConfig,
            );

            expect(aprc).toBeGreaterThan(3.0);
            expect(aprc).toBeLessThan(4.8);
        });

        it("higher follow-on rate increases APRC", () => {
            const aprcLowFollowOn = calculateAprc(3.5, 36, 4.0, standardConfig);
            const aprcHighFollowOn = calculateAprc(
                3.5,
                36,
                5.0,
                standardConfig,
            );

            expect(aprcHighFollowOn).toBeGreaterThan(aprcLowFollowOn);
        });

        it("longer fixed period reduces APRC impact of high follow-on", () => {
            const aprc3yr = calculateAprc(3.5, 36, 5.5, standardConfig);
            const aprc5yr = calculateAprc(3.5, 60, 5.5, standardConfig);

            // 5-year fixed gives more time at lower rate
            expect(aprc5yr).toBeLessThan(aprc3yr);
        });
    });

    describe("fee impact", () => {
        it("higher fees increase APRC", () => {
            const lowFeeConfig: AprcConfig = {
                ...standardConfig,
                valuationFee: 100,
                securityReleaseFee: 25,
            };

            const highFeeConfig: AprcConfig = {
                ...standardConfig,
                valuationFee: 300,
                securityReleaseFee: 100,
            };

            const aprcLowFee = calculateAprc(3.5, 36, 4.5, lowFeeConfig);
            const aprcHighFee = calculateAprc(3.5, 36, 4.5, highFeeConfig);

            expect(aprcHighFee).toBeGreaterThan(aprcLowFee);
        });

        it("zero fees results in APRC closer to nominal rate", () => {
            const noFeeConfig: AprcConfig = {
                ...standardConfig,
                valuationFee: 0,
                securityReleaseFee: 0,
            };

            const aprc = calculateAprc(4.0, 240, 4.0, noFeeConfig);

            // With no fees, APRC should be very close to nominal rate
            // (slight difference due to compounding)
            expect(Math.abs(aprc - 4.0)).toBeLessThan(0.1);
        });
    });

    describe("loan amount impact", () => {
        it("larger loan reduces relative fee impact", () => {
            const smallLoanConfig: AprcConfig = {
                ...standardConfig,
                loanAmount: 50000, // €50k
            };

            const largeLoanConfig: AprcConfig = {
                ...standardConfig,
                loanAmount: 500000, // €500k
            };

            const aprcSmall = calculateAprc(3.5, 36, 4.5, smallLoanConfig);
            const aprcLarge = calculateAprc(3.5, 36, 4.5, largeLoanConfig);

            // Fees are fixed, so they have less impact on larger loans
            expect(aprcLarge).toBeLessThan(aprcSmall);
        });
    });

    describe("term impact", () => {
        it("longer term has higher APRC when variable rate exceeds fixed", () => {
            const shortTermConfig: AprcConfig = {
                ...standardConfig,
                termMonths: 120, // 10 years
            };

            const longTermConfig: AprcConfig = {
                ...standardConfig,
                termMonths: 360, // 30 years
            };

            const aprcShort = calculateAprc(3.5, 36, 4.5, shortTermConfig);
            const aprcLong = calculateAprc(3.5, 36, 4.5, longTermConfig);

            // Longer term means more time at higher variable rate (4.5% vs 3.5%)
            // This outweighs the fee spread effect
            expect(aprcLong).toBeGreaterThan(aprcShort);
        });
    });

    describe("edge cases", () => {
        it("handles very low interest rates", () => {
            const aprc = calculateAprc(0.5, 36, 1.0, standardConfig);

            expect(aprc).toBeGreaterThan(0.5);
            expect(aprc).toBeLessThan(2.0);
        });

        it("handles very high interest rates", () => {
            const aprc = calculateAprc(8.0, 36, 10.0, standardConfig);

            expect(aprc).toBeGreaterThan(8.0);
            expect(aprc).toBeLessThan(11.0);
        });

        it("handles short fixed period", () => {
            const aprc = calculateAprc(2.5, 12, 4.5, standardConfig); // 1-year fixed

            expect(aprc).toBeGreaterThan(2.5);
            expect(aprc).toBeLessThan(4.5);
        });

        it("handles fixed period equal to term", () => {
            const aprc = calculateAprc(3.5, 240, 5.0, standardConfig);

            // Follow-on rate should not matter since fixed covers entire term
            const aprcWithDifferentFollowOn = calculateAprc(
                3.5,
                240,
                7.0,
                standardConfig,
            );

            expect(aprc).toBe(aprcWithDifferentFollowOn);
        });
    });

    describe("realistic Irish mortgage scenarios", () => {
        it("calculates realistic APRC for AIB-style mortgage", () => {
            // AIB typical: €250k, 30yr, 3yr fixed at 3.45%, variable ~4.5%
            const aprc = calculateAprc(3.45, 36, 4.5, largeConfig);

            expect(aprc).toBeGreaterThan(3.5);
            expect(aprc).toBeLessThan(4.5);
        });

        it("calculates realistic APRC for BOI-style mortgage", () => {
            // BOI typical: €250k, 30yr, 5yr fixed at 3.25%, variable ~4.8%
            const aprc = calculateAprc(3.25, 60, 4.8, largeConfig);

            expect(aprc).toBeGreaterThan(3.3);
            expect(aprc).toBeLessThan(4.8);
        });
    });

    describe("numerical precision", () => {
        it("returns APRC rounded to 2 decimal places", () => {
            const aprc = calculateAprc(3.45, 36, 4.55, standardConfig);

            // Should be exactly 2 decimal places
            const decimalPlaces = (aprc.toString().split(".")[1] || "").length;
            expect(decimalPlaces).toBeLessThanOrEqual(2);
        });

        it("produces consistent results across multiple calls", () => {
            const results = Array.from({ length: 10 }, () =>
                calculateAprc(3.5, 36, 4.5, standardConfig),
            );

            // All results should be identical
            expect(new Set(results).size).toBe(1);
        });
    });
});

describe("inferFollowOnRate", () => {
    describe("basic inference", () => {
        it("infers follow-on rate from observed APRC", () => {
            // First calculate an APRC with known parameters
            const knownFollowOn = 4.5;
            const observedAprc = calculateAprc(
                3.5,
                36,
                knownFollowOn,
                standardConfig,
            );

            // Then try to infer the follow-on rate
            const inferredRate = inferFollowOnRate(
                3.5,
                36,
                observedAprc,
                standardConfig,
            );

            // Should be very close to original follow-on rate
            expect(inferredRate).toBeCloseTo(knownFollowOn, 1);
        });

        it("infers different follow-on rates correctly", () => {
            const testRates = [3.5, 4.0, 4.5, 5.0, 5.5];

            for (const rate of testRates) {
                const observedAprc = calculateAprc(
                    3.5,
                    36,
                    rate,
                    standardConfig,
                );
                const inferredRate = inferFollowOnRate(
                    3.5,
                    36,
                    observedAprc,
                    standardConfig,
                );

                expect(inferredRate).toBeCloseTo(rate, 1);
            }
        });
    });

    describe("different configurations", () => {
        it("works with larger loan amounts", () => {
            const knownFollowOn = 4.8;
            const observedAprc = calculateAprc(
                3.25,
                60,
                knownFollowOn,
                largeConfig,
            );
            const inferredRate = inferFollowOnRate(
                3.25,
                60,
                observedAprc,
                largeConfig,
            );

            expect(inferredRate).toBeCloseTo(knownFollowOn, 1);
        });

        it("works with different fixed periods", () => {
            // 1-year fixed
            let observedAprc = calculateAprc(3.0, 12, 4.5, standardConfig);
            let inferredRate = inferFollowOnRate(
                3.0,
                12,
                observedAprc,
                standardConfig,
            );
            expect(inferredRate).toBeCloseTo(4.5, 1);

            // 5-year fixed
            observedAprc = calculateAprc(3.5, 60, 5.0, standardConfig);
            inferredRate = inferFollowOnRate(
                3.5,
                60,
                observedAprc,
                standardConfig,
            );
            expect(inferredRate).toBeCloseTo(5.0, 1);
        });
    });

    describe("edge cases", () => {
        it("handles low APRC values", () => {
            const observedAprc = calculateAprc(2.0, 36, 2.5, standardConfig);
            const inferredRate = inferFollowOnRate(
                2.0,
                36,
                observedAprc,
                standardConfig,
            );

            expect(inferredRate).toBeCloseTo(2.5, 1);
        });

        it("handles high APRC values", () => {
            const observedAprc = calculateAprc(6.0, 36, 8.0, standardConfig);
            const inferredRate = inferFollowOnRate(
                6.0,
                36,
                observedAprc,
                standardConfig,
            );

            expect(inferredRate).toBeCloseTo(8.0, 1);
        });
    });

    describe("numerical precision", () => {
        it("returns rate rounded to 2 decimal places", () => {
            const observedAprc = calculateAprc(3.5, 36, 4.55, standardConfig);
            const inferredRate = inferFollowOnRate(
                3.5,
                36,
                observedAprc,
                standardConfig,
            );

            const decimalPlaces = (inferredRate.toString().split(".")[1] || "")
                .length;
            expect(decimalPlaces).toBeLessThanOrEqual(2);
        });
    });

    describe("real-world use case", () => {
        it("can infer SVR from published APRC", () => {
            // Scenario: Lender publishes APRC of 4.2% for a 3-year fixed at 3.5%
            // What is their implied SVR?
            const publishedAprc = 4.2;
            const fixedRate = 3.5;
            const fixedTerm = 36;

            const inferredSvr = inferFollowOnRate(
                fixedRate,
                fixedTerm,
                publishedAprc,
                standardConfig,
            );

            // The inferred SVR should be reasonable
            expect(inferredSvr).toBeGreaterThan(fixedRate);
            expect(inferredSvr).toBeLessThan(10);

            // Verify by calculating APRC with inferred rate
            const verifyAprc = calculateAprc(
                fixedRate,
                fixedTerm,
                inferredSvr,
                standardConfig,
            );
            expect(verifyAprc).toBeCloseTo(publishedAprc, 0);
        });
    });
});
