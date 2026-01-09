import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareButton } from "../ShareButton";

describe("ShareButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with default label", () => {
		render(<ShareButton onShare={vi.fn()} />);

		expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
	});

	it("renders with custom label", () => {
		render(<ShareButton onShare={vi.fn()} label="Copy Link" />);

		expect(
			screen.getByRole("button", { name: /copy link/i }),
		).toBeInTheDocument();
	});

	it("calls onShare when clicked", async () => {
		const user = userEvent.setup();
		const onShare = vi.fn().mockResolvedValue("https://example.com/share");

		render(<ShareButton onShare={onShare} />);

		await user.click(screen.getByRole("button"));

		expect(onShare).toHaveBeenCalled();
	});

	it("shows 'Copied!' feedback after successful copy", async () => {
		const user = userEvent.setup();
		const onShare = vi.fn().mockResolvedValue("https://example.com/share");

		render(<ShareButton onShare={onShare} />);

		await user.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(screen.getByText("Copied!")).toBeInTheDocument();
		});
	});

	it("reverts to original label after 2 seconds", async () => {
		const user = userEvent.setup();
		const onShare = vi.fn().mockResolvedValue("https://example.com/share");

		render(<ShareButton onShare={onShare} />);

		await user.click(screen.getByRole("button"));

		// Verify it shows Copied first
		await waitFor(() => {
			expect(screen.getByText("Copied!")).toBeInTheDocument();
		});

		// Wait for the 2 second timeout to elapse
		await waitFor(
			() => {
				expect(screen.getByText("Share")).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	describe("responsive mode", () => {
		it("hides label on small screens when responsive is true", () => {
			render(<ShareButton onShare={vi.fn()} responsive />);

			const label = screen.getByText("Share");
			expect(label).toHaveClass("hidden", "sm:inline");
		});
	});
});
