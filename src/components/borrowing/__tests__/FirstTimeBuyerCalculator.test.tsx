import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LTI_LIMITS } from "@/lib/constants/central-bank";
import { createLocalStorageMock } from "@/test/utils/mock-data";
import { FirstTimeBuyerCalculator } from "../FirstTimeBuyerCalculator";

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

describe("FirstTimeBuyerCalculator", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
		window.location.search = "";
	});

	describe("form rendering", () => {
		it("renders calculator title", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(screen.getByText("How Much Can I Borrow?")).toBeInTheDocument();
		});

		it("renders calculator description", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(
				screen.getByText(/Enter your income and savings/),
			).toBeInTheDocument();
		});

		it("renders applicant inputs section", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(screen.getByText("Sole Applicant")).toBeInTheDocument();
			expect(screen.getByText("Joint Applicants")).toBeInTheDocument();
		});

		it("renders income input", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(screen.getByLabelText(/Gross Annual Salary/i)).toBeInTheDocument();
		});

		it("renders savings input", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(
				screen.getByLabelText(/Total Savings for Deposit/i),
			).toBeInTheDocument();
		});

		it("renders date of birth input", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(screen.getByPlaceholderText("DD/MM/YYYY")).toBeInTheDocument();
		});

		it("renders BER rating selector", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(screen.getByText("Expected BER Rating")).toBeInTheDocument();
		});

		it("renders property type selector", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(screen.getByText("Property Type")).toBeInTheDocument();
		});

		it("renders calculate button", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(
				screen.getByRole("button", { name: /calculate/i }),
			).toBeInTheDocument();
		});

		it("renders self-build checkbox", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(
				screen.getByLabelText(/Self Build \(building on land you own\)/),
			).toBeInTheDocument();
		});
	});

	describe("joint application", () => {
		it("shows second applicant fields when joint selected", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.click(screen.getByText("Joint Applicants"));

			expect(
				screen.getByLabelText(/Second Applicant's Gross Annual Salary/i),
			).toBeInTheDocument();
		});

		it("hides second applicant fields when sole selected", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			// Start with joint
			await user.click(screen.getByText("Joint Applicants"));
			expect(
				screen.getByLabelText(/Second Applicant's Gross Annual Salary/i),
			).toBeInTheDocument();

			// Switch back to sole
			await user.click(screen.getByText("Sole Applicant"));
			expect(
				screen.queryByLabelText(/Second Applicant's Gross Annual Salary/i),
			).not.toBeInTheDocument();
		});
	});

	describe("self-build mode", () => {
		it("shows site value input when self-build is checked", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.click(
				screen.getByLabelText(/Self Build \(building on land you own\)/),
			);

			expect(screen.getByLabelText("Site Value")).toBeInTheDocument();
		});

		it("changes savings label in self-build mode", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.click(
				screen.getByLabelText(/Self Build \(building on land you own\)/),
			);

			expect(screen.getByLabelText("Additional Savings")).toBeInTheDocument();
		});
	});

	describe("form validation", () => {
		it("disables calculate button when form is incomplete", () => {
			render(<FirstTimeBuyerCalculator />);

			const button = screen.getByRole("button", { name: /calculate/i });
			expect(button).toBeDisabled();
		});

		it("enables calculate button when required fields are filled", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText(/Total Savings for Deposit/i),
				"40000",
			);
			await fillDateOfBirth(user);

			const button = screen.getByRole("button", { name: /calculate/i });
			expect(button).not.toBeDisabled();
		});
	});

	describe("calculation and result", () => {
		it("opens result dialog when calculate is clicked", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText(/Total Savings for Deposit/i),
				"40000",
			);
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(screen.getByRole("alertdialog")).toBeInTheDocument();
			});
		});

		it("displays result dialog title", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText(/Total Savings for Deposit/i),
				"100000",
			);
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(screen.getByText("Your Mortgage Summary")).toBeInTheDocument();
			});
		});

		it("shows adjusted title when savings constrained", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			// Savings constrained scenario (low savings, high income)
			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "100000");
			await user.type(
				screen.getByLabelText(/Total Savings for Deposit/i),
				"20000",
			);
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(
					screen.getByText("Mortgage Summary (Adjusted for Savings)"),
				).toBeInTheDocument();
			});
		});

		it("displays Compare Mortgage Rates button in result", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText(/Total Savings for Deposit/i),
				"100000",
			);
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /compare mortgage rates/i }),
				).toBeInTheDocument();
			});
		});

		it("displays Export PDF button in result", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText(/Total Savings for Deposit/i),
				"100000",
			);
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /export pdf/i }),
				).toBeInTheDocument();
			});
		});

		it("displays Rent vs Buy calculator link in result", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText(/Total Savings for Deposit/i),
				"100000",
			);
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /rent vs buy calculator/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe("Central Bank rules display", () => {
		it("displays LTI limit information", () => {
			render(<FirstTimeBuyerCalculator />);

			expect(
				screen.getByText(new RegExp(`${LTI_LIMITS.FTB}× income`)),
			).toBeInTheDocument();
		});
	});

	describe("close dialog", () => {
		it("closes result dialog when Close button is clicked", async () => {
			const user = userEvent.setup();
			render(<FirstTimeBuyerCalculator />);

			await user.type(screen.getByLabelText(/Gross Annual Salary/i), "80000");
			await user.type(
				screen.getByLabelText(/Total Savings for Deposit/i),
				"100000",
			);
			await fillDateOfBirth(user);

			await user.click(screen.getByRole("button", { name: /calculate/i }));

			await waitFor(() => {
				expect(screen.getByRole("alertdialog")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /close/i }));

			await waitFor(() => {
				expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
			});
		});
	});
});
