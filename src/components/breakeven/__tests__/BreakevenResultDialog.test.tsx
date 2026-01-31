import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BreakevenResultDialog } from "../BreakevenResultDialog";

describe("BreakevenResultDialog", () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        title: "Rent vs Buy Analysis",
        description: "Compare renting and buying over time",
        children: <div>Result content</div>,
        onExport: vi.fn().mockResolvedValue(undefined),
        isExporting: false,
        onShare: vi.fn().mockResolvedValue("https://example.com/share"),
        hasResult: true,
    };

    describe("basic rendering", () => {
        it("renders title", () => {
            render(<BreakevenResultDialog {...defaultProps} />);

            expect(
                screen.getByRole("heading", { name: /rent vs buy analysis/i }),
            ).toBeInTheDocument();
        });

        it("renders description", () => {
            render(<BreakevenResultDialog {...defaultProps} />);

            expect(
                screen.getByText(/compare renting and buying/i),
            ).toBeInTheDocument();
        });

        it("renders children content", () => {
            render(<BreakevenResultDialog {...defaultProps} />);

            expect(screen.getByText("Result content")).toBeInTheDocument();
        });
    });

    describe("action buttons", () => {
        it("renders Export PDF button when hasResult", () => {
            render(<BreakevenResultDialog {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /export pdf/i }),
            ).toBeInTheDocument();
        });

        it("renders Share button when hasResult", () => {
            render(<BreakevenResultDialog {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /share/i }),
            ).toBeInTheDocument();
        });

        it("hides Export and Share buttons when no result", () => {
            render(
                <BreakevenResultDialog {...defaultProps} hasResult={false} />,
            );

            expect(
                screen.queryByRole("button", { name: /export pdf/i }),
            ).not.toBeInTheDocument();
        });

        it("renders Close button", () => {
            render(<BreakevenResultDialog {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /close/i }),
            ).toBeInTheDocument();
        });
    });

    describe("export button", () => {
        it("calls onExport when clicked", async () => {
            const user = userEvent.setup();
            const onExport = vi.fn().mockResolvedValue(undefined);
            render(
                <BreakevenResultDialog {...defaultProps} onExport={onExport} />,
            );

            await user.click(
                screen.getByRole("button", { name: /export pdf/i }),
            );

            expect(onExport).toHaveBeenCalled();
        });

        it("shows Exporting... when isExporting is true", () => {
            render(
                <BreakevenResultDialog {...defaultProps} isExporting={true} />,
            );

            expect(
                screen.getByRole("button", { name: /exporting/i }),
            ).toBeInTheDocument();
        });

        it("disables export button when isExporting", () => {
            render(
                <BreakevenResultDialog {...defaultProps} isExporting={true} />,
            );

            expect(
                screen.getByRole("button", { name: /exporting/i }),
            ).toBeDisabled();
        });
    });

    describe("dialog closed state", () => {
        it("does not render when closed", () => {
            render(<BreakevenResultDialog {...defaultProps} open={false} />);

            expect(
                screen.queryByRole("heading", {
                    name: /rent vs buy analysis/i,
                }),
            ).not.toBeInTheDocument();
        });
    });
});
