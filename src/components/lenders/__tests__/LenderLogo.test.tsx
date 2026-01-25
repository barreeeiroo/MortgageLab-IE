import { render, screen } from "@testing-library/react";
import { LenderLogo } from "../LenderLogo";

describe("LenderLogo", () => {
	describe("known lender", () => {
		it("renders img element for known lender", () => {
			render(<LenderLogo lenderId="aib" />);

			const img = screen.getByRole("img", { name: /aib logo/i });
			expect(img).toBeInTheDocument();
		});

		it("sets correct size on container", () => {
			const { container } = render(<LenderLogo lenderId="aib" size={64} />);

			const wrapper = container.firstChild as HTMLElement;
			const logoContainer = wrapper.querySelector("[style*='width']");
			expect(logoContainer).toHaveStyle({ width: "64px", height: "64px" });
		});

		it("applies custom className", () => {
			const { container } = render(
				<LenderLogo lenderId="aib" className="custom-class" />,
			);

			expect(container.firstChild).toHaveClass("custom-class");
		});
	});

	describe("custom rate with known lender", () => {
		it("shows custom badge when isCustom is true", () => {
			const { container } = render(
				<LenderLogo lenderId="aib" isCustom={true} />,
			);

			// Custom badge shows pencil icon
			const img = screen.getByRole("img", { name: /aib logo/i });
			expect(img).toBeInTheDocument();

			// Custom badge pencil icon should be present
			const pencilBadge = container.querySelector(".absolute.-top-1.-right-1");
			expect(pencilBadge).toBeInTheDocument();
		});
	});

	describe("custom rate with unknown lender", () => {
		it("shows pencil icon for custom rate with unknown lender", () => {
			const { container } = render(
				<LenderLogo lenderId="unknown-lender" isCustom={true} />,
			);

			// Should render a pencil icon instead of img
			expect(screen.queryByRole("img")).not.toBeInTheDocument();

			// Should have pencil icon in a container
			const pencilContainer = container.querySelector(
				'[class*="bg-primary/10"]',
			);
			expect(pencilContainer).toBeInTheDocument();
		});
	});

	describe("unknown lender fallback", () => {
		it("shows pencil icon for unknown lender", () => {
			const { container } = render(<LenderLogo lenderId="unknown-lender" />);

			// Unknown lenders are treated as custom and show pencil icon
			const pencilContainer = container.querySelector(
				'[class*="bg-primary/10"]',
			);
			expect(pencilContainer).toBeInTheDocument();
		});

		it("does not render img for unknown lender", () => {
			render(<LenderLogo lenderId="unknown-lender" />);

			expect(screen.queryByRole("img")).not.toBeInTheDocument();
		});
	});

	describe("default size", () => {
		it("uses default size of 48 when not specified", () => {
			const { container } = render(<LenderLogo lenderId="aib" />);

			const wrapper = container.firstChild as HTMLElement;
			const logoContainer = wrapper.querySelector("[style*='width']");
			expect(logoContainer).toHaveStyle({ width: "48px", height: "48px" });
		});
	});
});
