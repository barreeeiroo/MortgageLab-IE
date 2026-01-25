import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LTI_LIMITS } from "@/lib/constants/central-bank";
import { createLocalStorageMock } from "@/test/utils/mock-data";
import { HomeMoverCalculator } from "../HomeMoverCalculator";

// Mock localStorage
const localStorageMock = createLocalStorageMock();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock window.location
Object.defineProperty(window, "location", {
	value: { href: "", search: "" },
	writable: true,
});

// Helper to fill date of birth
async function fillDateOfBirth(
	user: ReturnType<typeof userEvent.setup>,
	date = "15061990",
) {
	const dobInput = screen.getByPlaceholderText("DD/MM/YYYY");
	await user.type(dobInput, date);
}

describe("HomeMoverCalculator", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
		window.location.search = "";
	});

	describe("form rendering", () => {
		it("renders calculator title", () => {
			render(<HomeMoverCalculator />);

			expect(screen.getByText("How Much Can I Borrow?")).toBeInTheDocument();
		});

		it("renders calculator description for home movers", () => {
			render(<HomeMoverCalculator />);

			expect(
				screen.getByText(/For homeowners selling their current property/),
			).toBeInTheDocument();
		});

		it("renders applicant inputs section", () => {
			render(<HomeMoverCalculator />);

			expect(screen.getByText("Sole Applicant")).toBeInTheDocument();
			expect(screen.getByText("Joint Applicants")).toBeInTheDocument();
		});

		it("renders current property value input", () => {
			render(<HomeMoverCalculator />);

			expect(
				screen.getByLabelText("Current Property Value"),
			).toBeInTheDocument();
		});

		it("renders outstanding mortgage input", () => {
			render(<HomeMoverCalculator />);

			expect(screen.getByLabelText("Outstanding Mortgage")).toBeInTheDocument();
		});

		it("renders additional savings input", () => {
			render(<HomeMoverCalculator />);

			expect(
				screen.getByLabelText("Additional Savings (Optional)"),
			).toBeInTheDocument();
		});

		it("renders BER rating selector", () => {
			render(<HomeMoverCalculator />);

			expect(screen.getByText("Expected BER Rating")).toBeInTheDocument();
		});

		it("renders calculate button", () => {
			render(<HomeMoverCalculator />);

			expect(
				screen.getByRole("button", { name: /calculate/i }),
			).toBeInTheDocument();
		});

		it("renders self-build checkbox", () => {
			render(<HomeMoverCalculator />);

			expect(
				screen.getByLabelText(
					/Self Build \(selling current home and building on land you own\)/,
				),
			).toBeInTheDocument();
		});
	});

	describe("equity display", () => {
		it("shows equity calculation when property value and mortgage entered", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			await user.type(
				screen.getByLabelText("Current Property Value"),
				"400000",
			);
			await user.type(screen.getByLabelText("Outstanding Mortgage"), "200000");

			await waitFor(() => {
				expect(screen.getByText(/Equity from sale:/)).toBeInTheDocument();
			});
		});

		it("does not show negative equity", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			await user.type(
				screen.getByLabelText("Current Property Value"),
				"200000",
			);
			await user.type(screen.getByLabelText("Outstanding Mortgage"), "250000");

			await waitFor(() => {
				expect(screen.queryByText(/Equity from sale:/)).not.toBeInTheDocument();
			});
		});
	});

	describe("total deposit display", () => {
		it("shows total available for deposit", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			await user.type(
				screen.getByLabelText("Current Property Value"),
				"400000",
			);
			await user.type(screen.getByLabelText("Outstanding Mortgage"), "200000");
			await user.type(
				screen.getByLabelText("Additional Savings (Optional)"),
				"50000",
			);

			await waitFor(() => {
				expect(
					screen.getByText(/Total available for deposit:/),
				).toBeInTheDocument();
				expect(screen.getByText("€250,000")).toBeInTheDocument();
			});
		});
	});

	describe("self-build mode", () => {
		it("shows site value input when self-build is checked", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			await user.click(
				screen.getByLabelText(
					/Self Build \(selling current home and building on land you own\)/,
				),
			);

			expect(screen.getByLabelText("Site Value")).toBeInTheDocument();
		});

		it("includes site value in total deposit calculation", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			await user.click(
				screen.getByLabelText(
					/Self Build \(selling current home and building on land you own\)/,
				),
			);

			await user.type(
				screen.getByLabelText("Current Property Value"),
				"400000",
			);
			await user.type(screen.getByLabelText("Outstanding Mortgage"), "200000");
			await user.type(screen.getByLabelText("Site Value"), "100000");
			await user.type(screen.getByLabelText("Additional Savings"), "50000");

			await waitFor(() => {
				// Equity 200k + Site 100k + Savings 50k = 350k
				expect(screen.getByText("€350,000")).toBeInTheDocument();
				expect(
					screen.getByText(/\(equity \+ site value \+ savings\)/),
				).toBeInTheDocument();
			});
		});
	});

	describe("form validation", () => {
		it("disables calculate button when form is incomplete", () => {
			render(<HomeMoverCalculator />);

			const button = screen.getByRole("button", { name: /calculate/i });
			expect(button).toBeDisabled();
		});

		it("enables calculate button when required fields are filled", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText("Current Property Value"),
				"400000",
			);
			await user.type(screen.getByLabelText("Outstanding Mortgage"), "200000");
			await fillDateOfBirth(user);

			const button = screen.getByRole("button", { name: /calculate/i });
			expect(button).not.toBeDisabled();
		});
	});

	describe("calculation and result", () => {
		it("opens result dialog when calculate is clicked", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText("Current Property Value"),
				"400000",
			);
			await user.type(screen.getByLabelText("Outstanding Mortgage"), "200000");
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(screen.getByRole("alertdialog")).toBeInTheDocument();
			});
		});

		it("shows adjusted title when deposit constrained", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			// High income but low equity
			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "150000");
			await user.type(
				screen.getByLabelText("Current Property Value"),
				"300000",
			);
			await user.type(screen.getByLabelText("Outstanding Mortgage"), "280000");
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(
					screen.getByText("Mortgage Summary (Adjusted for Deposit)"),
				).toBeInTheDocument();
			});
		});

		it("displays Compare Mortgage Rates button in result", async () => {
			const user = userEvent.setup();
			render(<HomeMoverCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText("Current Property Value"),
				"400000",
			);
			await user.type(screen.getByLabelText("Outstanding Mortgage"), "200000");
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /compare mortgage rates/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe("Central Bank rules display", () => {
		it("displays LTI limit information for movers", () => {
			render(<HomeMoverCalculator />);

			expect(
				screen.getByText(new RegExp(`${LTI_LIMITS.MOVER}× income`)),
			).toBeInTheDocument();
		});
	});
});
