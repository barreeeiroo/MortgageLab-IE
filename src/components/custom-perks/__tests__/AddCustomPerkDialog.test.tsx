import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddCustomPerkDialog } from "../AddCustomPerkDialog";

describe("AddCustomPerkDialog", () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        onAddPerk: vi.fn(),
    };

    describe("basic rendering", () => {
        it("renders Add Custom Perk title", () => {
            render(<AddCustomPerkDialog {...defaultProps} />);

            expect(
                screen.getByRole("heading", { name: /add custom perk/i }),
            ).toBeInTheDocument();
        });

        it("renders description text", () => {
            render(<AddCustomPerkDialog {...defaultProps} />);

            expect(
                screen.getByText(/create a custom perk to use with/i),
            ).toBeInTheDocument();
        });

        it("renders Create Perk button", () => {
            render(<AddCustomPerkDialog {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /create perk/i }),
            ).toBeInTheDocument();
        });

        it("renders close button", () => {
            render(<AddCustomPerkDialog {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /close/i }),
            ).toBeInTheDocument();
        });
    });

    describe("dialog closed state", () => {
        it("does not render when closed", () => {
            render(<AddCustomPerkDialog {...defaultProps} open={false} />);

            expect(
                screen.queryByRole("heading", { name: /add custom perk/i }),
            ).not.toBeInTheDocument();
        });
    });

    describe("back button", () => {
        it("renders back button when onBack provided", () => {
            render(<AddCustomPerkDialog {...defaultProps} onBack={vi.fn()} />);

            expect(
                screen.getByRole("button", { name: /back/i }),
            ).toBeInTheDocument();
        });

        it("does not render back button when onBack not provided", () => {
            render(<AddCustomPerkDialog {...defaultProps} />);

            expect(
                screen.queryByRole("button", { name: /back/i }),
            ).not.toBeInTheDocument();
        });

        it("calls onBack when back button is clicked", async () => {
            const user = userEvent.setup();
            const onBack = vi.fn();
            render(<AddCustomPerkDialog {...defaultProps} onBack={onBack} />);

            await user.click(screen.getByRole("button", { name: /back/i }));

            expect(onBack).toHaveBeenCalled();
        });
    });

    describe("close button", () => {
        it("calls onOpenChange when close button is clicked", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            render(
                <AddCustomPerkDialog
                    {...defaultProps}
                    onOpenChange={onOpenChange}
                />,
            );

            await user.click(screen.getByRole("button", { name: /close/i }));

            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe("form integration", () => {
        it("renders label input from CustomPerkForm", () => {
            render(<AddCustomPerkDialog {...defaultProps} />);

            expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
        });

        it("renders icon selection from CustomPerkForm", () => {
            render(<AddCustomPerkDialog {...defaultProps} />);

            expect(screen.getByText("Icon")).toBeInTheDocument();
        });
    });
});
