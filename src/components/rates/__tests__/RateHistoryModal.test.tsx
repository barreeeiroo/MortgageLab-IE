import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockLender, createMockRate } from "@/test/utils/mock-data";
import { RateHistoryModal } from "../RateHistoryModal";

// Mock the history data fetching
vi.mock("@/lib/stores/rates/rates-history", () => ({
	fetchLenderHistoryData: vi.fn().mockResolvedValue(null),
	getRateChanges: vi.fn().mockReturnValue([]),
	getRateTimeSeries: vi.fn().mockReturnValue(null),
}));

describe("RateHistoryModal", () => {
	const mockLender = createMockLender({
		id: "aib",
		name: "AIB",
		shortName: "AIB",
		ratesUrl: "https://aib.ie/rates",
	});

	const mockRate = createMockRate({
		id: "aib-fixed-3yr",
		name: "3 Year Fixed",
		lenderId: "aib",
		type: "fixed",
		rate: 3.45,
		apr: 3.52,
		fixedTerm: 3,
	});

	const defaultProps = {
		rate: mockRate,
		lender: mockLender,
		perks: [],
		open: true,
		onOpenChange: vi.fn(),
		onBack: vi.fn(),
	};

	describe("basic rendering", () => {
		it("renders rate name in title", async () => {
			render(<RateHistoryModal {...defaultProps} />);

			expect(
				screen.getByRole("heading", { name: /3 year fixed/i }),
			).toBeInTheDocument();
		});

		it("renders lender name in description", async () => {
			render(<RateHistoryModal {...defaultProps} />);

			expect(screen.getByText(/AIB/)).toBeInTheDocument();
		});

		it("shows Rate History in description", () => {
			render(<RateHistoryModal {...defaultProps} />);

			expect(screen.getByText(/Rate History/)).toBeInTheDocument();
		});
	});

	describe("back button", () => {
		it("renders back button", () => {
			render(<RateHistoryModal {...defaultProps} />);

			expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
		});

		it("calls onBack when back button is clicked", async () => {
			const user = userEvent.setup();
			const onBack = vi.fn();
			render(<RateHistoryModal {...defaultProps} onBack={onBack} />);

			await user.click(screen.getByRole("button", { name: /back/i }));

			expect(onBack).toHaveBeenCalled();
		});
	});

	describe("close button", () => {
		it("renders close button", () => {
			render(<RateHistoryModal {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /close/i }),
			).toBeInTheDocument();
		});

		it("calls onOpenChange when close button is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(
				<RateHistoryModal {...defaultProps} onOpenChange={onOpenChange} />,
			);

			await user.click(screen.getByRole("button", { name: /close/i }));

			expect(onOpenChange).toHaveBeenCalled();
		});
	});

	describe("loading state", () => {
		it("shows loading message while fetching data", () => {
			render(<RateHistoryModal {...defaultProps} />);

			expect(screen.getByText(/loading historical data/i)).toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("shows no data message when no history available", async () => {
			render(<RateHistoryModal {...defaultProps} />);

			await waitFor(() => {
				expect(
					screen.getByText(/no historical data available/i),
				).toBeInTheDocument();
			});
		});
	});

	describe("incorrect info link", () => {
		it("renders Incorrect Info link for non-custom rates", async () => {
			render(<RateHistoryModal {...defaultProps} />);

			await waitFor(() => {
				expect(
					screen.getByRole("link", { name: /incorrect info/i }),
				).toBeInTheDocument();
			});
		});

		it("does not render Incorrect Info link for custom rates", async () => {
			const customRate = { ...mockRate, isCustom: true };
			render(<RateHistoryModal {...defaultProps} rate={customRate} />);

			await waitFor(() => {
				expect(
					screen.queryByRole("link", { name: /incorrect info/i }),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("lender logo", () => {
		it("renders lender logo area", () => {
			render(<RateHistoryModal {...defaultProps} />);

			// The dialog header should contain lender information
			expect(screen.getByText(/AIB/)).toBeInTheDocument();
		});
	});

	describe("null rate handling", () => {
		it("returns null when rate is null", () => {
			const { container } = render(
				<RateHistoryModal {...defaultProps} rate={null} />,
			);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("custom rate display", () => {
		it("shows Custom badge for custom rates", () => {
			const customRate = { ...mockRate, isCustom: true };
			render(<RateHistoryModal {...defaultProps} rate={customRate} />);

			expect(screen.getByText("Custom")).toBeInTheDocument();
		});

		it("uses customLenderName when provided", () => {
			const customRate = {
				...mockRate,
				isCustom: true,
				customLenderName: "My Bank",
			};
			render(<RateHistoryModal {...defaultProps} rate={customRate} />);

			expect(screen.getByText(/My Bank/)).toBeInTheDocument();
		});
	});
});
