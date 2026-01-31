import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BerSelector } from "../BerSelector";

describe("BerSelector", () => {
    it("renders with label when not compact", () => {
        render(<BerSelector value="C1" onChange={vi.fn()} />);

        expect(screen.getByText("BER Rating")).toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renders without label when compact", () => {
        render(<BerSelector value="C1" onChange={vi.fn()} compact />);

        expect(screen.queryByText("BER Rating")).not.toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("displays selected value", () => {
        render(<BerSelector value="A1" onChange={vi.fn()} />);

        expect(screen.getByRole("combobox")).toHaveTextContent("A1");
    });

    it("displays all BER options when opened", async () => {
        const user = userEvent.setup();
        render(<BerSelector value="C1" onChange={vi.fn()} />);

        await user.click(screen.getByRole("combobox"));

        expect(screen.getByRole("option", { name: "A1" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "B3" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "C1" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "G" })).toBeInTheDocument();
        expect(
            screen.getByRole("option", { name: "Exempt" }),
        ).toBeInTheDocument();
    });

    it("calls onChange when selection changes", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<BerSelector value="C1" onChange={onChange} />);

        await user.click(screen.getByRole("combobox"));
        await user.click(screen.getByRole("option", { name: "A1" }));

        expect(onChange).toHaveBeenCalledWith("A1");
    });

    it("uses custom id when provided", () => {
        render(<BerSelector value="C1" onChange={vi.fn()} id="custom-ber" />);

        expect(screen.getByRole("combobox")).toHaveAttribute(
            "id",
            "custom-ber",
        );
    });

    it("uses custom label when provided", () => {
        render(
            <BerSelector value="C1" onChange={vi.fn()} label="Energy Rating" />,
        );

        expect(screen.getByText("Energy Rating")).toBeInTheDocument();
    });
});
