import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LTV_LIMITS } from "@/lib/constants/central-bank";
import { createLocalStorageMock } from "@/test/utils/mock-data";
import { BuyToLetCalculator } from "../BuyToLetCalculator";

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

describe("BuyToLetCalculator", () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        window.location.search = "";
    });

    describe("form rendering", () => {
        it("renders calculator title", () => {
            render(<BuyToLetCalculator />);

            expect(
                screen.getByText("How Much Can I Borrow?"),
            ).toBeInTheDocument();
        });

        it("renders calculator description for BTL", () => {
            render(<BuyToLetCalculator />);

            expect(
                screen.getByText(/For investment or second properties/),
            ).toBeInTheDocument();
        });

        it("renders applicant inputs section", () => {
            render(<BuyToLetCalculator />);

            expect(screen.getByText("Sole Applicant")).toBeInTheDocument();
            expect(screen.getByText("Joint Applicants")).toBeInTheDocument();
        });

        it("renders available deposit input", () => {
            render(<BuyToLetCalculator />);

            expect(
                screen.getByLabelText("Available Deposit"),
            ).toBeInTheDocument();
        });

        it("renders expected monthly rent input", () => {
            render(<BuyToLetCalculator />);

            expect(
                screen.getByLabelText("Expected Monthly Rent"),
            ).toBeInTheDocument();
        });

        it("renders BER rating selector", () => {
            render(<BuyToLetCalculator />);

            expect(screen.getByText("Expected BER Rating")).toBeInTheDocument();
        });

        it("renders calculate button", () => {
            render(<BuyToLetCalculator />);

            expect(
                screen.getByRole("button", { name: /calculate/i }),
            ).toBeInTheDocument();
        });

        it("does not render self-build checkbox (BTL specific)", () => {
            render(<BuyToLetCalculator />);

            expect(
                screen.queryByLabelText(/Self Build/),
            ).not.toBeInTheDocument();
        });
    });

    describe("deposit requirements", () => {
        it("displays 30% deposit requirement note", () => {
            render(<BuyToLetCalculator />);

            expect(
                screen.getByText(/minimum 30% deposit for buy-to-let/),
            ).toBeInTheDocument();
        });
    });

    describe("rental income tooltip", () => {
        it("renders info tooltip for expected rent", () => {
            render(<BuyToLetCalculator />);

            // Info icon should be present next to Expected Monthly Rent label
            const infoIcons = document.querySelectorAll("svg.lucide-info");
            expect(infoIcons.length).toBeGreaterThan(0);
        });
    });

    describe("form validation", () => {
        it("disables calculate button when form is incomplete", () => {
            render(<BuyToLetCalculator />);

            const button = screen.getByRole("button", { name: /calculate/i });
            expect(button).toBeDisabled();
        });

        it("requires deposit to be entered", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            // Fill everything except deposit
            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "80000",
            );
            await user.type(
                screen.getByLabelText("Expected Monthly Rent"),
                "1500",
            );
            await fillDateOfBirth(user);

            const button = screen.getByRole("button", { name: /calculate/i });
            expect(button).toBeDisabled();
        });

        it("requires expected rent to be entered", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            // Fill everything except rent
            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "80000",
            );
            await user.type(
                screen.getByLabelText("Available Deposit"),
                "100000",
            );
            await fillDateOfBirth(user);

            const button = screen.getByRole("button", { name: /calculate/i });
            expect(button).toBeDisabled();
        });

        it("enables calculate button when all required fields are filled", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "80000",
            );
            await user.type(
                screen.getByLabelText("Available Deposit"),
                "100000",
            );
            await user.type(
                screen.getByLabelText("Expected Monthly Rent"),
                "1500",
            );
            await fillDateOfBirth(user);

            const button = screen.getByRole("button", { name: /calculate/i });
            expect(button).not.toBeDisabled();
        });
    });

    describe("calculation and result", () => {
        it("opens result dialog when calculate is clicked", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "80000",
            );
            await user.type(
                screen.getByLabelText("Available Deposit"),
                "100000",
            );
            await user.type(
                screen.getByLabelText("Expected Monthly Rent"),
                "1500",
            );
            await fillDateOfBirth(user);

            await user.click(
                screen.getByRole("button", { name: /calculate/i }),
            );

            await waitFor(() => {
                expect(screen.getByRole("alertdialog")).toBeInTheDocument();
            });
        });

        it("shows rental constrained title when limited by rental income", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            // High deposit, high income, but low rent
            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "200000",
            );
            await user.type(
                screen.getByLabelText("Available Deposit"),
                "200000",
            );
            await user.type(
                screen.getByLabelText("Expected Monthly Rent"),
                "500",
            );
            await fillDateOfBirth(user);

            await user.click(
                screen.getByRole("button", { name: /calculate/i }),
            );

            await waitFor(() => {
                expect(
                    screen.getByText(
                        "Mortgage Summary (Limited by Rental Income)",
                    ),
                ).toBeInTheDocument();
            });
        });

        it("displays rental analysis section in result", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "80000",
            );
            await user.type(
                screen.getByLabelText("Available Deposit"),
                "100000",
            );
            await user.type(
                screen.getByLabelText("Expected Monthly Rent"),
                "1500",
            );
            await fillDateOfBirth(user);

            await user.click(
                screen.getByRole("button", { name: /calculate/i }),
            );

            await waitFor(() => {
                expect(screen.getByText("Rental Analysis")).toBeInTheDocument();
                expect(
                    screen.getByText("Est. Mortgage Payment"),
                ).toBeInTheDocument();
                expect(
                    screen.getByText("Net Monthly (before tax)"),
                ).toBeInTheDocument();
            });
        });

        it("displays rental coverage in result", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "80000",
            );
            await user.type(
                screen.getByLabelText("Available Deposit"),
                "100000",
            );
            await user.type(
                screen.getByLabelText("Expected Monthly Rent"),
                "1500",
            );
            await fillDateOfBirth(user);

            await user.click(
                screen.getByRole("button", { name: /calculate/i }),
            );

            await waitFor(() => {
                expect(screen.getByText("Rental Coverage")).toBeInTheDocument();
            });
        });

        it("displays Compare Mortgage Rates button in result", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "80000",
            );
            await user.type(
                screen.getByLabelText("Available Deposit"),
                "100000",
            );
            await user.type(
                screen.getByLabelText("Expected Monthly Rent"),
                "1500",
            );
            await fillDateOfBirth(user);

            await user.click(
                screen.getByRole("button", { name: /calculate/i }),
            );

            await waitFor(() => {
                expect(
                    screen.getByRole("button", {
                        name: /compare mortgage rates/i,
                    }),
                ).toBeInTheDocument();
            });
        });
    });

    describe("LTV limits", () => {
        it("uses 70% max LTV for BTL", () => {
            // 30% deposit = 70% LTV
            expect(LTV_LIMITS.BTL).toBe(70);
        });
    });

    describe("stress test information", () => {
        it("displays stress test rate information in result", async () => {
            const user = userEvent.setup();
            render(<BuyToLetCalculator />);

            await user.type(
                screen.getByLabelText(/Gross Annual Salary/i),
                "80000",
            );
            await user.type(
                screen.getByLabelText("Available Deposit"),
                "100000",
            );
            await user.type(
                screen.getByLabelText("Expected Monthly Rent"),
                "1500",
            );
            await fillDateOfBirth(user);

            await user.click(
                screen.getByRole("button", { name: /calculate/i }),
            );

            await waitFor(() => {
                // Should mention rental coverage requirement and stress-tested rate
                expect(
                    screen.getByText(/125% of the mortgage payment/),
                ).toBeInTheDocument();
                expect(
                    screen.getByText(/stress-tested rate/),
                ).toBeInTheDocument();
            });
        });
    });
});
