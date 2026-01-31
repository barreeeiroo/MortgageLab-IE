import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SimulateRedirectAlert } from "../SimulateRedirectAlert";

// Mock window.location
const mockLocation = {
    search: "",
    pathname: "/rates",
};

Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
});

// Mock window.history.replaceState
const mockReplaceState = vi.fn();
Object.defineProperty(window, "history", {
    value: { replaceState: mockReplaceState },
    writable: true,
});

describe("SimulateRedirectAlert", () => {
    beforeEach(() => {
        mockLocation.search = "";
        mockLocation.pathname = "/rates";
        mockReplaceState.mockClear();
    });

    describe("rendering based on URL params", () => {
        it("renders nothing when no from param", () => {
            mockLocation.search = "";
            const { container } = render(<SimulateRedirectAlert />);

            expect(container.firstChild).toBeNull();
        });

        it("renders simulate alert when from=simulate", async () => {
            mockLocation.search = "?from=simulate";
            render(<SimulateRedirectAlert />);

            await waitFor(() => {
                expect(
                    screen.getByText("Select a rate to simulate"),
                ).toBeInTheDocument();
            });
        });

        it("renders add rate alert when from=simulate-add", async () => {
            mockLocation.search = "?from=simulate-add";
            render(<SimulateRedirectAlert />);

            await waitFor(() => {
                expect(
                    screen.getByText("Add a rate to your simulation"),
                ).toBeInTheDocument();
            });
        });

        it("shows Simulate instruction for simulate mode", async () => {
            mockLocation.search = "?from=simulate";
            render(<SimulateRedirectAlert />);

            await waitFor(() => {
                expect(screen.getByText(/Simulate/)).toBeInTheDocument();
            });
        });

        it("shows Add to Simulation instruction for simulate-add mode", async () => {
            mockLocation.search = "?from=simulate-add";
            render(<SimulateRedirectAlert />);

            await waitFor(() => {
                expect(
                    screen.getByText(/Add to Simulation/),
                ).toBeInTheDocument();
            });
        });
    });

    describe("URL param cleanup", () => {
        it("clears the from param from URL", async () => {
            mockLocation.search = "?from=simulate";
            render(<SimulateRedirectAlert />);

            await waitFor(() => {
                expect(mockReplaceState).toHaveBeenCalledWith({}, "", "/rates");
            });
        });

        it("preserves other URL params when clearing from", async () => {
            mockLocation.search = "?from=simulate&other=value";
            render(<SimulateRedirectAlert />);

            await waitFor(() => {
                expect(mockReplaceState).toHaveBeenCalledWith(
                    {},
                    "",
                    "/rates?other=value",
                );
            });
        });
    });

    describe("dismiss functionality", () => {
        it("hides alert when close button is clicked", async () => {
            const user = userEvent.setup();
            mockLocation.search = "?from=simulate";
            render(<SimulateRedirectAlert />);

            await waitFor(() => {
                expect(
                    screen.getByText("Select a rate to simulate"),
                ).toBeInTheDocument();
            });

            const closeButton = screen.getByRole("button");
            await user.click(closeButton);

            await waitFor(() => {
                expect(
                    screen.queryByText("Select a rate to simulate"),
                ).not.toBeInTheDocument();
            });
        });
    });
});
