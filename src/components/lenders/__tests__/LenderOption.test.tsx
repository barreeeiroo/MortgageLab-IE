import { render, screen } from "@testing-library/react";
import { LenderOption } from "../LenderOption";

describe("LenderOption", () => {
    describe("basic rendering", () => {
        it("renders lender name", () => {
            render(<LenderOption lenderId="aib" name="AIB" />);

            expect(screen.getByText("AIB")).toBeInTheDocument();
        });

        it("renders lender logo", () => {
            render(<LenderOption lenderId="aib" name="AIB" />);

            expect(
                screen.getByRole("img", { name: /aib logo/i }),
            ).toBeInTheDocument();
        });
    });

    describe("custom size", () => {
        it("passes size to LenderLogo", () => {
            const { container } = render(
                <LenderOption lenderId="aib" name="AIB" size={32} />,
            );

            const logoContainer = container.querySelector("[style*='width']");
            expect(logoContainer).toHaveStyle({
                width: "32px",
                height: "32px",
            });
        });

        it("uses default size of 20", () => {
            const { container } = render(
                <LenderOption lenderId="aib" name="AIB" />,
            );

            const logoContainer = container.querySelector("[style*='width']");
            expect(logoContainer).toHaveStyle({
                width: "20px",
                height: "20px",
            });
        });
    });

    describe("custom rate", () => {
        it("passes isCustom to LenderLogo", () => {
            const { container } = render(
                <LenderOption lenderId="aib" name="AIB" isCustom={true} />,
            );

            // Custom badge with pencil icon should be present
            const pencilBadge = container.querySelector(
                ".absolute.-top-1.-right-1",
            );
            expect(pencilBadge).toBeInTheDocument();
        });
    });

    describe("layout", () => {
        it("renders with flex layout", () => {
            const { container } = render(
                <LenderOption lenderId="aib" name="AIB" />,
            );

            const wrapper = container.firstChild as HTMLElement;
            expect(wrapper).toHaveClass("flex", "items-center", "gap-2");
        });
    });
});
