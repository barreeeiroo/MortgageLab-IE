import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { generateQRCodeWithLogo } from "@/lib/share/qrcode";
import { ShareButton } from "../ShareButton";

// Mock the QR code generator
vi.mock("@/lib/share/qrcode", () => ({
	generateQRCodeWithLogo: vi
		.fn()
		.mockResolvedValue("data:image/png;base64,mockQrCodeWithLogo"),
}));

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

	it("opens QR code dialog when clicked", async () => {
		const user = userEvent.setup();
		const onShare = vi.fn().mockResolvedValue("https://example.com/share");

		render(<ShareButton onShare={onShare} />);

		await user.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Share URL")).toBeInTheDocument();
		});
	});

	it("calls onShare when button is clicked", async () => {
		const user = userEvent.setup();
		const onShare = vi.fn().mockResolvedValue("https://example.com/share");

		render(<ShareButton onShare={onShare} />);

		await user.click(screen.getByRole("button"));

		expect(onShare).toHaveBeenCalled();
	});

	it("shows loading state while generating share URL", async () => {
		const user = userEvent.setup();
		let resolveShare: (value: string) => void;
		const onShare = vi.fn().mockImplementation(
			() =>
				new Promise<string>((resolve) => {
					resolveShare = resolve;
				}),
		);

		render(<ShareButton onShare={onShare} />);

		// Click the button but don't resolve yet
		const clickPromise = user.click(screen.getByRole("button"));

		// Should show loading spinner (button is disabled while loading)
		await waitFor(() => {
			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
		});

		// Resolve the promise
		resolveShare?.("https://example.com/share");
		await clickPromise;

		// Dialog should open and button should no longer be disabled
		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
	});

	describe("QR code fallback", () => {
		it("shows 'Copied!' feedback when QR generation fails", async () => {
			const user = userEvent.setup();
			const onShare = vi.fn().mockResolvedValue("https://example.com/share");
			vi.mocked(generateQRCodeWithLogo).mockRejectedValueOnce(
				new Error("QR generation failed"),
			);

			render(<ShareButton onShare={onShare} />);

			await user.click(screen.getByRole("button"));

			await waitFor(() => {
				expect(screen.getByText("Copied!")).toBeInTheDocument();
			});
		});

		it("reverts to original label after 2 seconds on fallback", async () => {
			const user = userEvent.setup();
			const onShare = vi.fn().mockResolvedValue("https://example.com/share");
			vi.mocked(generateQRCodeWithLogo).mockRejectedValueOnce(
				new Error("QR generation failed"),
			);

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
	});

	describe("responsive mode", () => {
		it("hides label on small screens when responsive is true", () => {
			render(<ShareButton onShare={vi.fn()} responsive />);

			const label = screen.getByText("Share");
			expect(label).toHaveClass("hidden", "sm:inline");
		});
	});

	describe("QR Code dialog", () => {
		it("displays the QR code image in the dialog", async () => {
			const user = userEvent.setup();
			const onShare = vi.fn().mockResolvedValue("https://example.com/share");

			render(<ShareButton onShare={onShare} />);

			await user.click(screen.getByRole("button"));

			await waitFor(() => {
				const qrImage = screen.getByAltText("QR Code");
				expect(qrImage).toBeInTheDocument();
				expect(qrImage).toHaveAttribute(
					"src",
					"data:image/png;base64,mockQrCodeWithLogo",
				);
			});
		});

		it("shows Copy URL to Clipboard button in dialog", async () => {
			const user = userEvent.setup();
			const onShare = vi.fn().mockResolvedValue("https://example.com/share");

			render(<ShareButton onShare={onShare} />);

			await user.click(screen.getByRole("button"));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /copy url to clipboard/i }),
				).toBeInTheDocument();
			});
		});

		it("copies link when Copy URL to Clipboard button is clicked", async () => {
			const user = userEvent.setup();
			const onShare = vi.fn().mockResolvedValue("https://example.com/share");

			render(<ShareButton onShare={onShare} />);

			await user.click(screen.getByRole("button"));

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});

			await user.click(
				screen.getByRole("button", { name: /copy url to clipboard/i }),
			);

			// Should show "Copied!" feedback on the dialog button
			await waitFor(() => {
				// Find the button inside the dialog (not the main trigger)
				const dialogButtons = screen
					.getByRole("dialog")
					.querySelectorAll("button");
				const copyButton = Array.from(dialogButtons).find((btn) =>
					btn.textContent?.includes("Copied!"),
				);
				expect(copyButton).toBeTruthy();
			});
		});

		it("closes QR code dialog when clicking close button", async () => {
			const user = userEvent.setup();
			const onShare = vi.fn().mockResolvedValue("https://example.com/share");

			render(<ShareButton onShare={onShare} />);

			await user.click(screen.getByRole("button"));

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /close/i }));

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
		});
	});
});
