import { describe, expect, it } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
    describe("basic class merging", () => {
        it("returns single class unchanged", () => {
            expect(cn("text-red-500")).toBe("text-red-500");
        });

        it("merges multiple classes", () => {
            expect(cn("text-red-500", "bg-blue-500")).toBe(
                "text-red-500 bg-blue-500",
            );
        });

        it("handles empty string", () => {
            expect(cn("")).toBe("");
        });

        it("handles no arguments", () => {
            expect(cn()).toBe("");
        });
    });

    describe("conditional classes", () => {
        it("includes truthy conditional classes", () => {
            expect(cn("base", true && "active")).toBe("base active");
        });

        it("excludes falsy conditional classes", () => {
            expect(cn("base", false && "active")).toBe("base");
        });

        it("handles undefined values", () => {
            expect(cn("base", undefined, "end")).toBe("base end");
        });

        it("handles null values", () => {
            expect(cn("base", null, "end")).toBe("base end");
        });
    });

    describe("tailwind class conflicts", () => {
        it("resolves conflicting padding classes (last wins)", () => {
            expect(cn("p-4", "p-2")).toBe("p-2");
        });

        it("resolves conflicting text color classes", () => {
            expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
        });

        it("resolves conflicting background classes", () => {
            expect(cn("bg-white", "bg-gray-100")).toBe("bg-gray-100");
        });

        it("resolves conflicting margin classes", () => {
            expect(cn("mt-4", "mt-8")).toBe("mt-8");
        });

        it("keeps non-conflicting classes", () => {
            expect(cn("p-4", "m-2", "text-red-500")).toBe(
                "p-4 m-2 text-red-500",
            );
        });
    });

    describe("object syntax", () => {
        it("includes classes with truthy values", () => {
            expect(cn({ "text-red-500": true, "bg-blue-500": true })).toBe(
                "text-red-500 bg-blue-500",
            );
        });

        it("excludes classes with falsy values", () => {
            expect(cn({ "text-red-500": true, "bg-blue-500": false })).toBe(
                "text-red-500",
            );
        });

        it("handles mixed string and object syntax", () => {
            expect(cn("base", { active: true, disabled: false })).toBe(
                "base active",
            );
        });
    });

    describe("array syntax", () => {
        it("flattens array of classes", () => {
            expect(cn(["text-red-500", "bg-blue-500"])).toBe(
                "text-red-500 bg-blue-500",
            );
        });

        it("handles nested arrays", () => {
            expect(cn(["base", ["nested", "classes"]])).toBe(
                "base nested classes",
            );
        });
    });

    describe("real-world component patterns", () => {
        it("merges base classes with variant classes", () => {
            const baseClasses = "px-4 py-2 rounded font-medium";
            const variantClasses = "bg-blue-500 text-white";
            expect(cn(baseClasses, variantClasses)).toBe(
                "px-4 py-2 rounded font-medium bg-blue-500 text-white",
            );
        });

        it("allows overriding base padding", () => {
            const baseClasses = "px-4 py-2";
            const override = "px-8";
            expect(cn(baseClasses, override)).toBe("py-2 px-8");
        });

        it("handles disabled state override", () => {
            const baseClasses = "bg-blue-500 hover:bg-blue-600 cursor-pointer";
            const disabledClasses = "bg-gray-300 cursor-not-allowed";
            const isDisabled = true;
            expect(cn(baseClasses, isDisabled && disabledClasses)).toBe(
                "hover:bg-blue-600 bg-gray-300 cursor-not-allowed",
            );
        });
    });
});
