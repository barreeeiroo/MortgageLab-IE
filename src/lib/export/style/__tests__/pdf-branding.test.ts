import { describe, expect, it } from "vitest";
import { PDF_COLORS, PDF_FONTS, PDF_LAYOUT } from "../pdf-branding";

describe("PDF_COLORS", () => {
    describe("color format", () => {
        it("all colors are RGB tuples with 3 values", () => {
            for (const [_name, color] of Object.entries(PDF_COLORS)) {
                expect(color).toHaveLength(3);
                expect(color.every((v) => typeof v === "number")).toBe(true);
            }
        });

        it("all color values are in valid RGB range (0-255)", () => {
            for (const [_name, color] of Object.entries(PDF_COLORS)) {
                for (const value of color) {
                    expect(value).toBeGreaterThanOrEqual(0);
                    expect(value).toBeLessThanOrEqual(255);
                }
            }
        });
    });

    describe("primary colors", () => {
        it("has primary brand color (teal)", () => {
            expect(PDF_COLORS.primary).toBeDefined();
            expect(PDF_COLORS.primary).toEqual([13, 148, 136]);
        });
    });

    describe("text colors", () => {
        it("has text color (dark)", () => {
            expect(PDF_COLORS.text).toBeDefined();
            // Should be a dark color (low RGB values)
            const brightness =
                (PDF_COLORS.text[0] + PDF_COLORS.text[1] + PDF_COLORS.text[2]) /
                3;
            expect(brightness).toBeLessThan(100);
        });

        it("has muted text color (medium gray)", () => {
            expect(PDF_COLORS.textMuted).toBeDefined();
            // Should be between text and white
            const brightness =
                (PDF_COLORS.textMuted[0] +
                    PDF_COLORS.textMuted[1] +
                    PDF_COLORS.textMuted[2]) /
                3;
            expect(brightness).toBeGreaterThan(50);
            expect(brightness).toBeLessThan(200);
        });
    });

    describe("semantic colors", () => {
        it("has success color (green-ish)", () => {
            expect(PDF_COLORS.success).toBeDefined();
            // Green channel should be dominant
            expect(PDF_COLORS.success[1]).toBeGreaterThan(
                PDF_COLORS.success[0],
            );
            expect(PDF_COLORS.success[1]).toBeGreaterThan(
                PDF_COLORS.success[2],
            );
        });

        it("has warning color (yellow-ish)", () => {
            expect(PDF_COLORS.warning).toBeDefined();
            // Red and green should be high, blue low
            expect(PDF_COLORS.warning[0]).toBeGreaterThan(200);
            expect(PDF_COLORS.warning[1]).toBeGreaterThan(100);
            expect(PDF_COLORS.warning[2]).toBeLessThan(100);
        });

        it("has danger color (red-ish)", () => {
            expect(PDF_COLORS.danger).toBeDefined();
            // Red channel should be dominant
            expect(PDF_COLORS.danger[0]).toBeGreaterThan(PDF_COLORS.danger[1]);
            expect(PDF_COLORS.danger[0]).toBeGreaterThan(PDF_COLORS.danger[2]);
        });
    });

    describe("table colors", () => {
        it("has header background color (dark)", () => {
            expect(PDF_COLORS.headerBg).toBeDefined();
            const brightness =
                (PDF_COLORS.headerBg[0] +
                    PDF_COLORS.headerBg[1] +
                    PDF_COLORS.headerBg[2]) /
                3;
            expect(brightness).toBeLessThan(100);
        });

        it("has header text color (white)", () => {
            expect(PDF_COLORS.headerText).toBeDefined();
            expect(PDF_COLORS.headerText).toEqual([255, 255, 255]);
        });

        it("has alternate row background (light gray)", () => {
            expect(PDF_COLORS.altRowBg).toBeDefined();
            const brightness =
                (PDF_COLORS.altRowBg[0] +
                    PDF_COLORS.altRowBg[1] +
                    PDF_COLORS.altRowBg[2]) /
                3;
            expect(brightness).toBeGreaterThan(240);
        });

        it("has border color", () => {
            expect(PDF_COLORS.borderColor).toBeDefined();
        });
    });
});

