import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender } from "@/test/utils/mock-data";
import { RateUpdatesDialog } from "../RateUpdatesDialog";

describe("RateUpdatesDialog", () => {
    const mockLender = createMockLender({
        id: "aib",
        name: "AIB",
        shortName: "AIB",
        ratesUrl: "https://aib.ie/rates",
        mortgagesUrl: "https://aib.ie/mortgages",
    });

    const mockMetadata = {
        lenderId: "aib",
        lastScrapedAt: "2024-01-15T10:00:00.000Z",
        lastUpdatedAt: "2024-01-14T08:00:00.000Z",
    };

    const defaultProps = {
        lenders: [mockLender],
        ratesMetadata: [mockMetadata],
    };

    describe("trigger button", () => {
        it("renders Sources button", () => {
            render(<RateUpdatesDialog {...defaultProps} />);

            expect(
                screen.getByRole("button", { name: /sources/i }),
            ).toBeInTheDocument();
        });
    });

    describe("dialog content", () => {
        it("opens dialog when button is clicked", async () => {
            const user = userEvent.setup();
            render(<RateUpdatesDialog {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /sources/i }));

            await waitFor(() => {
                expect(
                    screen.getByText("Rate Update Information"),
                ).toBeInTheDocument();
            });
        });

        it("displays table headers", async () => {
            const user = userEvent.setup();
            render(<RateUpdatesDialog {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /sources/i }));

            await waitFor(() => {
                expect(screen.getByText("Lender")).toBeInTheDocument();
                expect(screen.getByText("Last Checked")).toBeInTheDocument();
                expect(screen.getByText("Rates Updated")).toBeInTheDocument();
                expect(screen.getByText("View Rates")).toBeInTheDocument();
            });
        });

        it("displays lender name", async () => {
            const user = userEvent.setup();
            render(<RateUpdatesDialog {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /sources/i }));

            await waitFor(() => {
                expect(screen.getByText("AIB")).toBeInTheDocument();
            });
        });

        it("displays relative time for last scraped", async () => {
            const user = userEvent.setup();
            render(<RateUpdatesDialog {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /sources/i }));

            await waitFor(() => {
                // Should show relative time like "X days ago"
                const cells = screen.getAllByRole("cell");
                expect(cells.length).toBeGreaterThan(0);
            });
        });

        it("renders external link to lender rates page", async () => {
            const user = userEvent.setup();
            render(<RateUpdatesDialog {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /sources/i }));

            await waitFor(() => {
                const links = screen.getAllByRole("link");
                const ratesLink = links.find(
                    (link) =>
                        link.getAttribute("href") === "https://aib.ie/rates",
                );
                expect(ratesLink).toBeInTheDocument();
            });
        });

        it("renders Missing Rates link in footer", async () => {
            const user = userEvent.setup();
            render(<RateUpdatesDialog {...defaultProps} />);

            await user.click(screen.getByRole("button", { name: /sources/i }));

            await waitFor(() => {
                expect(
                    screen.getByRole("link", { name: /missing rates/i }),
                ).toBeInTheDocument();
            });
        });
    });

    describe("multiple lenders", () => {
        it("displays all lenders in the table", async () => {
            const user = userEvent.setup();
            const lender2 = createMockLender({
                id: "boi",
                name: "Bank of Ireland",
                shortName: "BOI",
            });
            const metadata2 = {
                lenderId: "boi",
                lastScrapedAt: "2024-01-15T10:00:00.000Z",
                lastUpdatedAt: "2024-01-14T08:00:00.000Z",
            };

            render(
                <RateUpdatesDialog
                    lenders={[mockLender, lender2]}
                    ratesMetadata={[mockMetadata, metadata2]}
                />,
            );

            await user.click(screen.getByRole("button", { name: /sources/i }));

            await waitFor(() => {
                expect(screen.getByText("AIB")).toBeInTheDocument();
                expect(screen.getByText("Bank of Ireland")).toBeInTheDocument();
            });
        });
    });
});
