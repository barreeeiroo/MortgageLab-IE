import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomPerkForm, PERK_ICON_NAMES } from "../CustomPerkForm";

describe("CustomPerkForm", () => {
    const defaultProps = {
        onSubmit: vi.fn(),
        submitButton: ({
            onClick,
            disabled,
        }: {
            onClick: () => void;
            disabled: boolean;
        }) => (
            <button type="button" onClick={onClick} disabled={disabled}>
                Submit
            </button>
        ),
    };

    describe("basic rendering", () => {
        it("renders label input", () => {
            render(<CustomPerkForm {...defaultProps} />);

            expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
        });

        it("renders description input", () => {
            render(<CustomPerkForm {...defaultProps} />);

            expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        });

        it("renders icon selection", () => {
            render(<CustomPerkForm {...defaultProps} />);

            expect(screen.getByText("Icon")).toBeInTheDocument();
        });

        it("renders all icon options", () => {
            const { container } = render(<CustomPerkForm {...defaultProps} />);

            const iconButtons = container.querySelectorAll("button[title]");
            expect(iconButtons.length).toBe(PERK_ICON_NAMES.length);
        });

        it("renders submit button", () => {
            render(<CustomPerkForm {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /submit/i }),
            ).toBeInTheDocument();
        });
    });

    describe("form validation", () => {
        it("disables submit when label is empty", () => {
            render(<CustomPerkForm {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /submit/i }),
            ).toBeDisabled();
        });

        it("enables submit when label is filled", async () => {
            const user = userEvent.setup();
            render(<CustomPerkForm {...defaultProps} />);

            await user.type(screen.getByLabelText(/label/i), "Free Legal Fees");

            expect(
                screen.getByRole("button", { name: /submit/i }),
            ).not.toBeDisabled();
        });
    });

    describe("form submission", () => {
        it("calls onSubmit with perk data when submitted", async () => {
            const user = userEvent.setup();
            const onSubmit = vi.fn();
            render(<CustomPerkForm {...defaultProps} onSubmit={onSubmit} />);

            await user.type(screen.getByLabelText(/label/i), "Free Legal Fees");
            await user.type(
                screen.getByLabelText(/description/i),
                "Legal fees covered",
            );

            await user.click(screen.getByRole("button", { name: /submit/i }));

            expect(onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    label: "Free Legal Fees",
                    description: "Legal fees covered",
                    icon: "Star", // default icon
                }),
            );
        });

        it("generates id for new perk", async () => {
            const user = userEvent.setup();
            const onSubmit = vi.fn();
            render(<CustomPerkForm {...defaultProps} onSubmit={onSubmit} />);

            await user.type(screen.getByLabelText(/label/i), "Test Perk");
            await user.click(screen.getByRole("button", { name: /submit/i }));

            expect(onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: expect.stringContaining("custom-perk-"),
                }),
            );
        });
    });

    describe("icon selection", () => {
        it("has Star selected by default", () => {
            const { container } = render(<CustomPerkForm {...defaultProps} />);

            const starButton = container.querySelector('button[title="Star"]');
            expect(starButton?.className).toContain("border-primary");
        });

        it("allows selecting a different icon", async () => {
            const user = userEvent.setup();
            const { container } = render(<CustomPerkForm {...defaultProps} />);

            const giftButton = container.querySelector('button[title="Gift"]');
            expect(giftButton).toBeInTheDocument();
            if (giftButton) {
                await user.click(giftButton);
            }

            expect(giftButton?.className).toContain("border-primary");
        });
    });

    describe("edit mode", () => {
        const existingPerk = {
            id: "existing-perk",
            label: "Existing Perk",
            description: "An existing perk",
            icon: "Gift",
        };

        it("pre-populates form with existing perk data", () => {
            render(
                <CustomPerkForm {...defaultProps} initialPerk={existingPerk} />,
            );

            expect(
                screen.getByDisplayValue("Existing Perk"),
            ).toBeInTheDocument();
            expect(
                screen.getByDisplayValue("An existing perk"),
            ).toBeInTheDocument();
        });

        it("preserves existing perk id on submit", async () => {
            const user = userEvent.setup();
            const onSubmit = vi.fn();
            render(
                <CustomPerkForm
                    {...defaultProps}
                    initialPerk={existingPerk}
                    onSubmit={onSubmit}
                />,
            );

            await user.click(screen.getByRole("button", { name: /submit/i }));

            expect(onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({ id: "existing-perk" }),
            );
        });
    });

    describe("footer", () => {
        it("shows local storage notice", () => {
            render(<CustomPerkForm {...defaultProps} />);

            expect(
                screen.getByText(/custom perks are stored locally/i),
            ).toBeInTheDocument();
        });
    });
});
