import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LenderSelector } from "../LenderSelector";

describe("LenderSelector", () => {
    const mockLenders = [
        { id: "aib", name: "AIB" },
        { id: "boi", name: "Bank of Ireland" },
        { id: "ptsb", name: "Permanent TSB" },
    ];

    describe("basic rendering", () => {
        it("renders placeholder when nothing selected", () => {
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={[]}
                    onChange={vi.fn()}
                />,
            );

            expect(screen.getByText("All Lenders")).toBeInTheDocument();
        });

        it("renders custom placeholder", () => {
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={[]}
                    onChange={vi.fn()}
                    placeholder="Select a lender"
                />,
            );

            expect(screen.getByText("Select a lender")).toBeInTheDocument();
        });

        it("renders lender name when single selection", () => {
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={["aib"]}
                    onChange={vi.fn()}
                />,
            );

            expect(screen.getByText("AIB")).toBeInTheDocument();
        });

        it("renders count when multiple selected", () => {
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={["aib", "boi"]}
                    onChange={vi.fn()}
                    multiple
                />,
            );

            expect(screen.getByText("2 lenders")).toBeInTheDocument();
        });
    });

    describe("single select mode", () => {
        it("opens dropdown on click", async () => {
            const user = userEvent.setup();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={[]}
                    onChange={vi.fn()}
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(screen.getByText("Bank of Ireland")).toBeInTheDocument();
                expect(screen.getByText("Permanent TSB")).toBeInTheDocument();
            });
        });

        it("calls onChange with selected lender", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={[]}
                    onChange={onChange}
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(screen.getByText("Bank of Ireland")).toBeInTheDocument();
            });

            await user.click(
                screen.getByRole("menuitemcheckbox", { name: /AIB/i }),
            );

            expect(onChange).toHaveBeenCalledWith(["aib"]);
        });

        it("clears selection when clicking selected item", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={["aib"]}
                    onChange={onChange}
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(
                    screen.getByRole("menuitemcheckbox", { name: /AIB/i }),
                ).toBeInTheDocument();
            });

            await user.click(
                screen.getByRole("menuitemcheckbox", { name: /AIB/i }),
            );

            expect(onChange).toHaveBeenCalledWith([]);
        });
    });

    describe("multiple select mode", () => {
        it("shows selection count in dropdown header", async () => {
            const user = userEvent.setup();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={["aib", "boi"]}
                    onChange={vi.fn()}
                    multiple
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(
                    screen.getByText(/2 of 3 selected/i),
                ).toBeInTheDocument();
            });
        });

        it("shows Clear button when items selected", async () => {
            const user = userEvent.setup();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={["aib"]}
                    onChange={vi.fn()}
                    multiple
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: /clear/i }),
                ).toBeInTheDocument();
            });
        });

        it("shows All button when nothing selected", async () => {
            const user = userEvent.setup();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={[]}
                    onChange={vi.fn()}
                    multiple
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: /^all$/i }),
                ).toBeInTheDocument();
            });
        });

        it("calls onChange with toggled selection", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={["aib"]}
                    onChange={onChange}
                    multiple
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(screen.getByText("Bank of Ireland")).toBeInTheDocument();
            });

            await user.click(
                screen.getByRole("menuitemcheckbox", {
                    name: /Bank of Ireland/i,
                }),
            );

            expect(onChange).toHaveBeenCalledWith(
                expect.arrayContaining(["aib", "boi"]),
            );
        });

        it("shows Select All option", async () => {
            const user = userEvent.setup();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={[]}
                    onChange={vi.fn()}
                    multiple
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(
                    screen.getByRole("menuitemcheckbox", {
                        name: /select all/i,
                    }),
                ).toBeInTheDocument();
            });
        });

        it("calls onChange with all lenders when Select All clicked", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={[]}
                    onChange={onChange}
                    multiple
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(
                    screen.getByRole("menuitemcheckbox", {
                        name: /select all/i,
                    }),
                ).toBeInTheDocument();
            });

            await user.click(
                screen.getByRole("menuitemcheckbox", { name: /select all/i }),
            );

            expect(onChange).toHaveBeenCalledWith(["aib", "boi", "ptsb"]);
        });

        it("clears all when Clear button clicked", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <LenderSelector
                    lenders={mockLenders}
                    value={["aib", "boi"]}
                    onChange={onChange}
                    multiple
                />,
            );

            await user.click(screen.getByRole("button"));

            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: /clear/i }),
                ).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: /clear/i }));

            expect(onChange).toHaveBeenCalledWith([]);
        });
    });

    describe("single lender display", () => {
        it("shows lender logo when single lender selected", () => {
            const { container } = render(
                <LenderSelector
                    lenders={mockLenders}
                    value={["aib"]}
                    onChange={vi.fn()}
                />,
            );

            // LenderLogo should be rendered in the trigger button
            const img = container.querySelector("img");
            expect(img).toBeInTheDocument();
        });
    });
});
