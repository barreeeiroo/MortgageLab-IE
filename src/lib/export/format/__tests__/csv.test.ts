import { describe, expect, it } from "vitest";
import { generateCSV } from "../csv";

describe("generateCSV", () => {
    describe("basic functionality", () => {
        it("generates CSV with headers and rows", () => {
            const data = {
                headers: ["Name", "Age", "City"],
                rows: [
                    ["Alice", 30, "Dublin"],
                    ["Bob", 25, "Cork"],
                ],
            };

            const csv = generateCSV(data);

            // Should start with UTF-8 BOM
            expect(csv.charCodeAt(0)).toBe(0xfeff);

            // Check content (skip BOM)
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines).toHaveLength(3);
            expect(lines[0]).toBe('"Name","Age","City"');
            expect(lines[1]).toBe('"Alice",30,"Dublin"');
            expect(lines[2]).toBe('"Bob",25,"Cork"');
        });

        it("handles empty rows array", () => {
            const data = {
                headers: ["Col1", "Col2"],
                rows: [],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1); // Skip BOM

            expect(content).toBe('"Col1","Col2"');
        });

        it("handles single row", () => {
            const data = {
                headers: ["Value"],
                rows: [[42]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines).toHaveLength(2);
            expect(lines[0]).toBe('"Value"');
            expect(lines[1]).toBe("42");
        });
    });

    describe("value escaping", () => {
        it("quotes string values", () => {
            const data = {
                headers: ["Text"],
                rows: [["Hello World"]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe('"Hello World"');
        });

        it("does not quote numeric values", () => {
            const data = {
                headers: ["Number"],
                rows: [[123.45]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe("123.45");
        });

        it("escapes internal quotes by doubling them", () => {
            const data = {
                headers: ["Quote"],
                rows: [['He said "Hello"']],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe('"He said ""Hello"""');
        });

        it("handles strings with commas", () => {
            const data = {
                headers: ["Address"],
                rows: [["123 Main St, Dublin, Ireland"]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            // Commas inside quotes are preserved
            expect(lines[1]).toBe('"123 Main St, Dublin, Ireland"');
        });

        it("handles strings with newlines", () => {
            const data = {
                headers: ["MultiLine"],
                rows: [["Line 1\nLine 2"]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);

            // The newline is inside quotes, so it's preserved
            expect(content).toContain('"Line 1\nLine 2"');
        });

        it("handles null values as empty strings", () => {
            const data = {
                headers: ["Value"],
                rows: [[null as unknown as string]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe("");
        });

        it("handles undefined values as empty strings", () => {
            const data = {
                headers: ["Value"],
                rows: [[undefined as unknown as string]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe("");
        });

        it("handles empty string values", () => {
            const data = {
                headers: ["Empty"],
                rows: [[""]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe('""');
        });
    });

    describe("mixed data types", () => {
        it("handles rows with mixed string and number values", () => {
            const data = {
                headers: ["Name", "Amount", "Rate"],
                rows: [
                    ["Mortgage", 300000, 3.5],
                    ["Insurance", 1200, 0],
                ],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe('"Mortgage",300000,3.5');
            expect(lines[2]).toBe('"Insurance",1200,0');
        });

        it("handles zero values correctly", () => {
            const data = {
                headers: ["Value"],
                rows: [[0]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe("0");
        });

        it("handles negative numbers", () => {
            const data = {
                headers: ["Balance"],
                rows: [[-500.25]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe("-500.25");
        });
    });

    describe("UTF-8 BOM", () => {
        it("includes UTF-8 BOM at the start for Excel compatibility", () => {
            const data = {
                headers: ["Test"],
                rows: [["Value"]],
            };

            const csv = generateCSV(data);

            // UTF-8 BOM is U+FEFF
            expect(csv.charCodeAt(0)).toBe(0xfeff);
        });

        it("BOM is followed by actual content", () => {
            const data = {
                headers: ["Col"],
                rows: [],
            };

            const csv = generateCSV(data);

            expect(csv.length).toBeGreaterThan(1);
            expect(csv.slice(1)).toBe('"Col"');
        });
    });

    describe("special characters", () => {
        it("handles euro symbol", () => {
            const data = {
                headers: ["Price"],
                rows: [["€1,234.56"]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe('"€1,234.56"');
        });

        it("handles accented characters", () => {
            const data = {
                headers: ["Name"],
                rows: [["Seán Ó'Brien"]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe('"Seán Ó\'Brien"');
        });

        it("handles percentage symbol", () => {
            const data = {
                headers: ["Rate"],
                rows: [["3.5%"]],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe('"3.5%"');
        });
    });

    describe("real-world export scenarios", () => {
        it("handles amortization schedule data", () => {
            const data = {
                headers: [
                    "Year",
                    "Opening Balance",
                    "Principal",
                    "Interest",
                    "Closing Balance",
                ],
                rows: [
                    [
                        1,
                        "€300,000.00",
                        "€8,500.00",
                        "€10,500.00",
                        "€291,500.00",
                    ],
                    [
                        2,
                        "€291,500.00",
                        "€8,800.00",
                        "€10,200.00",
                        "€282,700.00",
                    ],
                ],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines).toHaveLength(3);
            expect(lines[0]).toBe(
                '"Year","Opening Balance","Principal","Interest","Closing Balance"',
            );
            expect(lines[1]).toBe(
                '1,"€300,000.00","€8,500.00","€10,500.00","€291,500.00"',
            );
        });

        it("handles rate periods data", () => {
            const data = {
                headers: ["Period", "Lender", "Rate", "Type", "Duration"],
                rows: [
                    [1, "AIB", "3.50%", "Fixed", "3 years"],
                    [2, "AIB", "4.20%", "Variable", "Until end"],
                ],
            };

            const csv = generateCSV(data);
            const content = csv.slice(1);
            const lines = content.split("\n");

            expect(lines[1]).toBe('1,"AIB","3.50%","Fixed","3 years"');
            expect(lines[2]).toBe('2,"AIB","4.20%","Variable","Until end"');
        });
    });
});
