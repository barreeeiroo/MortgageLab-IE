import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender } from "@/test/utils/mock-data";
import { EditCustomRateDialog } from "../EditCustomRateDialog";

describe("EditCustomRateDialog", () => {
    const mockLenders = [
        createMockLender({ id: "aib", name: "AIB" }),
        createMockLender({ id: "boi", name: "Bank of Ireland" }),
    ];

    const mockRate = {
        id: "custom-1",
        name: "3 Year Fixed",
        lenderId: "aib",
        type: "fixed" as const,
        rate: 3.45,
        apr: 3.52,
        fixedTerm: 3,
        minLtv: 0,
        maxLtv: 80,
        buyerTypes: ["ftb", "mover"] as (
            | "ftb"
            | "mover"
            | "btl"
            | "switcher-pdh"
            | "switcher-btl"
        )[],
        perks: [],
    };

    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        rate: mockRate,
        lenders: mockLenders,
        customLenders: [],
        perks: [],
        currentBuyerType: "ftb" as const,
        onUpdateRate: vi.fn(),
    };

    describe("basic rendering", () => {
        it("renders Edit Custom Rate title", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(
                screen.getByRole("heading", { name: /edit custom rate/i }),
            ).toBeInTheDocument();
        });

        it("renders description with lender name", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(
                screen.getByText(/modify your custom rate for aib/i),
            ).toBeInTheDocument();
        });

        it("renders Save Changes button", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /save changes/i }),
            ).toBeInTheDocument();
        });

        it("renders close button", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /close/i }),
            ).toBeInTheDocument();
        });
    });

    describe("dialog closed state", () => {
        it("does not render when closed", () => {
            render(<EditCustomRateDialog {...defaultProps} open={false} />);

            expect(
                screen.queryByRole("heading", { name: /edit custom rate/i }),
            ).not.toBeInTheDocument();
        });
    });

    describe("back button", () => {
        it("renders back button when onBack provided", () => {
            render(<EditCustomRateDialog {...defaultProps} onBack={vi.fn()} />);

            expect(
                screen.getByRole("button", { name: /back/i }),
            ).toBeInTheDocument();
        });

        it("does not render back button when onBack not provided", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(
                screen.queryByRole("button", { name: /back/i }),
            ).not.toBeInTheDocument();
        });

        it("calls onBack when back button is clicked", async () => {
            const user = userEvent.setup();
            const onBack = vi.fn();
            render(<EditCustomRateDialog {...defaultProps} onBack={onBack} />);

            await user.click(screen.getByRole("button", { name: /back/i }));

            expect(onBack).toHaveBeenCalled();
        });
    });

    describe("close button", () => {
        it("calls onOpenChange when close button is clicked", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            render(
                <EditCustomRateDialog
                    {...defaultProps}
                    onOpenChange={onOpenChange}
                />,
            );

            await user.click(screen.getByRole("button", { name: /close/i }));

            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe("pre-populated form", () => {
        it("shows rate name in input", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(
                screen.getByDisplayValue("3 Year Fixed"),
            ).toBeInTheDocument();
        });

        it("shows rate value in input", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(screen.getByDisplayValue("3.45")).toBeInTheDocument();
        });

        it("shows APRC value in input", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(screen.getByDisplayValue("3.52")).toBeInTheDocument();
        });

        it("shows fixed term in input", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            expect(screen.getByDisplayValue("3")).toBeInTheDocument();
        });
    });

    describe("custom lender display", () => {
        it("shows custom lender name in description", () => {
            const customRate = {
                ...mockRate,
                lenderId: "my-bank",
                customLenderName: "My Bank",
            };
            render(
                <EditCustomRateDialog {...defaultProps} rate={customRate} />,
            );

            expect(
                screen.getByText(/modify your custom rate for my bank/i),
            ).toBeInTheDocument();
        });

        it("falls back to Custom when no lender found", () => {
            const unknownRate = {
                ...mockRate,
                lenderId: "unknown-lender",
            };
            render(
                <EditCustomRateDialog {...defaultProps} rate={unknownRate} />,
            );

            expect(
                screen.getByText(/modify your custom rate for custom/i),
            ).toBeInTheDocument();
        });
    });

    describe("lender logo", () => {
        it("renders lender logo in header for known lender", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            // Dialog renders in a portal, so use document.querySelector
            const img = document.querySelector('img[alt="aib logo"]');
            expect(img).toBeInTheDocument();
        });

        it("renders custom badge for custom lender", () => {
            render(
                <EditCustomRateDialog
                    {...defaultProps}
                    rate={{ ...mockRate, customLenderName: "My Bank" }}
                />,
            );

            // Dialog renders in a portal, so use document.querySelector
            const pencilBadge = document.querySelector(
                ".absolute.-top-1.-right-1",
            );
            expect(pencilBadge).toBeInTheDocument();
        });
    });

    describe("form integration", () => {
        it("does not show APRC calculation mode toggle", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            // Edit dialog doesn't show fee calculation mode
            expect(
                screen.queryByLabelText(/calculate from fees/i),
            ).not.toBeInTheDocument();
        });

        it("includes custom perks in the form", () => {
            const customPerks = [
                {
                    id: "custom-perk",
                    label: "My Perk",
                    description: "Custom perk",
                    icon: "Gift",
                },
            ];
            render(
                <EditCustomRateDialog
                    {...defaultProps}
                    customPerks={customPerks}
                />,
            );

            expect(screen.getByText("Perks")).toBeInTheDocument();
            expect(screen.getByText("My Perk")).toBeInTheDocument();
        });
    });

    describe("lender selection disabled", () => {
        it("disables lender selection in edit mode", () => {
            render(<EditCustomRateDialog {...defaultProps} />);

            // Radix Select comboboxes don't get accessible names from Label elements
            // The lender select is the first combobox and should be disabled in edit mode
            const comboboxes = screen.getAllByRole("combobox");
            expect(comboboxes[0]).toBeDisabled();
        });
    });
});