describe("PDF_LAYOUT", () => {
    describe("margins", () => {
        it("has all margin values defined", () => {
            expect(PDF_LAYOUT.marginLeft).toBeDefined();
            expect(PDF_LAYOUT.marginRight).toBeDefined();
            expect(PDF_LAYOUT.marginTop).toBeDefined();
            expect(PDF_LAYOUT.marginBottom).toBeDefined();
        });

        it("margins are positive numbers", () => {
            expect(PDF_LAYOUT.marginLeft).toBeGreaterThan(0);
            expect(PDF_LAYOUT.marginRight).toBeGreaterThan(0);
            expect(PDF_LAYOUT.marginTop).toBeGreaterThan(0);
            expect(PDF_LAYOUT.marginBottom).toBeGreaterThan(0);
        });

        it("left and right margins are equal for symmetry", () => {
            expect(PDF_LAYOUT.marginLeft).toBe(PDF_LAYOUT.marginRight);
        });
    });

    describe("content width", () => {
        it("has content width defined", () => {
            expect(PDF_LAYOUT.contentWidth).toBeDefined();
        });

        it("content width equals A4 width minus margins", () => {
            // A4 is 210mm wide
            const expectedWidth =
                210 - PDF_LAYOUT.marginLeft - PDF_LAYOUT.marginRight;
            expect(PDF_LAYOUT.contentWidth).toBe(expectedWidth);
        });
    });

    describe("spacing", () => {
        it("has section gap defined", () => {
            expect(PDF_LAYOUT.sectionGap).toBeDefined();
            expect(PDF_LAYOUT.sectionGap).toBeGreaterThan(0);
        });

        it("has paragraph gap defined", () => {
            expect(PDF_LAYOUT.paragraphGap).toBeDefined();
            expect(PDF_LAYOUT.paragraphGap).toBeGreaterThan(0);
        });

        it("section gap is larger than paragraph gap", () => {
            expect(PDF_LAYOUT.sectionGap).toBeGreaterThan(
                PDF_LAYOUT.paragraphGap,
            );
        });
    });

    describe("logo dimensions", () => {
        it("has logo dimensions defined", () => {
            expect(PDF_LAYOUT.logoWidth).toBeDefined();
            expect(PDF_LAYOUT.logoHeight).toBeDefined();
        });

        it("logo dimensions are positive", () => {
            expect(PDF_LAYOUT.logoWidth).toBeGreaterThan(0);
            expect(PDF_LAYOUT.logoHeight).toBeGreaterThan(0);
        });

        it("logo width is greater than height (horizontal logo)", () => {
            expect(PDF_LAYOUT.logoWidth).toBeGreaterThan(PDF_LAYOUT.logoHeight);
        });
    });

    describe("divider", () => {
        it("has divider width defined", () => {
            expect(PDF_LAYOUT.dividerWidth).toBeDefined();
            expect(PDF_LAYOUT.dividerWidth).toBeGreaterThan(0);
        });
    });
});

describe("PDF_FONTS", () => {
    describe("font sizes", () => {
        it("has all font sizes defined", () => {
            expect(PDF_FONTS.title).toBeDefined();
            expect(PDF_FONTS.sectionHeader).toBeDefined();
            expect(PDF_FONTS.subtitle).toBeDefined();
            expect(PDF_FONTS.body).toBeDefined();
            expect(PDF_FONTS.small).toBeDefined();
            expect(PDF_FONTS.footer).toBeDefined();
        });

        it("all font sizes are positive numbers", () => {
            for (const [_name, size] of Object.entries(PDF_FONTS)) {
                expect(size).toBeGreaterThan(0);
            }
        });
    });

    describe("font hierarchy", () => {
        it("title is the largest font", () => {
            expect(PDF_FONTS.title).toBeGreaterThan(PDF_FONTS.sectionHeader);
            expect(PDF_FONTS.title).toBeGreaterThan(PDF_FONTS.subtitle);
            expect(PDF_FONTS.title).toBeGreaterThan(PDF_FONTS.body);
        });

        it("section header is larger than body", () => {
            expect(PDF_FONTS.sectionHeader).toBeGreaterThan(PDF_FONTS.body);
        });

        it("subtitle is larger than body", () => {
            expect(PDF_FONTS.subtitle).toBeGreaterThan(PDF_FONTS.body);
        });

        it("body is larger than small", () => {
            expect(PDF_FONTS.body).toBeGreaterThan(PDF_FONTS.small);
        });

        it("small is larger than footer", () => {
            expect(PDF_FONTS.small).toBeGreaterThan(PDF_FONTS.footer);
        });

        it("footer is the smallest font", () => {
            const sizes = Object.values(PDF_FONTS);
            const minSize = Math.min(...sizes);
            expect(PDF_FONTS.footer).toBe(minSize);
        });
    });

    describe("reasonable font sizes for PDF", () => {
        it("title font is readable but not too large", () => {
            expect(PDF_FONTS.title).toBeGreaterThanOrEqual(14);
            expect(PDF_FONTS.title).toBeLessThanOrEqual(24);
        });

        it("body font is standard readable size", () => {
            expect(PDF_FONTS.body).toBeGreaterThanOrEqual(9);
            expect(PDF_FONTS.body).toBeLessThanOrEqual(12);
        });

        it("footer font is still readable", () => {
            expect(PDF_FONTS.footer).toBeGreaterThanOrEqual(6);
            expect(PDF_FONTS.footer).toBeLessThanOrEqual(10);
        });
    });
});
