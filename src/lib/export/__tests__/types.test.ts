import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile, generateExportFilename } from "../types";

describe("generateExportFilename", () => {
    beforeEach(() => {
        // Mock Date to ensure consistent timestamps in tests
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 0, 12, 14, 30));
    });

    it("generates correct filename format for rates page", () => {
        expect(generateExportFilename("rates", "csv")).toBe(
            "mortgagelab-rates-20260112-1430.csv",
        );
    });

    it("generates correct filename for different formats", () => {
        expect(generateExportFilename("rates", "xlsx")).toBe(
            "mortgagelab-rates-20260112-1430.xlsx",
        );
        expect(generateExportFilename("rates", "pdf")).toBe(
            "mortgagelab-rates-20260112-1430.pdf",
        );
        expect(generateExportFilename("rates", "png")).toBe(
            "mortgagelab-rates-20260112-1430.png",
        );
    });

    it("generates correct filename for different pages", () => {
        expect(generateExportFilename("simulation", "pdf")).toBe(
            "mortgagelab-simulation-20260112-1430.pdf",
        );
        expect(generateExportFilename("breakeven-rentvsbuy", "pdf")).toBe(
            "mortgagelab-breakeven-rentvsbuy-20260112-1430.pdf",
        );
        expect(generateExportFilename("breakeven-remortgage", "csv")).toBe(
            "mortgagelab-breakeven-remortgage-20260112-1430.csv",
        );
        expect(generateExportFilename("affordability-ftb", "xlsx")).toBe(
            "mortgagelab-affordability-ftb-20260112-1430.xlsx",
        );
        expect(generateExportFilename("affordability-mover", "pdf")).toBe(
            "mortgagelab-affordability-mover-20260112-1430.pdf",
        );
        expect(generateExportFilename("affordability-btl", "csv")).toBe(
            "mortgagelab-affordability-btl-20260112-1430.csv",
        );
    });

    it("pads single digit month, day, hour, minute with zeros", () => {
        vi.setSystemTime(new Date(2026, 0, 5, 9, 5)); // Jan 5, 09:05
        expect(generateExportFilename("rates", "csv")).toBe(
            "mortgagelab-rates-20260105-0905.csv",
        );
    });

    it("handles midnight correctly", () => {
        vi.setSystemTime(new Date(2026, 0, 1, 0, 0));
        expect(generateExportFilename("rates", "csv")).toBe(
            "mortgagelab-rates-20260101-0000.csv",
        );
    });

    it("handles end of year correctly", () => {
        vi.setSystemTime(new Date(2025, 11, 31, 23, 59));
        expect(generateExportFilename("rates", "csv")).toBe(
            "mortgagelab-rates-20251231-2359.csv",
        );
    });
});

describe("downloadFile", () => {
    let mockLink: {
        href: string;
        download: string;
        click: ReturnType<typeof vi.fn>;
    };
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;
    let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Mock link element
        mockLink = {
            href: "",
            download: "",
            click: vi.fn(),
        };

        vi.spyOn(document, "createElement").mockReturnValue(
            mockLink as unknown as HTMLAnchorElement,
        );
        appendChildSpy = vi
            .spyOn(document.body, "appendChild")
            .mockImplementation(() => mockLink as unknown as HTMLAnchorElement);
        removeChildSpy = vi
            .spyOn(document.body, "removeChild")
            .mockImplementation(() => mockLink as unknown as HTMLAnchorElement);

        // Mock URL APIs
        createObjectURLSpy = vi
            .spyOn(URL, "createObjectURL")
            .mockReturnValue("blob:test-url");
        revokeObjectURLSpy = vi
            .spyOn(URL, "revokeObjectURL")
            .mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("creates a download link and triggers click", () => {
        downloadFile("test content", "test.txt");

        expect(document.createElement).toHaveBeenCalledWith("a");
        expect(mockLink.click).toHaveBeenCalled();
    });

    it("sets correct href and download attributes", () => {
        downloadFile("test content", "test.txt");

        expect(mockLink.href).toBe("blob:test-url");
        expect(mockLink.download).toBe("test.txt");
    });

    it("appends and removes link from document body", () => {
        downloadFile("test content", "test.txt");

        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
    });

    it("creates and revokes object URL", () => {
        downloadFile("test content", "test.txt");

        expect(createObjectURLSpy).toHaveBeenCalled();
        expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test-url");
    });

    it("creates Blob from string with default mime type", () => {
        downloadFile("test content", "test.txt");

        expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    });

    it("creates Blob from string with custom mime type", () => {
        downloadFile("csv,data", "test.csv", "text/csv;charset=utf-8");

        expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    });

    it("uses existing Blob directly when passed", () => {
        const blob = new Blob(["existing blob"], { type: "application/json" });
        downloadFile(blob, "test.json");

        expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    });

    it("handles different filenames correctly", () => {
        downloadFile("data", "report-2026.xlsx");
        expect(mockLink.download).toBe("report-2026.xlsx");
    });
});
